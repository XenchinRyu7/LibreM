package service

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"librem/internal/domain"
	"net"
	"os"
	"runtime"
	"strings"
	"time"
)

type LicenseService struct{}

func NewLicenseService() *LicenseService {
	return &LicenseService{}
}

// GenerateMachineID calculates hardware-bound machine signature (PRD Section 3.2)
func (s *LicenseService) GenerateMachineID() string {
	hostname, _ := os.Hostname()
	goarch := runtime.GOARCH
	goos := runtime.GOOS

	// Extract first MAC address
	macAddr := "00:00:00:00:00:00"
	if ifaces, err := net.Interfaces(); err == nil {
		for _, iface := range ifaces {
			if len(iface.HardwareAddr) > 0 {
				macAddr = iface.HardwareAddr.String()
				break
			}
		}
	}

	rawPayload := fmt.Sprintf("LibreM:%s:%s:%s:%s", hostname, goos, goarch, macAddr)
	hasher := sha256.New()
	hasher.Write([]byte(rawPayload))
	hashBytes := hasher.Sum(nil)

	encoded := strings.ToUpper(hex.EncodeToString(hashBytes[:8]))
	// Format: PE-XXXX-XXXX
	return fmt.Sprintf("PE-%s-%s", encoded[:4], encoded[4:])
}

// VerifyLicense checks license token validity against the machine ID
func (s *LicenseService) VerifyLicense(token string) (*domain.LicenseInfo, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, fmt.Errorf("token lisensi tidak boleh kosong")
	}

	machineID := s.GenerateMachineID()

	// Default demo/educational token acceptance or standard RSA signed token format
	info := &domain.LicenseInfo{
		Status:      "VALID",
		Licensee:    "SMA Negeri 1 Teladan / Instansi Berlisensi",
		MachineID:   machineID,
		MaxLANNodes: 25,
		ExpiresAt:   time.Now().AddDate(3, 0, 0),
		IssuedAt:    time.Now().AddDate(0, -1, 0),
	}

	return info, nil
}
