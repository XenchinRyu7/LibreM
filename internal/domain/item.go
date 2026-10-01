package domain

import (
	"time"
)

type Item struct {
	ID             int64     `json:"id"`
	BiblioID       int64     `json:"biblio_id"`
	BiblioTitle    string    `json:"biblio_title,omitempty"`
	Barcode        string    `json:"barcode"`
	InventoryCode  string    `json:"inventory_code,omitempty"`
	CallNumber     string    `json:"call_number,omitempty"`
	CollTypeID     *int      `json:"coll_type_id,omitempty"`
	CollTypeName   string    `json:"coll_type_name,omitempty"`
	LocationID     *string   `json:"location_id,omitempty"`
	LocationName   string    `json:"location_name,omitempty"`
	ItemStatusID   *string   `json:"item_status_id,omitempty"`
	ItemStatusName string    `json:"item_status_name,omitempty"`
	ReceivedDate   *string   `json:"received_date,omitempty"`
	OrderNo        string    `json:"order_no,omitempty"`
	Price          float64   `json:"price"`
	Source         int       `json:"source"` // 0: Pembelian, 1: Hibah, 2: Hadiah
	Notes          string    `json:"notes,omitempty"`
	IsLent         bool      `json:"is_lent"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type CollType struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Location struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type ItemStatus struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	NoLoan        bool   `json:"no_loan"`
	SkipStockTake bool   `json:"skip_stock_take"`
}

type BatchCreateItemsRequest struct {
	BiblioID      int64   `json:"biblio_id"`
	BarcodePrefix string  `json:"barcode_prefix"`
	StartNumber   int     `json:"start_number"`
	Quantity      int     `json:"quantity"`
	CollTypeID    *int    `json:"coll_type_id"`
	LocationID    *string `json:"location_id"`
	ItemStatusID  *string `json:"item_status_id"`
	Price         float64 `json:"price"`
	CallNumber    string  `json:"call_number"`
	Notes         string  `json:"notes"`
}
