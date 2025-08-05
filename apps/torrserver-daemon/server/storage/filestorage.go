package storage

import (
	"context"
	"os"
	"path/filepath"

	"github.com/anacrolix/torrent/metainfo"
	"github.com/anacrolix/torrent/storage"
)

// FileStorage is a storage.ClientImpl that stores torrents in subdirectories
// named by their infohash.
type FileStorage struct {
	baseDir string
}

// New creates a new FileStorage. Note the return type matches the interface.
func New(baseDir string) storage.ClientImpl {
	return &FileStorage{
		baseDir: baseDir,
	}
}

// OpenTorrent creates a directory for the torrent and then uses the library's
// file storage implementation for that directory.
func (fs *FileStorage) OpenTorrent(ctx context.Context, info *metainfo.Info, infoHash metainfo.Hash) (storage.TorrentImpl, error) {
	torrentDir := filepath.Join(fs.baseDir, infoHash.HexString())
	if err := os.MkdirAll(torrentDir, 0755); err != nil {
		return storage.TorrentImpl{}, err
	}
	// Create a new file-based storage client for the specific torrent directory.
	torrentStorage := storage.NewFile(torrentDir)
	// Now, open the torrent with this specific storage client.
	return torrentStorage.OpenTorrent(ctx, info, infoHash)
}

// Close does nothing, as the underlying file storage for each torrent is
// managed by the torrent client.
func (fs *FileStorage) Close() error {
	return nil
}