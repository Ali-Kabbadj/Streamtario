package torr

import (
	"net/http"

	"github.com/anacrolix/torrent"
	"github.com/anacrolix/torrent/metainfo"
	"github.com/gin-gonic/gin"
)

type torrReqJS struct {
	Action   string   `json:"action"`
	Hash     string   `json:"hash"`
	Link     string   `json:"link"`
	Announce []string `json:"announce"`
}

func Torrents(c *gin.Context) {
	var req torrReqJS
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	switch req.Action {
	case "add":
		spec := torrent.TorrentSpec{
			InfoHash: metainfo.NewHashFromHex(req.Link),
		}
		if len(req.Announce) > 0 {
			spec.Trackers = append(spec.Trackers, req.Announce)
		}
		AddTorrent(&spec, "", -1)
		c.Status(http.StatusOK)
	case "cleanup":
		RemTorrent(req.Hash)
		c.Status(http.StatusOK)
	default:
		c.Status(http.StatusOK)
	}
}