//go:build windows

package database

import (
	"os/exec"
	"syscall"
	"unsafe"
)

var (
	advapi32              = syscall.NewLazyDLL("advapi32.dll")
	createRestrictedToken = advapi32.NewProc("CreateRestrictedToken")
)

// getRestrictedToken creates a restricted token where Administrator privileges are stripped,
// allowing PostgreSQL to start without complaining about running as Administrator.
func getRestrictedToken() (syscall.Token, error) {
	var currentToken syscall.Token
	hProcess, _ := syscall.GetCurrentProcess()
	err := syscall.OpenProcessToken(hProcess, syscall.TOKEN_DUPLICATE|syscall.TOKEN_QUERY|syscall.TOKEN_ASSIGN_PRIMARY, &currentToken)
	if err != nil {
		return 0, err
	}
	defer currentToken.Close()

	var restrictedToken syscall.Token
	// Flags: 1 = DISABLE_MAX_PRIVILEGE (drops Administrator group and all elevation privileges)
	r1, _, err := createRestrictedToken.Call(
		uintptr(currentToken),
		1,
		0, 0,
		0, 0,
		0, 0,
		uintptr(unsafe.Pointer(&restrictedToken)),
	)
	if r1 == 0 {
		return 0, err
	}
	return restrictedToken, nil
}

func prepareCmdAttrs(cmd *exec.Cmd) {
	procAttr := &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: 0x08000000, // CREATE_NO_WINDOW
	}
	if tok, err := getRestrictedToken(); err == nil && tok != 0 {
		procAttr.Token = tok
	}
	cmd.SysProcAttr = procAttr
}
