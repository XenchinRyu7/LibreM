//go:build !windows

package database

import "os/exec"

func prepareCmdAttrs(cmd *exec.Cmd) {
	// Standard process execution for Unix platforms (Linux / macOS)
}
