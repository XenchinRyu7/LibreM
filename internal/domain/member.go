package domain

import (
	"time"
)

type Member struct {
	ID                 string      `json:"id"` // Nomor Anggota / NISN / NIP
	FullName           string      `json:"full_name"`
	Gender             string      `json:"gender,omitempty"` // M or F
	BirthDate          *string     `json:"birth_date,omitempty"`
	MemberTypeID       int         `json:"member_type_id"`
	MemberTypeName     string      `json:"member_type_name,omitempty"`
	Address            string      `json:"address,omitempty"`
	Email              string      `json:"email,omitempty"`
	Phone              string      `json:"phone,omitempty"`
	Institution        string      `json:"institution,omitempty"` // misal Kelas atau Unit Kerja
	AvatarURL          string      `json:"avatar_url,omitempty"`
	RegisterDate       string      `json:"register_date"`
	ExpireDate         string      `json:"expire_date"`
	IsPending          bool        `json:"is_pending"`
	IsExpired          bool        `json:"is_expired"`
	ActiveLoansCount   int         `json:"active_loans_count"`
	UnpaidFineBalance  float64     `json:"unpaid_fine_balance"`
	Notes              string      `json:"notes,omitempty"`
	MemberType         *MemberType `json:"member_type,omitempty"`
	CreatedAt          time.Time   `json:"created_at"`
	UpdatedAt          time.Time   `json:"updated_at"`
}

type MemberType struct {
	ID                     int       `json:"id"`
	Name                   string    `json:"name"`
	LoanLimit              int       `json:"loan_limit"`
	LoanPeriodeDays        int       `json:"loan_periode_days"`
	ReborrowLimit          int       `json:"reborrow_limit"`
	FineEachDay            float64   `json:"fine_each_day"`
	GracePeriodeDays       int       `json:"grace_periode_days"`
	MembershipDurationDays int       `json:"membership_duration_days"`
	EnableReserve          bool      `json:"enable_reserve"`
	ReserveLimit           int       `json:"reserve_limit"`
	CreatedAt              time.Time `json:"created_at"`
}

type CreateMemberRequest struct {
	ID           string  `json:"id"`
	FullName     string  `json:"full_name"`
	Gender       string  `json:"gender"`
	BirthDate    *string `json:"birth_date"`
	MemberTypeID int     `json:"member_type_id"`
	Address      string  `json:"address"`
	Email        string  `json:"email"`
	Phone        string  `json:"phone"`
	Institution  string  `json:"institution"`
	Notes        string  `json:"notes"`
}
