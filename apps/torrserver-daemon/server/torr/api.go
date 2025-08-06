package torr

import (
	"net/http"

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
