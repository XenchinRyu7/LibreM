package librem

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed all:frontend/dist
var FrontendFS embed.FS

func GetFrontendFileSystem() http.FileSystem {
	return http.FS(GetFrontendSubFS())
}

func GetFrontendSubFS() fs.FS {
	subFS, err := fs.Sub(FrontendFS, "frontend/dist")
	if err != nil {
		panic(err)
	}
	return subFS
}
