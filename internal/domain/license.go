package domain

import (
	"time"
)

type SetupStatus struct {
	IsInitialized bool   `json:"is_initialized"`
	MachineID     string `json:"machine_id"`
	RequiredStep  string `json:"required_step"` // LICENSE_VERIFICATION, DB_CONFIG, BRANDING, ADMIN_SETUP, COMPLETED
	Version       string `json:"version"`
}

type LicenseVerificationRequest struct {
	LicenseToken string `json:"license_token"`
}

type LicenseInfo struct {
	Status      string    `json:"status"` // VALID, EXPIRED, INVALID_HARDWARE
	Licensee    string    `json:"licensee"`
	MachineID   string    `json:"machine_id"`
	MaxLANNodes int       `json:"max_lan_nodes"`
	ExpiresAt   time.Time `json:"expires_at"`
	IssuedAt    time.Time `json:"issued_at"`
}

type ConfigureDBRequest struct {
	Host     string `json:"host"`
	Port     string `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
	Database string `json:"database"`
	SSLMode  string `json:"ssl_mode"`
}

type BrandingSetupRequest struct {
	Name       string `json:"name"`
	SubName    string `json:"sub_name"`
	Address    string `json:"address"`
	Phone      string `json:"phone"`
	ThemeColor string `json:"theme_color"`
}

type InitSuperadminRequest struct {
	Username string `json:"username"`
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}
