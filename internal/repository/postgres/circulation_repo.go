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

type CirculationRepo struct {
	pool *pgxpool.Pool
}

func NewCirculationRepo(pool *pgxpool.Pool) *CirculationRepo {
	return &CirculationRepo{pool: pool}
}

// Checkout processes loan transaction following SLiMS rules & precedence
func (r *CirculationRepo) Checkout(ctx context.Context, memberID string, barcode string, staffUserID *int64) (*domain.Loan, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// 1. Validasi Pemustaka
	var member domain.Member
	var isExpired bool
	var unpaidFine float64
	memberQuery := `
		SELECT m.id, m.full_name, m.member_type_id, m.is_pending, m.expire_date::text,
		       (m.expire_date < CURRENT_DATE) AS is_expired,
		       COALESCE((SELECT SUM(debit) - SUM(credit) FROM fine_ledgers f WHERE f.member_id = m.id), 0) AS unpaid_fine
		FROM members m
		WHERE m.id = $1 FOR UPDATE
	`
	err = tx.QueryRow(ctx, memberQuery, strings.TrimSpace(memberID)).Scan(
		&member.ID, &member.FullName, &member.MemberTypeID, &member.IsPending,
		&member.ExpireDate, &isExpired, &unpaidFine,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("MEMBER_NOT_FOUND: Kartu anggota tidak terdaftar")
		}
		return nil, err
	}

	if member.IsPending {
		return nil, errors.New("MEMBER_SUSPENDED: Keanggotaan sedang dinonaktifkan")
	}
	if isExpired {
		return nil, errors.New("MEMBERSHIP_EXPIRED: Masa berlaku kartu anggota telah habis (" + member.ExpireDate + ")")
	}
	if unpaidFine > 5000.00 { // Max allowed debt limit
		return nil, fmt.Errorf("MEMBER_HAS_UNPAID_FINES: Anggota memiliki tunggakan denda sebesar Rp %.0f yang harus dilunasi", unpaidFine)
	}

	// 2. Validasi Eksemplar Fisik
	var itemID int64
	var collTypeID *int
	var gmdID *int
	var biblioTitle string
	var itemCallNum string
	var coverImg string
	var noLoan bool

	itemQuery := `
		SELECT i.id, i.coll_type_id, b.gmd_id, b.title, COALESCE(i.call_number, ''),
		       COALESCE(b.cover_image, ''), COALESCE(s.no_loan, FALSE)
		FROM items i
		JOIN biblios b ON i.biblio_id = b.id
		LEFT JOIN mst_item_statuses s ON i.item_status_id = s.id
		WHERE i.barcode = $1 FOR UPDATE OF i
	`
	err = tx.QueryRow(ctx, itemQuery, strings.TrimSpace(barcode)).Scan(
		&itemID, &collTypeID, &gmdID, &biblioTitle, &itemCallNum, &coverImg, &noLoan,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("ITEM_NOT_FOUND: Barcode buku tidak ditemukan di sistem")
		}
		return nil, err
	}

	if noLoan {
		return nil, errors.New("ITEM_STATUS_FORBIDS_LOAN: Status buku ini tidak dapat dipinjamkan (Hanya Baca / Rusak / Hilang)")
	}

	// Check if already lent
	var isLent bool
	err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM loans WHERE item_id = $1 AND is_return = FALSE)`, itemID).Scan(&isLent)
	if err != nil {
		return nil, err
	}
	if isLent {
		return nil, errors.New("ITEM_ALREADY_BORROWED: Buku ini sedang dipinjam oleh pemustaka lain")
	}

	// Check reservations
	var isReservedByOther bool
	err = tx.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM reservations WHERE item_id = $1 AND member_id != $2 AND status = 'PENDING')
	`, itemID, member.ID).Scan(&isReservedByOther)
	if err != nil {
		return nil, err
	}
	if isReservedByOther {
		return nil, errors.New("ITEM_RESERVED_BY_ANOTHER_MEMBER: Buku ini telah di-booking oleh pemustaka lain")
	}

	// 3. Resolusi Aturan Pinjam (Hierarchical Precedence SLiMS)
	var loanLimit int
	var loanPeriodeDays int
	var loanRuleID *int

	// Try Level 1, 2, 3 in mst_loan_rules
	ruleFound := false
	ruleQuery := `
		SELECT id, loan_limit, loan_periode_days
		FROM mst_loan_rules
		WHERE member_type_id = $1
		  AND (coll_type_id = $2 OR (coll_type_id IS NULL AND $2 IS NULL))
		  AND (gmd_id = $3 OR (gmd_id IS NULL AND $3 IS NULL))
		LIMIT 1
	`
	var rID int
	if err := tx.QueryRow(ctx, ruleQuery, member.MemberTypeID, collTypeID, gmdID).Scan(&rID, &loanLimit, &loanPeriodeDays); err == nil {
		loanRuleID = &rID
		ruleFound = true
	}

	// Fallback Level 4: default from mst_member_types
	if !ruleFound {
		err = tx.QueryRow(ctx, `
			SELECT loan_limit, loan_periode_days FROM mst_member_types WHERE id = $1
		`, member.MemberTypeID).Scan(&loanLimit, &loanPeriodeDays)
		if err != nil {
			loanLimit = 3
			loanPeriodeDays = 7
		}
	}

	// 4. Cek Kuota Pinjam
	var activeLoansCount int
	err = tx.QueryRow(ctx, `SELECT COUNT(*) FROM loans WHERE member_id = $1 AND is_return = FALSE`, member.ID).Scan(&activeLoansCount)
	if err != nil {
		return nil, err
	}
	if activeLoansCount >= loanLimit {
		return nil, fmt.Errorf("LOAN_LIMIT_EXCEEDED: Anggota telah mencapai batas maksimal peminjaman (%d buku)", loanLimit)
	}

	// 5. Hitung Tanggal Jatuh Tempo (Lewati Hari Libur / Akhir Pekan)
	candidateDueDate := time.Now().AddDate(0, 0, loanPeriodeDays)
	for r.isHolidayOrWeekend(ctx, candidateDueDate) {
		candidateDueDate = candidateDueDate.AddDate(0, 0, 1)
	}

	// Jangan melampaui masa berlaku member
	memberExpireT, err := time.Parse("2006-01-02", member.ExpireDate)
	if err == nil && candidateDueDate.After(memberExpireT) {
		candidateDueDate = memberExpireT
	}

	loanDateStr := time.Now().Format("2006-01-02")
	dueDateStr := candidateDueDate.Format("2006-01-02")

	// 6. Simpan Record Peminjaman
	insertLoanQuery := `
		INSERT INTO loans (
			item_id, member_id, loan_rules_id, loan_date, due_date,
			renewed_count, is_lent, is_return, staff_user_id
		) VALUES ($1, $2, $3, $4, $5, 0, TRUE, FALSE, $6)
		RETURNING id, created_at, updated_at
	`
	var newLoan domain.Loan
	newLoan.ItemID = itemID
	newLoan.ItemBarcode = barcode
	newLoan.ItemCallNumber = itemCallNum
	newLoan.BiblioTitle = biblioTitle
	newLoan.CoverImage = coverImg
	newLoan.MemberID = member.ID
	newLoan.MemberName = member.FullName
	newLoan.LoanRulesID = loanRuleID
	newLoan.LoanDate = loanDateStr
	newLoan.DueDate = dueDateStr
	newLoan.RenewedCount = 0
	newLoan.IsLent = true
	newLoan.IsReturn = false
	newLoan.StaffUserID = staffUserID

	err = tx.QueryRow(ctx, insertLoanQuery,
		itemID, member.ID, loanRuleID, loanDateStr, dueDateStr, staffUserID,
	).Scan(&newLoan.ID, &newLoan.CreatedAt, &newLoan.UpdatedAt)
	if err != nil {
		return nil, err
	}

	// Update any reservation to FULFILLED
	_, _ = tx.Exec(ctx, `UPDATE reservations SET status = 'FULFILLED' WHERE item_id = $1 AND member_id = $2`, itemID, member.ID)

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &newLoan, nil
}

// Checkin processes rapid book return, calculates overdue & generates fine ledger
func (r *CirculationRepo) Checkin(ctx context.Context, barcode string, staffUserID *int64) (*domain.CheckinResponse, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Cari pinjaman aktif berdasarkan barcode buku
	query := `
		SELECT l.id, l.item_id, l.member_id, m.full_name, b.title, l.due_date::text,
		       mt.fine_each_day, mt.grace_periode_days
		FROM loans l
		JOIN items i ON l.item_id = i.id
		JOIN biblios b ON i.biblio_id = b.id
		JOIN members m ON l.member_id = m.id
		JOIN mst_member_types mt ON m.member_type_id = mt.id
		WHERE i.barcode = $1 AND l.is_return = FALSE
		FOR UPDATE OF l
		LIMIT 1
	`
	var loanID int64
	var itemID int64
	var memberID, memberName, title, dueDateStr string
	var fineEachDay float64
	var gracePeriodDays int

	err = tx.QueryRow(ctx, query, strings.TrimSpace(barcode)).Scan(
		&loanID, &itemID, &memberID, &memberName, &title, &dueDateStr,
		&fineEachDay, &gracePeriodDays,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("NO_ACTIVE_LOAN: Tidak ada transaksi peminjaman aktif untuk barcode buku ini")
		}
		return nil, err
	}

	returnDateStr := time.Now().Format("2006-01-02")
	returnDate, _ := time.Parse("2006-01-02", returnDateStr)
	dueDate, _ := time.Parse("2006-01-02", dueDateStr)

	overdueDays := 0
	fineAmount := 0.00
	var fineLedgerID *int64

	if returnDate.After(dueDate) {
		rawDays := int(returnDate.Sub(dueDate).Hours() / 24)
		// Kurangi hari libur jika dikonfigurasi
		holidaysBetween := r.countHolidaysBetween(ctx, dueDate, returnDate)
		netOverdue := rawDays - holidaysBetween
		if netOverdue > 0 {
			overdueDays = netOverdue
		}

		if overdueDays > gracePeriodDays {
			fineAmount = float64(overdueDays) * fineEachDay

			// Catat ke Buku Kas Denda (fine_ledgers)
			ledgerQuery := `
				INSERT INTO fine_ledgers (
					member_id, loan_id, transaction_date, debit, credit, description, staff_user_id
				) VALUES ($1, $2, $3, $4, 0.00, $5, $6)
				RETURNING id
			`
			desc := fmt.Sprintf("Denda keterlambatan pengembalian buku '%s' (Barcode: %s) selama %d hari", title, barcode, overdueDays)
			var flID int64
			err = tx.QueryRow(ctx, ledgerQuery, memberID, loanID, returnDateStr, fineAmount, desc, staffUserID).Scan(&flID)
			if err != nil {
				return nil, err
			}
			fineLedgerID = &flID
		}
	}

	// Update Loan to is_return = TRUE
	updateQuery := `
		UPDATE loans
		SET is_return = TRUE, actual_return_date = $1, updated_at = NOW()
		WHERE id = $2
	`
	_, err = tx.Exec(ctx, updateQuery, returnDateStr, loanID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &domain.CheckinResponse{
		LoanID:       loanID,
		ItemBarcode:  barcode,
		Title:        title,
		MemberID:     memberID,
		MemberName:   memberName,
		ReturnDate:   returnDateStr,
		DueDate:      dueDateStr,
		OverdueDays:  overdueDays,
		FineAmount:   fineAmount,
		FineLedgerID: fineLedgerID,
	}, nil
}

// Renew extends active loan due date
func (r *CirculationRepo) Renew(ctx context.Context, loanID int64, staffUserID *int64) (*domain.Loan, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	query := `
		SELECT l.id, l.item_id, l.member_id, l.due_date::text, l.renewed_count,
		       mt.reborrow_limit, mt.loan_periode_days, m.expire_date::text
		FROM loans l
		JOIN items i ON l.item_id = i.id
		JOIN members m ON l.member_id = m.id
		JOIN mst_member_types mt ON m.member_type_id = mt.id
		WHERE l.id = $1 AND l.is_return = FALSE
		FOR UPDATE OF l
	`
	var id, itemID int64
	var memberID, dueDateStr, memberExpireStr string
	var renewedCount, reborrowLimit, loanPeriodeDays int

	err = tx.QueryRow(ctx, query, loanID).Scan(
		&id, &itemID, &memberID, &dueDateStr, &renewedCount,
		&reborrowLimit, &loanPeriodeDays, &memberExpireStr,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("LOAN_NOT_FOUND: Transaksi pinjaman tidak ditemukan atau sudah dikembalikan")
		}
		return nil, err
	}

	if renewedCount >= reborrowLimit {
		return nil, fmt.Errorf("RENEWAL_LIMIT_EXCEEDED: Batas perpanjangan telah habis (Maksimal %d kali)", reborrowLimit)
	}

	// Perpanjang dari tanggal sekarang atau tanggal jatuh tempo lama
	baseDate := time.Now()
	newDueDate := baseDate.AddDate(0, 0, loanPeriodeDays)
	for r.isHolidayOrWeekend(ctx, newDueDate) {
		newDueDate = newDueDate.AddDate(0, 0, 1)
	}

	memberExpireT, err := time.Parse("2006-01-02", memberExpireStr)
	if err == nil && newDueDate.After(memberExpireT) {
		newDueDate = memberExpireT
	}

	newDueDateStr := newDueDate.Format("2006-01-02")
	updateQuery := `
		UPDATE loans
		SET renewed_count = renewed_count + 1, due_date = $1, updated_at = NOW()
		WHERE id = $2
	`
	_, err = tx.Exec(ctx, updateQuery, newDueDateStr, loanID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return r.FindLoanByID(ctx, loanID)
}

func (r *CirculationRepo) FindLoanByID(ctx context.Context, id int64) (*domain.Loan, error) {
	query := `
		SELECT l.id, l.item_id, i.barcode, COALESCE(i.call_number, ''),
		       b.title, COALESCE(b.cover_image, ''),
		       l.member_id, m.full_name, l.loan_rules_id,
		       l.loan_date::text, l.due_date::text, l.actual_return_date::text,
		       l.renewed_count, l.is_lent, l.is_return,
		       (CURRENT_DATE > l.due_date AND l.is_return = FALSE) AS is_overdue,
		       GREATEST(0, (CURRENT_DATE - l.due_date)) AS overdue_days,
		       (GREATEST(0, (CURRENT_DATE - l.due_date)) * mt.fine_each_day) AS estimated_fine,
		       l.staff_user_id, l.created_at, l.updated_at
		FROM loans l
		JOIN items i ON l.item_id = i.id
		JOIN biblios b ON i.biblio_id = b.id
		JOIN members m ON l.member_id = m.id
		JOIN mst_member_types mt ON m.member_type_id = mt.id
		WHERE l.id = $1
	`
	var l domain.Loan
	var returnDate *string
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&l.ID, &l.ItemID, &l.ItemBarcode, &l.ItemCallNumber,
		&l.BiblioTitle, &l.CoverImage,
		&l.MemberID, &l.MemberName, &l.LoanRulesID,
		&l.LoanDate, &l.DueDate, &returnDate,
		&l.RenewedCount, &l.IsLent, &l.IsReturn,
		&l.IsOverdue, &l.OverdueDays, &l.EstimatedFine,
		&l.StaffUserID, &l.CreatedAt, &l.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	l.ActualReturnDate = returnDate
	return &l, nil
}

func (r *CirculationRepo) GetActiveLoansByMember(ctx context.Context, memberID string) ([]domain.Loan, error) {
	query := `
		SELECT l.id, l.item_id, i.barcode, COALESCE(i.call_number, ''),
		       b.title, COALESCE(b.cover_image, ''),
		       l.member_id, m.full_name, l.loan_rules_id,
		       l.loan_date::text, l.due_date::text, l.actual_return_date::text,
		       l.renewed_count, l.is_lent, l.is_return,
		       (CURRENT_DATE > l.due_date AND l.is_return = FALSE) AS is_overdue,
		       GREATEST(0, (CURRENT_DATE - l.due_date)) AS overdue_days,
		       (GREATEST(0, (CURRENT_DATE - l.due_date)) * mt.fine_each_day) AS estimated_fine,
		       l.staff_user_id, l.created_at, l.updated_at
		FROM loans l
		JOIN items i ON l.item_id = i.id
		JOIN biblios b ON i.biblio_id = b.id
		JOIN members m ON l.member_id = m.id
		JOIN mst_member_types mt ON m.member_type_id = mt.id
		WHERE l.member_id = $1 AND l.is_return = FALSE
		ORDER BY l.due_date ASC
	`
	rows, err := r.pool.Query(ctx, query, strings.TrimSpace(memberID))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var loans []domain.Loan
	for rows.Next() {
		var l domain.Loan
		var returnDate *string
		err := rows.Scan(
			&l.ID, &l.ItemID, &l.ItemBarcode, &l.ItemCallNumber,
			&l.BiblioTitle, &l.CoverImage,
			&l.MemberID, &l.MemberName, &l.LoanRulesID,
			&l.LoanDate, &l.DueDate, &returnDate,
			&l.RenewedCount, &l.IsLent, &l.IsReturn,
			&l.IsOverdue, &l.OverdueDays, &l.EstimatedFine,
			&l.StaffUserID, &l.CreatedAt, &l.UpdatedAt,
		)
		if err == nil {
			l.ActualReturnDate = returnDate
			loans = append(loans, l)
		}
	}
	return loans, nil
}

func (r *CirculationRepo) ListOverdues(ctx context.Context, limit, offset int) ([]domain.Loan, int64, error) {
	countQuery := `SELECT COUNT(*) FROM loans WHERE is_return = FALSE AND due_date < CURRENT_DATE`
	var total int64
	_ = r.pool.QueryRow(ctx, countQuery).Scan(&total)

	query := `
		SELECT l.id, l.item_id, i.barcode, COALESCE(i.call_number, ''),
		       b.title, COALESCE(b.cover_image, ''),
		       l.member_id, m.full_name, l.loan_rules_id,
		       l.loan_date::text, l.due_date::text, l.actual_return_date::text,
		       l.renewed_count, l.is_lent, l.is_return,
		       TRUE AS is_overdue,
		       GREATEST(0, (CURRENT_DATE - l.due_date)) AS overdue_days,
		       (GREATEST(0, (CURRENT_DATE - l.due_date)) * mt.fine_each_day) AS estimated_fine,
		       l.staff_user_id, l.created_at, l.updated_at
		FROM loans l
		JOIN items i ON l.item_id = i.id
		JOIN biblios b ON i.biblio_id = b.id
		JOIN members m ON l.member_id = m.id
		JOIN mst_member_types mt ON m.member_type_id = mt.id
		WHERE l.is_return = FALSE AND l.due_date < CURRENT_DATE
		ORDER BY l.due_date ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var loans []domain.Loan
	for rows.Next() {
		var l domain.Loan
		var returnDate *string
		err := rows.Scan(
			&l.ID, &l.ItemID, &l.ItemBarcode, &l.ItemCallNumber,
			&l.BiblioTitle, &l.CoverImage,
			&l.MemberID, &l.MemberName, &l.LoanRulesID,
			&l.LoanDate, &l.DueDate, &returnDate,
			&l.RenewedCount, &l.IsLent, &l.IsReturn,
			&l.IsOverdue, &l.OverdueDays, &l.EstimatedFine,
			&l.StaffUserID, &l.CreatedAt, &l.UpdatedAt,
		)
		if err == nil {
			l.ActualReturnDate = returnDate
			loans = append(loans, l)
		}
	}
	return loans, total, nil
}

func (r *CirculationRepo) ListFineLedgers(ctx context.Context, memberID string, limit, offset int) ([]domain.FineLedger, int64, error) {
	whereClause := ""
	var args []interface{}
	argIdx := 1
	if strings.TrimSpace(memberID) != "" {
		whereClause = fmt.Sprintf("WHERE f.member_id = $%d", argIdx)
		args = append(args, strings.TrimSpace(memberID))
		argIdx++
	}

	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM fine_ledgers f %s`, whereClause)
	var total int64
	_ = r.pool.QueryRow(ctx, countQuery, args...).Scan(&total)

	query := fmt.Sprintf(`
		SELECT f.id, f.member_id, m.full_name, f.loan_id, f.transaction_date::text,
		       f.debit, f.credit, f.description, f.staff_user_id, f.created_at
		FROM fine_ledgers f
		JOIN members m ON f.member_id = m.id
		%s
		ORDER BY f.id DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, limit, offset)
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var ledgers []domain.FineLedger
	for rows.Next() {
		var fl domain.FineLedger
		err := rows.Scan(
			&fl.ID, &fl.MemberID, &fl.MemberName, &fl.LoanID, &fl.TransactionDate,
			&fl.Debit, &fl.Credit, &fl.Description, &fl.StaffUserID, &fl.CreatedAt,
		)
		if err == nil {
			ledgers = append(ledgers, fl)
		}
	}
	return ledgers, total, nil
}

func (r *CirculationRepo) PayFine(ctx context.Context, req domain.PayFineRequest, staffUserID *int64) (*domain.FineLedger, error) {
	query := `
		INSERT INTO fine_ledgers (
			member_id, transaction_date, debit, credit, description, staff_user_id
		) VALUES ($1, CURRENT_DATE, 0.00, $2, $3, $4)
		RETURNING id, created_at
	`
	desc := req.Description
	if desc == "" {
		desc = fmt.Sprintf("Pembayaran denda sebesar Rp %.0f", req.Amount)
	}

	var fl domain.FineLedger
	fl.MemberID = req.MemberID
	fl.Credit = req.Amount
	fl.Debit = 0.00
	fl.Description = desc
	fl.TransactionDate = time.Now().Format("2006-01-02")
	fl.StaffUserID = staffUserID

	err := r.pool.QueryRow(ctx, query, req.MemberID, req.Amount, desc, staffUserID).Scan(&fl.ID, &fl.CreatedAt)
	if err != nil {
		return nil, err
	}

	return &fl, nil
}

func (r *CirculationRepo) isHolidayOrWeekend(ctx context.Context, t time.Time) bool {
	// Sunday is always weekend
	if t.Weekday() == time.Sunday {
		return true
	}

	dayName := t.Format("Mon")
	dateStr := t.Format("2006-01-02")

	var isHoliday bool
	query := `
		SELECT EXISTS(
			SELECT 1 FROM holidays 
			WHERE (is_recurring = TRUE AND day_name = $1)
			   OR (specific_date = $2::date)
		)
	`
	_ = r.pool.QueryRow(ctx, query, dayName, dateStr).Scan(&isHoliday)
	return isHoliday
}

func (r *CirculationRepo) countHolidaysBetween(ctx context.Context, start, end time.Time) int {
	count := 0
	curr := start.AddDate(0, 0, 1)
	for !curr.After(end) {
		if r.isHolidayOrWeekend(ctx, curr) {
			count++
		}
		curr = curr.AddDate(0, 0, 1)
	}
	return count
}
