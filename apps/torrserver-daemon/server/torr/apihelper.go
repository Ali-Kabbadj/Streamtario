package torr

import (
	"io"
	"os"
	"sort"
	"sync"
	"time"

	"github.com/anacrolix/torrent"
	"github.com/anacrolix/torrent/metainfo"

	"server/log"
	"server/settings"
	sets "server/settings"
)

var bts *BTServer
var torrentMu sync.Mutex

func Init() {
	bts = NewBTS()
	err := bts.Connect()
	if err != nil {
		log.TLogln("Failed to initialize torrent server:", err)
		os.Exit(1)
	}
}

func Close() {
	if bts != nil {
		bts.Disconnect()
	}
}

func AddTorrent(spec *torrent.TorrentSpec, title, poster string, data string, category string) (*Torrent, error) {
    spec.DisableInitialPieceCheck = true

    // Use the client's internal lock to safely check for an existing torrent.
    if _, ok := bts.client.Torrent(spec.InfoHash); ok {
        // It exists in the client, but we need our wrapper.
        if torr, ok := bts.torrents[spec.InfoHash]; ok {
            log.TLogln("Returning existing torrent instance for:", spec.InfoHash.HexString())
            // Refresh the timer on the existing instance.
            torr.AddExpiredTime(time.Second * time.Duration(settings.Get().TorrentDisconnectTimeout))
            return torr, nil
        }
    }
    
    torr, err := NewTorrent(spec, bts)
    if err != nil {
        log.TLogln("error creating new torrent:", err)
        return nil, err
    }
    
    torr.Title = title
    torr.Poster = poster
    torr.Data = data
    torr.Category = category

    return torr, nil
}


// RemTorrent finds an active torrent, closes it gracefully, and removes it from management.
func RemTorrent(hashHex string) {
	// Acquire the lock to ensure this operation is atomic.
	torrentMu.Lock()
	defer torrentMu.Unlock()

	hash := metainfo.NewHashFromHex(hashHex)
	
	torr := bts.GetTorrent(hash)
	if torr == nil {
		log.TLogln("Attempted to remove torrent not found in active client:", hashHex)
		return
	}

	// Remove from our map BEFORE telling the client to drop it.
	bts.mu.Lock()
	delete(bts.torrents, hash)
	bts.mu.Unlock()
	
	// Now, safely and synchronously close the torrent instance.
	torr.Close()
	log.TLogln("Explicitly removed torrent from client and references:", hashHex)
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
			return ret[i].Title > ret[j].Title
		}
	})

	return ret
}

func DropTorrent(hashHex string) {
	hash := metainfo.NewHashFromHex(hashHex)
	bts.RemoveTorrent(hash)
}

func SetSettings(set *sets.BTSets) {
	if sets.ReadOnly {
		log.TLogln("API SetSettings: Read-only DB mode!")
		return
	}
	sets.SetBTSets(set)
	log.TLogln("drop all torrents")
	dropAllTorrent()
	time.Sleep(time.Second * 1)
	log.TLogln("disconect")
	bts.Disconnect()
	log.TLogln("connect")
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
	log.TLogln("drop all torrents")
	dropAllTorrent()
	time.Sleep(time.Second * 1)
	log.TLogln("disconect")
	bts.Disconnect()
	log.TLogln("connect")
	bts.Connect()
	time.Sleep(time.Second * 1)
	log.TLogln("end set default settings")
}

func dropAllTorrent() {
	for _, torr := range bts.torrents {
		torr.drop()
		<-torr.closed
	}
}

func Shutdown() {
	bts.Disconnect()
	sets.CloseDB()
	log.TLogln("Received shutdown. Quit")
	os.Exit(0)
}

func WriteStatus(w io.Writer) {
	bts.client.WriteStatus(w)
}