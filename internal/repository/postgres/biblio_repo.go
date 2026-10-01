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

type BiblioRepo struct {
	pool *pgxpool.Pool
}

func NewBiblioRepo(pool *pgxpool.Pool) *BiblioRepo {
	return &BiblioRepo{pool: pool}
}

func (r *BiblioRepo) List(ctx context.Context, queryStr string, limit, offset int, classification string) ([]domain.Biblio, int64, error) {
	var conditions []string
	var args []interface{}
	argIdx := 1

	if strings.TrimSpace(queryStr) != "" {
		conditions = append(conditions, fmt.Sprintf("(b.title ILIKE $%d OR b.isbn_issn ILIKE $%d OR b.call_number ILIKE $%d OR b.sor ILIKE $%d)", argIdx, argIdx, argIdx, argIdx))
		args = append(args, "%"+strings.TrimSpace(queryStr)+"%")
		argIdx++
	}

	if strings.TrimSpace(classification) != "" {
		conditions = append(conditions, fmt.Sprintf("b.classification LIKE $%d", argIdx))
		args = append(args, strings.TrimSpace(classification)+"%")
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM biblios b %s`, whereClause)
	var totalRecords int64
	err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalRecords)
	if err != nil {
		return nil, 0, err
	}

	dataQuery := fmt.Sprintf(`
		SELECT b.id, b.title, COALESCE(b.sor, ''), COALESCE(b.edition, ''), COALESCE(b.isbn_issn, ''),
		       b.publisher_id, COALESCE(p.name, ''), b.publish_place_id, COALESCE(pl.name, ''),
		       COALESCE(b.publish_year, ''), COALESCE(b."collation", ''), COALESCE(b.series_title, ''),
		       COALESCE(b.call_number, ''), COALESCE(b.language_code, ''), COALESCE(b.classification, ''),
		       COALESCE(b.notes, ''), COALESCE(b.cover_image, ''), b.gmd_id, COALESCE(g.name, ''),
		       b.opac_hide, b.promoted, b.created_at, b.updated_at,
		       (SELECT COUNT(*) FROM items i WHERE i.biblio_id = b.id) AS total_items,
		       (SELECT COUNT(*) FROM items i WHERE i.biblio_id = b.id AND i.id NOT IN (SELECT l.item_id FROM loans l WHERE l.is_return = FALSE)) AS available_items
		FROM biblios b
		LEFT JOIN mst_publishers p ON b.publisher_id = p.id
		LEFT JOIN mst_places pl ON b.publish_place_id = pl.id
		LEFT JOIN mst_gmd g ON b.gmd_id = g.id
		%s
		ORDER BY b.id DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var biblios []domain.Biblio
	for rows.Next() {
		var b domain.Biblio
		err := rows.Scan(
			&b.ID, &b.Title, &b.SOR, &b.Edition, &b.ISBNISSN,
			&b.PublisherID, &b.PublisherName, &b.PublishPlaceID, &b.PublishPlace,
			&b.PublishYear, &b.Collation, &b.SeriesTitle,
			&b.CallNumber, &b.LanguageCode, &b.Classification,
			&b.Notes, &b.CoverImage, &b.GMDID, &b.GMDName,
			&b.OPACHide, &b.Promoted, &b.CreatedAt, &b.UpdatedAt,
			&b.TotalItems, &b.AvailableItems,
		)
		if err != nil {
			return nil, 0, err
		}
		biblios = append(biblios, b)
	}

	// Fetch authors for these biblios
	for i := range biblios {
		authors, err := r.getAuthorsForBiblio(ctx, biblios[i].ID)
		if err == nil {
			biblios[i].Authors = authors
		}
	}

	return biblios, totalRecords, nil
}

func (r *BiblioRepo) getAuthorsForBiblio(ctx context.Context, biblioID int64) ([]domain.Author, error) {
	q := `
		SELECT a.id, a.name, a.authority_type, ba.level
		FROM biblio_authors ba
		JOIN mst_authors a ON ba.author_id = a.id
		WHERE ba.biblio_id = $1
		ORDER BY ba.level ASC
	`
	rows, err := r.pool.Query(ctx, q, biblioID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var authors []domain.Author
	for rows.Next() {
		var a domain.Author
		if err := rows.Scan(&a.ID, &a.Name, &a.AuthorityType, &a.Level); err == nil {
			authors = append(authors, a)
		}
	}
	return authors, nil
}

func (r *BiblioRepo) FindByID(ctx context.Context, id int64) (*domain.Biblio, error) {
	query := `
		SELECT b.id, b.title, COALESCE(b.sor, ''), COALESCE(b.edition, ''), COALESCE(b.isbn_issn, ''),
		       b.publisher_id, COALESCE(p.name, ''), b.publish_place_id, COALESCE(pl.name, ''),
		       COALESCE(b.publish_year, ''), COALESCE(b."collation", ''), COALESCE(b.series_title, ''),
		       COALESCE(b.call_number, ''), COALESCE(b.language_code, ''), COALESCE(b.classification, ''),
		       COALESCE(b.notes, ''), COALESCE(b.cover_image, ''), b.gmd_id, COALESCE(g.name, ''),
		       b.opac_hide, b.promoted, b.created_at, b.updated_at,
		       (SELECT COUNT(*) FROM items i WHERE i.biblio_id = b.id) AS total_items,
		       (SELECT COUNT(*) FROM items i WHERE i.biblio_id = b.id AND i.id NOT IN (SELECT l.item_id FROM loans l WHERE l.is_return = FALSE)) AS available_items
		FROM biblios b
		LEFT JOIN mst_publishers p ON b.publisher_id = p.id
		LEFT JOIN mst_places pl ON b.publish_place_id = pl.id
		LEFT JOIN mst_gmd g ON b.gmd_id = g.id
		WHERE b.id = $1
	`
	var b domain.Biblio
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&b.ID, &b.Title, &b.SOR, &b.Edition, &b.ISBNISSN,
		&b.PublisherID, &b.PublisherName, &b.PublishPlaceID, &b.PublishPlace,
		&b.PublishYear, &b.Collation, &b.SeriesTitle,
		&b.CallNumber, &b.LanguageCode, &b.Classification,
		&b.Notes, &b.CoverImage, &b.GMDID, &b.GMDName,
		&b.OPACHide, &b.Promoted, &b.CreatedAt, &b.UpdatedAt,
		&b.TotalItems, &b.AvailableItems,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	authors, _ := r.getAuthorsForBiblio(ctx, b.ID)
	b.Authors = authors
	return &b, nil
}

func (r *BiblioRepo) Create(ctx context.Context, req domain.CreateBiblioRequest) (*domain.Biblio, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	query := `
		INSERT INTO biblios (
			title, sor, edition, isbn_issn, publisher_id, publish_place_id,
			publish_year, "collation", series_title, call_number, language_code,
			classification, notes, cover_image, gmd_id, promoted
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		RETURNING id
	`
	var newID int64
	err = tx.QueryRow(ctx, query,
		req.Title, req.SOR, req.Edition, req.ISBNISSN, req.PublisherID, req.PublishPlaceID,
		req.PublishYear, req.Collation, req.SeriesTitle, req.CallNumber, req.LanguageCode,
		req.Classification, req.Notes, req.CoverImage, req.GMDID, req.Promoted,
	).Scan(&newID)
	if err != nil {
		return nil, err
	}

	for idx, authorID := range req.AuthorIDs {
		level := 1
		if idx > 0 {
			level = 2
		}
		_, err := tx.Exec(ctx, `INSERT INTO biblio_authors (biblio_id, author_id, level) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, newID, authorID, level)
		if err != nil {
			return nil, err
		}
	}

	for idx, topicID := range req.TopicIDs {
		level := 1
		if idx > 0 {
			level = 2
		}
		_, err := tx.Exec(ctx, `INSERT INTO biblio_topics (biblio_id, topic_id, level) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, newID, topicID, level)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return r.FindByID(ctx, newID)
}

func (r *BiblioRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM biblios WHERE id = $1`, id)
	return err
}

func (r *BiblioRepo) GetMasters(ctx context.Context) (map[string]interface{}, error) {
	publishersRows, err := r.pool.Query(ctx, `SELECT id, name FROM mst_publishers ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer publishersRows.Close()

	var publishers []domain.Publisher
	for publishersRows.Next() {
		var p domain.Publisher
		_ = publishersRows.Scan(&p.ID, &p.Name)
		publishers = append(publishers, p)
	}

	placesRows, err := r.pool.Query(ctx, `SELECT id, name FROM mst_places ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer placesRows.Close()

	var places []domain.Place
	for placesRows.Next() {
		var pl domain.Place
		_ = placesRows.Scan(&pl.ID, &pl.Name)
		places = append(places, pl)
	}

	gmdRows, err := r.pool.Query(ctx, `SELECT id, code, name FROM mst_gmd ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer gmdRows.Close()

	var gmds []domain.GMD
	for gmdRows.Next() {
		var g domain.GMD
		_ = gmdRows.Scan(&g.ID, &g.Code, &g.Name)
		gmds = append(gmds, g)
	}

	authorRows, err := r.pool.Query(ctx, `SELECT id, name, authority_type FROM mst_authors ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer authorRows.Close()

	var authors []domain.Author
	for authorRows.Next() {
		var a domain.Author
		_ = authorRows.Scan(&a.ID, &a.Name, &a.AuthorityType)
		authors = append(authors, a)
	}

	return map[string]interface{}{
		"publishers": publishers,
		"places":     places,
		"gmds":       gmds,
		"authors":    authors,
	}, nil
}
