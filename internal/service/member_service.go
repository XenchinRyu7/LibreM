package service

import (
	"context"
	"librem/internal/domain"
	"librem/internal/repository/postgres"
)

type MemberService struct {
	memberRepo *postgres.MemberRepo
}

func NewMemberService(memberRepo *postgres.MemberRepo) *MemberService {
	return &MemberService{memberRepo: memberRepo}
}

func (s *MemberService) ListMembers(ctx context.Context, q string, page, limit int) ([]domain.Member, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit
	return s.memberRepo.List(ctx, q, limit, offset)
}

func (s *MemberService) GetMemberByID(ctx context.Context, id string) (*domain.Member, error) {
	return s.memberRepo.FindByID(ctx, id)
}

func (s *MemberService) CreateMember(ctx context.Context, req domain.CreateMemberRequest) (*domain.Member, error) {
	return s.memberRepo.Create(ctx, req)
}

func (s *MemberService) DeleteMember(ctx context.Context, id string) error {
	return s.memberRepo.Delete(ctx, id)
}

func (s *MemberService) GetMemberTypes(ctx context.Context) ([]domain.MemberType, error) {
	return s.memberRepo.GetMemberTypes(ctx)
}
