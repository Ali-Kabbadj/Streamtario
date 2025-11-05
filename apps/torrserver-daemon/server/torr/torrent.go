package torr

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/anacrolix/torrent"
	"github.com/anacrolix/torrent/bencode"
	"github.com/anacrolix/torrent/metainfo"

	"server/log"
	"server/settings"
	"server/torr/state"
	"server/torr/utils"
)

type Torrent struct {
	FileName string
	FileIdx  int

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
				log.TLogln("Loaded torrent metadata from cache for:", spec.InfoHash.HexString())
			}
		}
	}

	spec.DisallowDataDownload = true

	log.TLogln("[STREAM_LIFECYCLE] Adding torrent spec to client for hash:", spec.InfoHash.HexString())
	goTorrent, _, err = bt.client.AddTorrentSpec(spec)
	if err != nil {
		return nil, fmt.Errorf("error adding torrent spec to client: %w", err)
	}

	bt.mu.Lock()
	defer bt.mu.Unlock()

	if torr, ok := bt.torrents[spec.InfoHash]; ok {
		if torr.FileIdx != fileIdx && fileIdx != -1 {
			torr.FileIdx = fileIdx
			torr.setFilePriorities()
		}
		torr.FileName = filename
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

	go func() {
		log.TLogln("[INIT] Waiting for metadata for hash:", torr.Hash().HexString(), "...")
		<-torr.Torrent.GotInfo()
		log.TLogln("[INIT] ==> Metadata acquired for hash:", torr.Hash().HexString(), ".")
		torr.saveMetadata()

		torr.setFilePriorities()

		log.TLogln("[INIT] Priorities set. Allowing data download for", torr.Hash().HexString(), ".")
		torr.Torrent.AllowDataDownload()

		torr.muTorrent.Lock()
		torr.Stat = state.TorrentWorking
		torr.muTorrent.Unlock()
	}()

	go torr.worker()

	bt.torrents[spec.InfoHash] = torr
	log.TLogln("New torrent instance created and added for:", spec.InfoHash.HexString())
	return torr, nil
}

func (t *Torrent) setFilePriorities() {
	if t.Info() == nil || t.FileIdx < 0 {
		return
	}

	log.TLogln("[PRIORITY] Setting file priorities for hash", t.Hash().HexString(), ", focusing ONLY on fileIndex", t.FileIdx, ".")
	for i, f := range t.Files() {
		if i == t.FileIdx {
			log.TLogln("[PRIORITY]   - Enabling download for target file:", f.Path())
			f.Download()
		} else {
			log.TLogln("[PRIORITY]   - Disabling download for file:", f.Path())
			f.SetPriority(torrent.PiecePriorityNone)
		}
	}
}

func (t *Torrent) worker() {
	t.progressTicker = time.NewTicker(2 * time.Second)
	defer t.progressTicker.Stop()

	for {
		select {
		case <-t.progressTicker.C:
			t.progressEvent()
		case <-t.closed:
			log.TLogln("[STREAM_LIFECYCLE] Worker shutting down for hash:", t.Hash().HexString())
			return
		}
	}
}

func (t *Torrent) GotInfo() bool {
	if t.Torrent == nil {
		return false
	}
	return t.Info() != nil
}

func (t *Torrent) WaitInfo() bool {
	if t.Torrent == nil {
		return false
	}
	if t.Info() != nil {
		t.saveMetadata()
		return true
	}
	log.TLogln("[STREAM_LIFECYCLE] Waiting for metadata for hash:", t.Hash().HexString())
	infoTimeout := time.Second * 30
	timer := time.NewTimer(infoTimeout)
	defer timer.Stop()

	select {
	case <-t.Torrent.GotInfo():
		log.TLogln("[STREAM_LIFECYCLE] ==> Metadata acquired for hash:", t.Hash().HexString())
		t.saveMetadata()
		return true
	case <-t.closed:
		log.TLogln("[STREAM_LIFECYCLE] Torrent closed before info received for hash:", t.Hash().HexString())
		return false
	case <-timer.C:
		log.TLogln("[STREAM_LIFECYCLE] ==> Metadata acquisition timed out for hash:", t.Hash().HexString())
		t.Close()
		return false
	}
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
					log.TLogln("[STREAM_LIFECYCLE] Metadata saved to cache for hash:", t.Hash().HexString())
				}
			}
		}
	}
}

func (t *Torrent) UpdatePiecePriorityForOffset(fileOffset int64) {
	if t.Torrent == nil || t.Info() == nil || t.FileIdx < 0 {
		return
	}
	files := t.Files()
	if t.FileIdx >= len(files) {
		return
	}
	
	pieceLength := t.Info().PieceLength
	targetFile := files[t.FileIdx]

	log.TLogln("[PRIORITY] Updating piece priorities for hash", t.Hash().HexString(), ", focusing ONLY on fileIndex", t.FileIdx)

	for i, file := range files {
		if i != t.FileIdx {
			fileStartPiece := file.Offset() / pieceLength
			fileEndPiece := (file.Offset() + file.Length() - 1) / pieceLength
			for p := fileStartPiece; p <= fileEndPiece; p++ {
				t.Piece(int(p)).SetPriority(torrent.PiecePriorityNone)
			}
		}
	}

	targetFileStartPiece := targetFile.Offset() / pieceLength
	targetFileEndPiece := (targetFile.Offset() + targetFile.Length() - 1) / pieceLength

	headerSize := int64(2 * 1024 * 1024)
	headerEndOffset := targetFile.Offset() + headerSize
	headerEndPiece := headerEndOffset / pieceLength
	
	seekStartPiece := (targetFile.Offset() + fileOffset) / pieceLength
	bufferBytes := int64(50 * 1024 * 1024)
	bufferEndPiece := seekStartPiece + (bufferBytes / pieceLength)

	log.TLogln("[PRIORITY] Target File '", targetFile.Path(), "' piece range:", targetFileStartPiece, "to", targetFileEndPiece)
	log.TLogln("[PRIORITY]   - Header Range (High Priority): Pieces", targetFileStartPiece, "to", headerEndPiece)
	log.TLogln("[PRIORITY]   - Seek Buffer Range (High Priority): Pieces", seekStartPiece, "to", bufferEndPiece)
	log.TLogln("[PRIORITY]   - All other pieces in this file will be set to NONE.")

	for p := targetFileStartPiece; p <= targetFileEndPiece; p++ {
		pieceIndex := int(p)
		isHeader := p <= headerEndPiece
		isSeekBuffer := p >= seekStartPiece && p <= bufferEndPiece

		if isHeader || isSeekBuffer {
			t.Piece(pieceIndex).SetPriority(torrent.PiecePriorityHigh)
		} else {
			t.Piece(pieceIndex).SetPriority(torrent.PiecePriorityNone)
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
	if t.DownloadSpeed > 0 || deltaDlBytes > 0 {
		log.TLogln(fmt.Sprintf("[STATS] Hash: %s | ActivePeers: %d | Speed: %.2f KB/s", t.Hash().HexString(), st.ActivePeers, t.DownloadSpeed/1024))
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
	if t.Torrent != nil {
		log.TLogln("Calling Torrent.Drop() for:", t.Hash().HexString())
		t.Torrent.Drop()
	}
	return true
}