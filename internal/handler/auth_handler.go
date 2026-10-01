package handler

import (
	"librem/internal/domain"
	"librem/internal/service"

	"github.com/gofiber/fiber/v2"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req domain.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Format data login tidak valid",
		})
	}

	ip := c.IP()
	resp, err := h.authService.Login(c.Context(), req.Username, req.Password, ip)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(resp)
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	userID := c.Locals("user_id")
	username := c.Locals("username")
	role := c.Locals("role")

	return c.JSON(fiber.Map{
		"user": fiber.Map{
			"id":       userID,
			"username": username,
			"role":     role,
		},
	})
}
