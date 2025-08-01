package torr

import (
	"net/http"
	"strconv"

	"server/log"
	"server/torr/state"
	"server/torr/utils"

	"github.com/gin-gonic/gin"
)

// This struct is copied from the old web/api/torrents.go
type torrReqJS struct {
	Action   string `json:"action"`
	Link     string `json:"link"`
	Hash     string `json:"hash"`
	Title    string `json:"title"`
	Poster   string `json:"poster"`
	Category string `json:"category"`
	Data     string `json:"data"`
	Save     bool   `json:"save_to_db"`
}

func Torrents(c *gin.Context) {
	var req torrReqJS
	if c.BindJSON(&req) != nil {
		return
	}

	switch req.Action {
	case "add":
		spec, err := utils.ParseLink(req.Link)
		if err != nil {
			log.TLogln("Error parse link", err)
			c.String(http.StatusBadRequest, "Invalid torrent link")
			return
		}
		torr, err := AddTorrent(spec, req.Title, req.Poster, req.Data, req.Category)
		if err != nil {
			log.TLogln("Error add torrent", err)
			c.String(http.StatusInternalServerError, "Failed to add torrent")
			return
		}
		if req.Save {
			SaveTorrentToDB(torr)
		}
		c.JSON(http.StatusOK, torr.Status())
	case "list":
		list := ListTorrent()
		var ret []*state.TorrentStatus
		for _, t := range list {
			ret = append(ret, t.Status())
		}
		c.JSON(http.StatusOK, ret)
	case "rem":
		RemTorrent(req.Hash)
		c.Status(http.StatusOK)
	default:
		c.String(http.StatusBadRequest, "Invalid action")
	}
}

// Stream is the public API handler for the /stream endpoint.
func Stream(c *gin.Context) {
	hash := c.Param("hash")
	id := c.Param("id")

	i, err := strconv.Atoi(id)
	if err != nil {
		c.String(http.StatusBadRequest, "Invalid file index")
		return
	}

	torr := GetTorrent(hash)
	if torr == nil {
		c.String(http.StatusNotFound, "Torrent not found")
		return
	}

	err = torr.Stream(i, c.Request, c.Writer)
	if err != nil {
		log.TLogln("Stream error:", err)
	}
}
