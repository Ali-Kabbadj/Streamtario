package torr

import (
	"log"
	"mime"
	"net/http"
	"path/filepath"
	"server/settings"
	"strconv"
	"time"

	"github.com/anacrolix/torrent"
	"github.com/anacrolix/torrent/metainfo"
	"github.com/gin-gonic/gin"
)

func Stream(c *gin.Context) {

	infoHashHex := c.Param("hash")
	idStr := c.Param("id")
	fileIdx, err := strconv.Atoi(idStr)
	if err != nil {
		c.String(http.StatusBadRequest, "Invalid file index")
		return
	}

	infoHash := metainfo.NewHashFromHex(infoHashHex)

	spec := &torrent.TorrentSpec{
		InfoHash:                 infoHash,
		DisableInitialPieceCheck: true,
	}

	torr, err := AddTorrent(spec, "", fileIdx)
	if err != nil {
		log.Printf("Failed to prepare torrent %s (file %d): %v", infoHashHex, fileIdx, err)
		c.String(http.StatusInternalServerError, "Failed to prepare torrent for streaming")
		return
	}

	torr.AddExpiredTime(time.Second * time.Duration(settings.Get().TorrentDisconnectTimeout))

	if !torr.GotInfo() {
		log.Printf("Torrent info not available for %s after waiting", infoHashHex)
		c.String(http.StatusNotFound, "Torrent metadata could not be retrieved in time")
		return
	}

	files := torr.Files()
	if fileIdx < 0 || fileIdx >= len(files) {
		log.Printf("File index %d out of bounds for torrent %s", fileIdx, infoHashHex)
		c.String(http.StatusBadRequest, "File index out of bounds")
		return
	}
	targetFile := files[fileIdx]

	torr.muTorrent.Lock()
	if torr.FileName == "" {
		torr.FileName = filepath.Base(targetFile.Path())
	}
	torr.FileIdx = fileIdx
	torr.muTorrent.Unlock()

	reader := targetFile.NewReader()
	reader.SetReadahead(settings.Get().CacheSize)
	defer reader.Close()

	extension := filepath.Ext(torr.FileName)
	mimeType := mime.TypeByExtension(extension)
	if mimeType != "" {
		c.Header("Content-Type", mimeType)
	} else {
		c.Header("Content-Type", "application/octet-stream")
	}

	log.Printf("Streaming file %s (index %d, size %d) from torrent %s", torr.FileName, fileIdx, targetFile.Length(), infoHashHex)

	http.ServeContent(c.Writer, c.Request, torr.FileName, time.Unix(torr.Timestamp, 0), reader)
}