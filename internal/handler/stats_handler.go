package handler

import (
	"librem/internal/repository/postgres"

	"github.com/gofiber/fiber/v2"
)

type StatsHandler struct {
	settingRepo *postgres.SettingRepo
}

func NewStatsHandler(settingRepo *postgres.SettingRepo) *StatsHandler {
	return &StatsHandler{settingRepo: settingRepo}
}

func (h *StatsHandler) GetDashboard(c *fiber.Ctx) error {
	stats, err := h.settingRepo.GetDashboardStats(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(stats)
}

func (h *StatsHandler) GetLibraryInfo(c *fiber.Ctx) error {
	info, err := h.settingRepo.GetLibraryInfo(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(info)
}
