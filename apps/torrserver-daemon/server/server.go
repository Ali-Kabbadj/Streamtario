package server

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	"server/log"
	"server/settings"
	"server/torr"
)

func Run() {
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
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
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
			log.TLogln(fmt.Sprintf("Listen error: %s\n", err))
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