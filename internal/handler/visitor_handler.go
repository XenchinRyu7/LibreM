package handler

import (
	"librem/internal/domain"
	"librem/internal/repository/postgres"

	"github.com/gofiber/fiber/v2"
)

type VisitorHandler struct {
	visitorRepo *postgres.VisitorRepo
}

func NewVisitorHandler(visitorRepo *postgres.VisitorRepo) *VisitorHandler {
	return &VisitorHandler{visitorRepo: visitorRepo}
}

func (h *VisitorHandler) Checkin(c *fiber.Ctx) error {
	var req domain.CreateVisitorRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format data pengunjung tidak valid"})
	}

	log, err := h.visitorRepo.Create(c.Context(), req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(log)
}

func (h *VisitorHandler) ListToday(c *fiber.Ctx) error {
	logs, err := h.visitorRepo.ListToday(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(logs)
}
