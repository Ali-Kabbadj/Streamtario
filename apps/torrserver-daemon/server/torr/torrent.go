package torr

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/anacrolix/torrent"
	"github.com/anacrolix/torrent/bencode"
	"github.com/anacrolix/torrent/metainfo"

	"server/settings"
	"server/torr/state"
	"server/torr/utils"
)

type Torrent struct {
	expiredTime time.Time
	FileName    string
	FileIdx     int

	*torrent.TorrentSpec

	Stat      state.TorrentStat
	Timestamp int64

	*torrent.Torrent
	muTorrent sync.Mutex

	bt *BTServer

	lastTimeSpeed       time.Time
	DownloadSpeed       float64
	UploadSpeed         float64
	BytesReadUsefulData int64

	closed         chan struct{}
	progressTicker *time.Ticker
}

func NewTorrent(spec *torrent.TorrentSpec, bt *BTServer, filename string, fileIdx int, startTime float64, duration float64) (*Torrent, error) {
	if bt == nil || bt.client == nil {
		return nil, errors.New("BT client not connected")
	}

	mergedTrackers := spec.Trackers
	switch settings.Get().RetrackersMode {
	case 1:
		mergedTrackers = append(mergedTrackers, [][]string{utils.GetDefTrackers()}...)
	case 2:
	case 3:
		mergedTrackers = [][]string{utils.GetDefTrackers()}
	}
	fileTrackers := utils.GetTrackerFromFile()
	if len(fileTrackers) > 0 {
		mergedTrackers = append(mergedTrackers, [][]string{fileTrackers}...)
	}
	spec.Trackers = mergedTrackers

	var goTorrent *torrent.Torrent
	var err error

	metaFilePath := filepath.Join(settings.Get().TorrentsSavePath, spec.InfoHash.HexString(), ".metainfo.json")
	if metaBytes, readErr := os.ReadFile(metaFilePath); readErr == nil {
		var info metainfo.Info
		if json.Unmarshal(metaBytes, &info) == nil {
			infoBytes, bencodeErr := bencode.Marshal(&info)
			if bencodeErr == nil {
				spec.InfoBytes = infoBytes
				log.Println("Loaded torrent metadata from cache for:", spec.InfoHash.HexString())
			}
		}
	}

	goTorrent, _, err = bt.client.AddTorrentSpec(spec)
	if err != nil {
		return nil, fmt.Errorf("error adding torrent spec to client: %w", err)
	}

	bt.mu.Lock()
	defer bt.mu.Unlock()

	if torr, ok := bt.torrents[spec.InfoHash]; ok {
		log.Println("Re-using existing torrent instance for:", spec.InfoHash.HexString())
		if torr.FileIdx != fileIdx && fileIdx != -1 {
			torr.FileIdx = fileIdx
		}
		if torr.GotInfo() {
			torr.UpdateReadAhead(startTime, duration)
		}
		torr.FileName = filename
		torr.AddExpiredTime(time.Second * time.Duration(settings.Get().TorrentDisconnectTimeout))
		return torr, nil
	}

	torr := &Torrent{
		Torrent:       goTorrent,
		TorrentSpec:   spec,
		Stat:          state.TorrentAdded,
		lastTimeSpeed: time.Now(),
		bt:            bt,
		closed:        make(chan struct{}),
		Timestamp:     time.Now().Unix(),
		FileName:      filename,
		FileIdx:       fileIdx,
	}

	go torr.watchStats()

	if torr.GotInfo() {
		torr.UpdateReadAhead(startTime, duration)
	}

	bt.torrents[spec.InfoHash] = torr
	log.Println("New torrent instance created and added for:", spec.InfoHash.HexString())
	torr.AddExpiredTime(time.Second * time.Duration(settings.Get().TorrentDisconnectTimeout))
	return torr, nil
}

func (t *Torrent) WaitInfo() bool {
	if t.Torrent == nil {
		return false
	}
	if t.Info() != nil {
		t.saveMetadata()
		return true
	}
	infoTimeout := time.Second * 30
	timer := time.NewTimer(infoTimeout)
	defer timer.Stop()

	select {
	case <-t.Torrent.GotInfo():
		log.Println("Torrent info received from network for:", t.Hash().HexString())
		t.saveMetadata()
		return true
	case <-t.closed:
		log.Println("Torrent closed before info received:", t.Hash().HexString())
		return false
	case <-timer.C:
		log.Println("Timeout waiting for torrent info:", t.Hash().HexString())
		t.Close()
		return false
	}
}

func (t *Torrent) GotInfo() bool {
	t.muTorrent.Lock()
	if t.Stat == state.TorrentClosed {
		t.muTorrent.Unlock()
		return false
	}
	t.Stat = state.TorrentGettingInfo
	t.muTorrent.Unlock()
	if t.WaitInfo() {
		t.muTorrent.Lock()
		t.Stat = state.TorrentWorking
		t.muTorrent.Unlock()
		return true
	}
	return false
}

func (t *Torrent) saveMetadata() {
	if t.Torrent == nil || t.Torrent.Info() == nil {
		return
	}
	info := t.Torrent.Info()
	torrentDir := filepath.Join(settings.Get().TorrentsSavePath, t.Hash().HexString())
	metaFilePath := filepath.Join(torrentDir, ".metainfo.json")
	if _, err := os.Stat(metaFilePath); os.IsNotExist(err) {
		metaBytes, err := json.Marshal(info)
		if err == nil {
			if err = os.MkdirAll(torrentDir, 0755); err == nil {
				if err = os.WriteFile(metaFilePath, metaBytes, 0644); err == nil {
					log.Println("Saved .metainfo.json for", t.Hash().HexString())
				}
			}
		}
	}
}

func (t *Torrent) UpdateReadAhead(startTime float64, duration float64) {
	if t.Torrent == nil || t.Info() == nil || t.FileIdx < 0 {
		return
	}
	files := t.Files()
	if t.FileIdx >= len(files) {
		return
	}
	targetFile := files[t.FileIdx]
	fileLength := targetFile.Length()
	pieceLength := t.Info().PieceLength

	var targetOffset int64
	if startTime > 0 && duration > 0 {
		targetOffset = int64((startTime / duration) * float64(fileLength))
	} else {
		targetOffset = 0
	}

	startPiece := (targetFile.Offset() + targetOffset) / pieceLength
	endPiece := (targetFile.Offset() + fileLength - 1) / pieceLength
	bufferPieces := int64((25 * 1024 * 1024) / pieceLength)
	if bufferPieces == 0 {
		bufferPieces = 1
	}

	log.Printf("[PRIORITY_LOG] Setting initial priority. Offset: %d, Start Piece: %d", targetOffset, startPiece)

	for i := 0; i < t.NumPieces(); i++ {
		t.Piece(i).SetPriority(torrent.PiecePriorityNone)
	}

	for i := startPiece; i < startPiece+bufferPieces && i <= endPiece; i++ {
		t.Piece(int(i)).SetPriority(torrent.PiecePriorityHigh)
	}

	for i, f := range files {
		if i == t.FileIdx {
			f.SetPriority(torrent.PiecePriorityNormal)
		} else {
			f.SetPriority(torrent.PiecePriorityNone)
		}
	}
}

func (t *Torrent) watchStats() {
	t.progressTicker = time.NewTicker(2 * time.Second)
	defer t.progressTicker.Stop()
	for {
		select {
		case <-t.progressTicker.C:
			t.progressEvent()
		case <-t.closed:
			return
		}
	}
}

func (t *Torrent) progressEvent() {
	t.muTorrent.Lock()
	defer t.muTorrent.Unlock()
	if t.Torrent == nil {
		t.Stat = state.TorrentClosed
		return
	}
	if t.Torrent.Info() == nil {
		t.Stat = state.TorrentGettingInfo
	} else {
		t.Stat = state.TorrentWorking
	}
	st := t.Torrent.Stats()
	deltaDlBytes := st.BytesReadData.Int64() - t.BytesReadUsefulData
	deltaTime := time.Since(t.lastTimeSpeed).Seconds()
	if deltaTime > 0 {
		t.DownloadSpeed = float64(deltaDlBytes) / deltaTime
	}
	t.BytesReadUsefulData = st.BytesReadData.Int64()
	t.lastTimeSpeed = time.Now()
}

func (t *Torrent) Files() []*torrent.File {
	if t.Torrent != nil && t.Torrent.Info() != nil {
		return t.Torrent.Files()
	}
	return nil
}

func (t *Torrent) Hash() metainfo.Hash {
	if t.Torrent != nil {
		return t.Torrent.InfoHash()
	}
	if t.TorrentSpec != nil {
		return t.TorrentSpec.InfoHash
	}
	return metainfo.Hash{}
}

func (t *Torrent) Length() int64 {
	if t.Info() == nil {
		return 0
	}
	return t.Torrent.Length()
}

func (t *Torrent) Status() *state.TorrentStatus {
	t.muTorrent.Lock()
	defer t.muTorrent.Unlock()
	st := new(state.TorrentStatus)
	st.Stat = t.Stat
	st.StatString = t.Stat.String()
	st.Timestamp = t.Timestamp
	st.Hash = t.Hash().HexString()
	if t.Torrent != nil {
		st.LoadedSize = t.Torrent.BytesCompleted()
		st.DownloadSpeed = t.DownloadSpeed
		tst := t.Torrent.Stats()
		st.TotalPeers = tst.TotalPeers
		st.PendingPeers = tst.PendingPeers
		st.ActivePeers = tst.ActivePeers
		st.ConnectedSeeders = tst.ConnectedSeeders
		if t.Torrent.Info() != nil {
			st.TorrentSize = t.Torrent.Length()
			files := t.Torrent.Files()
			st.FileStats = make([]*state.TorrentFileStat, len(files))
			for i, f := range files {
				st.FileStats[i] = &state.TorrentFileStat{
					Index:  i,
					Path:   f.Path(),
					Length: f.Length(),
				}
			}
			if t.FileIdx >= 0 && t.FileIdx < len(files) {
				targetFile := files[t.FileIdx]
				st.PreloadSize = 25 * 1024 * 1024
				st.PreloadedBytes = targetFile.BytesCompleted()
			}
		}
	}
	return st
}

func (t *Torrent) Close() bool {
	t.muTorrent.Lock()
	if t.Stat == state.TorrentClosed {
		t.muTorrent.Unlock()
		return true
	}
	t.Stat = state.TorrentClosed
	close(t.closed)
	t.muTorrent.Unlock()
	if t.progressTicker != nil {
		t.progressTicker.Stop()
	}
	if t.Torrent != nil {
		log.Println("Calling Torrent.Drop() for:", t.Hash().HexString())
		t.Torrent.Drop()
	}
	return true
}

func (t *Torrent) AddExpiredTime(duration time.Duration) {
	t.muTorrent.Lock()
	defer t.muTorrent.Unlock()
	t.expiredTime = time.Now().Add(duration)
}

func (t *Torrent) expired() bool {
	t.muTorrent.Lock()
	defer t.muTorrent.Unlock()
	return time.Now().After(t.expiredTime)
}