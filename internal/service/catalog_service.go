package service

import (
	"context"
	"librem/internal/domain"
	"librem/internal/repository/postgres"
)

type CatalogService struct {
	biblioRepo *postgres.BiblioRepo
	itemRepo   *postgres.ItemRepo
}

func NewCatalogService(biblioRepo *postgres.BiblioRepo, itemRepo *postgres.ItemRepo) *CatalogService {
	return &CatalogService{
		biblioRepo: biblioRepo,
		itemRepo:   itemRepo,
	}
}

func (s *CatalogService) ListBiblios(ctx context.Context, q string, page, limit int, classification string) ([]domain.Biblio, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit
	return s.biblioRepo.List(ctx, q, limit, offset, classification)
}

func (s *CatalogService) GetBiblioByID(ctx context.Context, id int64) (*domain.Biblio, error) {
	return s.biblioRepo.FindByID(ctx, id)
}

func (s *CatalogService) CreateBiblio(ctx context.Context, req domain.CreateBiblioRequest) (*domain.Biblio, error) {
	return s.biblioRepo.Create(ctx, req)
}

func (s *CatalogService) DeleteBiblio(ctx context.Context, id int64) error {
	return s.biblioRepo.Delete(ctx, id)
}

func (s *CatalogService) GetCatalogMasters(ctx context.Context) (map[string]interface{}, error) {
	bibMasters, err := s.biblioRepo.GetMasters(ctx)
	if err != nil {
		return nil, err
	}
	itemMasters, err := s.itemRepo.GetMasters(ctx)
	if err != nil {
		return nil, err
	}

	for k, v := range itemMasters {
		bibMasters[k] = v
	}
	return bibMasters, nil
}

func (s *CatalogService) ListItems(ctx context.Context, biblioID int64, q string, page, limit int) ([]domain.Item, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 25
	}
	offset := (page - 1) * limit
	return s.itemRepo.List(ctx, biblioID, q, limit, offset)
}

func (s *CatalogService) FindItemByBarcode(ctx context.Context, barcode string) (*domain.Item, error) {
	return s.itemRepo.FindByBarcode(ctx, barcode)
}

func (s *CatalogService) BatchCreateItems(ctx context.Context, req domain.BatchCreateItemsRequest) ([]domain.Item, error) {
	return s.itemRepo.BatchCreate(ctx, req)
}

func (s *CatalogService) DeleteItem(ctx context.Context, id int64) error {
	return s.itemRepo.Delete(ctx, id)
}
