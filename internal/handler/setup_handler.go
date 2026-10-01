package handler

import (
	"librem/internal/domain"
	"librem/internal/service"

	"github.com/gofiber/fiber/v2"
)

type SetupHandler struct {
	setupService   *service.SetupService
	licenseService *service.LicenseService
}

func NewSetupHandler(setupService *service.SetupService, licenseService *service.LicenseService) *SetupHandler {
	return &SetupHandler{
		setupService:   setupService,
		licenseService: licenseService,
	}
}

func (h *SetupHandler) GetStatus(c *fiber.Ctx) error {
	status := h.setupService.GetStatus(c.Context())
	return c.JSON(status)
}

func (h *SetupHandler) VerifyLicense(c *fiber.Ctx) error {
	var req domain.LicenseVerificationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format permintaan lisensi tidak valid"})
	}

	info, err := h.licenseService.VerifyLicense(req.LicenseToken)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(info)
}

func (h *SetupHandler) ConfigureDB(c *fiber.Ctx) error {
	var req domain.ConfigureDBRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format konfigurasi database tidak valid"})
	}

	if err := h.setupService.ConfigureDB(c.Context(), req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"db_connected": true,
		"migration":    "SUCCESS",
		"message":      "Konfigurasi database berhasil disimpan",
	})
}

func (h *SetupHandler) SetupBranding(c *fiber.Ctx) error {
	var req domain.BrandingSetupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format konfigurasi branding tidak valid"})
	}

	if err := h.setupService.SetupBranding(c.Context(), req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"branding_saved": true,
		"message":        "Identitas sekolah berhasil diperbarui",
	})
}

func (h *SetupHandler) InitSuperadmin(c *fiber.Ctx) error {
	var req domain.InitSuperadminRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format akun superadmin tidak valid"})
	}

	if err := h.setupService.InitSuperadmin(c.Context(), req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"setup_complete": true,
		"redirect":       "/login",
		"message":        "Inisialisasi sistem LibreM selesai! Silakan masuk ke aplikasi.",
	})
}
