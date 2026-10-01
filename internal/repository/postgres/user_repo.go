package postgres

import (
	"context"
	"errors"
	"librem/internal/domain"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepo struct {
	pool *pgxpool.Pool
}

func NewUserRepo(pool *pgxpool.Pool) *UserRepo {
	return &UserRepo{pool: pool}
}

func (r *UserRepo) FindByUsername(ctx context.Context, username string) (*domain.User, error) {
	query := `
		SELECT u.id, u.username, u.full_name, u.email, u.password_hash, u.role_id, 
		       r.name AS role_name, u.is_active, u.avatar_url, u.last_login_at, u.last_login_ip, 
		       u.created_at, u.updated_at
		FROM users u
		JOIN roles r ON u.role_id = r.id
		WHERE u.username = $1 LIMIT 1
	`
	row := r.pool.QueryRow(ctx, query, username)

	var u domain.User
	var avatar, ip *string
	var lastLogin *time.Time

	err := row.Scan(
		&u.ID, &u.Username, &u.FullName, &u.Email, &u.PasswordHash, &u.RoleID,
		&u.RoleName, &u.IsActive, &avatar, &lastLogin, &ip,
		&u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	if avatar != nil {
		u.AvatarURL = *avatar
	}
	if ip != nil {
		u.LastLoginIP = *ip
	}
	u.LastLoginAt = lastLogin

	return &u, nil
}

func (r *UserRepo) FindByID(ctx context.Context, id int64) (*domain.User, error) {
	query := `
		SELECT u.id, u.username, u.full_name, u.email, u.password_hash, u.role_id, 
		       r.name AS role_name, u.is_active, u.avatar_url, u.last_login_at, u.last_login_ip, 
		       u.created_at, u.updated_at
		FROM users u
		JOIN roles r ON u.role_id = r.id
		WHERE u.id = $1 LIMIT 1
	`
	row := r.pool.QueryRow(ctx, query, id)

	var u domain.User
	var avatar, ip *string
	var lastLogin *time.Time

	err := row.Scan(
		&u.ID, &u.Username, &u.FullName, &u.Email, &u.PasswordHash, &u.RoleID,
		&u.RoleName, &u.IsActive, &avatar, &lastLogin, &ip,
		&u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	if avatar != nil {
		u.AvatarURL = *avatar
	}
	if ip != nil {
		u.LastLoginIP = *ip
	}
	u.LastLoginAt = lastLogin

	return &u, nil
}

func (r *UserRepo) UpdateLastLogin(ctx context.Context, id int64, ip string) error {
	query := `UPDATE users SET last_login_at = NOW(), last_login_ip = $1 WHERE id = $2`
	_, err := r.pool.Exec(ctx, query, ip, id)
	return err
}

func (r *UserRepo) CreateSuperadmin(ctx context.Context, req domain.InitSuperadminRequest, passwordHash string) error {
	query := `
		INSERT INTO users (username, full_name, email, password_hash, role_id, is_active)
		VALUES ($1, $2, $3, $4, 1, TRUE)
		ON CONFLICT (username) DO UPDATE 
		SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, updated_at = NOW()
	`
	_, err := r.pool.Exec(ctx, query, req.Username, req.FullName, req.Email, passwordHash)
	return err
}
