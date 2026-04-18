package web

import (
	"embed"
	"encoding/json"
	"html/template"
	"net/http"
	"strings"
	"time"

	"github.com/getquantumdrive/groundstate/internal/store"
	"github.com/getquantumdrive/groundstate/internal/types"
)

//go:embed templates/*.html
var templateFS embed.FS

var tmpl = template.Must(
	template.New("").Funcs(template.FuncMap{
		"complianceClass": complianceClass,
		"complianceLabel": complianceLabel,
		"severityClass":   severityClass,
		"trendIcon":       trendIcon,
		"shortDate":       shortDate,
		"repoSlug":        repoSlug,
	}).ParseFS(templateFS, "templates/*.html"),
)

// Handler returns an http.Handler for the Groundstate web UI and API.
func Handler(s *store.Store) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /", dashboardHandler(s))
	mux.HandleFunc("GET /repos/{slug}", repoHandler(s))
	mux.HandleFunc("POST /api/reports", ingestHandler(s))
	return mux
}

// --- dashboard ---

type dashboardData struct {
	OrgName   string
	Summaries []types.RepoSummary
	Now       string
}

func dashboardHandler(s *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		summaries, err := s.GetRepoSummaries("demo")
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		tmpl.ExecuteTemplate(w, "dashboard.html", dashboardData{
			OrgName:   "Demo Organisation",
			Summaries: summaries,
			Now:       time.Now().UTC().Format("2 Jan 2006 15:04 UTC"),
		})
	}
}

// --- repo detail ---

type repoData struct {
	Slug    string
	Reports []types.StoredReport
}

func repoHandler(s *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		slug := r.PathValue("slug")
		// Decode URL-encoded slug back to "org/repo" form.
		repo := strings.ReplaceAll(slug, "--", "/")
		reports, err := s.GetRepoReports("demo", repo)
		if err != nil || len(reports) == 0 {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		tmpl.ExecuteTemplate(w, "repo.html", repoData{Slug: slug, Reports: reports})
	}
}

// --- ingest API ---

func ingestHandler(s *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Bearer token auth.
		auth := r.Header.Get("Authorization")
		token := strings.TrimPrefix(auth, "Bearer ")
		org, err := s.GetOrgByKey(token)
		if err != nil || org == nil {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		var report types.ScanReport
		if err := json.NewDecoder(r.Body).Decode(&report); err != nil {
			http.Error(w, `{"error":"bad request"}`, http.StatusBadRequest)
			return
		}

		stored := types.StoredReport{
			ScanReport: report,
			OrgID:      org.ID,
			ReceivedAt: time.Now().UTC().Format(time.RFC3339),
		}
		if err := s.SaveReport(org.ID, stored); err != nil {
			http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	}
}

// --- template helpers ---

func complianceClass(v string) string {
	switch v {
	case types.ComplianceNonCompliant:
		return "badge-red"
	case types.ComplianceAtRisk:
		return "badge-yellow"
	default:
		return "badge-green"
	}
}

func complianceLabel(v string) string {
	switch v {
	case types.ComplianceNonCompliant:
		return "NON-COMPLIANT"
	case types.ComplianceAtRisk:
		return "AT RISK"
	default:
		return "COMPLIANT"
	}
}

func severityClass(v string) string {
	switch v {
	case types.SeverityCritical:
		return "sev-critical"
	case types.SeverityHigh:
		return "sev-high"
	case types.SeverityMedium:
		return "sev-medium"
	default:
		return "sev-low"
	}
}

func trendIcon(v string) string {
	switch v {
	case "improving":
		return "↓"
	case "worsening":
		return "↑"
	default:
		return "→"
	}
}

func shortDate(s string) string {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return s
	}
	return t.Format("2 Jan 2006")
}

// repoSlug converts "org/repo" to a URL-safe slug.
func repoSlug(repo string) string {
	return strings.ReplaceAll(repo, "/", "--")
}
