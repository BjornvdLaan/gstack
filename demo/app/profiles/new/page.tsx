"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SourceInput {
  url: string;
  label: string;
}

export default function NewProfile() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [sources, setSources] = useState<SourceInput[]>([{ url: "", label: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addSource() {
    setSources([...sources, { url: "", label: "" }]);
  }

  function updateSource(i: number, field: keyof SourceInput, value: string) {
    setSources(sources.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  function removeSource(i: number) {
    if (sources.length === 1) return;
    setSources(sources.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const validSources = sources.filter((s) => s.url.trim());
    if (!topic.trim()) return setError("Enter a topic.");
    if (validSources.length === 0) return setError("Add at least one source URL.");
    setSaving(true);
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, sources: validSources }),
    });
    if (res.ok) {
      const p = await res.json();
      router.push(`/profiles/${p.id}`);
    } else {
      setError("Something went wrong.");
      setSaving(false);
    }
  }

  const inputStyle = {
    border: "1px solid #e5e2dc",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "14px",
    color: "#1a1a1a",
    background: "#fff",
    outline: "none",
    width: "100%",
    transition: "border-color 0.15s",
  };

  return (
    <main className="max-w-lg">
      <Link href="/" className="inline-block text-sm mb-6" style={{ color: "#aaa" }}>
        ← Back
      </Link>

      <h1
        className="text-2xl font-semibold mb-1"
        style={{ color: "#1a1a1a", letterSpacing: "-0.03em" }}
      >
        New profile
      </h1>
      <p className="text-sm mb-8" style={{ color: "#888" }}>
        Name a topic and add the sources Claude should read.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "#aaa" }}>
            Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. European AI regulation, Anthropic, TSMC"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "#1a1a1a")}
            onBlur={(e) => (e.target.style.borderColor = "#e5e2dc")}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: "#aaa" }}>
              Sources
            </label>
            <button
              type="button"
              onClick={addSource}
              className="text-xs font-medium"
              style={{ color: "#888" }}
            >
              + Add source
            </button>
          </div>
          <div className="space-y-2">
            {sources.map((s, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={s.label}
                  onChange={(e) => updateSource(i, "label", e.target.value)}
                  placeholder="Label"
                  style={{ ...inputStyle, width: "110px", flexShrink: 0 }}
                  onFocus={(e) => (e.target.style.borderColor = "#1a1a1a")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e2dc")}
                />
                <input
                  type="url"
                  value={s.url}
                  onChange={(e) => updateSource(i, "url", e.target.value)}
                  placeholder="https://"
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={(e) => (e.target.style.borderColor = "#1a1a1a")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e2dc")}
                />
                {sources.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSource(i)}
                    className="text-lg leading-none shrink-0"
                    style={{ color: "#ccc" }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs" style={{ color: "#bbb" }}>
            Add public URLs — news pages, Wikipedia, company sites, RSS feeds.
          </p>
        </div>

        {error && <p className="text-sm" style={{ color: "#e53e3e" }}>{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full text-sm font-medium py-3 rounded-xl transition-opacity"
          style={{ background: "#1a1a1a", color: "#fff", opacity: saving ? 0.5 : 1 }}
        >
          {saving ? "Creating…" : "Create profile →"}
        </button>
      </form>
    </main>
  );
}
