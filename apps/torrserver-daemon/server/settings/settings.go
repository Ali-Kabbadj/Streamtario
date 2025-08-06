package settings

import (
	"os"
	"path/filepath"

	"server/log"
)

var (
	tdb      TorrServerDB
	Path     string
	ReadOnly bool
)

func Get() *BTSets {
	return BTsets
}

func InitSets(readOnly, searchWA bool) {
	ReadOnly = readOnly

	bboltDB := NewTDB()
	if bboltDB == nil {
		log.TLogln("Error open bboltDB:", filepath.Join(Path, "config.db"))
		os.Exit(1)
	}
	jsonDB := NewJsonDB()
	dbRouter := NewXPathDBRouter()
	dbRouter.RegisterRoute(jsonDB, "Settings")
	dbRouter.RegisterRoute(jsonDB, "Viewed")
	dbRouter.RegisterRoute(bboltDB, "Torrents")
	tdb = NewDBReadCache(dbRouter)
	loadBTSets()
}

func CloseDB() {
	tdb.CloseDB()
}
