package seed

import (
	"time"

	"github.com/getquantumdrive/groundstate/internal/types"
)

func t(s string) string { return s }

// Reports returns realistic demo scan reports for three repositories.
func Reports() []types.StoredReport {
	now := time.Now().UTC()
	ago := func(d time.Duration) string {
		return now.Add(-d).Format(time.RFC3339)
	}

	return []types.StoredReport{
		// payment-service — NON-COMPLIANT, worsening
		{
			OrgID:      "demo",
			ReceivedAt: ago(2 * time.Hour),
			ScanReport: types.ScanReport{
				ID:           "seed-payment-1",
				Source:       "acme-corp/payment-service",
				Ref:          "main",
				SHA:          "a1b2c3d4",
				ScannedAt:    ago(2 * time.Hour),
				FilesScanned: 142,
				Findings: []types.Finding{
					{
						RuleID:    "java-rsa-keygen",
						File:      "src/main/java/com/acme/payments/KeyManager.java",
						Line:      42,
						Algorithm: "RSA",
						Severity:  types.SeverityHigh,
						Snippet:   "KeyPairGenerator kpg = KeyPairGenerator.getInstance(\"RSA\");\nkpg.initialize(2048);\nKeyPair kp = kpg.generateKeyPair();",
						Message:   "RSA key generation detected. RSA is vulnerable to Shor's algorithm on quantum computers.",
						Migration: "Replace with CRYSTALS-Kyber (FIPS 203) for key encapsulation or CRYSTALS-Dilithium (FIPS 204) for signatures.",
					},
					{
						RuleID:    "java-sha1-sig",
						File:      "src/main/java/com/acme/payments/LegacySigner.java",
						Line:      17,
						Algorithm: "SHA1withRSA",
						Severity:  types.SeverityCritical,
						Snippet:   "Signature sig = Signature.getInstance(\"SHA1withRSA\");\nsig.initSign(privateKey);\nsig.update(data);",
						Message:   "SHA-1 based signature scheme detected. SHA-1 is cryptographically broken and the underlying RSA primitive is quantum-vulnerable.",
						Migration: "Replace immediately with CRYSTALS-Dilithium (FIPS 204). SHA-1 has been retired by NIST.",
					},
					{
						RuleID:    "java-ecdh-agreement",
						File:      "src/main/java/com/acme/payments/SessionKey.java",
						Line:      88,
						Algorithm: "ECDH",
						Severity:  types.SeverityHigh,
						Snippet:   "KeyAgreement ka = KeyAgreement.getInstance(\"ECDH\");\nka.init(privateKey);\nka.doPhase(peerPublicKey, true);",
						Message:   "ECDH key agreement detected. Elliptic-curve Diffie-Hellman is broken by Shor's algorithm.",
						Migration: "Replace with CRYSTALS-Kyber (ML-KEM, FIPS 203) for key encapsulation.",
					},
					{
						RuleID:    "java-ec-keygen",
						File:      "src/main/java/com/acme/payments/TokenService.java",
						Line:      55,
						Algorithm: "ECDSA",
						Severity:  types.SeverityHigh,
						Snippet:   "KeyPairGenerator kpg = KeyPairGenerator.getInstance(\"EC\");\nkpg.initialize(new ECGenParameterSpec(\"secp256r1\"));\nKeyPair kp = kpg.generateKeyPair();",
						Message:   "Elliptic-curve key generation detected. EC keys are quantum-vulnerable.",
						Migration: "Replace with CRYSTALS-Dilithium (ML-DSA, FIPS 204) for digital signatures.",
					},
				},
				RiskSummary: types.RiskSummary{Critical: 1, High: 3, Total: 4},
				Compliance: types.ComplianceStatus{
					NISTFIPS203: types.ComplianceNonCompliant,
					NISTFIPS204: types.ComplianceNonCompliant,
					NIS2:        types.ComplianceNonCompliant,
					DORA:        types.ComplianceNonCompliant,
				},
			},
		},
		// payment-service — older scan (3 findings, improving trend)
		{
			OrgID:      "demo",
			ReceivedAt: ago(8 * 24 * time.Hour),
			ScanReport: types.ScanReport{
				ID:           "seed-payment-0",
				Source:       "acme-corp/payment-service",
				Ref:          "main",
				SHA:          "aaaaaaa",
				ScannedAt:    ago(8 * 24 * time.Hour),
				FilesScanned: 138,
				Findings: []types.Finding{
					{
						RuleID:    "java-rsa-keygen",
						File:      "src/main/java/com/acme/payments/KeyManager.java",
						Line:      42,
						Algorithm: "RSA",
						Severity:  types.SeverityHigh,
						Message:   t("RSA key generation detected."),
						Migration: t("Replace with ML-KEM (FIPS 203)."),
					},
					{
						RuleID:    "java-sha1-sig",
						File:      "src/main/java/com/acme/payments/LegacySigner.java",
						Line:      17,
						Algorithm: "SHA1withRSA",
						Severity:  types.SeverityCritical,
						Message:   t("SHA-1 signature detected."),
						Migration: t("Replace with ML-DSA (FIPS 204)."),
					},
					{
						RuleID:    "java-ecdh-agreement",
						File:      "src/main/java/com/acme/payments/SessionKey.java",
						Line:      88,
						Algorithm: "ECDH",
						Severity:  types.SeverityHigh,
						Message:   t("ECDH key agreement detected."),
						Migration: t("Replace with ML-KEM (FIPS 203)."),
					},
				},
				RiskSummary: types.RiskSummary{Critical: 1, High: 2, Total: 3},
				Compliance: types.ComplianceStatus{
					NISTFIPS203: types.ComplianceNonCompliant,
					NISTFIPS204: types.ComplianceNonCompliant,
					NIS2:        types.ComplianceNonCompliant,
					DORA:        types.ComplianceNonCompliant,
				},
			},
		},
		// auth-service — AT RISK, stable
		{
			OrgID:      "demo",
			ReceivedAt: ago(3 * time.Hour),
			ScanReport: types.ScanReport{
				ID:           "seed-auth-1",
				Source:       "acme-corp/auth-service",
				Ref:          "main",
				SHA:          "b2c3d4e5",
				ScannedAt:    ago(3 * time.Hour),
				FilesScanned: 87,
				Findings: []types.Finding{
					{
						RuleID:    "py-rsa-generate",
						File:      "auth/crypto/jwt_keys.py",
						Line:      12,
						Algorithm: "RSA",
						Severity:  types.SeverityHigh,
						Snippet:   "from cryptography.hazmat.primitives.asymmetric import rsa\nprivate_key = rsa.generate_private_key(\n    public_exponent=65537, key_size=2048\n)",
						Message:   "Python RSA key generation detected. RSA is quantum-vulnerable.",
						Migration: "Replace with ML-DSA (FIPS 204) via the `dilithium` Python package once available, or Cloudflare's liboqs bindings.",
					},
				},
				RiskSummary: types.RiskSummary{High: 1, Total: 1},
				Compliance: types.ComplianceStatus{
					NISTFIPS203: types.ComplianceAtRisk,
					NISTFIPS204: types.ComplianceAtRisk,
					NIS2:        types.ComplianceAtRisk,
					DORA:        types.ComplianceAtRisk,
				},
			},
		},
		// auth-service — older scan (same finding, stable trend)
		{
			OrgID:      "demo",
			ReceivedAt: ago(7 * 24 * time.Hour),
			ScanReport: types.ScanReport{
				ID:           "seed-auth-0",
				Source:       "acme-corp/auth-service",
				Ref:          "main",
				SHA:          "bbbbbbbb",
				ScannedAt:    ago(7 * 24 * time.Hour),
				FilesScanned: 85,
				Findings: []types.Finding{
					{
						RuleID:    "py-rsa-generate",
						File:      "auth/crypto/jwt_keys.py",
						Line:      12,
						Algorithm: "RSA",
						Severity:  types.SeverityHigh,
						Message:   t("Python RSA key generation detected."),
						Migration: t("Replace with ML-DSA (FIPS 204)."),
					},
				},
				RiskSummary: types.RiskSummary{High: 1, Total: 1},
				Compliance: types.ComplianceStatus{
					NISTFIPS203: types.ComplianceAtRisk,
					NISTFIPS204: types.ComplianceAtRisk,
					NIS2:        types.ComplianceAtRisk,
					DORA:        types.ComplianceAtRisk,
				},
			},
		},
		// data-api — COMPLIANT
		{
			OrgID:      "demo",
			ReceivedAt: ago(1 * time.Hour),
			ScanReport: types.ScanReport{
				ID:           "seed-data-1",
				Source:       "acme-corp/data-api",
				Ref:          "main",
				SHA:          "c3d4e5f6",
				ScannedAt:    ago(1 * time.Hour),
				FilesScanned: 63,
				Findings:     []types.Finding{},
				RiskSummary:  types.RiskSummary{},
				Compliance: types.ComplianceStatus{
					NISTFIPS203: types.ComplianceCompliant,
					NISTFIPS204: types.ComplianceCompliant,
					NIS2:        types.ComplianceCompliant,
					DORA:        types.ComplianceCompliant,
				},
			},
		},
	}
}
