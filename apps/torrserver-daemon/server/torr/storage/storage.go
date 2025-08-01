package storage

import (
	"github.com/anacrolix/torrent/metainfo"
	"github.com/anacrolix/torrent/storage"
)

// Storage is an interface
type Storage interface {
	storage.ClientImpl

	CloseHash(hash metainfo.Hash)
}
