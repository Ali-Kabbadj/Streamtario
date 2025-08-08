package server

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"sync"
	"syscall"
	"time"

	"github.com/anacrolix/torrent/metainfo"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"server/log"
	"server/settings"
	"server/storage"
	"server/torr"
	"server/torr/state"
	"server/torr/utils"
)

var (
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}
	clients   = make(map[*websocket.Conn]bool)
	clientsMu sync.Mutex
)

func Broadcast(status []*state.TorrentStatus) {
	clientsMu.Lock()
	defer clientsMu.Unlock()

	if len(clients) == 0 {
		return
	}

	message := gin.H{
		"type":    "stats-update",
		"payload": gin.H{"torrents": status},
	}

	for conn := range clients {
		if err := conn.WriteJSON(message); err != nil {
			log.TLogln("ws write error:", err)
			conn.Close()
			delete(clients, conn)
		}
	}
}

func StartStatsPusher() {
	go func() {
		ticker := time.NewTicker(500 * time.Millisecond)
		defer ticker.Stop()

		lastCount := -1
		for range ticker.C {
			var statusList []*state.TorrentStatus
			for _, t := range torr.ListTorrent() {
				statusList = append(statusList, t.Status())
			}

			currCount := len(statusList)
			if currCount > 0 || (lastCount > 0 && currCount == 0) {
				Broadcast(statusList)
			}
			lastCount = currCount
		}
	}()
}

func handleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.TLogln("ws upgrade error:", err)
		return
	}
	defer conn.Close()

	clientsMu.Lock()
	clients[conn] = true
	clientsMu.Unlock()
	log.TLogln("WebSocket client connected")

	var initial []*state.TorrentStatus
	for _, t := range torr.ListTorrent() {
		initial = append(initial, t.Status())
	}
	if len(initial) > 0 {
		conn.WriteJSON(gin.H{"type": "stats-update", "payload": gin.H{"torrents": initial}})
	}

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			clientsMu.Lock()
			delete(clients, conn)
			clientsMu.Unlock()
			log.TLogln("WebSocket client disconnected")
			break
		}
	}
}

func handleFileStats(c *gin.Context) {
	infoHashHex := c.Param("hash")
	idStr := c.Param("id")
	fileIdx, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file index"})
		return
	}

	infoHash := metainfo.NewHashFromHex(infoHashHex)
	t := torr.GetTorrent(infoHash)

	if t == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Torrent not in client"})
		return
	}

	if !t.GotInfo() {
		c.JSON(http.StatusNotFound, gin.H{"error": "Torrent info not ready"})
		return
	}

	storageClient, ok := torr.GetStorage().(*storage.FilePieceStorageClient)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Server is not using file-based storage"})
		return
	}

	filePath := storageClient.FilePath(infoHashHex, fileIdx)
	file, err := os.Open(filePath)
	if err != nil {
		files := t.Files()
		if fileIdx >= 0 && fileIdx < len(files) {
			targetFile := files[fileIdx]
			c.JSON(http.StatusOK, gin.H{"hash": nil, "size": targetFile.Length()})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found and metadata unavailable"})
		return
	}
	defer file.Close()

	hash, size, err := utils.OpenSubtitlesHash(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate hash"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"hash": hash, "size": size})
}

func Run() {
	StartStatsPusher()

	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(func(c *gin.Context) {
		start := time.Now()
		c.Next()
		latency := time.Since(start)
		log.TLogln(fmt.Sprintf("| %3d | %13v | %-7s | %s",
			c.Writer.Status(),
			latency,
			c.Request.Method,
			c.Request.URL.Path,
		))
	})

	router.POST("/torrents", torr.Torrents)
	router.GET("/stream/:hash/:id", torr.Stream)
	router.HEAD("/stream/:hash/:id", torr.Stream)
	router.GET("/ws", handleWebSocket)
	router.GET("/file-stats/:hash/:id", handleFileStats)
	router.GET("/", func(c *gin.Context) {
		c.String(http.StatusOK, "TorrServer Daemon: Core API is running")
	})

	port := settings.Get().Port
	log.TLogln(fmt.Sprintf("Starting daemon API server on port %d", port))

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", port),
		Handler: router,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.TLogln(fmt.Sprintf("Listen error: %s", err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.TLogln("Shutdown signal received, closing daemon...")
	torr.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.TLogln(fmt.Sprintf("Server Shutdown error: %s", err))
	}

	log.TLogln("Server exiting.")
}