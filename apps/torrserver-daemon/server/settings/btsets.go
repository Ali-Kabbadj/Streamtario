package settings

import (
	"encoding/json"
	"io"
	"io/fs"
	"path/filepath"
	"strings"

	"server/log"
	"server/version" // Assuming version is in its own package
)

type BTSets struct {
	// Cache
	CacheSize       int64 `json:"CacheSize"`
	ReaderReadAHead int   `json:"ReaderReadAHead"`
	PreloadCache    int   `json:"PreloadCache"`

	// Disk
	UseDisk           bool   `json:"UseDisk"`
	TorrentsSavePath  string `json:"TorrentsSavePath"`
	RemoveCacheOnDrop bool   `json:"RemoveCacheOnDrop"`

	// Torrent
	ForceEncrypt             bool `json:"ForceEncrypt"`
	RetrackersMode           int  `json:"RetrackersMode"`
	TorrentDisconnectTimeout int  `json:"TorrentDisconnectTimeout"`
	EnableDebug              bool `json:"EnableDebug"`

	// DLNA
	EnableDLNA   bool   `json:"EnableDLNA"`
	FriendlyName string `json:"FriendlyName"`

	// Rutor
	EnableRutorSearch bool `json:"EnableRutorSearch"`

	// BT Config
	EnableIPv6        bool `json:"EnableIPv6"`
	DisableTCP        bool `json:"DisableTCP"`
	DisableUTP        bool `json:"DisableUTP"`
	DisableUPNP       bool `json:"DisableUPNP"`
	DisableDHT        bool `json:"DisableDHT"`
	DisablePEX        bool `json:"DisablePEX"`
	DisableUpload     bool `json:"DisableUpload"`
	DownloadRateLimit int  `json:"DownloadRateLimit"`
	UploadRateLimit   int  `json:"UploadRateLimit"`
	ConnectionsLimit  int  `json:"ConnectionsLimit"`
	PeersListenPort   int  `json:"PeersListenPort"`

	// HTTPS
	SslPort int    `json:"SslPort"`
	SslCert string `json:"SslCert"`
	SslKey  string `json:"SslKey"`
	Port    int    `json:"Port"`

	// Reader
	ResponsiveMode bool `json:"ResponsiveMode"`
}

func (v *BTSets) String() string {
	buf, _ := json.Marshal(v)
	return string(buf)
}

var BTsets *BTSets

// getFactoryDefaults provides the hardcoded, initial state for the settings.
// This is now the single source of truth for default values.
func getFactoryDefaults() *BTSets {
	return &BTSets{
		Port:                     8090,
		CacheSize:                64 * 1024 * 1024, // 64 MB
		PreloadCache:             50,
		ConnectionsLimit:         25,
		RetrackersMode:           1,
		TorrentDisconnectTimeout: 30, // Lowered to 30s as per our successful tests
		ReaderReadAHead:          95, // 95%
		UseDisk:                  true,
		TorrentsSavePath:         "cache",
		FriendlyName:             "TorrServer " + version.Version,
	}
}

// saveToDB serializes the current global BTsets to the database.
func saveToDB() {
	if ReadOnly {
		return
	}
	buf, err := json.Marshal(BTsets)
	if err != nil {
		log.TLogln("Error marshaling BTsets for saving:", err)
		return
	}
	tdb.Set("Settings", "BitTorr", buf)
}

// applyFailsafes ensures that critical values are within a valid range.
func applyFailsafes(sets *BTSets) {
	if sets.CacheSize == 0 {
		sets.CacheSize = 64 * 1024 * 1024
	}
	if sets.ConnectionsLimit == 0 {
		sets.ConnectionsLimit = 25
	}
	if sets.TorrentDisconnectTimeout == 0 {
		sets.TorrentDisconnectTimeout = 30
	}
	if sets.ReaderReadAHead < 5 {
		sets.ReaderReadAHead = 5
	} else if sets.ReaderReadAHead > 100 {
		sets.ReaderReadAHead = 100
	}
	if sets.PreloadCache < 0 {
		sets.PreloadCache = 0
	} else if sets.PreloadCache > 100 {
		sets.PreloadCache = 100
	}
	if sets.TorrentsSavePath == "" {
		sets.UseDisk = false
	}
}

// loadBTSets is called by InitSets to populate the settings.
// It now correctly handles the "first run" scenario.
func loadBTSets() {
	buf := tdb.Get("Settings", "BitTorr")
	if len(buf) > 0 {
		// Settings exist in the database, so we load them.
		if err := json.Unmarshal(buf, &BTsets); err != nil {
			log.TLogln("Error unmarshaling btsets, falling back to defaults:", err)
			// If unmarshal fails, it's safer to start with defaults.
			BTsets = getFactoryDefaults()
			saveToDB() // Save the clean defaults to fix the corrupted entry.
		} else {
			log.TLogln("Successfully loaded settings from database.")
		}
	} else {
		// No settings found in the database (first run).
		log.TLogln("No settings found in database, creating and saving defaults.")
		BTsets = getFactoryDefaults()
		saveToDB()
	}
	// Always apply failsafes after loading or creating.
	applyFailsafes(BTsets)
}

// SetBTSets is called by the API to update settings.
func SetBTSets(sets *BTSets) {
	if ReadOnly {
		log.TLogln("Attempted to set settings in read-only mode.")
		return
	}

	applyFailsafes(sets)

	if sets.UseDisk {
		// This directory walk logic seems custom for finding a specific folder.
		// We'll keep it as it seems intentional for your setup.
		go filepath.WalkDir(sets.TorrentsSavePath, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if d.IsDir() && strings.ToLower(d.Name()) == ".tsc" {
				sets.TorrentsSavePath = path
				log.TLogln("Found directory \"" + sets.TorrentsSavePath + "\", using as cache dir")
				return io.EOF
			}
			if d.IsDir() && strings.HasPrefix(d.Name(), ".") {
				return filepath.SkipDir
			}
			return nil
		})
	}

	BTsets = sets
	saveToDB()
}

// SetDefaultConfig is called by the API to reset settings.
func SetDefaultConfig() {
	if ReadOnly {
		log.TLogln("Attempted to set default settings in read-only mode.")
		return
	}
	log.TLogln("Resetting settings to factory defaults.")
	BTsets = getFactoryDefaults()
	saveToDB()
}