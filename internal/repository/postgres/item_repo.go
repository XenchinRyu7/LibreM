package postgres

import (
	"context"
	"errors"
	"fmt"
	"librem/internal/domain"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ItemRepo struct {
	pool *pgxpool.Pool
}

func NewItemRepo(pool *pgxpool.Pool) *ItemRepo {
	return &ItemRepo{pool: pool}
}

func (r *ItemRepo) List(ctx context.Context, biblioID int64, queryStr string, limit, offset int) ([]domain.Item, int64, error) {
	var conditions []string
	var args []interface{}
	argIdx := 1

	if biblioID > 0 {
		conditions = append(conditions, fmt.Sprintf("i.biblio_id = $%d", argIdx))
		args = append(args, biblioID)
		argIdx++
	}

	if strings.TrimSpace(queryStr) != "" {
		conditions = append(conditions, fmt.Sprintf("(i.barcode ILIKE $%d OR b.title ILIKE $%d OR i.call_number ILIKE $%d)", argIdx, argIdx, argIdx))
		args = append(args, "%"+strings.TrimSpace(queryStr)+"%")
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM items i 
		JOIN biblios b ON i.biblio_id = b.id 
		%s
	`, whereClause)

	var totalRecords int64
	err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalRecords)
	if err != nil {
		return nil, 0, err
	}

	dataQuery := fmt.Sprintf(`
		SELECT i.id, i.biblio_id, b.title, i.barcode, COALESCE(i.inventory_code, ''),
		       COALESCE(i.call_number, ''), i.coll_type_id, COALESCE(c.name, ''),
		       i.location_id, COALESCE(l.name, ''), i.item_status_id, COALESCE(s.name, ''),
		       i.price, i.source, COALESCE(i.notes, ''),
		       EXISTS(SELECT 1 FROM loans ln WHERE ln.item_id = i.id AND ln.is_return = FALSE) AS is_lent,
		       i.created_at, i.updated_at
		FROM items i
		JOIN biblios b ON i.biblio_id = b.id
		LEFT JOIN mst_coll_types c ON i.coll_type_id = c.id
		LEFT JOIN mst_locations l ON i.location_id = l.id
		LEFT JOIN mst_item_statuses s ON i.item_status_id = s.id
		%s
		ORDER BY i.id DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []domain.Item
	for rows.Next() {
		var item domain.Item
		err := rows.Scan(
			&item.ID, &item.BiblioID, &item.BiblioTitle, &item.Barcode, &item.InventoryCode,
			&item.CallNumber, &item.CollTypeID, &item.CollTypeName,
			&item.LocationID, &item.LocationName, &item.ItemStatusID, &item.ItemStatusName,
			&item.Price, &item.Source, &item.Notes, &item.IsLent,
			&item.CreatedAt, &item.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}

	return items, totalRecords, nil
}

func (r *ItemRepo) FindByBarcode(ctx context.Context, barcode string) (*domain.Item, error) {
	query := `
		SELECT i.id, i.biblio_id, b.title, i.barcode, COALESCE(i.inventory_code, ''),
		       COALESCE(i.call_number, ''), i.coll_type_id, COALESCE(c.name, ''),
		       i.location_id, COALESCE(l.name, ''), i.item_status_id, COALESCE(s.name, ''),
		       i.price, i.source, COALESCE(i.notes, ''),
		       EXISTS(SELECT 1 FROM loans ln WHERE ln.item_id = i.id AND ln.is_return = FALSE) AS is_lent,
		       i.created_at, i.updated_at
		FROM items i
		JOIN biblios b ON i.biblio_id = b.id
		LEFT JOIN mst_coll_types c ON i.coll_type_id = c.id
		LEFT JOIN mst_locations l ON i.location_id = l.id
		LEFT JOIN mst_item_statuses s ON i.item_status_id = s.id
		WHERE i.barcode = $1 LIMIT 1
	`
	var item domain.Item
	err := r.pool.QueryRow(ctx, query, strings.TrimSpace(barcode)).Scan(
		&item.ID, &item.BiblioID, &item.BiblioTitle, &item.Barcode, &item.InventoryCode,
		&item.CallNumber, &item.CollTypeID, &item.CollTypeName,
		&item.LocationID, &item.LocationName, &item.ItemStatusID, &item.ItemStatusName,
		&item.Price, &item.Source, &item.Notes, &item.IsLent,
		&item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (r *ItemRepo) BatchCreate(ctx context.Context, req domain.BatchCreateItemsRequest) ([]domain.Item, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var created []domain.Item
	prefix := req.BarcodePrefix
	if prefix == "" {
		prefix = "B"
	}
	startNum := req.StartNumber
	if startNum <= 0 {
		var maxID int64
		_ = tx.QueryRow(ctx, `SELECT COALESCE(MAX(id), 0) FROM items`).Scan(&maxID)
		startNum = int(maxID) + 101
	}

	for i := 0; i < req.Quantity; i++ {
		barcode := fmt.Sprintf("%s%06d", prefix, startNum+i)
		invCode := fmt.Sprintf("INV/%s", barcode)
		callNum := req.CallNumber
		if callNum == "" {
			callNum = fmt.Sprintf("ITEM c.%d", i+1)
		}

		query := `
			INSERT INTO items (
				biblio_id, barcode, inventory_code, call_number, coll_type_id,
				location_id, item_status_id, price, notes
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			RETURNING id
		`
		var id int64
		err := tx.QueryRow(ctx, query,
			req.BiblioID, barcode, invCode, callNum, req.CollTypeID,
			req.LocationID, req.ItemStatusID, req.Price, req.Notes,
		).Scan(&id)
		if err != nil {
			return nil, err
		}

		created = append(created, domain.Item{
			ID:            id,
			BiblioID:      req.BiblioID,
			Barcode:       barcode,
			InventoryCode: invCode,
			CallNumber:    callNum,
			Price:         req.Price,
		})
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return created, nil
}

func (r *ItemRepo) Delete(ctx context.Context, id int64) error {
	var isLent bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM loans WHERE item_id = $1 AND is_return = FALSE)`, id).Scan(&isLent)
	if err != nil {
		return err
	}
	if isLent {
		return errors.New("cannot delete item currently on loan")
	}

	_, err = r.pool.Exec(ctx, `DELETE FROM items WHERE id = $1`, id)
	return err
}

func (r *ItemRepo) GetMasters(ctx context.Context) (map[string]interface{}, error) {
	collRows, err := r.pool.Query(ctx, `SELECT id, name FROM mst_coll_types ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer collRows.Close()

	var collTypes []domain.CollType
	for collRows.Next() {
		var c domain.CollType
		_ = collRows.Scan(&c.ID, &c.Name)
		collTypes = append(collTypes, c)
	}

	locRows, err := r.pool.Query(ctx, `SELECT id, name FROM mst_locations ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer locRows.Close()

	var locations []domain.Location
	for locRows.Next() {
		var l domain.Location
		_ = locRows.Scan(&l.ID, &l.Name)
		locations = append(locations, l)
	}

	statusRows, err := r.pool.Query(ctx, `SELECT id, name, no_loan, skip_stock_take FROM mst_item_statuses ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer statusRows.Close()

	var statuses []domain.ItemStatus
	for statusRows.Next() {
		var s domain.ItemStatus
		_ = statusRows.Scan(&s.ID, &s.Name, &s.NoLoan, &s.SkipStockTake)
		statuses = append(statuses, s)
	}

	return map[string]interface{}{
		"coll_types":    collTypes,
		"locations":     locations,
		"item_statuses": statuses,
	}, nil
}
