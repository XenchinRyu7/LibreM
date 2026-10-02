package service_test

import (
	"testing"
	"time"

	"librem/config"
	"librem/internal/service"

	"github.com/golang-jwt/jwt/v5"
)

func TestAuthService_ValidateToken(t *testing.T) {
	cfg := &config.Config{
		JWTSecret: "super-secret-test-key-32-bytes-long!",
	}
	authSvc := service.NewAuthService(nil, cfg)

	t.Run("Valid token succeeds", func(t *testing.T) {
		claims := service.JWTClaims{
			UserID:   1,
			Username: "admin",
			Role:     "SUPERADMIN",
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now()),
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, err := token.SignedString([]byte(cfg.JWTSecret))
		if err != nil {
			t.Fatalf("failed to sign token: %v", err)
		}

		parsed, err := authSvc.ValidateToken(tokenStr)
		if err != nil {
			t.Fatalf("expected valid token, got: %v", err)
		}
		if parsed.Username != "admin" {
			t.Errorf("expected username admin, got %s", parsed.Username)
		}
		if parsed.Role != "SUPERADMIN" {
			t.Errorf("expected role SUPERADMIN, got %s", parsed.Role)
		}
	})

	t.Run("Expired token fails", func(t *testing.T) {
		expiredClaims := service.JWTClaims{
			UserID:   1,
			Username: "admin",
			Role:     "SUPERADMIN",
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, expiredClaims)
		tokenStr, _ := token.SignedString([]byte(cfg.JWTSecret))

		_, err := authSvc.ValidateToken(tokenStr)
		if err == nil {
			t.Error("expected error for expired token, got nil")
		}
	})

	t.Run("Wrong signing secret fails", func(t *testing.T) {
		claims := service.JWTClaims{
			UserID:   1,
			Username: "admin",
			Role:     "SUPERADMIN",
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, _ := token.SignedString([]byte("wrong-secret-key-attacker"))

		_, err := authSvc.ValidateToken(tokenStr)
		if err == nil {
			t.Error("expected signature error for wrong secret, got nil")
		}
	})
}
