package domain

import (
	"time"
)

type Biblio struct {
	ID             int64         `json:"id"`
	Title          string        `json:"title"`
	SOR            string        `json:"sor,omitempty"`
	Edition        string        `json:"edition,omitempty"`
	ISBNISSN       string        `json:"isbn_issn,omitempty"`
	PublisherID    *int          `json:"publisher_id,omitempty"`
	PublisherName  string        `json:"publisher_name,omitempty"`
	PublishPlaceID *int          `json:"publish_place_id,omitempty"`
	PublishPlace   string        `json:"publish_place,omitempty"`
	PublishYear    string        `json:"publish_year,omitempty"`
	Collation      string        `json:"collation,omitempty"`
	SeriesTitle    string        `json:"series_title,omitempty"`
	CallNumber     string        `json:"call_number,omitempty"`
	LanguageCode   string        `json:"language_code,omitempty"`
	Classification string        `json:"classification,omitempty"`
	Notes          string        `json:"notes,omitempty"`
	CoverImage     string        `json:"cover_image,omitempty"`
	GMDID          *int          `json:"gmd_id,omitempty"`
	GMDName        string        `json:"gmd_name,omitempty"`
	OPACHide       bool          `json:"opac_hide"`
	Promoted       bool          `json:"promoted"`
	TotalItems     int           `json:"total_items"`
	AvailableItems int           `json:"available_items"`
	Authors        []Author      `json:"authors,omitempty"`
	Topics         []Topic       `json:"topics,omitempty"`
	CreatedAt      time.Time     `json:"created_at"`
	UpdatedAt      time.Time     `json:"updated_at"`
}

type Author struct {
	ID            int64  `json:"id"`
	Name          string `json:"name"`
	AuthorityType string `json:"authority_type"`
	Level         int    `json:"level"` // 1: Primary, 2: Additional, 3: Editor
}

type Topic struct {
	ID        int64  `json:"id"`
	Topic     string `json:"topic"`
	TopicType string `json:"topic_type"`
	Level     int    `json:"level"`
}

type Publisher struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Place struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type GMD struct {
	ID   int    `json:"id"`
	Code string `json:"code"`
	Name string `json:"name"`
}

type Language struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

type CreateBiblioRequest struct {
	Title          string  `json:"title"`
	SOR            string  `json:"sor"`
	Edition        string  `json:"edition"`
	ISBNISSN       string  `json:"isbn_issn"`
	PublisherID    *int    `json:"publisher_id"`
	PublishPlaceID *int    `json:"publish_place_id"`
	PublishYear    string  `json:"publish_year"`
	Collation      string  `json:"collation"`
	SeriesTitle    string  `json:"series_title"`
	CallNumber     string  `json:"call_number"`
	LanguageCode   string  `json:"language_code"`
	Classification string  `json:"classification"`
	Notes          string  `json:"notes"`
	CoverImage     string  `json:"cover_image"`
	GMDID          *int    `json:"gmd_id"`
	AuthorIDs      []int64 `json:"author_ids"`
	TopicIDs       []int64 `json:"topic_ids"`
	Promoted       bool    `json:"promoted"`
}
