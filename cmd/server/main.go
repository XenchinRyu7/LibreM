package main

import (
	"context"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"librem"
	"librem/config"
	"librem/internal/handler"
	"librem/internal/middleware"
	"librem/internal/repository/postgres"
	"librem/internal/service"
	"librem/pkg/database"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

type safeWriter struct {
	w io.Writer
}

func (s safeWriter) Write(p []byte) (n int, err error) {
	if s.w == nil {
		return len(p), nil
	}
	_, _ = s.w.Write(p)
	return len(p), nil // Never break the multiwriter pipeline on invalid handle
}

func setupLogging(appDir string) {
	localApp := os.Getenv("LOCALAPPDATA")
	if localApp == "" {
		localApp = os.Getenv("APPDATA")
	}
	appDataDir := filepath.Join(localApp, "LibreM")
	_ = os.MkdirAll(appDataDir, 0755)

	var writers []io.Writer

	// 1. Tulis ke AppData (selalu diizinkan untuk semua user tanpa UAC)
	if f1, err := os.OpenFile(filepath.Join(appDataDir, "librem.log"), os.O_CREATE|os.O_WRONLY|os.O_APPEND|os.O_SYNC, 0666); err == nil {
		writers = append(writers, f1)
	}

	// 2. Tulis ke direktori instalasi aplikasi jika diizinkan
	if appDir != "" && appDir != "." {
		if f2, err := os.OpenFile(filepath.Join(appDir, "librem.log"), os.O_CREATE|os.O_WRONLY|os.O_APPEND|os.O_SYNC, 0666); err == nil {
			writers = append(writers, f2)
		}
	}

	// 3. Tambahkan stdout secara aman
	writers = append(writers, safeWriter{w: os.Stdout})

	log.SetOutput(io.MultiWriter(writers...))
	log.Printf("==================================================")
	log.Printf(" LibreM Session Started: %s", time.Now().Format("2006-01-02 15:04:05"))
	log.Printf(" Application Directory  : %s", appDir)
	log.Printf(" AppData Directory      : %s", appDataDir)
	log.Printf("==================================================")
}

func main() {
	// 1. Tentukan direktori instalasi aplikasi (appDir) secara absolut
	appDir := "."
	if exePath, err := os.Executable(); err == nil {
		exeLower := strings.ToLower(exePath)
		if !strings.Contains(exeLower, "go-build") && !strings.Contains(exeLower, "temp") {
			appDir = filepath.Dir(exePath)
			_ = os.Chdir(appDir)
		}
	}

	setupLogging(appDir)

	serverMode := flag.Bool("server", false, "Jalankan dalam mode headless server (untuk server LAN)")
	portFlag := flag.String("port", "", "Override port server")
	flag.Parse()

	cfg := config.LoadConfig()
	if *portFlag != "" {
		cfg.AppPort = *portFlag
	}

	// 2. Inisialisasi & Jalankan Portable PostgreSQL (jika dibundle)
	pgManager, pgErr := database.StartPortablePostgres(appDir, cfg.DBPort)
	if pgErr != nil {
		errMsg := fmt.Sprintf("Gagal menjalankan engine PostgreSQL portable:\n%v\n\nPastikan engine PostgreSQL dapat berjalan dan port %s tidak diblokir.", pgErr, cfg.DBPort)
		log.Printf("Fatal: %s", errMsg)
		showErrorBox("LibreM Database Error", errMsg)
		os.Exit(1)
	}
	if pgManager != nil {
		defer pgManager.Stop()
	}

	// 3. Connect to PostgreSQL (baik portable maupun eksternal)
	pool, err := config.ConnectDB(cfg)
	if err != nil {
		errMsg := fmt.Sprintf("Gagal terhubung ke database PostgreSQL:\n%v\n\nPastikan engine PostgreSQL aktif pada port %s.", err, cfg.DBPort)
		log.Printf("Fatal: %s", errMsg)
		showErrorBox("LibreM Database Error", errMsg)
		os.Exit(1)
	}
	defer pool.Close()
	log.Println("✓ Connected to PostgreSQL")

	// 2. Auto-Migrate Database Schema & Master Seed Data
	if err := database.AutoMigrate(context.Background(), pool); err != nil {
		log.Printf("Peringatan auto-migrasi skema: %v", err)
	}

	// Repositories
	userRepo := postgres.NewUserRepo(pool)
	biblioRepo := postgres.NewBiblioRepo(pool)
	itemRepo := postgres.NewItemRepo(pool)
	memberRepo := postgres.NewMemberRepo(pool)
	circRepo := postgres.NewCirculationRepo(pool)
	settingRepo := postgres.NewSettingRepo(pool)
	visitorRepo := postgres.NewVisitorRepo(pool)

	// Services
	licenseService := service.NewLicenseService()
	authService := service.NewAuthService(userRepo, cfg)
	catalogService := service.NewCatalogService(biblioRepo, itemRepo)
	circService := service.NewCirculationService(circRepo)
	memberService := service.NewMemberService(memberRepo)
	setupService := service.NewSetupService(settingRepo, userRepo, licenseService, cfg)

	// Handlers
	authHandler := handler.NewAuthHandler(authService)
	catalogHandler := handler.NewCatalogHandler(catalogService)
	circHandler := handler.NewCirculationHandler(circService)
	memberHandler := handler.NewMemberHandler(memberService)
	setupHandler := handler.NewSetupHandler(setupService, licenseService)
	visitorHandler := handler.NewVisitorHandler(visitorRepo)
	statsHandler := handler.NewStatsHandler(settingRepo)

	// Initialize Fiber Web Engine
	app := fiber.New(fiber.Config{
		AppName:      "LibreM",
		ServerHeader: "LibreM/1.0.0",
		BodyLimit:    50 * 1024 * 1024, // 50MB
	})

	// Middlewares
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${latency} ${method} ${path}\n",
	}))
	app.Use(middleware.LANSchoolCORS())

	// Static uploads directory
	_ = os.MkdirAll(cfg.StoragePath, 0755)
	app.Static("/uploads", cfg.StoragePath)

	// API Routing
	api := app.Group("/api/v1")

	// 1. Setup & Licensing (Public)
	setupGroup := api.Group("/setup")
	setupGroup.Get("/status", setupHandler.GetStatus)
	setupGroup.Post("/verify-license", setupHandler.VerifyLicense)
	setupGroup.Post("/configure-db", setupHandler.ConfigureDB)
	setupGroup.Post("/branding", setupHandler.SetupBranding)
	setupGroup.Post("/init-superadmin", setupHandler.InitSuperadmin)

	// 2. Auth Routes
	api.Post("/auth/login", authHandler.Login)
	api.Get("/auth/me", middleware.Protected(authService), authHandler.Me)

	// 3. System Info & Dashboard
	api.Get("/stats/library-info", statsHandler.GetLibraryInfo)
	api.Get("/stats/dashboard", middleware.Protected(authService), statsHandler.GetDashboard)

	// 4. Catalog & OPAC (Public read for OPAC)
	api.Get("/catalog/biblios", catalogHandler.ListBiblios)
	api.Get("/catalog/biblios/:id", catalogHandler.GetBiblio)
	api.Get("/catalog/masters", catalogHandler.GetCatalogMasters)

	// Catalog management (Protected)
	catProtected := api.Group("/catalog", middleware.Protected(authService))
	catProtected.Post("/biblios", catalogHandler.CreateBiblio)
	catProtected.Delete("/biblios/:id", catalogHandler.DeleteBiblio)
	catProtected.Get("/items", catalogHandler.ListItems)
	catProtected.Get("/items/:barcode", catalogHandler.FindItemByBarcode)
	catProtected.Post("/items/batch", catalogHandler.BatchCreateItems)
	catProtected.Delete("/items/:id", catalogHandler.DeleteItem)

	// 5. Circulation Desk (Protected)
	circProtected := api.Group("/circulation", middleware.Protected(authService))
	circProtected.Post("/checkout", circHandler.Checkout)
	circProtected.Post("/checkin", circHandler.Checkin)
	circProtected.Post("/renew/:loan_id", circHandler.Renew)
	circProtected.Get("/loans/member/:member_id", circHandler.GetMemberLoans)
	circProtected.Get("/overdues", circHandler.ListOverdues)
	circProtected.Get("/fines", circHandler.ListFines)
	circProtected.Post("/pay-fine", circHandler.PayFine)

	// 6. Membership (Protected)
	memProtected := api.Group("/members", middleware.Protected(authService))
	memProtected.Get("", memberHandler.ListMembers)
	memProtected.Get("/types", memberHandler.GetMemberTypes)
	memProtected.Get("/:id", memberHandler.GetMember)
	memProtected.Post("", memberHandler.CreateMember)
	memProtected.Delete("/:id", memberHandler.DeleteMember)

	// 7. Visitor Kiosk (Buku Tamu - Public)
	api.Post("/visitors/checkin", visitorHandler.Checkin)
	api.Get("/visitors/today", visitorHandler.ListToday)

	// 8. Desktop Window Controls (Frameless TitleBar controls)
	var isMaximized bool
	api.Post("/window/minimize", func(c *fiber.Ctx) error {
		minimizeDesktopWindow()
		return c.JSON(fiber.Map{"status": "minimized"})
	})

	api.Post("/window/maximize", func(c *fiber.Ctx) error {
		maximized := toggleMaximizeDesktopWindow(&isMaximized)
		return c.JSON(fiber.Map{"status": "toggled", "maximized": maximized})
	})

	api.Post("/window/close", func(c *fiber.Ctx) error {
		go func() {
			time.Sleep(150 * time.Millisecond)
			os.Exit(0)
		}()
		return c.JSON(fiber.Map{"status": "closing"})
	})

	// Fallback status endpoint
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":     "healthy",
			"engine":     "LibreM Go Fiber Core",
			"machine_id": licenseService.GenerateMachineID(),
			"version":    "1.0.0",
		})
	})

	// Serve Single-Binary Embedded Frontend (with SPA fallback)
	app.Use("/", filesystem.New(filesystem.Config{
		Root:         librem.GetFrontendFileSystem(),
		Index:        "index.html",
		NotFoundFile: "index.html",
	}))

	addr := fmt.Sprintf("0.0.0.0:%s", cfg.AppPort)
	localURL := fmt.Sprintf("http://127.0.0.1:%s", cfg.AppPort)
	log.Printf("==================================================")
	log.Printf(" LibreM Core Server Listening on http://%s", addr)
	log.Printf(" Local Access: %s", localURL)
	log.Printf(" Machine ID  : %s", licenseService.GenerateMachineID())
	isHeadlessServer := *serverMode || runtime.GOOS != "windows" || os.Getenv("SERVER_MODE") == "true" || os.Getenv("HEADLESS") == "true"
	if isHeadlessServer {
		log.Printf(" Mode        : Headless Server")
	} else {
		log.Printf(" Mode        : Windows Desktop Application")
	}
	log.Printf("==================================================")

	// In Desktop Mode: Run background server and launch native window
	if !isHeadlessServer {
		// Run Fiber REST API engine in background
		go func() {
			if err := app.Listen(addr); err != nil {
				log.Printf("Background server status: %v", err)
			}
		}()

		// Polling aktif: Tunggu hingga server benar-benar merespon HTTP sebelum buka browser window
		serverReady := false
		client := &http.Client{Timeout: 500 * time.Millisecond}
		for i := 0; i < 60; i++ {
			resp, err := client.Get(localURL + "/api/v1/health")
			if err == nil && resp.StatusCode == http.StatusOK {
				_ = resp.Body.Close()
				serverReady = true
				break
			}
			if resp != nil {
				_ = resp.Body.Close()
			}
			time.Sleep(100 * time.Millisecond)
		}

		if !serverReady {
			errMsg := fmt.Sprintf("Gagal memulai backend LibreM pada %s.\nPeriksa librem.log untuk detail.", localURL)
			log.Printf("Fatal: %s", errMsg)
			showErrorBox("LibreM Startup Error", errMsg)
			os.Exit(1)
		}

		// Open dedicated chromeless desktop application window
		openDesktopWindow(localURL)

		// Block forever until window is closed (cmd.Wait triggers os.Exit)
		select {}
	}

	// In Headless Server Mode
	if err := app.Listen(addr); err != nil {
		log.Fatalf("Server stopped: %v", err)
	}
}


