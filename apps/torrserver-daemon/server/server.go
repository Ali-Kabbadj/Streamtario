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
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	log "log"
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
			log.Printf("ws write error:", err)
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
		log.Printf("ws upgrade error:", err)
		return
	}
	defer conn.Close()

	clientsMu.Lock()
	clients[conn] = true
	clientsMu.Unlock()
	log.Printf("WebSocket client connected")

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
			log.Printf("WebSocket client disconnected")
			break
		}
	}
}


func handleFileStats(c *gin.Context) {
	infoHashHex := c.Param("hash")
	idStr := c.Param("id")
	fileIdx, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": gin.H{
			"type":        "BAD_REQUEST",
			"dev_message": "Invalid file index parameter",
			"ui_message":  "An internal error occurred (invalid file index).",
		}})
		return
	}

	infoHash := metainfo.NewHashFromHex(infoHashHex)
	t := torr.GetTorrent(infoHash)

	if t == nil {
		c.JSON(http.StatusNotFound, gin.H{"ok": false, "error": gin.H{
			"type":        "TORRENT_NOT_FOUND",
			"dev_message": "Torrent not found in client for hash: " + infoHashHex,
			"ui_message":  "The requested stream could not be found.",
		}})
		return
	}

	if !t.GotInfo() {
		log.Printf("[FILE-STATS] Waiting for metadata for hash: %s...", infoHashHex)
		if !t.WaitInfo() {
			log.Printf("[FILE-STATS] Failed to get metadata for hash: %s", infoHashHex)
			c.JSON(http.StatusNotFound, gin.H{"ok": false, "error": gin.H{
				"type":        "METADATA_TIMEOUT",
				"dev_message": "Timed out waiting for torrent metadata.",
				"ui_message":  "Could not retrieve stream details in time.",
			}})
			return
		}
		log.Printf("[FILE-STATS] Metadata is now ready for hash: %s. Proceeding.", infoHashHex)
	}

	storageClient, ok := torr.GetStorage().(*storage.FilePieceStorageClient)
	if !ok {
		files := t.Files()
		if fileIdx >= 0 && fileIdx < len(files) {
			targetFile := files[fileIdx]
			log.Printf("[FILE-STATS] Non-file storage, returning size from metadata for %s/%d", infoHashHex, fileIdx)
			c.JSON(http.StatusOK, gin.H{"ok": true, "data": gin.H{"hash": nil, "size": targetFile.Length()}})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": gin.H{
			"type":        "STORAGE_ERROR",
			"dev_message": "Server is not using file-based storage and metadata is inconsistent.",
			"ui_message":  "An internal server error occurred.",
		}})
		return
	}

	filePath := storageClient.FilePath(infoHashHex, fileIdx)
	file, err := os.Open(filePath)
	if err != nil {
		files := t.Files()
		if fileIdx >= 0 && fileIdx < len(files) {
			targetFile := files[fileIdx]
			log.Printf("[FILE-STATS] File not on disk, returning size from metadata for %s/%d", infoHashHex, fileIdx)
			c.JSON(http.StatusOK, gin.H{"ok": true, "data": gin.H{"hash": nil, "size": targetFile.Length()}})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"ok": false, "error": gin.H{
			"type":        "FILE_NOT_FOUND",
			"dev_message": "File not found on disk and metadata is unavailable for the given index.",
			"ui_message":  "The requested video file could not be found.",
		}})
		return
	}
	defer file.Close()

	hash, size, err := utils.OpenSubtitlesHash(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": gin.H{
			"type":        "HASHING_ERROR",
			"dev_message": "Failed to calculate OpenSubtitles hash for the file.",
			"ui_message":  "An internal error occurred while processing the video file.",
		}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true, "data": gin.H{"hash": hash, "size": size}})
}

func Run() {
	StartStatsPusher()

	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery())

	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"https://localhost:3000", "https://streamtario.app"},
		AllowMethods:     []string{"GET", "POST", "HEAD", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	router.Use(func(c *gin.Context) {
		start := time.Now()
		c.Next()
		latency := time.Since(start)
		log.Printf(fmt.Sprintf("| %3d | %13v | %-7s | %s",
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

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "ok"}})
	})

	router.GET("/", func(c *gin.Context) {
		c.String(http.StatusOK, "TorrServer Daemon: Core API is running")
	})

	port := settings.Get().Port
	log.Printf(fmt.Sprintf("Starting daemon API server on port %d", port))

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", port),
		Handler: router,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf(fmt.Sprintf("Listen error: %s", err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Printf("Shutdown signal received, closing daemon...")
	torr.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf(fmt.Sprintf("Server Shutdown error: %s", err))
	}

	log.Printf("Server exiting.")
}