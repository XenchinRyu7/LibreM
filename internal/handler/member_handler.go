package handler

import (
	"librem/internal/domain"
	"librem/internal/service"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type MemberHandler struct {
	memberService *service.MemberService
}

func NewMemberHandler(memberService *service.MemberService) *MemberHandler {
	return &MemberHandler{memberService: memberService}
}

func (h *MemberHandler) ListMembers(c *fiber.Ctx) error {
	q := c.Query("q", "")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	members, total, err := h.memberService.ListMembers(c.Context(), q, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data": members,
		"meta": fiber.Map{
			"total_records": total,
			"page":          page,
			"limit":         limit,
		},
	})
}

func (h *MemberHandler) GetMember(c *fiber.Ctx) error {
	id := c.Params("id")
	member, err := h.memberService.GetMemberByID(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if member == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Anggota tidak ditemukan"})
	}
	return c.JSON(member)
}

func (h *MemberHandler) CreateMember(c *fiber.Ctx) error {
	var req domain.CreateMemberRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Data anggota tidak valid"})
	}

	member, err := h.memberService.CreateMember(c.Context(), req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(member)
}

func (h *MemberHandler) DeleteMember(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.memberService.DeleteMember(c.Context(), id); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Data anggota berhasil dihapus"})
}

func (h *MemberHandler) GetMemberTypes(c *fiber.Ctx) error {
	types, err := h.memberService.GetMemberTypes(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(types)
}
