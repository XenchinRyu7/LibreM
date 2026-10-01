package database

import (
	"context"
	"fmt"
	"log"
	"os"

	"librem/internal/repository/migrations"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

// AutoMigrate verifies and executes schema and seed migrations on the PostgreSQL database
func AutoMigrate(ctx context.Context, pool *pgxpool.Pool) error {
	var exists bool
	checkQuery := `
		SELECT EXISTS (
			SELECT 1 FROM information_schema.tables 
			WHERE table_schema = 'public' AND table_name = 'system_settings'
		);
	`
	err := pool.QueryRow(ctx, checkQuery).Scan(&exists)
	if err != nil {
		return fmt.Errorf("gagal memeriksa tabel database: %w", err)
	}

	if !exists {
		log.Println("⚡ Menjalankan auto-migrasi skema database LibreM...")
		if _, err := pool.Exec(ctx, migrations.SchemaSQL); err != nil {
			return fmt.Errorf("gagal migrasi skema database: %w", err)
		}
		log.Println("✓ Skema database LibreM berhasil diterapkan.")

		log.Println("🌱 Menjalankan data seeding awal LibreM...")
		if _, err := pool.Exec(ctx, migrations.SeedSQL); err != nil {
			return fmt.Errorf("gagal seeding data: %w", err)
		}
		log.Println("✓ Data seeding master berhasil diimpor.")
	}

	// Pastikan user postgres memiliki password sesuai konfigurasi DB_PASSWORD
	dbPass := os.Getenv("DB_PASSWORD")
	if dbPass != "" {
		_, _ = pool.Exec(ctx, fmt.Sprintf("ALTER USER postgres WITH PASSWORD '%s';", dbPass))
	}

	// Terapkan kustomisasi dari installer jika ada (.env)
	adminUser := os.Getenv("ADMIN_INITIAL_USERNAME")
	adminPass := os.Getenv("ADMIN_INITIAL_PASSWORD")
	schoolName := os.Getenv("SCHOOL_NAME")

	if adminUser == "" {
		adminUser = "admin"
	}
	if adminPass == "" {
		adminPass = "admin123"
	}

	// Update / create superadmin user
	hash, err := bcrypt.GenerateFromPassword([]byte(adminPass), bcrypt.DefaultCost)
	if err == nil {
		_, _ = pool.Exec(ctx, `
			INSERT INTO users (username, full_name, email, password_hash, role_id, is_active)
			VALUES ($1, 'Administrator Perpustakaan', 'admin@perpus.sch.id', $2, 1, TRUE)
			ON CONFLICT (username) DO UPDATE
			SET password_hash = EXCLUDED.password_hash, updated_at = NOW();
		`, adminUser, string(hash))
	}

	// Update school name if provided
	if schoolName != "" {
		infoJSON := fmt.Sprintf(`{"name": "%s", "sub_name": "Perpustakaan Digital", "address": "Jl. Pendidikan", "theme_color": "#004db6"}`, schoolName)
		_, _ = pool.Exec(ctx, `
			INSERT INTO system_settings (setting_key, setting_value, description)
			VALUES ('library_info', $1::jsonb, 'Profil perpustakaan')
			ON CONFLICT (setting_key) DO UPDATE
			SET setting_value = EXCLUDED.setting_value, updated_at = NOW();
		`, infoJSON)
	}

	return nil
}
