//go:build !windows

package main

import (
	"log"
	"os/exec"
	"runtime"
)

func showErrorBox(title, message string) {
	log.Printf("[ERROR] %s: %s", title, message)
}

func getLibreMWindowHandle() uintptr {
	return 0
}

func minimizeDesktopWindow() {
	// Not applicable on headless / native web window
}

func toggleMaximizeDesktopWindow(isMaximized *bool) bool {
	*isMaximized = !*isMaximized
	return *isMaximized
}

func openDesktopWindow(targetURL string) {
	if runtime.GOOS == "darwin" {
		_ = exec.Command("open", targetURL).Start()
		return
	}
	// Linux / BSD
	_ = exec.Command("xdg-open", targetURL).Start()
}
