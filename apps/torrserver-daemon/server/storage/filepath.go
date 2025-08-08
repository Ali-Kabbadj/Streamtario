package storage

import (
	"fmt"
	"path/filepath"
)

func (fsc *FilePieceStorageClient) FilePath(infoHashHex string, fileIndex int) string {
	return filepath.Join(fsc.baseDir, infoHashHex, fmt.Sprintf("%d", fileIndex))
}