package types

// Severity constants for findings.
const (
	SeverityCritical = "CRITICAL"
	SeverityHigh     = "HIGH"
	SeverityMedium   = "MEDIUM"
	SeverityLow      = "LOW"
	SeveritySafe     = "SAFE"
)

// ComplianceValue constants.
const (
	ComplianceCompliant    = "COMPLIANT"
	ComplianceAtRisk       = "AT RISK"
	ComplianceNonCompliant = "NON-COMPLIANT"
)

// Severity is one of CRITICAL | HIGH | MEDIUM | LOW | SAFE.
type Severity = string

// ComplianceValue is one of COMPLIANT | AT RISK | NON-COMPLIANT.
type ComplianceValue = string

// AIRisk holds AI-specific risk metadata for a finding.
type AIRisk struct {
	Severity     string `json:"severity"`
	Reasoning    string `json:"reasoning"`
	DataLifetime string `json:"dataLifetime"`
}

// Finding represents a single cryptographic vulnerability detected in source code.
type Finding struct {
	RuleID    string   `json:"ruleId"`
	File      string   `json:"file"`
	Line      int      `json:"line"`
	Algorithm string   `json:"algorithm"`
	Severity  Severity `json:"severity"`
	Snippet   string   `json:"snippet"`
	Message   string   `json:"message"`
	Migration string   `json:"migration"`
	AIRisk    *AIRisk  `json:"aiRisk,omitempty"`
}

// RiskSummary holds aggregate counts of findings by severity.
type RiskSummary struct {
	Critical int `json:"critical"`
	High     int `json:"high"`
	Medium   int `json:"medium"`
	Low      int `json:"low"`
	Safe     int `json:"safe"`
	Total    int `json:"total"`
}

// ComplianceStatus holds the compliance verdict per regulatory framework.
type ComplianceStatus struct {
	NISTFIPS203 ComplianceValue `json:"nist_fips_203"`
	NISTFIPS204 ComplianceValue `json:"nist_fips_204"`
	NIS2        ComplianceValue `json:"nis2"`
	DORA        ComplianceValue `json:"dora"`
}

// ScanReport is the payload posted by the Observer GitHub Action.
type ScanReport struct {
	ID           string           `json:"id"`
	Source       string           `json:"source"`
	Ref          string           `json:"ref,omitempty"`
	SHA          string           `json:"sha,omitempty"`
	ScannedAt    string           `json:"scannedAt"`
	FilesScanned int              `json:"filesScanned"`
	RulesApplied int              `json:"rulesApplied,omitempty"`
	Findings     []Finding        `json:"findings"`
	RiskSummary  RiskSummary      `json:"riskSummary"`
	Compliance   ComplianceStatus `json:"compliance"`
	AIScoring    bool             `json:"aiScoringEnabled"`
}

// StoredReport is a ScanReport enriched with storage metadata.
type StoredReport struct {
	ScanReport
	OrgID      string `json:"orgId"`
	ReceivedAt string `json:"receivedAt"`
}

// RepoSummary is the aggregated view of a repository across all its scans.
type RepoSummary struct {
	Repo         string
	LatestReport StoredReport
	ReportCount  int
	// Trend is one of "improving" | "worsening" | "stable" | "new".
	Trend string
}

// Org represents a customer organisation.
type Org struct {
	ID        string
	Name      string
	APIKey    string
	CreatedAt string
}
