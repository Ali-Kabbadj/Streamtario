package utils

import (
	"bytes"
	"io"
	"net/http"

	"github.com/anacrolix/torrent"
	"github.com/anacrolix/torrent/metainfo"
)

// ParseLink handles magnet links, http links to .torrent files, and infohashes.
func ParseLink(link string) (*torrent.TorrentSpec, error) {
	// 1. Try parsing as a magnet link.
	if spec, err := torrent.TorrentSpecFromMagnetURI(link); err == nil {
		return spec, nil
	}

	// 2. Try parsing as a raw 40-character hexadecimal infohash.
	if len(link) == 40 {
		// THIS IS THE CORRECT METHOD:
		// First, create an InfoHash object from the hex string.
		hash := metainfo.NewHashFromHex(link)
		// Then, create a new TorrentSpec struct using that hash.
		spec := &torrent.TorrentSpec{
			InfoHash: hash,
		}
		return spec, nil
	}

	// 3. Finally, try fetching it as a URL to a .torrent file.
	resp, err := http.Get(link)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	metaInfo, err := metainfo.Load(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	return torrent.TorrentSpecFromMetaInfo(metaInfo), nil
}
