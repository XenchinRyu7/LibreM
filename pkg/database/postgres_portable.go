package database

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"time"
	"unsafe"

	"github.com/jackc/pgx/v5"
)

var (
	advapi32              = syscall.NewLazyDLL("advapi32.dll")
	createRestrictedToken = advapi32.NewProc("CreateRestrictedToken")
)

// getRestrictedToken creates a restricted token where Administrator privileges are stripped,
// allowing PostgreSQL to start without complaining about running as Administrator.
func getRestrictedToken() (syscall.Token, error) {
	var currentToken syscall.Token
	hProcess, _ := syscall.GetCurrentProcess()
	err := syscall.OpenProcessToken(hProcess, syscall.TOKEN_DUPLICATE|syscall.TOKEN_QUERY|syscall.TOKEN_ASSIGN_PRIMARY, &currentToken)
	if err != nil {
		return 0, err
	}
	defer currentToken.Close()

	var restrictedToken syscall.Token
	// Flags: 1 = DISABLE_MAX_PRIVILEGE (drops Administrator group and all elevation privileges)
	r1, _, err := createRestrictedToken.Call(
		uintptr(currentToken),
		1,
		0, 0,
		0, 0,
		0, 0,
		uintptr(unsafe.Pointer(&restrictedToken)),
	)
	if r1 == 0 {
		return 0, err
	}
	return restrictedToken, nil
}

// PortablePostgres manages the embedded PostgreSQL child process
type PortablePostgres struct {
	cmd     *exec.Cmd
	DataDir string
	Port    string
	BinDir  string
}

// resolveDataDir determines a safely writable directory for PostgreSQL cluster
func resolveDataDir(baseDir string) string {
	dataDir := filepath.Join(baseDir, "pgdata")
	_ = os.MkdirAll(dataDir, 0755)

	// Check if directory is actually writable
	testFile := filepath.Join(dataDir, ".perm_test")
	if err := os.WriteFile(testFile, []byte("ok"), 0644); err == nil {
		_ = os.Remove(testFile)
		return dataDir
	}

	// Fallback to %LOCALAPPDATA%\LibreM\pgdata if Program Files or permission denied
	localApp := os.Getenv("LOCALAPPDATA")
	if localApp == "" {
		localApp = os.Getenv("APPDATA")
	}
	if localApp != "" {
		appDataDir := filepath.Join(localApp, "LibreM", "pgdata")
		_ = os.MkdirAll(appDataDir, 0755)
		return appDataDir
	}

	return dataDir
}

// StartPortablePostgres initializes and starts the embedded PostgreSQL engine silently
func StartPortablePostgres(baseDir string, port string) (*PortablePostgres, error) {
	if baseDir == "" {
		baseDir = "."
	}

	pgsqlDir := filepath.Join(baseDir, "pgsql")
	binDir := filepath.Join(pgsqlDir, "bin")
	dataDir := resolveDataDir(baseDir)
	initdbExe := filepath.Join(binDir, "initdb.exe")
	postgresExe := filepath.Join(binDir, "postgres.exe")

	// If portable postgres binary does not exist, assume external database
	if _, err := os.Stat(postgresExe); os.IsNotExist(err) {
		log.Printf("ℹ Portable PostgreSQL tidak ditemukan di %s. Menggunakan koneksi database eksternal.", postgresExe)
		return nil, nil
	}

	// 0. Cek apakah PostgreSQL sudah aktif di port tersebut (misal PostgreSQL lokal saat mode dev)
	conn, err := net.DialTimeout("tcp", "127.0.0.1:"+port, 300*time.Millisecond)
	if err == nil {
		_ = conn.Close()
		log.Printf("✓ PostgreSQL sudah aktif di port %s. Menggunakan database lokal yang sedang berjalan (mode dev).", port)
		return nil, nil
	}

	// Hapus file pid stale jika database tidak sedang berjalan
	pidFile := filepath.Join(dataDir, "postmaster.pid")
	if _, err := os.Stat(pidFile); err == nil {
		_ = os.Remove(pidFile)
	}

	// Buat restricted token jika proses ini memiliki hak Administrator
	var tok syscall.Token
	if rTok, err := getRestrictedToken(); err == nil {
		tok = rTok
	}

	// 1. Inisialisasi Database jika folder data belum ada
	pgVersionFile := filepath.Join(dataDir, "PG_VERSION")
	if _, err := os.Stat(pgVersionFile); os.IsNotExist(err) {
		log.Println("⚡ Menginisialisasi cluster database PostgreSQL portable...")
		_ = os.MkdirAll(dataDir, 0755)

		initCmd := exec.Command(initdbExe, "-D", dataDir, "-U", "postgres", "--auth=trust", "--encoding=UTF8", "--locale=C")
		initProcAttr := &syscall.SysProcAttr{
			HideWindow:    true,
			CreationFlags: 0x08000000, // CREATE_NO_WINDOW
		}
		if tok != 0 {
			initProcAttr.Token = tok
		}
		initCmd.SysProcAttr = initProcAttr

		out, err := initCmd.CombinedOutput()
		if err != nil {
			log.Printf("Error initdb: %v, output: %s", err, string(out))
			return nil, fmt.Errorf("gagal initdb: %w", err)
		}
		log.Println("✓ Inisialisasi PostgreSQL cluster selesai.")
	}

	// 2. Jalankan PostgreSQL sebagai Child Process Go dengan token ter-restriksi
	log.Printf("🚀 Menjalankan engine PostgreSQL portable pada port %s (Data: %s)...", port, dataDir)
	pgCmd := exec.Command(postgresExe, "-D", dataDir, "-p", port)
	sysProcAttr := &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: 0x08000000, // CREATE_NO_WINDOW
	}
	if tok != 0 {
		sysProcAttr.Token = tok
	}
	pgCmd.SysProcAttr = sysProcAttr

	// Redirect output log postgres
	pgLogPath := filepath.Join(dataDir, "postgres.log")
	pgLogFile, err := os.OpenFile(pgLogPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err == nil {
		pgCmd.Stdout = pgLogFile
		pgCmd.Stderr = pgLogFile
		defer pgLogFile.Close()
	}

	if err := pgCmd.Start(); err != nil {
		return nil, fmt.Errorf("gagal menjalankan postgres.exe: %w", err)
	}

	portable := &PortablePostgres{
		cmd:     pgCmd,
		DataDir: dataDir,
		Port:    port,
		BinDir:  binDir,
	}

	// 3. Tunggu hingga PostgreSQL siap menerima koneksi (TCP poll max 15 detik)
	ready := false
	for i := 0; i < 30; i++ {
		conn, err := net.DialTimeout("tcp", "127.0.0.1:"+port, 500*time.Millisecond)
		if err == nil {
			_ = conn.Close()
			ready = true
			break
		}
		time.Sleep(500 * time.Millisecond)
	}

	if !ready {
		logOut, _ := os.ReadFile(pgLogPath)
		portable.Stop()
		return nil, fmt.Errorf("timeout menunggu PostgreSQL portable siap pada port %s:\n%s", port, string(logOut))
	}

	log.Printf("✓ Engine PostgreSQL portable aktif dan siap pada port %s.", port)

	// 4. Pastikan database librem_db sudah dibuat
	ensureDatabaseExists(port, "librem_db")

	return portable, nil
}

// Stop menghentikan proses PostgreSQL dengan aman dan cepat
func (p *PortablePostgres) Stop() {
	if p == nil || p.cmd == nil || p.cmd.Process == nil {
		return
	}

	log.Println("🛑 Menghentikan engine PostgreSQL portable...")
	pgctlExe := filepath.Join(p.BinDir, "pg_ctl.exe")
	if _, err := os.Stat(pgctlExe); err == nil {
		stopCmd := exec.Command(pgctlExe, "stop", "-D", p.DataDir, "-m", "fast")
		stopCmd.SysProcAttr = &syscall.SysProcAttr{
			HideWindow:    true,
			CreationFlags: 0x08000000, // CREATE_NO_WINDOW
		}
		_ = stopCmd.Run()
	}

	_ = p.cmd.Process.Kill()
	_ = p.cmd.Wait()
	log.Println("✓ Engine PostgreSQL portable telah dihentikan dengan aman.")
}

// ensureDatabaseExists memeriksa dan membuat database librem_db jika belum ada
func ensureDatabaseExists(port, dbName string) error {
	connStr := fmt.Sprintf("postgres://postgres@127.0.0.1:%s/postgres?sslmode=disable", port)

	// Tunggu hingga PostgreSQL benar-benar siap menerima kueri (bukan sekadar port TCP terbuka)
	var conn *pgx.Conn
	var err error
	for i := 0; i < 20; i++ {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		conn, err = pgx.Connect(ctx, connStr)
		cancel()
		if err == nil {
			break
		}
		time.Sleep(500 * time.Millisecond)
	}

	if err != nil {
		log.Printf("Peringatan: Tidak dapat terhubung ke database default postgres: %v", err)
		return err
	}
	defer conn.Close(context.Background())

	var exists bool
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := fmt.Sprintf("SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = '%s')", dbName)
	if err := conn.QueryRow(ctx, query).Scan(&exists); err == nil && !exists {
		log.Printf("⚡ Membuat database '%s' secara otomatis...", dbName)
		_, createErr := conn.Exec(ctx, fmt.Sprintf("CREATE DATABASE %s", dbName))
		if createErr != nil {
			log.Printf("Peringatan saat membuat database: %v", createErr)
			return createErr
		}
		log.Printf("✓ Database '%s' berhasil dibuat.", dbName)
	}
	return nil
}
