package torr

import (
	"encoding/json"
	"errors"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/anacrolix/torrent"
	"github.com/anacrolix/torrent/metainfo"

	"server/settings"
	"server/torr/state"
	"server/torr/utils"
)

type Torrent struct {
	expiredTime   time.Time
	Title    string
	Category string
	Poster   string
	Data     string
	*torrent.TorrentSpec
	readerCount int

	Stat      state.TorrentStat
	Timestamp int64
	Size      int64

	*torrent.Torrent
	muTorrent sync.Mutex

    bt            *BTServer

    lastTimeSpeed       time.Time
	DownloadSpeed       float64
	UploadSpeed         float64
	BytesReadUsefulData int64
	BytesWrittenData    int64

	DurationSeconds float64
	BitRate         string


	closed <-chan struct{}

	progressTicker *time.Ticker
}

func NewTorrent(spec *torrent.TorrentSpec, bt *BTServer) (*Torrent, error) {
	if bt == nil || bt.client == nil {
		return nil, errors.New("BT client not connected")
	}
	if len(spec.Trackers) == 0 {
		switch settings.Get().RetrackersMode {
		case 1:
			spec.Trackers = append(spec.Trackers, [][]string{utils.GetDefTrackers()}...)
		case 2:
			spec.Trackers = nil
		case 3:
			spec.Trackers = [][]string{utils.GetDefTrackers()}
		}
	
		trackers := utils.GetTrackerFromFile()
		if len(trackers) > 0 {
			spec.Trackers = append(spec.Trackers, [][]string{trackers}...)
		}
	}

	goTorrent, _, err := bt.client.AddTorrentSpec(spec)
	if err != nil {
		return nil, err
	}

	bt.mu.Lock()
	defer bt.mu.Unlock()
	if tor, ok := bt.torrents[spec.InfoHash]; ok {
		return tor, nil
	}

	timeout := time.Second * time.Duration(settings.Get().TorrentDisconnectTimeout)
	if timeout > time.Minute {
		timeout = time.Minute
	}

	torr := new(Torrent)
    torr.Torrent = goTorrent
	torr.Stat = state.TorrentAdded
	torr.lastTimeSpeed = time.Now()
	torr.bt = bt
	torr.closed = goTorrent.Closed()
	torr.TorrentSpec = spec
	torr.Timestamp = time.Now().Unix()

	go torr.watch()

	bt.torrents[spec.InfoHash] = torr
	return torr, nil
}



func (t *Torrent) WaitInfo() bool {
	if t.Torrent == nil {
		return false
	}

	tm := time.NewTimer(time.Minute + time.Second*time.Duration(settings.Get().TorrentDisconnectTimeout))

	select {
	case <-t.Torrent.GotInfo():
		return true
	case <-t.closed:
		return false
	case <-tm.C:
		return false
	}
}

func (t *Torrent) GotInfo() bool {
	if t.Stat == state.TorrentClosed {
		return false
	}
	t.Stat = state.TorrentGettingInfo
	if t.WaitInfo() {
		// --- SAVE METADATA ON SUCCESS ---
		info := t.Info()
		metaBytes, err := json.Marshal(info)
		if err == nil {
			torrentDir := filepath.Join(settings.Get().TorrentsSavePath, t.Hash().HexString())
			metaFilePath := filepath.Join(torrentDir, ".metainfo.json")
			// We don't need to check the error here, it's a best-effort cache.
			os.WriteFile(metaFilePath, metaBytes, 0644)
		}
		// -----------------------------

		t.Stat = state.TorrentWorking
		return true
	} else {
		t.Close()
		return false
	}
}




func (t *Torrent) watch() {
	t.progressTicker = time.NewTicker(time.Second)
	defer t.progressTicker.Stop()

	for {
		select {
		case <-t.progressTicker.C:
			go t.progressEvent()
		case <-t.closed:
			return
		}
	}
}

func (t *Torrent) progressEvent() {
	 if t.expired() {
        log.Println("Torrent closing due to idle timeout:", t.Hash().HexString())
        t.Close()
        return
    }
    t.muTorrent.Lock()
    defer t.muTorrent.Unlock()

    if t.Torrent == nil || t.Torrent.Info() == nil {
        t.Stat = state.TorrentGettingInfo
    } else {
        t.Stat = state.TorrentWorking
    }

    if t.Torrent != nil && t.Torrent.Info() != nil {
        st := t.Torrent.Stats()
        deltaDlBytes := st.BytesReadData.Int64() - t.BytesReadUsefulData
        deltaUpBytes := st.BytesWrittenData.Int64() - t.BytesWrittenData
        deltaTime := time.Since(t.lastTimeSpeed).Seconds()

        if deltaTime > 0 {
            t.DownloadSpeed = float64(deltaDlBytes) / deltaTime
            t.UploadSpeed = float64(deltaUpBytes) / deltaTime
        }

        t.BytesReadUsefulData = st.BytesReadData.Int64()
        t.BytesWrittenData = st.BytesWrittenData.Int64()
    } else {
        t.DownloadSpeed = 0
        t.UploadSpeed = 0
    }
    
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
	return [20]byte{}
}

func (t *Torrent) Length() int64 {
	if t.Info() == nil {
		return 0
	}
	return t.Torrent.Length()
}

func (t *Torrent) NewReader(file *torrent.File) torrent.Reader {
    t.muTorrent.Lock()
    t.readerCount++
    t.muTorrent.Unlock()
    return file.NewReader()
}

func (t *Torrent) CloseReader(reader torrent.Reader) {
    reader.Close()
    t.muTorrent.Lock()
    t.readerCount--
    t.muTorrent.Unlock()
}

func (t *Torrent) drop() {
	t.muTorrent.Lock()
	defer t.muTorrent.Unlock()
	if t.Torrent != nil {
		t.Torrent.Drop()
		t.Torrent = nil
	}
}


func (t *Torrent) Status() *state.TorrentStatus {
	t.muTorrent.Lock()
	defer t.muTorrent.Unlock()

	st := new(state.TorrentStatus)

	st.Stat = t.Stat
	st.StatString = t.Stat.String()
	st.Title = t.Title
	st.Category = t.Category
	st.Poster = t.Poster
	st.Data = t.Data
	st.Timestamp = t.Timestamp
	st.TorrentSize = t.Size
	st.BitRate = t.BitRate
	st.DurationSeconds = t.DurationSeconds

	if t.TorrentSpec != nil {
		st.Hash = t.TorrentSpec.InfoHash.HexString()
	}
	if t.Torrent != nil {
		st.Name = t.Torrent.Name()
		st.Hash = t.Torrent.InfoHash().HexString()
		st.LoadedSize = t.Torrent.BytesCompleted()
		
		st.DownloadSpeed = t.DownloadSpeed
		st.UploadSpeed = t.UploadSpeed

		tst := t.Torrent.Stats()
		st.BytesWritten = tst.BytesWritten.Int64()
		st.BytesWrittenData = tst.BytesWrittenData.Int64()
		st.BytesRead = tst.BytesRead.Int64()
		st.BytesReadData = tst.BytesReadData.Int64()
		st.BytesReadUsefulData = tst.BytesReadUsefulData.Int64()
		st.ChunksWritten = tst.ChunksWritten.Int64()
		st.ChunksRead = tst.ChunksRead.Int64()
		st.ChunksReadUseful = tst.ChunksReadUseful.Int64()
		st.ChunksReadWasted = tst.ChunksReadWasted.Int64()
		st.PiecesDirtiedGood = tst.PiecesDirtiedGood.Int64()
		st.PiecesDirtiedBad = tst.PiecesDirtiedBad.Int64()
		st.TotalPeers = tst.TotalPeers
		st.PendingPeers = tst.PendingPeers
		st.ActivePeers = tst.ActivePeers
		st.ConnectedSeeders = tst.ConnectedSeeders
		st.HalfOpenPeers = tst.HalfOpenPeers

		if t.Torrent.Info() != nil {
			st.TorrentSize = t.Torrent.Length()

			files := t.Files()
			for i, f := range files {
				st.FileStats = append(st.FileStats, &state.TorrentFileStat{
					Id:     i,
					Path:   f.Path(),
					Length: f.Length(),
				})
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
    t.muTorrent.Unlock()

    if t.progressTicker != nil {
        t.progressTicker.Stop()
    }

    if t.Torrent != nil {
        t.Torrent.Drop()
        <-t.closed
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
    // Never expire a torrent that hasn't finished getting its metadata.
    if t.Info() == nil {
        return false
    }
    return time.Now().After(t.expiredTime)
}