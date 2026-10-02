package service_test

import (
	"regexp"
	"testing"

	"librem/internal/service"
)

func TestLicenseService_GenerateMachineID(t *testing.T) {
	svc := service.NewLicenseService()
	machineID := svc.GenerateMachineID()

	if machineID == "" {
		t.Fatal("expected non-empty machine ID")
	}

	pattern := `^PE-[0-9A-F]{4}-[0-9A-F]{12}$`
	matched, err := regexp.MatchString(pattern, machineID)
	if err != nil {
		t.Fatalf("regex error: %v", err)
	}
	if !matched {
		t.Errorf("machine ID '%s' does not match expected format 'PE-XXXX-XXXXXXXXXXXX'", machineID)
	}

	// Determinism check on same hardware
	secondID := svc.GenerateMachineID()
	if machineID != secondID {
		t.Errorf("machine ID must be deterministic on same machine: got %s, then %s", machineID, secondID)
	}
}

func TestLicenseService_VerifyLicense(t *testing.T) {
	svc := service.NewLicenseService()

	t.Run("Empty token fails", func(t *testing.T) {
		_, err := svc.VerifyLicense("")
		if err == nil {
			t.Error("expected error for empty license token, got nil")
		}
	})

	t.Run("Valid trial/educational token passes", func(t *testing.T) {
		info, err := svc.VerifyLicense("LIBREM-2026-TRIAL-COMMERCIAL-UNLIMITED")
		if err != nil {
			t.Fatalf("expected valid license, got error: %v", err)
		}
		if info.Status != "VALID" {
			t.Errorf("expected status VALID, got %s", info.Status)
		}
		if info.MaxLANNodes <= 0 {
			t.Errorf("expected positive MaxLANNodes, got %d", info.MaxLANNodes)
		}
	})
}
