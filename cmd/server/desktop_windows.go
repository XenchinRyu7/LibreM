//go:build windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"time"
	"unsafe"
)

var (
	user32           = syscall.NewLazyDLL("user32.dll")
	showWindowProc   = user32.NewProc("ShowWindow")
	findWindowProc   = user32.NewProc("FindWindowW")
	getForegroundWin = user32.NewProc("GetForegroundWindow")
	messageBoxProc   = user32.NewProc("MessageBoxW")
)

const (
	swMinimize = 6
	swMaximize = 3
	swRestore  = 9
)

func showErrorBox(title, message string) {
	tPtr, _ := syscall.UTF16PtrFromString(title)
	mPtr, _ := syscall.UTF16PtrFromString(message)
	_, _, _ = messageBoxProc.Call(0, uintptr(unsafe.Pointer(mPtr)), uintptr(unsafe.Pointer(tPtr)), 0x10) // MB_ICONERROR
}

func getLibreMWindowHandle() uintptr {
	titlePtr, _ := syscall.UTF16PtrFromString("LibreM")
	hwnd, _, _ := findWindowProc.Call(0, uintptr(unsafe.Pointer(titlePtr)))
	if hwnd != 0 {
		return hwnd
	}
	hwnd, _, _ = getForegroundWin.Call()
	return hwnd
}

func minimizeDesktopWindow() {
	hwnd := getLibreMWindowHandle()
	if hwnd != 0 {
		showWindowProc.Call(hwnd, uintptr(swMinimize))
	}
}

func toggleMaximizeDesktopWindow(isMaximized *bool) bool {
	hwnd := getLibreMWindowHandle()
	if hwnd != 0 {
		if *isMaximized {
			showWindowProc.Call(hwnd, uintptr(swRestore))
			*isMaximized = false
		} else {
			showWindowProc.Call(hwnd, uintptr(swMaximize))
			*isMaximized = true
		}
	}
	return *isMaximized
}

// openDesktopWindow launches a dedicated chromeless application window on Windows
func openDesktopWindow(targetURL string) {
	// Dedicated isolated profile directory for LibreM (100% separated from OS Edge/Chrome profile)
	localApp := os.Getenv("LOCALAPPDATA")
	appData := os.Getenv("APPDATA")
	if appData == "" {
		appData = localApp
	}
	if appData == "" {
		appData = os.TempDir()
	}
	profileDir := filepath.Join(appData, "LibreM", "webview_data")
	defaultDir := filepath.Join(profileDir, "Default")
	_ = os.MkdirAll(defaultDir, 0755)

	// Pre-configure profile to completely suppress password manager, account sync, and Edge first-run
	prefPath := filepath.Join(defaultDir, "Preferences")
	prefs := `{"credentials_enable_service":false,"profile":{"password_manager_enabled":false},"signin":{"allowed":false},"sync":{"has_setup_completed":false,"suppress_first_run":true},"edge":{"sync":{"has_setup_completed":false,"enabled":false},"first_run":{"has_seen_fre":true}},"autofill":{"credit_card_enabled":false,"profile_enabled":false},"translate":{"enabled":false}}`
	_ = os.WriteFile(prefPath, []byte(prefs), 0644)

	appArgs := []string{
		fmt.Sprintf("--app=%s", targetURL),
		fmt.Sprintf("--user-data-dir=%s", profileDir),
		"--window-size=1280,820",
		"--app-id=LibreM",
		"--no-first-run",
		"--no-default-browser-check",
		"--disable-sync",
		"--guest",
		"--disable-save-password-bubble",
		"--disable-infobars",
		"--disable-notifications",
		"--disable-session-crashed-bubble",
		"--disable-features=EdgeSync,EdgeSignin,Translate,EdgeCollections,EdgeShopping,EdgeSplitWindow,msEdgeHub,msEdgeSidebarV2,PasswordManager,PasswordGeneration,OptimizationHints,PrivacySandboxSettings4,AutofillServerCommunication",
		"--password-store=basic",
		"--disable-component-update",
		"--disable-background-mode",
	}

	// 1. Try Microsoft Edge in standalone Application window mode
	edgePaths := []string{
		`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`,
		`C:\Program Files\Microsoft\Edge\Application\msedge.exe`,
	}
	for _, p := range edgePaths {
		if _, err := os.Stat(p); err == nil {
			cmd := exec.Command(p, appArgs...)
			if err := cmd.Start(); err == nil {
				go func() {
					start := time.Now()
					_ = cmd.Wait()
					if time.Since(start) > 2*time.Second {
						os.Exit(0)
					}
				}()
				return
			}
		}
	}

	// 2. Try Google Chrome in standalone Application window mode
	chromePaths := []string{
		`C:\Program Files\Google\Chrome\Application\chrome.exe`,
		`C:\Program Files\Google\Chrome\Application\chrome.exe`,
		filepath.Join(localApp, `Google\Chrome\Application\chrome.exe`),
	}
	for _, p := range chromePaths {
		if _, err := os.Stat(p); err == nil {
			cmd := exec.Command(p, appArgs...)
			if err := cmd.Start(); err == nil {
				go func() {
					start := time.Now()
					_ = cmd.Wait()
					if time.Since(start) > 2*time.Second {
						os.Exit(0)
					}
				}()
				return
			}
		}
	}

	// 3. Fallback to default browser
	exec.Command("rundll32", "url.dll,FileProtocolHandler", targetURL).Start()
}
