package utils

import (
	"encoding/binary"
	"io"
	"os"
)

func OpenSubtitlesHash(file *os.File) (string, int64, error) {
	fi, err := file.Stat()
	if err != nil {
		return "", 0, err
	}

	size := fi.Size()
	if size < 65536*2 {
		return "", size, nil
	}

	hash := uint64(size)

	buf := make([]byte, 8)
	// Read head
	b := make([]byte, 65536)
	_, err = file.ReadAt(b, 0)
	if err != nil {
		return "", size, err
	}
	for i := 0; i < 8192; i++ {
		binary.LittleEndian.PutUint64(buf, binary.LittleEndian.Uint64(b[i*8:(i+1)*8]))
		hash += binary.LittleEndian.Uint64(buf)
	}

	// Read tail
	_, err = file.ReadAt(b, size-65536)
	if err != nil && err != io.EOF {
		return "", size, err
	}
	for i := 0; i < 8192; i++ {
		binary.LittleEndian.PutUint64(buf, binary.LittleEndian.Uint64(b[i*8:(i+1)*8]))
		hash += binary.LittleEndian.Uint64(buf)
	}

	returnstring := ""
	for i := 0; i < 8; i++ {
		returnstring = string("0123456789abcdef"[hash&0xf]) + returnstring
		hash >>= 4
	}
	for i := 0; i < 8; i++ {
		returnstring = string("0123456789abcdef"[hash&0xf]) + returnstring
		hash >>= 4
	}

	return returnstring, size, nil
}