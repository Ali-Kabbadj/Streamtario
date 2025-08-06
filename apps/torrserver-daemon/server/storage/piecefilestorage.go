package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"sync"

	"github.com/anacrolix/torrent/metainfo"
	"github.com/anacrolix/torrent/storage"
)

var (
	_ storage.ClientImpl = (*FilePieceStorageClient)(nil)
	_ storage.PieceImpl  = (*filePieceImpl)(nil)
)

type FilePieceStorageClient struct {
	baseDir string
}

func NewFilePieceStorage(baseDir string) storage.ClientImpl {
	return &FilePieceStorageClient{
		baseDir: baseDir,
	}
}

func (fsc *FilePieceStorageClient) OpenTorrent(ctx context.Context, info *metainfo.Info, infoHash metainfo.Hash) (storage.TorrentImpl, error) {
	torrentDir := filepath.Join(fsc.baseDir, infoHash.HexString())
	if err := os.MkdirAll(torrentDir, 0755); err != nil {
		return storage.TorrentImpl{}, fmt.Errorf("failed to create torrent storage directory: %w", err)
	}

	fpt, err := newFilePieceTorrentImpl(torrentDir, info, infoHash) // <-- PASS THE infoHash
	if err != nil {
		return storage.TorrentImpl{}, err
	}

	return storage.TorrentImpl{
		Piece: fpt.Piece,
		Close: fpt.Close,
		Flush: fpt.Flush,
	}, nil
}

func (fsc *FilePieceStorageClient) Close() error {
	return nil
}

type filePieceTorrentImpl struct {
	torrentDir  string
	info        *metainfo.Info
	infoHash    metainfo.Hash 
	fileOffsets []int64
	fileHandles map[int]*os.File
	completion  storage.PieceCompletion
	mu          sync.Mutex
}

func newFilePieceTorrentImpl(torrentDir string, info *metainfo.Info, infoHash metainfo.Hash) (*filePieceTorrentImpl, error) { // <-- ADD infoHash to signature
	fileOffsets := make([]int64, len(info.Files))
	currentOffset := int64(0)
	for i, file := range info.Files {
		fileOffsets[i] = currentOffset
		currentOffset += file.Length
	}

	completion, err := newBitfieldPieceCompletion(filepath.Join(torrentDir, "bitfield"), info.NumPieces())
	if err != nil {
		return nil, fmt.Errorf("failed to initialize piece completion: %w", err)
	}

	return &filePieceTorrentImpl{
		torrentDir:  torrentDir,
		info:        info,
		infoHash:    infoHash, // <-- STORE THE infoHash
		fileOffsets: fileOffsets,
		fileHandles: make(map[int]*os.File),
		completion:  completion,
	}, nil
}


func (fpt *filePieceTorrentImpl) Piece(p metainfo.Piece) storage.PieceImpl {
	return &filePieceImpl{
		fpt:     fpt,
		piece:   p,
	}
}

func (fpt *filePieceTorrentImpl) Close() error {
	fpt.mu.Lock()
	defer fpt.mu.Unlock()
	var firstErr error
	for i, f := range fpt.fileHandles {
		err := f.Close()
		if err != nil && firstErr == nil {
			firstErr = err
		}
		delete(fpt.fileHandles, i)
	}
	if err := fpt.completion.Close(); err != nil && firstErr == nil {
		firstErr = err
	}
	return firstErr
}

func (fpt *filePieceTorrentImpl) Flush() error {
	return nil
}

func (fpt *filePieceTorrentImpl) getOrCreateFileHandle(fileIdx int) (*os.File, error) {
	fpt.mu.Lock()
	defer fpt.mu.Unlock()

	if f, ok := fpt.fileHandles[fileIdx]; ok {
		return f, nil
	}

	filePath := filepath.Join(fpt.torrentDir, strconv.Itoa(fileIdx))
	f, err := os.OpenFile(filePath, os.O_RDWR|os.O_CREATE, 0644)
	if err != nil {
		return nil, err
	}
	fpt.fileHandles[fileIdx] = f
	return f, nil
}

type filePieceImpl struct {
	fpt   *filePieceTorrentImpl
	piece metainfo.Piece
}

func (fpi *filePieceImpl) WriteAt(p []byte, off int64) (n int, err error) {
	return fpi.performIO(p, off, true)
}

func (fpi *filePieceImpl) ReadAt(b []byte, off int64) (n int, err error) {
	return fpi.performIO(b, off, false)
}

func (fpi *filePieceImpl) MarkComplete() error {
	key := metainfo.PieceKey{
		InfoHash: fpi.fpt.infoHash,
		Index:    fpi.piece.Index(),
	}
	return fpi.fpt.completion.Set(key, true)
}

func (fpi *filePieceImpl) MarkNotComplete() error {
	key := metainfo.PieceKey{
		InfoHash: fpi.fpt.infoHash,
		Index:    fpi.piece.Index(),
	}
	return fpi.fpt.completion.Set(key, false)
}

func (fpi *filePieceImpl) Completion() storage.Completion {
	key := metainfo.PieceKey{
		InfoHash: fpi.fpt.infoHash,
		Index:    fpi.piece.Index(),
	}
	c, _ := fpi.fpt.completion.Get(key)
	return c
}
func (fpi *filePieceImpl) performIO(buf []byte, off int64, isWrite bool) (n int, err error) {
	torrentOffset := fpi.piece.Offset() + off
	remainingBuf := buf

	for len(remainingBuf) > 0 {
		fileIdx, fileStartOffset, fileLen := fpi.findFileForOffset(torrentOffset)
		if fileIdx == -1 {
			break
		}

		offsetInFile := torrentOffset - fileStartOffset
		chunkSize := int64(len(remainingBuf))
		if offsetInFile+chunkSize > fileLen {
			chunkSize = fileLen - offsetInFile
		}
		if chunkSize <= 0 {
			break
		}

		f, err := fpi.fpt.getOrCreateFileHandle(fileIdx)
		if err != nil {
			return n, fmt.Errorf("failed to get file handle for index %d: %w", fileIdx, err)
		}

		var currentN int
		if isWrite {
			currentN, err = f.WriteAt(remainingBuf[:chunkSize], offsetInFile)
		} else {
			currentN, err = f.ReadAt(remainingBuf[:chunkSize], offsetInFile)
		}

		n += currentN
		if err != nil {
			if err == io.EOF && !isWrite {
				return n, nil
			}
			return n, err
		}

		remainingBuf = remainingBuf[chunkSize:]
		torrentOffset += int64(currentN)
	}

	return len(buf), nil
}

func (fpi *filePieceImpl) findFileForOffset(torrentOffset int64) (fileIdx int, fileStartOffset int64, fileLen int64) {
	for i, f := range fpi.fpt.info.Files {
		start := fpi.fpt.fileOffsets[i]
		end := start + f.Length
		if torrentOffset >= start && torrentOffset < end {
			return i, start, f.Length
		}
	}
	return -1, 0, 0
}