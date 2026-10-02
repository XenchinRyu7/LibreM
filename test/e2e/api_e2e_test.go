package e2e_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"testing"
	"time"
)

const baseURL = "http://127.0.0.1:8080/api/v1"

func isServerRunning() bool {
	client := http.Client{Timeout: 800 * time.Millisecond}
	resp, err := client.Get(baseURL + "/health")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

func TestE2E_FullDataflow(t *testing.T) {
	if !isServerRunning() {
		t.Skip("LibreM server is not running on port 8080, skipping live E2E test")
	}

	client := &http.Client{Timeout: 10 * time.Second}
	var authToken string

	// 1. Health
	t.Run("Health", func(t *testing.T) {
		resp, err := client.Get(baseURL + "/health")
		if err != nil {
			t.Fatalf("health check failed: %v", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Errorf("expected 200, got %d", resp.StatusCode)
		}
	})

	// 2. Auth Login
	t.Run("Superadmin Login", func(t *testing.T) {
		loginPayload := map[string]string{
			"username": "admin",
			"password": "admin123",
		}
		b, _ := json.Marshal(loginPayload)
		resp, err := client.Post(baseURL+"/auth/login", "application/json", bytes.NewReader(b))
		if err != nil {
			t.Fatalf("login failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("login status %d: %s", resp.StatusCode, string(body))
		}

		var res struct {
			Token string `json:"token"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
			t.Fatalf("decode login response: %v", err)
		}
		if res.Token == "" {
			t.Fatal("empty JWT token returned")
		}
		authToken = res.Token
	})

	// Helper for authenticated requests
	authRequest := func(method, endpoint string, bodyData interface{}) (*http.Response, error) {
		var bodyReader io.Reader
		if bodyData != nil {
			b, _ := json.Marshal(bodyData)
			bodyReader = bytes.NewReader(b)
		}
		req, err := http.NewRequest(method, baseURL+endpoint, bodyReader)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+authToken)
		req.Header.Set("Content-Type", "application/json")
		return client.Do(req)
	}

	// 3. Auth Me
	t.Run("Auth Me", func(t *testing.T) {
		resp, err := authRequest("GET", "/auth/me", nil)
		if err != nil {
			t.Fatalf("failed /auth/me: %v", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Errorf("expected 200, got %d", resp.StatusCode)
		}
	})

	// 4. Catalog Masters
	t.Run("Catalog Masters", func(t *testing.T) {
		resp, err := client.Get(baseURL + "/catalog/masters")
		if err != nil {
			t.Fatalf("failed /catalog/masters: %v", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Errorf("expected 200, got %d", resp.StatusCode)
		}
	})

	// 5. Create Biblio, Item, Member, and Circulation Cycle
	t.Run("Full Circulation Lifecycle", func(t *testing.T) {
		rnd := rand.Intn(90000) + 10000

		// A. Create Biblio
		biblioReq := map[string]interface{}{
			"title":         fmt.Sprintf("Go Testing Biblio %d", rnd),
			"publish_year":  "2026",
			"language_code": "id",
		}
		resp, err := authRequest("POST", "/catalog/biblios", biblioReq)
		if err != nil {
			t.Fatalf("create biblio failed: %v", err)
		}
		var biblioRes struct {
			ID int64 `json:"id"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&biblioRes)
		resp.Body.Close()
		if biblioRes.ID == 0 {
			t.Fatal("expected non-zero biblio ID")
		}

		// B. Batch Create Item
		itemReq := map[string]interface{}{
			"biblio_id":      biblioRes.ID,
			"barcode_prefix": "GO",
			"quantity":       1,
		}
		resp, err = authRequest("POST", "/catalog/items/batch", itemReq)
		if err != nil {
			t.Fatalf("batch create item failed: %v", err)
		}
		var itemRes struct {
			GeneratedItems []struct {
				ID      int64  `json:"id"`
				Barcode string `json:"barcode"`
			} `json:"generated_items"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&itemRes)
		resp.Body.Close()
		if len(itemRes.GeneratedItems) == 0 {
			t.Fatal("expected generated item")
		}
		itemBarcode := itemRes.GeneratedItems[0].Barcode

		// C. Create Member
		memberID := fmt.Sprintf("MBR-GO-%d", rnd)
		memReq := map[string]interface{}{
			"id":             memberID,
			"full_name":      "Go E2E Member",
			"gender":         "M",
			"member_type_id": 1,
		}
		resp, err = authRequest("POST", "/members", memReq)
		if err != nil {
			t.Fatalf("create member failed: %v", err)
		}
		resp.Body.Close()

		// D. Checkout
		checkoutReq := map[string]interface{}{
			"member_id": memberID,
			"barcode":   itemBarcode,
		}
		resp, err = authRequest("POST", "/circulation/checkout", checkoutReq)
		if err != nil {
			t.Fatalf("checkout failed: %v", err)
		}
		var loanRes struct {
			ID int64 `json:"id"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&loanRes)
		resp.Body.Close()
		if loanRes.ID == 0 {
			t.Fatal("expected non-zero loan ID")
		}

		// E. Renew
		resp, err = authRequest("POST", fmt.Sprintf("/circulation/renew/%d", loanRes.ID), map[string]interface{}{})
		if err != nil {
			t.Fatalf("renew failed: %v", err)
		}
		resp.Body.Close()

		// F. Checkin
		checkinReq := map[string]interface{}{
			"barcode": itemBarcode,
		}
		resp, err = authRequest("POST", "/circulation/checkin", checkinReq)
		if err != nil {
			t.Fatalf("checkin failed: %v", err)
		}
		if resp.StatusCode != http.StatusOK {
			t.Errorf("checkin expected 200, got %d", resp.StatusCode)
		}
		resp.Body.Close()
	})
}
