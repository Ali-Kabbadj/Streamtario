package main

import (
	"fmt"
	"runtime"

	"server"
	"server/log"
	"server/settings"
	"server/torr"
	"server/version"
)

func main() {
	runtime.GOMAXPROCS(runtime.NumCPU())
	settings.Path = "."
	log.Init("", "")

	fmt.Println("=========== STARTING MINIMAL TORRSERVER DAEMON ===========")
	fmt.Printf("Version: %s, Go: %s, CPUs: %d\n", version.Version, runtime.Version(), runtime.NumCPU())

	settings.InitSets(false, false)
	torr.Init()
	server.Run()

	fmt.Println("=========== SHUTDOWN COMPLETE ===========")
}
