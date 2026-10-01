package domain

import (
	"time"
)

type Loan struct {
	ID               int64      `json:"id"`
	ItemID           int64      `json:"item_id"`
	ItemBarcode      string     `json:"item_barcode"`
	ItemCallNumber   string     `json:"item_call_number,omitempty"`
	BiblioTitle      string     `json:"biblio_title"`
	CoverImage       string     `json:"cover_image,omitempty"`
	MemberID         string     `json:"member_id"`
	MemberName       string     `json:"member_name"`
	LoanRulesID      *int       `json:"loan_rules_id,omitempty"`
	LoanDate         string     `json:"loan_date"`
	DueDate          string     `json:"due_date"`
	ActualReturnDate *string    `json:"actual_return_date,omitempty"`
	RenewedCount     int        `json:"renewed_count"`
	IsLent           bool       `json:"is_lent"`
	IsReturn         bool       `json:"is_return"`
	IsOverdue        bool       `json:"is_overdue"`
	OverdueDays      int        `json:"overdue_days"`
	EstimatedFine    float64    `json:"estimated_fine"`
	StaffUserID      *int64     `json:"staff_user_id,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type LoanRule struct {
	ID               int       `json:"id"`
	MemberTypeID     int       `json:"member_type_id"`
	CollTypeID       *int      `json:"coll_type_id,omitempty"`
	GMDID            *int      `json:"gmd_id,omitempty"`
	LoanLimit        int       `json:"loan_limit"`
	LoanPeriodeDays  int       `json:"loan_periode_days"`
	ReborrowLimit    int       `json:"reborrow_limit"`
	FineEachDay      float64   `json:"fine_each_day"`
	GracePeriodeDays int       `json:"grace_periode_days"`
	CreatedAt        time.Time `json:"created_at"`
}

type Holiday struct {
	ID           int     `json:"id"`
	DayName      *string `json:"day_name,omitempty"`
	SpecificDate *string `json:"specific_date,omitempty"`
	Description  string  `json:"description"`
	IsRecurring  bool    `json:"is_recurring"`
}

type FineLedger struct {
	ID              int64     `json:"id"`
	MemberID        string    `json:"member_id"`
	MemberName      string    `json:"member_name,omitempty"`
	LoanID          *int64    `json:"loan_id,omitempty"`
	TransactionDate string    `json:"transaction_date"`
	Debit           float64   `json:"debit"`  // Tagihan denda bertambah
	Credit          float64   `json:"credit"` // Denda dibayar
	Description     string    `json:"description"`
	StaffUserID     *int64    `json:"staff_user_id,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

type CheckoutRequest struct {
	MemberID string `json:"member_id"`
	Barcode  string `json:"barcode"`
}

type CheckinRequest struct {
	Barcode string `json:"barcode"`
}

type CheckinResponse struct {
	LoanID       int64   `json:"loan_id"`
	ItemBarcode  string  `json:"item_barcode"`
	Title        string  `json:"title"`
	MemberID     string  `json:"member_id"`
	MemberName   string  `json:"member_name"`
	ReturnDate   string  `json:"return_date"`
	DueDate      string  `json:"due_date"`
	OverdueDays  int     `json:"overdue_days"`
	FineAmount   float64 `json:"fine_amount"`
	FineLedgerID *int64  `json:"fine_ledger_id,omitempty"`
}

type PayFineRequest struct {
	MemberID    string  `json:"member_id"`
	Amount      float64 `json:"amount"`
	Description string  `json:"description"`
}
