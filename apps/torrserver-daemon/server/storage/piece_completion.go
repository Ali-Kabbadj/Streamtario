package storage

import (
	"fmt"
	"os"
	"sync"

	"github.com/anacrolix/torrent/metainfo"
	"github.com/anacrolix/torrent/storage"
)

// bitfieldPieceCompletion implements storage.PieceCompletion using a simple file.
type bitfieldPieceCompletion struct {
	file      *os.File
	numPieces int
	mu        sync.RWMutex
}

// newBitfieldPieceCompletion creates or opens a bitfield file for a torrent.
func newBitfieldPieceCompletion(filePath string, numPieces int) (storage.PieceCompletion, error) {
	f, err := os.OpenFile(filePath, os.O_RDWR|os.O_CREATE, 0644)
	if err != nil {
		return nil, fmt.Errorf("could not open bitfield file: %w", err)
	}

	// Ensure the file is large enough to hold the bitfield for all pieces.
	expectedSize := (numPieces + 7) / 8
	stat, err := f.Stat()
	if err != nil {
		return nil, err
	}
	if stat.Size() < int64(expectedSize) {
		if err := f.Truncate(int64(expectedSize)); err != nil {
			return nil, err
		}
	}

	return &bitfieldPieceCompletion{
		file:      f,
		numPieces: numPieces,
	}, nil
}

func (pc *bitfieldPieceCompletion) Get(pk metainfo.PieceKey) (ret storage.Completion, err error) {
	pc.mu.RLock()
	defer pc.mu.RUnlock()

	idx := pk.Index
	if idx >= pc.numPieces {
		return storage.Completion{}, fmt.Errorf("piece index %d out of bounds", idx)
	}

	byteIndex := idx / 8
	bitIndex := uint(idx % 8)

	buf := make([]byte, 1)
	_, err = pc.file.ReadAt(buf, int64(byteIndex))
	if err != nil {
		return
	}

	ret.Ok = true
	ret.Complete = (buf[0] & (1 << bitIndex)) != 0
	return
}

func (pc *bitfieldPieceCompletion) Set(pk metainfo.PieceKey, complete bool) error {
	pc.mu.Lock()
	defer pc.mu.Unlock()

	idx := pk.Index
	if idx >= pc.numPieces {
		return fmt.Errorf("piece index %d out of bounds", idx)
	}

	byteIndex := idx / 8
	bitIndex := uint(idx % 8)

	buf := make([]byte, 1)
	// Read-modify-write
	_, err := pc.file.ReadAt(buf, int64(byteIndex))
	if err != nil {
		return err
	}

	if complete {
		buf[0] |= (1 << bitIndex)
	} else {
		buf[0] &= ^(1 << bitIndex)
	}

	_, err = pc.file.WriteAt(buf, int64(byteIndex))
	return err
}

func (pc *bitfieldPieceCompletion) Close() error {
	pc.mu.Lock()
	defer pc.mu.Unlock()
	return pc.file.Close()
}
