package torr

import (
	"log"
	"net/http"
	"server/settings"
	"strconv"
	"time"

	"github.com/anacrolix/torrent"
	"github.com/anacrolix/torrent/metainfo"
	"github.com/gin-gonic/gin"
)

// This struct is only for the cleanup action.
type torrReqJS struct {
	Action string `json:"action"`
	Hash   string `json:"hash"`
}

// Torrents now ONLY handles the explicit cleanup action.
func Torrents(c *gin.Context) {
	c.Status(http.StatusOK)
}



// Stream is the single, intelligent entry point for all playback.
func Stream(c *gin.Context) {
	hash := c.Param("hash")
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.String(http.StatusBadRequest, "Invalid file index")
		return
	}

	spec := &torrent.TorrentSpec{
		InfoHash:                 metainfo.NewHashFromHex(hash),
		DisableInitialPieceCheck: true,
	}
	
	torr, err := AddTorrent(spec, "", "", "", "")
	if err != nil {
		c.String(http.StatusInternalServerError, "Failed to prepare torrent")
		return
	}

	// Refresh the timer every time we get a stream request.
	torr.AddExpiredTime(time.Second * time.Duration(settings.Get().TorrentDisconnectTimeout))

	err = torr.Stream(id, c.Request, c.Writer)
	if err != nil {
		log.Println("Streaming failed:", err)
		if !c.Writer.Written() {
			c.String(http.StatusInternalServerError, "Streaming failed")
		}
	}
}