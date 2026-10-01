package handler

import (
	"librem/internal/domain"
	"librem/internal/service"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type CirculationHandler struct {
	circService *service.CirculationService
}

func NewCirculationHandler(circService *service.CirculationService) *CirculationHandler {
	return &CirculationHandler{circService: circService}
}

func (h *CirculationHandler) Checkout(c *fiber.Ctx) error {
	var req domain.CheckoutRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format permintaan sirkulasi tidak valid"})
	}

	var staffID *int64
	if uid, ok := c.Locals("user_id").(int64); ok {
		staffID = &uid
	}

	loan, err := h.circService.Checkout(c.Context(), req.MemberID, req.Barcode, staffID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(loan)
}

func (h *CirculationHandler) Checkin(c *fiber.Ctx) error {
	var req domain.CheckinRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format permintaan pengembalian tidak valid"})
	}

	var staffID *int64
	if uid, ok := c.Locals("user_id").(int64); ok {
		staffID = &uid
	}

	resp, err := h.circService.Checkin(c.Context(), req.Barcode, staffID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(resp)
}

func (h *CirculationHandler) Renew(c *fiber.Ctx) error {
	loanID, err := strconv.ParseInt(c.Params("loan_id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID pinjaman tidak valid"})
	}

	var staffID *int64
	if uid, ok := c.Locals("user_id").(int64); ok {
		staffID = &uid
	}

	loan, err := h.circService.Renew(c.Context(), loanID, staffID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(loan)
}

func (h *CirculationHandler) GetMemberLoans(c *fiber.Ctx) error {
	memberID := c.Params("member_id")
	loans, err := h.circService.GetActiveLoansByMember(c.Context(), memberID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(loans)
}

func (h *CirculationHandler) ListOverdues(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	loans, total, err := h.circService.ListOverdues(c.Context(), page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data": loans,
		"meta": fiber.Map{
			"total_records": total,
			"page":          page,
			"limit":         limit,
		},
	})
}

func (h *CirculationHandler) ListFines(c *fiber.Ctx) error {
	memberID := c.Query("member_id", "")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	fines, total, err := h.circService.ListFines(c.Context(), memberID, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data": fines,
		"meta": fiber.Map{
			"total_records": total,
			"page":          page,
			"limit":         limit,
		},
	})
}

func (h *CirculationHandler) PayFine(c *fiber.Ctx) error {
	var req domain.PayFineRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format pembayaran denda tidak valid"})
	}

	var staffID *int64
	if uid, ok := c.Locals("user_id").(int64); ok {
		staffID = &uid
	}

	fl, err := h.circService.PayFine(c.Context(), req, staffID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fl)
}
