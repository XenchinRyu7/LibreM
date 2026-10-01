package domain

import (
	"encoding/json"
	"time"
)

type SystemSetting struct {
	SettingKey   string          `json:"setting_key"`
	SettingValue json.RawMessage `json:"setting_value"`
	Description  string          `json:"description"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

type LibraryInfo struct {
	Name       string `json:"name"`
	SubName    string `json:"sub_name"`
	Address    string `json:"address"`
	Phone      string `json:"phone"`
	ThemeColor string `json:"theme_color"`
	LogoURL    string `json:"logo_url,omitempty"`
}

type VisitorLog struct {
	ID          int64     `json:"id"`
	MemberID    *string   `json:"member_id,omitempty"`
	VisitorName string    `json:"visitor_name"`
	Institution string    `json:"institution,omitempty"`
	Gender      string    `json:"gender,omitempty"`
	Purpose     string    `json:"purpose,omitempty"`
	CheckinTime time.Time `json:"checkin_time"`
}

type CreateVisitorRequest struct {
	MemberID    string `json:"member_id,omitempty"`
	VisitorName string `json:"visitor_name"`
	Institution string `json:"institution,omitempty"`
	Gender      string `json:"gender,omitempty"`
	Purpose     string `json:"purpose,omitempty"`
}

type DashboardStats struct {
	TotalBiblios      int64             `json:"total_biblios"`
	TotalItems        int64             `json:"total_items"`
	ActiveLoans       int64             `json:"active_loans"`
	AvailableItems    int64             `json:"available_items"`
	OverdueLoansCount int64             `json:"overdue_loans_count"`
	TotalMembers      int64             `json:"total_members"`
	TodayVisitors     int64             `json:"today_visitors"`
	UnpaidFinesTotal  float64           `json:"unpaid_fines_total"`
	Trends            []DailyCircTrend  `json:"trends"`
}

type DailyCircTrend struct {
	Day       string `json:"day"`
	Date      string `json:"date"`
	Pinjam    int    `json:"pinjam"`
	Kembali   int    `json:"kembali"`
	Perpanjang int   `json:"perpanjang"`
}
