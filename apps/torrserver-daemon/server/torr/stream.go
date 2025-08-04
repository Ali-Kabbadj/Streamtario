package torr

import (
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"time"

	"github.com/anacrolix/dms/dlna"
	"github.com/anacrolix/missinggo/v2/httptoo"
	"github.com/anacrolix/torrent"

	mt "server/mimetype"
	sets "server/settings"
	"server/torr/state"
)

func (t *Torrent) Stream(fileID int, req *http.Request, resp http.ResponseWriter) error {
	if !t.GotInfo() {
		http.Error(resp, "Torrent metadata could not be retrieved. The torrent may be dead.", http.StatusNotFound)
		return errors.New("torrent don't get info")
	}

	// This logic correctly finds the file metadata based on the sorted index from Status()
	st := t.Status()
	var stFile *state.TorrentFileStat
	for _, fileStat := range st.FileStats {
		if fileStat.Id == fileID {
			stFile = fileStat
			break
		}
	}
	if stFile == nil {
		return fmt.Errorf("file with id %v not found in torrent status", fileID)
	}

	// Now, find the actual file object using its unique path.
	var fileToStream *torrent.File
	for _, f := range t.Files() {
		if f.Path() == stFile.Path {
			fileToStream = f
			break
		}
	}
	if fileToStream == nil {
		return fmt.Errorf("file with path %s not found in torrent", stFile.Path)
	}

	// THIS IS THE CRITICAL FIX:
	// Explicitly de-prioritize all other files in the torrent to prevent them from being downloaded.
	for _, f := range t.Files() {
		if f.Path() == fileToStream.Path() {
			// This is the file we want. Set its priority to normal to begin downloading.
			f.SetPriority(torrent.PiecePriorityNormal)
		} else {
			// We do not want this file. Set its priority to none to ignore it.
			f.SetPriority(torrent.PiecePriorityNone)
		}
	}

	reader := t.NewReader(fileToStream)
	if sets.Get().ResponsiveMode {
		reader.SetResponsive()
	}

	host, port, err := net.SplitHostPort(req.RemoteAddr)
	if sets.Get().EnableDebug {
		if err != nil {
			log.Println("Connect client")
		} else {
			log.Println("Connect client", host, port)
		}
	}

	sets.SetViewed(&sets.Viewed{Hash: t.Hash().HexString(), FileIndex: fileID})

	resp.Header().Set("Connection", "close")
	etag := hex.EncodeToString([]byte(fmt.Sprintf("%s/%s", t.Hash().HexString(), fileToStream.Path())))
	resp.Header().Set("ETag", httptoo.EncodeQuotedString(etag))
	resp.Header().Set("transferMode.dlna.org", "Streaming")
	mime, err := mt.ByPath(fileToStream.Path())
	if err == nil && mime.IsMedia() {
		resp.Header().Set("content-type", mime.String())
	}
	if req.Header.Get("getContentFeatures.dlna.org") != "" {
		resp.Header().Set("contentFeatures.dlna.org", dlna.ContentFeatures{
			SupportRange:    true,
			SupportTimeSeek: true,
		}.String())
	}

	http.ServeContent(resp, req, fileToStream.Path(), time.Unix(t.Timestamp, 0), reader)

	t.CloseReader(reader)
	if sets.Get().EnableDebug {
		if err != nil {
			log.Println("Disconnect client")
		} else {
			log.Println("Disconnect client", host, port)
		}
	}
	return nil
}