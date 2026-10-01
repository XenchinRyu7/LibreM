package handler

import (
	"librem/internal/domain"
	"librem/internal/service"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type CatalogHandler struct {
	catalogService *service.CatalogService
}

func NewCatalogHandler(catalogService *service.CatalogService) *CatalogHandler {
	return &CatalogHandler{catalogService: catalogService}
}

func (h *CatalogHandler) ListBiblios(c *fiber.Ctx) error {
	q := c.Query("q", "")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	class := c.Query("classification", "")

	biblios, total, err := h.catalogService.ListBiblios(c.Context(), q, page, limit, class)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	totalPages := int(total) / limit
	if int(total)%limit != 0 {
		totalPages++
	}

	return c.JSON(fiber.Map{
		"data": biblios,
		"meta": fiber.Map{
			"total_records": total,
			"page":          page,
			"limit":         limit,
			"total_pages":   totalPages,
		},
	})
}

func (h *CatalogHandler) GetBiblio(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID bibliografi tidak valid"})
	}

	biblio, err := h.catalogService.GetBiblioByID(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if biblio == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Bibliografi tidak ditemukan"})
	}

	return c.JSON(biblio)
}

func (h *CatalogHandler) CreateBiblio(c *fiber.Ctx) error {
	var req domain.CreateBiblioRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Data bibliografi tidak valid"})
	}

	biblio, err := h.catalogService.CreateBiblio(c.Context(), req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(biblio)
}

func (h *CatalogHandler) DeleteBiblio(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID tidak valid"})
	}

	if err := h.catalogService.DeleteBiblio(c.Context(), id); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Bibliografi berhasil dihapus"})
}

func (h *CatalogHandler) GetCatalogMasters(c *fiber.Ctx) error {
	masters, err := h.catalogService.GetCatalogMasters(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(masters)
}

func (h *CatalogHandler) ListItems(c *fiber.Ctx) error {
	biblioID, _ := strconv.ParseInt(c.Query("biblio_id", "0"), 10, 64)
	q := c.Query("q", "")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "25"))

	items, total, err := h.catalogService.ListItems(c.Context(), biblioID, q, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data": items,
		"meta": fiber.Map{
			"total_records": total,
			"page":          page,
			"limit":         limit,
		},
	})
}

func (h *CatalogHandler) FindItemByBarcode(c *fiber.Ctx) error {
	barcode := c.Params("barcode")
	item, err := h.catalogService.FindItemByBarcode(c.Context(), barcode)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if item == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Barcode item tidak ditemukan"})
	}
	return c.JSON(item)
}

func (h *CatalogHandler) BatchCreateItems(c *fiber.Ctx) error {
	var req domain.BatchCreateItemsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Data item tidak valid"})
	}

	items, err := h.catalogService.BatchCreateItems(c.Context(), req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"generated_items": items,
		"total_created":   len(items),
	})
}

func (h *CatalogHandler) DeleteItem(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID tidak valid"})
	}

	if err := h.catalogService.DeleteItem(c.Context(), id); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Item eksemplar berhasil dihapus"})
}
