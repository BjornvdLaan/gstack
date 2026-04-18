package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/getquantumdrive/groundstate/internal/seed"
	"github.com/getquantumdrive/groundstate/internal/store"
	"github.com/getquantumdrive/groundstate/internal/web"
)

func main() {
	port := flag.String("port", envOr("PORT", "3000"), "HTTP listen port")
	dbPath := flag.String("db", envOr("DB_PATH", "data/groundstate.db"), "SQLite database path")
	flag.Parse()

	// Ensure data directory exists.
	if err := os.MkdirAll("data", 0o755); err != nil {
		log.Fatalf("create data dir: %v", err)
	}

	s, err := store.Open(*dbPath)
	if err != nil {
		log.Fatalf("open store: %v", err)
	}
	defer s.Close()

	// Bootstrap demo org and seed reports on first run.
	if err := s.EnsureDemoOrg(); err != nil {
		log.Fatalf("ensure demo org: %v", err)
	}
	if err := s.SeedDemoReports(seed.Reports()); err != nil {
		log.Fatalf("seed demo reports: %v", err)
	}

	handler := web.Handler(s)
	addr := fmt.Sprintf(":%s", *port)
	log.Printf("Groundstate listening on http://localhost%s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("server: %v", err)
	}
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
