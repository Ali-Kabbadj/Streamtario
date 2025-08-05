package torr

import (
	"errors"
	"log"
	"net/http"
	"time"
)

func (t *Torrent) Stream(fileID int, req *http.Request, resp http.ResponseWriter) error {
	// Wait for metadata. This will be very fast because verification is disabled.
	if !t.GotInfo() {
		http.Error(resp, "Torrent metadata could not be retrieved.", http.StatusNotFound)
		return errors.New("torrent can't get info")
	}
	
	files := t.Files()
	if fileID < 0 || fileID >= len(files) {
		http.Error(resp, "File index out of bounds.", http.StatusBadRequest)
		return errors.New("file index out of bounds")
	}
	fileToStream := files[fileID]
	
	log.Println("Streaming from intelligent torrent reader:", fileToStream.Path())

	reader := t.NewReader(fileToStream)
	defer t.CloseReader(reader)
	
	// http.ServeContent handles seeking and range requests perfectly.
	http.ServeContent(resp, req, fileToStream.Path(), time.Unix(t.Timestamp, 0), reader)
	return nil
}