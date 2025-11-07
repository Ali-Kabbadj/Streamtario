package torr

// in ./torr/stream.go

import (
	"io"
	"log"
	"mime"
	"net/http"
	"path/filepath"
	"server/settings"
	"strconv"

	"fmt"

	"github.com/anacrolix/torrent/metainfo"
	"github.com/gin-gonic/gin"
)

// in ./torr/stream.go

func Stream(c *gin.Context) {
	infoHashHex := c.Param("hash")
	idStr := c.Param("id")
	fileIdx, err := strconv.Atoi(idStr)
	if err != nil {
		c.String(http.StatusBadRequest, "Invalid file index")
		return
	}

	torr := GetTorrent(metainfo.NewHashFromHex(infoHashHex))
	if torr == nil {
		c.String(http.StatusNotFound, "Stream not found.")
		return
	}
	if !torr.WaitInfo() {
		c.String(http.StatusNotFound, "Could not retrieve stream details in time.")
		return
	}

	files := torr.Files()
	if fileIdx < 0 || fileIdx >= len(files) {
		c.String(http.StatusBadRequest, "File index out of bounds")
		return
	}
	targetFile := files[fileIdx]
	fileSize := targetFile.Length()

	torr.muTorrent.Lock()
	if torr.FileName == "" {
		torr.FileName = filepath.Base(targetFile.Path())
	}
	torr.muTorrent.Unlock()

	reader := targetFile.NewReader()
	defer reader.Close()
	reader.SetReadahead(settings.Get().CacheSize)

	// ========================================================================
	// START: THE DEFINITIVE FIX - SMART STREAMING WITH RANGE SUPPORT
	// ========================================================================

	c.Header("Content-Type", mime.TypeByExtension(filepath.Ext(torr.FileName)))
	c.Header("Accept-Ranges", "bytes")

	// Check for a Range header, which is how players seek.
	rangeHeader := c.Request.Header.Get("Range")
	if rangeHeader == "" {
		// --- NO RANGE HEADER: Stream the entire file from a specific start point ---
		log.Printf("[STREAM] No Range header. Serving full content.")

		// Support for starting from a specific offset (e.g., watch history).
		startOffsetStr := c.DefaultQuery("start", "0")
		startOffset, _ := strconv.ParseInt(startOffsetStr, 10, 64)
		if startOffset > 0 {
			reader.Seek(startOffset, io.SeekStart)
		}

		c.Header("Content-Length", strconv.FormatInt(fileSize-startOffset, 10))
		c.Writer.WriteHeader(http.StatusOK)
		c.Writer.Flush()

		io.Copy(c.Writer, reader)
		return
	}

	// --- RANGE HEADER DETECTED: Serve a partial chunk of the file ---
	log.Printf("[STREAM] Range header detected: %s. Serving partial content.", rangeHeader)

	var start, end int64
	_, err = fmt.Sscanf(rangeHeader, "bytes=%d-%d", &start, &end)
	if err != nil { // This format is common: "bytes=500-"
		_, err = fmt.Sscanf(rangeHeader, "bytes=%d-", &start)
		end = fileSize - 1
	}
	if err != nil {
		c.String(http.StatusBadRequest, "Invalid Range header")
		return
	}

	contentLength := end - start + 1

	c.Header("Content-Length", strconv.FormatInt(contentLength, 10))
	c.Header("Content-Range", fmt.Sprintf("bytes %d-%d/%d", start, end, fileSize))

	// IMPORTANT: Send the 206 Partial Content header BEFORE seeking.
	// This satisfies the browser's TTFB timeout.
	c.Writer.WriteHeader(http.StatusPartialContent)
	c.Writer.Flush()

	// Now, seek the torrent reader to the requested start position.
	// This might block, but it's okay because the client is already happy.
	_, err = reader.Seek(start, io.SeekStart)
	if err != nil {
		log.Printf("[STREAM] Seek error: %v", err)
		c.String(http.StatusInternalServerError, "Error seeking stream")
		return
	}

	// Copy exactly the number of bytes required for the range.
	written, err := io.CopyN(c.Writer, reader, contentLength)
	if err != nil {
		log.Printf("[STREAM] Partial copy finished with error (often normal if client disconnects): %v", err)
	}
	log.Printf("[STREAM] Partial copy finished. Transferred %d bytes.", written)

	// ========================================================================
	// END: THE DEFINITIVE FIX
	// ========================================================================
}