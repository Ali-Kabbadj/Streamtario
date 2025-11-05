package torr

import (
	"log"
	"mime"
	"net/http"
	"path/filepath"
	"server/settings"
	"strconv"
	"time"

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
	torr := GetTorrent(infoHash)
	if torr == nil {
		log.Printf("Stream request for non-existent torrent %s. It must be set up first.", infoHashHex)
		c.String(http.StatusNotFound, "Stream not found. Please set up the stream before accessing it.")
		return
	}

	log.Printf("[STREAM_LIFECYCLE] Player connected to stream URL for hash: %s, fileIndex: %d", infoHashHex, fileIdx)

	if torr.Info() == nil {
		log.Printf("[STREAM] Player is waiting for metadata for hash: %s...", infoHashHex)
		<-torr.Torrent.GotInfo()
		log.Printf("[STREAM] Metadata is now ready for hash: %s. Proceeding.", infoHashHex)
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
	torr.muTorrent.Unlock()
	reader := targetFile.NewReader()
	defer reader.Close()
	reader.SetReadahead(settings.Get().CacheSize)
	reader.SetResponsive()
	extension := filepath.Ext(torr.FileName)
	mimeType := mime.TypeByExtension(extension)
	if mimeType != "" {
		c.Header("Content-Type", mimeType)
	} else {
		c.Header("Content-Type", "application/octet-stream")
	}

	log.Printf("[STREAM_LIFECYCLE] Serving file '%s' (index %d, size %d) from torrent %s", torr.FileName, fileIdx, targetFile.Length(), infoHashHex)

	http.ServeContent(c.Writer, c.Request, torr.FileName, time.Unix(torr.Timestamp, 0), reader)
}