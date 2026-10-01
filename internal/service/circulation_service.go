package service

import (
	"context"
	"librem/internal/domain"
	"librem/internal/repository/postgres"
)

type CirculationService struct {
	circRepo *postgres.CirculationRepo
}

func NewCirculationService(circRepo *postgres.CirculationRepo) *CirculationService {
	return &CirculationService{circRepo: circRepo}
}

func (s *CirculationService) Checkout(ctx context.Context, memberID string, barcode string, staffUserID *int64) (*domain.Loan, error) {
	return s.circRepo.Checkout(ctx, memberID, barcode, staffUserID)
}

func (s *CirculationService) Checkin(ctx context.Context, barcode string, staffUserID *int64) (*domain.CheckinResponse, error) {
	return s.circRepo.Checkin(ctx, barcode, staffUserID)
}

func (s *CirculationService) Renew(ctx context.Context, loanID int64, staffUserID *int64) (*domain.Loan, error) {
	return s.circRepo.Renew(ctx, loanID, staffUserID)
}

func (s *CirculationService) GetActiveLoansByMember(ctx context.Context, memberID string) ([]domain.Loan, error) {
	return s.circRepo.GetActiveLoansByMember(ctx, memberID)
}

func (s *CirculationService) ListOverdues(ctx context.Context, page, limit int) ([]domain.Loan, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit
	return s.circRepo.ListOverdues(ctx, limit, offset)
}

func (s *CirculationService) ListFines(ctx context.Context, memberID string, page, limit int) ([]domain.FineLedger, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit
	return s.circRepo.ListFineLedgers(ctx, memberID, limit, offset)
}

func (s *CirculationService) PayFine(ctx context.Context, req domain.PayFineRequest, staffUserID *int64) (*domain.FineLedger, error) {
	return s.circRepo.PayFine(ctx, req, staffUserID)
}
