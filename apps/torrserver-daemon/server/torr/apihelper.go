package torr

import (
	"io"
	"os"
	"sort"
	"time"

	"github.com/anacrolix/torrent"
	"github.com/anacrolix/torrent/metainfo"
	"github.com/anacrolix/torrent/storage"

	"server/log"
	sets "server/settings"
)

var bts *BTServer

func Init() {
	bts = NewBTS()
	err := bts.Connect()
	if err != nil {
		log.TLogln("Failed to initialize torrent server:", err)
		os.Exit(1)
	}
}

func GetStorage() storage.ClientImpl {
	if bts != nil {
		return bts.Storage
	}
	return nil
}

func Close() {
	if bts != nil {
		bts.Disconnect()
	}
}

func AddTorrent(spec *torrent.TorrentSpec, filename string, fileIdx int, startTime float64, duration float64) (*Torrent, error) {
	spec.DisableInitialPieceCheck = true

	bts.mu.Lock()
	shouldDropAll := false
	if len(bts.torrents) > 0 {
		_, isAlreadyThere := bts.torrents[spec.InfoHash]
		if !isAlreadyThere || len(bts.torrents) > 1 {
			shouldDropAll = true
		}
	}
	bts.mu.Unlock()

	if shouldDropAll {
		log.TLogln("[STREAM_LIFECYCLE] New stream request requires cleanup of old torrent(s). Dropping all.")
		dropAllTorrent()
		time.Sleep(500 * time.Millisecond)
	}

	bts.mu.Lock()
	existingTorrent, ok := bts.torrents[spec.InfoHash]
	bts.mu.Unlock()

	if ok && existingTorrent != nil {
		log.TLogln("[STREAM_LIFECYCLE] Re-using existing torrent instance for:", spec.InfoHash.HexString())
		return existingTorrent, nil
	}

	log.TLogln("[STREAM_LIFECYCLE] Creating new torrent instance for:", spec.InfoHash.HexString())
	torr, err := NewTorrent(spec, bts, filename, fileIdx, startTime, duration)
	if err != nil {
		log.TLogln("error creating new torrent:", err)
		return nil, err
	}

	return torr, nil
}

func RemTorrent(hashHex string) {
	hash := metainfo.NewHashFromHex(hashHex)

	bts.mu.Lock()
	torr, ok := bts.torrents[hash]
	if ok {
		delete(bts.torrents, hash)
	}
	bts.mu.Unlock()

	if ok && torr != nil {
		torr.Close()
		log.TLogln("Explicitly removed torrent from client and references:", hashHex)
	} else {
		log.TLogln("Attempted to remove torrent not found in active client:", hashHex)
	}
}

func GetTorrent(hash metainfo.Hash) *Torrent {
	bts.mu.Lock()
	defer bts.mu.Unlock()
	return bts.torrents[hash]
}

func ListTorrent() []*Torrent {
	btlist := bts.ListTorrents()

	var ret []*Torrent
	for _, t := range btlist {
		ret = append(ret, t)
	}

	sort.Slice(ret, func(i, j int) bool {
		if ret[i].Timestamp != ret[j].Timestamp {
			return ret[i].Timestamp > ret[j].Timestamp
		} else {
			return ret[i].FileName > ret[j].FileName
		}
	})

	return ret
}

func DropTorrent(hashHex string) {
	RemTorrent(hashHex)
}

func SetSettings(set *sets.BTSets) {
	if sets.ReadOnly {
		log.TLogln("API SetSettings: Read-only DB mode!")
		return
	}
	sets.SetBTSets(set)
	log.TLogln("dropping all torrents for settings change")
	dropAllTorrent()
	time.Sleep(time.Second * 1)
	log.TLogln("disconnecting BT client")
	bts.Disconnect()
	log.TLogln("connecting BT client with new settings")
	bts.Connect()
	time.Sleep(time.Second * 1)
	log.TLogln("end set settings")
}

func SetDefSettings() {
	if sets.ReadOnly {
		log.TLogln("API SetDefSettings: Read-only DB mode!")
		return
	}
	sets.SetDefaultConfig()
	log.TLogln("dropping all torrents for default settings change")
	dropAllTorrent()
	time.Sleep(time.Second * 1)
	log.TLogln("disconnecting BT client")
	bts.Disconnect()
	log.TLogln("connecting BT client with default settings")
	bts.Connect()
	time.Sleep(time.Second * 1)
	log.TLogln("end set default settings")
}

func dropAllTorrent() {
	bts.mu.Lock()
	torrentsToDrop := make([]*Torrent, 0, len(bts.torrents))
	for hash, torr := range bts.torrents {
		torrentsToDrop = append(torrentsToDrop, torr)
		delete(bts.torrents, hash)
	}
	bts.mu.Unlock()

	for _, torr := range torrentsToDrop {
		torr.Close()
	}
}

func Shutdown() {
	bts.Disconnect()
	sets.CloseDB()
	log.TLogln("Received shutdown. Quit")
	os.Exit(0)
}

func WriteStatus(w io.Writer) {
	if bts.client != nil {
		bts.client.WriteStatus(w)
	} else {
		io.WriteString(w, "Torrent client is not connected.\n")
	}
}