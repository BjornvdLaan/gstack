package store

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/getquantumdrive/groundstate/internal/types"
	_ "modernc.org/sqlite"
)

const maxReportsPerSource = 50

// Store wraps a SQLite database connection.
type Store struct {
	db *sql.DB
}

// Open opens (or creates) the SQLite database at path and runs migrations.
func Open(path string) (*Store, error) {
	db, err := sql.Open("sqlite", path+"?_journal_mode=WAL&_busy_timeout=5000&_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	db.SetMaxOpenConns(1)

	s := &Store{db: db}
	if err := s.migrate(); err != nil {
		db.Close()
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return s, nil
}

// Close closes the underlying database connection.
func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) migrate() error {
	_, err := s.db.Exec(`
		CREATE TABLE IF NOT EXISTS orgs (
			id         TEXT PRIMARY KEY,
			name       TEXT NOT NULL,
			api_key    TEXT UNIQUE NOT NULL,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS reports (
			id               TEXT PRIMARY KEY,
			org_id           TEXT NOT NULL,
			source           TEXT NOT NULL,
			scanned_at       TEXT NOT NULL,
			received_at      TEXT NOT NULL,
			risk_critical    INTEGER NOT NULL DEFAULT 0,
			risk_high        INTEGER NOT NULL DEFAULT 0,
			risk_total       INTEGER NOT NULL DEFAULT 0,
			worst_compliance TEXT NOT NULL DEFAULT 'COMPLIANT',
			payload          TEXT NOT NULL,
			FOREIGN KEY (org_id) REFERENCES orgs(id)
		);

		CREATE INDEX IF NOT EXISTS idx_reports_org_source ON reports(org_id, source);
		CREATE INDEX IF NOT EXISTS idx_reports_scanned    ON reports(org_id, scanned_at DESC);
	`)
	return err
}

// GetOrgByKey looks up an organisation by its API key.
func (s *Store) GetOrgByKey(apiKey string) (*types.Org, error) {
	row := s.db.QueryRow(
		`SELECT id, name, api_key, created_at FROM orgs WHERE api_key = ?`, apiKey,
	)
	return scanOrg(row)
}

// GetOrg looks up an organisation by its ID.
func (s *Store) GetOrg(orgID string) (*types.Org, error) {
	row := s.db.QueryRow(
		`SELECT id, name, api_key, created_at FROM orgs WHERE id = ?`, orgID,
	)
	return scanOrg(row)
}

func scanOrg(row *sql.Row) (*types.Org, error) {
	var o types.Org
	if err := row.Scan(&o.ID, &o.Name, &o.APIKey, &o.CreatedAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &o, nil
}

// SaveReport inserts a report and trims the per-org-per-source cap to 50 newest.
func (s *Store) SaveReport(orgID string, report types.StoredReport) error {
	payload, err := json.Marshal(report)
	if err != nil {
		return fmt.Errorf("marshal report: %w", err)
	}

	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		INSERT OR REPLACE INTO reports
			(id, org_id, source, scanned_at, received_at, risk_critical, risk_high, risk_total, worst_compliance, payload)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		report.ID,
		orgID,
		report.Source,
		report.ScannedAt,
		report.ReceivedAt,
		report.RiskSummary.Critical,
		report.RiskSummary.High,
		report.RiskSummary.Total,
		worstCompliance(report),
		string(payload),
	)
	if err != nil {
		return fmt.Errorf("insert report: %w", err)
	}

	// Trim to maxReportsPerSource newest entries for this org+source.
	_, err = tx.Exec(`
		DELETE FROM reports
		WHERE org_id = ? AND source = ?
		  AND id NOT IN (
			  SELECT id FROM reports
			  WHERE org_id = ? AND source = ?
			  ORDER BY scanned_at DESC
			  LIMIT ?
		  )`,
		orgID, report.Source,
		orgID, report.Source,
		maxReportsPerSource,
	)
	if err != nil {
		return fmt.Errorf("trim reports: %w", err)
	}

	return tx.Commit()
}

// GetRepoSummaries returns one RepoSummary per distinct source for an org,
// computing trends from the two most recent scans. Results are sorted worst
// compliance first, then by source name.
func (s *Store) GetRepoSummaries(orgID string) ([]types.RepoSummary, error) {
	// Get all distinct sources.
	rows, err := s.db.Query(`
		SELECT DISTINCT source FROM reports WHERE org_id = ? ORDER BY source`,
		orgID,
	)
	if err != nil {
		return nil, err
	}
	var sources []string
	for rows.Next() {
		var src string
		if err := rows.Scan(&src); err != nil {
			rows.Close()
			return nil, err
		}
		sources = append(sources, src)
	}
	rows.Close()

	var summaries []types.RepoSummary
	for _, src := range sources {
		summary, err := s.buildRepoSummary(orgID, src)
		if err != nil {
			return nil, err
		}
		summaries = append(summaries, summary)
	}

	// Sort: NON-COMPLIANT first, then AT RISK, then COMPLIANT.
	sortSummaries(summaries)
	return summaries, nil
}

func (s *Store) buildRepoSummary(orgID, source string) (types.RepoSummary, error) {
	rows, err := s.db.Query(`
		SELECT payload FROM reports
		WHERE org_id = ? AND source = ?
		ORDER BY scanned_at DESC
		LIMIT 2`,
		orgID, source,
	)
	if err != nil {
		return types.RepoSummary{}, err
	}
	defer rows.Close()

	var reports []types.StoredReport
	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return types.RepoSummary{}, err
		}
		var r types.StoredReport
		if err := json.Unmarshal([]byte(raw), &r); err != nil {
			return types.RepoSummary{}, err
		}
		reports = append(reports, r)
	}
	if err := rows.Err(); err != nil {
		return types.RepoSummary{}, err
	}

	var countRow *sql.Row
	countRow = s.db.QueryRow(
		`SELECT COUNT(*) FROM reports WHERE org_id = ? AND source = ?`,
		orgID, source,
	)
	var total int
	countRow.Scan(&total)

	summary := types.RepoSummary{
		Repo:        source,
		ReportCount: total,
		Trend:       "new",
	}
	if len(reports) > 0 {
		summary.LatestReport = reports[0]
	}
	if len(reports) >= 2 {
		summary.Trend = computeTrend(reports[1], reports[0])
	}
	return summary, nil
}

// GetRepoReports returns all stored reports for a repo, newest first.
func (s *Store) GetRepoReports(orgID, source string) ([]types.StoredReport, error) {
	rows, err := s.db.Query(`
		SELECT payload FROM reports
		WHERE org_id = ? AND source = ?
		ORDER BY scanned_at DESC`,
		orgID, source,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []types.StoredReport
	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return nil, err
		}
		var r types.StoredReport
		if err := json.Unmarshal([]byte(raw), &r); err != nil {
			return nil, err
		}
		result = append(result, r)
	}
	return result, rows.Err()
}

// EnsureDemoOrg idempotently creates the demo organisation.
func (s *Store) EnsureDemoOrg() error {
	_, err := s.db.Exec(`
		INSERT OR IGNORE INTO orgs (id, name, api_key, created_at)
		VALUES ('demo', 'Demo Organisation', 'demo-key', ?)`,
		time.Now().UTC().Format(time.RFC3339),
	)
	return err
}

// SeedDemoReports seeds reports for the demo org if none exist yet.
func (s *Store) SeedDemoReports(reports []types.StoredReport) error {
	var count int
	row := s.db.QueryRow(`SELECT COUNT(*) FROM reports WHERE org_id = 'demo'`)
	if err := row.Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	for _, r := range reports {
		if err := s.SaveReport("demo", r); err != nil {
			return err
		}
	}
	return nil
}

// worstCompliance returns the worst compliance state across all four frameworks.
func worstCompliance(r types.StoredReport) string {
	for _, v := range []string{
		r.Compliance.NISTFIPS203,
		r.Compliance.NISTFIPS204,
		r.Compliance.NIS2,
		r.Compliance.DORA,
	} {
		if v == types.ComplianceNonCompliant {
			return types.ComplianceNonCompliant
		}
	}
	for _, v := range []string{
		r.Compliance.NISTFIPS203,
		r.Compliance.NISTFIPS204,
		r.Compliance.NIS2,
		r.Compliance.DORA,
	} {
		if v == types.ComplianceAtRisk {
			return types.ComplianceAtRisk
		}
	}
	return types.ComplianceCompliant
}

// computeTrend compares older → newer by total findings count.
func computeTrend(older, newer types.StoredReport) string {
	switch {
	case newer.RiskSummary.Total < older.RiskSummary.Total:
		return "improving"
	case newer.RiskSummary.Total > older.RiskSummary.Total:
		return "worsening"
	default:
		return "stable"
	}
}

// complianceRank assigns a numeric rank for sorting (higher = worse).
func complianceRank(c string) int {
	switch c {
	case types.ComplianceNonCompliant:
		return 2
	case types.ComplianceAtRisk:
		return 1
	default:
		return 0
	}
}

func sortSummaries(summaries []types.RepoSummary) {
	for i := 1; i < len(summaries); i++ {
		for j := i; j > 0; j-- {
			ri := complianceRank(worstCompliance(summaries[j].LatestReport))
			rj := complianceRank(worstCompliance(summaries[j-1].LatestReport))
			if ri > rj {
				summaries[j], summaries[j-1] = summaries[j-1], summaries[j]
			} else {
				break
			}
		}
	}
}
