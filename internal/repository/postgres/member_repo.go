package postgres

import (
	"context"
	"errors"
	"fmt"
	"librem/internal/domain"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MemberRepo struct {
	pool *pgxpool.Pool
}

func NewMemberRepo(pool *pgxpool.Pool) *MemberRepo {
	return &MemberRepo{pool: pool}
}

func (r *MemberRepo) List(ctx context.Context, queryStr string, limit, offset int) ([]domain.Member, int64, error) {
	var conditions []string
	var args []interface{}
	argIdx := 1

	if strings.TrimSpace(queryStr) != "" {
		conditions = append(conditions, fmt.Sprintf("(m.id ILIKE $%d OR m.full_name ILIKE $%d OR m.email ILIKE $%d OR m.institution ILIKE $%d)", argIdx, argIdx, argIdx, argIdx))
		args = append(args, "%"+strings.TrimSpace(queryStr)+"%")
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM members m %s`, whereClause)
	var totalRecords int64
	err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalRecords)
	if err != nil {
		return nil, 0, err
	}

	dataQuery := fmt.Sprintf(`
		SELECT m.id, m.full_name, COALESCE(m.gender, ''), m.birth_date::text,
		       m.member_type_id, mt.name AS member_type_name,
		       COALESCE(m.address, ''), COALESCE(m.email, ''), COALESCE(m.phone, ''),
		       COALESCE(m.institution, ''), COALESCE(m.avatar_url, ''),
		       m.register_date::text, m.expire_date::text, m.is_pending,
		       (m.expire_date < CURRENT_DATE) AS is_expired,
		       (SELECT COUNT(*) FROM loans l WHERE l.member_id = m.id AND l.is_return = FALSE) AS active_loans_count,
		       COALESCE((SELECT SUM(debit) - SUM(credit) FROM fine_ledgers f WHERE f.member_id = m.id), 0) AS unpaid_fine_balance,
		       COALESCE(m.notes, ''), m.created_at, m.updated_at
		FROM members m
		JOIN mst_member_types mt ON m.member_type_id = mt.id
		%s
		ORDER BY m.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var members []domain.Member
	for rows.Next() {
		var m domain.Member
		var birthDate *string
		err := rows.Scan(
			&m.ID, &m.FullName, &m.Gender, &birthDate,
			&m.MemberTypeID, &m.MemberTypeName,
			&m.Address, &m.Email, &m.Phone,
			&m.Institution, &m.AvatarURL,
			&m.RegisterDate, &m.ExpireDate, &m.IsPending,
			&m.IsExpired, &m.ActiveLoansCount, &m.UnpaidFineBalance,
			&m.Notes, &m.CreatedAt, &m.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		m.BirthDate = birthDate
		members = append(members, m)
	}

	return members, totalRecords, nil
}

func (r *MemberRepo) FindByID(ctx context.Context, id string) (*domain.Member, error) {
	query := `
		SELECT m.id, m.full_name, COALESCE(m.gender, ''), m.birth_date::text,
		       m.member_type_id, mt.name AS member_type_name,
		       COALESCE(m.address, ''), COALESCE(m.email, ''), COALESCE(m.phone, ''),
		       COALESCE(m.institution, ''), COALESCE(m.avatar_url, ''),
		       m.register_date::text, m.expire_date::text, m.is_pending,
		       (m.expire_date < CURRENT_DATE) AS is_expired,
		       (SELECT COUNT(*) FROM loans l WHERE l.member_id = m.id AND l.is_return = FALSE) AS active_loans_count,
		       COALESCE((SELECT SUM(debit) - SUM(credit) FROM fine_ledgers f WHERE f.member_id = m.id), 0) AS unpaid_fine_balance,
		       COALESCE(m.notes, ''), m.created_at, m.updated_at,
		       mt.loan_limit, mt.loan_periode_days, mt.reborrow_limit, mt.fine_each_day, mt.grace_periode_days
		FROM members m
		JOIN mst_member_types mt ON m.member_type_id = mt.id
		WHERE m.id = $1 LIMIT 1
	`
	var m domain.Member
	var birthDate *string
	var mt domain.MemberType

	err := r.pool.QueryRow(ctx, query, strings.TrimSpace(id)).Scan(
		&m.ID, &m.FullName, &m.Gender, &birthDate,
		&m.MemberTypeID, &m.MemberTypeName,
		&m.Address, &m.Email, &m.Phone,
		&m.Institution, &m.AvatarURL,
		&m.RegisterDate, &m.ExpireDate, &m.IsPending,
		&m.IsExpired, &m.ActiveLoansCount, &m.UnpaidFineBalance,
		&m.Notes, &m.CreatedAt, &m.UpdatedAt,
		&mt.LoanLimit, &mt.LoanPeriodeDays, &mt.ReborrowLimit, &mt.FineEachDay, &mt.GracePeriodeDays,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	m.BirthDate = birthDate
	mt.ID = m.MemberTypeID
	mt.Name = m.MemberTypeName
	m.MemberType = &mt

	return &m, nil
}

func (r *MemberRepo) Create(ctx context.Context, req domain.CreateMemberRequest) (*domain.Member, error) {
	// Look up membership duration
	var durationDays int
	err := r.pool.QueryRow(ctx, `SELECT membership_duration_days FROM mst_member_types WHERE id = $1`, req.MemberTypeID).Scan(&durationDays)
	if err != nil {
		durationDays = 365
	}

	expireDate := time.Now().AddDate(0, 0, durationDays).Format("2006-01-02")
	regDate := time.Now().Format("2006-01-02")

	query := `
		INSERT INTO members (
			id, full_name, gender, birth_date, member_type_id,
			address, email, phone, institution, register_date, expire_date, notes
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	_, err = r.pool.Exec(ctx, query,
		strings.TrimSpace(req.ID), req.FullName, req.Gender, req.BirthDate, req.MemberTypeID,
		req.Address, req.Email, req.Phone, req.Institution, regDate, expireDate, req.Notes,
	)
	if err != nil {
		return nil, err
	}

	return r.FindByID(ctx, req.ID)
}

func (r *MemberRepo) Delete(ctx context.Context, id string) error {
	var activeLoans int
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM loans WHERE member_id = $1 AND is_return = FALSE`, id).Scan(&activeLoans)
	if activeLoans > 0 {
		return errors.New("cannot delete member with active borrowed books")
	}

	_, err := r.pool.Exec(ctx, `DELETE FROM members WHERE id = $1`, id)
	return err
}

func (r *MemberRepo) GetMemberTypes(ctx context.Context) ([]domain.MemberType, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, name, loan_limit, loan_periode_days, reborrow_limit, fine_each_day, grace_periode_days, membership_duration_days, enable_reserve, reserve_limit, created_at FROM mst_member_types ORDER BY id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var types []domain.MemberType
	for rows.Next() {
		var t domain.MemberType
		err := rows.Scan(&t.ID, &t.Name, &t.LoanLimit, &t.LoanPeriodeDays, &t.ReborrowLimit, &t.FineEachDay, &t.GracePeriodeDays, &t.MembershipDurationDays, &t.EnableReserve, &t.ReserveLimit, &t.CreatedAt)
		if err == nil {
			types = append(types, t)
		}
	}
	return types, nil
}
