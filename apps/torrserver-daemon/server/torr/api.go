package torr

import (
	"net/http"

	"github.com/anacrolix/torrent"
	"github.com/anacrolix/torrent/metainfo"
	"github.com/gin-gonic/gin"

	"server/log"
)

type torrReqJS struct {
	Action    string   `json:"action"`
	Hash      string   `json:"hash"`
	Link      string   `json:"link"`
	Announce  []string `json:"announce"`
	FileIdx   int      `json:"file_idx"`
	StartTime float64  `json:"start_time"`
	Duration  float64  `json:"duration"`
}

func Torrents(c *gin.Context) {
	var req torrReqJS
	req.FileIdx = -1
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	switch req.Action {
	case "add":
		log.TLogln("[STREAM_LIFECYCLE] Received 'add' request for hash:", req.Link, ", fileIndex:", req.FileIdx)
		spec := torrent.TorrentSpec{
			InfoHash: metainfo.NewHashFromHex(req.Link),
		}
		if len(req.Announce) > 0 {
			spec.Trackers = append(spec.Trackers, req.Announce)
		}
		AddTorrent(&spec, "", req.FileIdx, req.StartTime, req.Duration)
		c.JSON(http.StatusOK, gin.H{"ok": true, "data": gin.H{"message": "Stream setup initiated"}})
	case "cleanup":
		log.TLogln("[STREAM_LIFECYCLE] Received 'cleanup' request for hash:", req.Hash)
		RemTorrent(req.Hash)
		c.JSON(http.StatusOK, gin.H{"ok": true, "data": gin.H{"message": "Cleanup successful"}})
	default:
		c.JSON(http.StatusOK, gin.H{"ok": true, "data": gin.H{"message": "Action not specified or recognized"}})
	}
}