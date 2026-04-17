"use client";

import { useState, useRef, useEffect } from "react";
import { ScanReport } from "@/lib/types";
import { Results } from "./Results";

type Tab = "repo" | "file";
type State = "idle" | "scanning" | "done" | "error";

export function ScanInput() {
  const [tab, setTab] = useState<Tab>("repo");
  const [repoUrl, setRepoUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [aiScoring, setAiScoring] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("pqc_api_key");
    if (stored) setApiKey(stored);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => setFileContent(ev.target?.result as string ?? "");
    reader.readAsText(file);
  }

  async function handleScan() {
    const body: Record<string, unknown> = {
      aiScoring,
      apiKey: apiKey || undefined,
    };

    if (tab === "repo") {
      if (!repoUrl.trim()) return;
      body.repoUrl = repoUrl.trim();
    } else {
      if (!fileContent) return;
      body.fileContent = fileContent;
      body.fileName = fileName || "file.txt";
    }

    setState("scanning");
    setStatusMsg("Starting scan…");
    setReport(null);
    setError("");

    if (apiKey) localStorage.setItem("pqc_api_key", apiKey);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === "status") setStatusMsg(msg.message);
            else if (msg.type === "report") {
              setReport(msg.report);
              setState("done");
            } else if (msg.type === "error") {
              setError(msg.message);
              setState("error");
            }
          } catch { /* malformed line */ }
        }
      }
    } catch (err) {
      setError(String(err).replace("Error: ", ""));
      setState("error");
    }
  }

  if (state === "error") {
    return (
      <div className="rounded-2xl p-6" style={{ background: "#fff1f0", border: "1px solid #fcc" }}>
        <p className="text-sm font-semibold mb-1" style={{ color: "#c0392b" }}>Scan failed</p>
        <p className="text-sm" style={{ color: "#c0392b" }}>{error}</p>
        <button
          onClick={() => setState("idle")}
          className="mt-4 text-xs font-semibold"
          style={{ color: "#c0392b" }}
        >
          ← Try again
        </button>
      </div>
    );
  }

  if (state === "done" && report) {
    return (
      <div className="fade-in">
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => { setState("idle"); setReport(null); }}
            className="text-xs font-semibold"
            style={{ color: "#aaa" }}
          >
            ← Scan another
          </button>
        </div>
        <Results report={report} />
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#1a1a1a", letterSpacing: "-0.03em" }}>
          Find quantum-vulnerable crypto
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "#888" }}>
          Scans codebases for RSA, ECDSA, and Diffie-Hellman — all broken by a quantum computer.
          Generates NIS2 and NIST FIPS 203/204 compliance reports.
        </p>
      </div>

      <div className="rounded-2xl p-6" style={{ background: "#fff", border: "1px solid #ebe8e3" }}>
        {/* Tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: "#f9f7f4" }}>
          {(["repo", "file"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab === t ? "#fff" : "transparent",
                color: tab === t ? "#1a1a1a" : "#aaa",
                boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {t === "repo" ? "GitHub Repo" : "Paste / Upload"}
            </button>
          ))}
        </div>

        {/* Input */}
        {tab === "repo" ? (
          <div>
            <input
              type="text"
              placeholder="github.com/owner/repo"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleScan()}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none font-mono"
              style={{ background: "#f9f7f4", color: "#1a1a1a", border: "1px solid #ebe8e3" }}
            />
            <p className="mt-1.5 text-xs" style={{ color: "#bbb" }}>
              Public repos only. For private repos, use the GitHub Action.
            </p>
          </div>
        ) : (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".java,.py,.js,.mjs,.cjs,.ts,.tsx,.go"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl px-4 py-3 text-sm text-left transition-colors"
              style={{
                background: "#f9f7f4",
                border: "1px solid #ebe8e3",
                color: fileName ? "#1a1a1a" : "#bbb",
              }}
            >
              {fileName || "Click to upload a source file (.java, .py, .js, .ts, .go)"}
            </button>
            <p className="mt-1.5 text-xs" style={{ color: "#bbb" }}>
              File is scanned locally — content is not stored.
            </p>
          </div>
        )}

        {/* AI Scoring toggle */}
        <div className="mt-5">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 text-xs"
            style={{ color: "#aaa" }}
          >
            <span
              style={{
                display: "inline-block",
                transform: showSettings ? "rotate(90deg)" : "none",
                transition: "transform 0.15s",
              }}
            >
              ▶
            </span>
            AI risk scoring (optional)
          </button>

          {showSettings && (
            <div className="mt-3 space-y-3 fade-in">
              <input
                type="password"
                placeholder="sk-ant-… Anthropic API key"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                style={{ background: "#f9f7f4", color: "#1a1a1a", border: "1px solid #ebe8e3" }}
              />
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiScoring}
                  onChange={e => setAiScoring(e.target.checked)}
                  className="mt-0.5 rounded shrink-0"
                />
                <span className="text-xs leading-relaxed" style={{ color: "#555" }}>
                  Enable AI risk scoring — sends 5-line snippets to Claude Haiku for
                  context-aware severity assessment (no full files sent)
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Scan button */}
        <button
          onClick={handleScan}
          disabled={state === "scanning"}
          className="mt-5 w-full py-3 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: state === "scanning" ? "#f0ede8" : "#1a1a1a",
            color: state === "scanning" ? "#aaa" : "#fff",
            cursor: state === "scanning" ? "not-allowed" : "pointer",
          }}
        >
          {state === "scanning" ? (
            <span className="flex items-center justify-center gap-2.5">
              <span className="inline-flex gap-1">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: "#aaa",
                      animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </span>
              <span>{statusMsg}</span>
            </span>
          ) : (
            "Scan →"
          )}
        </button>
      </div>

      {/* Supported languages */}
      <div className="mt-6 flex flex-wrap gap-2">
        {["Java", "Python", "JavaScript", "TypeScript", "Go"].map(lang => (
          <span
            key={lang}
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: "#f0ede8", color: "#888" }}
          >
            {lang}
          </span>
        ))}
        <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ color: "#bbb" }}>
          + custom YAML rules
        </span>
      </div>
    </div>
  );
}
