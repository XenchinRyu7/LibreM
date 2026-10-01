package postgres

import (
	"context"
	"librem/internal/domain"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type VisitorRepo struct {
	pool *pgxpool.Pool
}

func NewVisitorRepo(pool *pgxpool.Pool) *VisitorRepo {
	return &VisitorRepo{pool: pool}
}

func (r *VisitorRepo) Create(ctx context.Context, req domain.CreateVisitorRequest) (*domain.VisitorLog, error) {
	// If member_id is provided, try to fill name and institution
	name := req.VisitorName
	inst := req.Institution
	var memID *string

	if strings.TrimSpace(req.MemberID) != "" {
		mID := strings.TrimSpace(req.MemberID)
		memID = &mID
		var mName, mInst string
		err := r.pool.QueryRow(ctx, `SELECT full_name, COALESCE(institution, '') FROM members WHERE id = $1`, mID).Scan(&mName, &mInst)
		if err == nil {
			name = mName
			if inst == "" {
				inst = mInst
			}
		}
	}

	query := `
		INSERT INTO visitor_logs (member_id, visitor_name, institution, gender, purpose)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, checkin_time
	`
	var log domain.VisitorLog
	log.MemberID = memID
	log.VisitorName = name
	log.Institution = inst
	log.Gender = req.Gender
	log.Purpose = req.Purpose

	err := r.pool.QueryRow(ctx, query, memID, name, inst, req.Gender, req.Purpose).Scan(&log.ID, &log.CheckinTime)
	if err != nil {
		return nil, err
	}

	return &log, nil
}

func (r *VisitorRepo) ListToday(ctx context.Context) ([]domain.VisitorLog, error) {
	query := `
		SELECT id, member_id, visitor_name, COALESCE(institution, ''), COALESCE(gender, ''), COALESCE(purpose, ''), checkin_time
		FROM visitor_logs
		WHERE checkin_time::date = CURRENT_DATE
		ORDER BY checkin_time DESC
		LIMIT 100
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []domain.VisitorLog
	for rows.Next() {
		var l domain.VisitorLog
		var mID *string
		err := rows.Scan(&l.ID, &mID, &l.VisitorName, &l.Institution, &l.Gender, &l.Purpose, &l.CheckinTime)
		if err == nil {
			l.MemberID = mID
			logs = append(logs, l)
		}
	}
	return logs, nil
}
