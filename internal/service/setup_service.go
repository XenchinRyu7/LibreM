package service

import (
	"context"
	"fmt"
	"librem/config"
	"librem/internal/domain"
	"librem/internal/repository/postgres"
	"os"

	"golang.org/x/crypto/bcrypt"
)

type SetupService struct {
	settingRepo    *postgres.SettingRepo
	userRepo       *postgres.UserRepo
	licenseService *LicenseService
	cfg            *config.Config
}

func NewSetupService(
	settingRepo *postgres.SettingRepo,
	userRepo *postgres.UserRepo,
	licenseService *LicenseService,
	cfg *config.Config,
) *SetupService {
	return &SetupService{
		settingRepo:    settingRepo,
		userRepo:       userRepo,
		licenseService: licenseService,
		cfg:            cfg,
	}
}

func (s *SetupService) GetStatus(ctx context.Context) *domain.SetupStatus {
	machineID := s.licenseService.GenerateMachineID()
	initialized := s.settingRepo.IsInitialized(ctx)

	requiredStep := "COMPLETED"
	if !initialized {
		requiredStep = "LICENSE_VERIFICATION"
	}

	return &domain.SetupStatus{
		IsInitialized: initialized,
		MachineID:     machineID,
		RequiredStep:  requiredStep,
		Version:       "1.0.0 (Bulian Edition)",
	}
}

func (s *SetupService) ConfigureDB(ctx context.Context, req domain.ConfigureDBRequest) error {
	// Write / update .env
	envContent := fmt.Sprintf(`PORT=%s
DB_HOST=%s
DB_PORT=%s
DB_USER=%s
DB_PASSWORD=%s
DB_NAME=%s
DB_SSLMODE=%s
JWT_SECRET=%s
STORAGE_PATH=%s
`, s.cfg.AppPort, req.Host, req.Port, req.User, req.Password, req.Database, req.SSLMode, s.cfg.JWTSecret, s.cfg.StoragePath)

	return os.WriteFile(".env", []byte(envContent), 0644)
}

func (s *SetupService) SetupBranding(ctx context.Context, req domain.BrandingSetupRequest) error {
	info := domain.LibraryInfo{
		Name:       req.Name,
		SubName:    req.SubName,
		Address:    req.Address,
		Phone:      req.Phone,
		ThemeColor: req.ThemeColor,
	}
	if info.ThemeColor == "" {
		info.ThemeColor = "#004db6"
	}
	return s.settingRepo.SaveLibraryInfo(ctx, info)
}

func (s *SetupService) InitSuperadmin(ctx context.Context, req domain.InitSuperadminRequest) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	err = s.userRepo.CreateSuperadmin(ctx, req, string(hash))
	if err != nil {
		return err
	}

	return s.settingRepo.SetInitialized(ctx)
}
