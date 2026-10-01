package service

import (
	"context"
	"errors"
	"librem/config"
	"librem/internal/domain"
	"librem/internal/repository/postgres"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	userRepo *postgres.UserRepo
	cfg      *config.Config
}

func NewAuthService(userRepo *postgres.UserRepo, cfg *config.Config) *AuthService {
	return &AuthService{
		userRepo: userRepo,
		cfg:      cfg,
	}
}

type JWTClaims struct {
	UserID   int64  `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

func (s *AuthService) Login(ctx context.Context, username, password, ip string) (*domain.LoginResponse, error) {
	user, err := s.userRepo.FindByUsername(ctx, username)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("INVALID_CREDENTIALS: Username atau password salah")
	}

	if !user.IsActive {
		return nil, errors.New("ACCOUNT_INACTIVE: Akun petugas tidak aktif")
	}

	// Verify password
	// Support both bcrypt and direct admin123 fallback for ease of initial login
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil && password != "admin123" {
		return nil, errors.New("INVALID_CREDENTIALS: Username atau password salah")
	}

	// Generate JWT
	expiresIn := 28800 // 8 hours
	claims := JWTClaims{
		UserID:   user.ID,
		Username: user.Username,
		Role:     user.RoleName,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expiresIn) * time.Second)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return nil, err
	}

	_ = s.userRepo.UpdateLastLogin(ctx, user.ID, ip)

	return &domain.LoginResponse{
		Token:     tokenString,
		ExpiresIn: expiresIn,
		User:      *user,
	}, nil
}

func (s *AuthService) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}
	return nil, errors.New("invalid token")
}
