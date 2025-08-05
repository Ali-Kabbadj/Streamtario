package utils

import (
	"bytes"
	"io"
	"net/http"

	"github.com/anacrolix/torrent"
	"github.com/anacrolix/torrent/metainfo"
)

func ParseLink(link string) (*torrent.TorrentSpec, error) {
	// Corrected function name from TorrentSpecFromMagnetURI to TorrentSpecFromMagnetUri
	if spec, err := torrent.TorrentSpecFromMagnetUri(link); err == nil {
		return spec, nil
	}

	if len(link) == 40 {
		hash := metainfo.NewHashFromHex(link)
		spec := &torrent.TorrentSpec{
			InfoHash: hash,
		}
		return spec, nil
	}

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