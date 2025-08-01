package mimetype

import (
	"log"
	"mime"
	"net/http"
	"os"
	"path"
	"strings"
)

func init() {
	for _, t := range []struct {
		mimeType   string
		extensions string
	}{
		{"image/bmp", ".bmp"},
		{"image/gif", ".gif"},
		{"image/jpeg", ".jpg,.jpeg"},
		{"image/png", ".png"},
		{"image/tiff", ".tiff,.tif"},
		{"audio/x-aac", ".aac"},
		{"audio/dsd", ".dsd,.dsf,.dff"},
		{"audio/flac", ".flac"},
		{"audio/mpeg", ".mpga,.mpega,.mp2,.mp3,.m4a"},
		{"audio/ogg", ".oga,.ogg,.opus,.spx"},
		{"audio/opus", ".opus"},
		{"audio/weba", ".weba"},
		{"audio/x-ape", ".ape"},
		{"audio/x-wav", ".wav"},
		{"video/dv", ".dif,.dv"},
		{"video/fli", ".fli"},
		{"video/mp4", ".mp4"},
		{"video/mpeg", ".mpeg,.mpg,.mpe"},
		{"video/x-matroska", ".mpv,.mkv"},
		{"video/mp2t", ".ts,.m2ts,.mts"},
		{"video/ogg", ".ogv"},
		{"video/webm", ".webm"},
		{"video/x-ms-vob", ".vob"},
		{"video/x-msvideo", ".avi"},
		{"video/x-quicktime", ".qt,.mov"},
		{"text/srt", ".srt"},
		{"text/smi", ".smi"},
		{"text/ssa", ".ssa"},
	} {
		for _, ext := range strings.Split(t.extensions, ",") {
			err := mime.AddExtensionType(ext, t.mimeType)
			if err != nil {
				panic(err)
			}
		}
	}
	if err := mime.AddExtensionType(".rmvb", "application/vnd.rn-realmedia-vbr"); err != nil {
		log.Printf("Could not register application/vnd.rn-realmedia-vbr MIME type: %s", err)
	}
}

type MimeType string

func (mt MimeType) IsMedia() bool {
	return mt.IsVideo() || mt.IsAudio() || mt.IsImage()
}

func (mt MimeType) IsVideo() bool {
	return strings.HasPrefix(string(mt), "video/") || mt == "application/vnd.rn-realmedia-vbr"
}

func (mt MimeType) IsAudio() bool {
	return strings.HasPrefix(string(mt), "audio/")
}

func (mt MimeType) IsImage() bool {
	return strings.HasPrefix(string(mt), "image/")
}

func (mt MimeType) IsSub() bool {
	return strings.HasPrefix(string(mt), "text/srt") || strings.HasPrefix(string(mt), "text/smi") || strings.HasPrefix(string(mt), "text/ssa")
}

func (mt MimeType) Type() string {
	return strings.SplitN(string(mt), "/", 2)[0]
}

func (mt MimeType) String() string {
	return string(mt)
}

// ByPath gets the mime type for a given path.
// It first checks the file extension, and if that fails it sniffs the content.
func ByPath(filePath string) (ret MimeType, err error) {
	ret = mimeTypeByBaseName(path.Base(filePath))
	if ret == "" {
		ret, err = mimeTypeByContent(filePath)
	}
	switch ret {
		case "video/mp2t":
			ret = "video/mpeg"
		case "video/x-matroska":
			ret = "video/mpeg"
		case "video/x-msvideo":
			ret = "video/avi"
		case "":
			ret = "application/octet-stream"
	}
	return
}

func mimeTypeByBaseName(name string) MimeType {
	name = strings.TrimSuffix(name, ".part")
	ext := path.Ext(name)
	if ext != "" {
		return MimeType(mime.TypeByExtension(ext))
	}
	return MimeType("")
}

func mimeTypeByContent(path string) (ret MimeType, err error) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()
	var data [512]byte
	if n, err := file.Read(data[:]); err == nil {
		ret = MimeType(http.DetectContentType(data[:n]))
	}
	return
}

