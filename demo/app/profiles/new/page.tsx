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

  function removeSource(i: number) {
    setSources(sources.filter((_, idx) => idx !== i));
  }

  function updateSource(i: number, field: keyof SourceInput, value: string) {
    setSources(sources.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const validSources = sources.filter((s) => s.url.trim());
    if (!topic.trim()) return setError("Topic is required.");
    if (validSources.length === 0) return setError("Add at least one source URL.");

    setSaving(true);
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, sources: validSources }),
    });
    if (res.ok) {
      const profile = await res.json();
      router.push(`/profiles/${profile.id}`);
    } else {
      setError("Failed to create profile.");
      setSaving(false);
    }
  }

  return (
    <main className="max-w-xl">
      <div className="mb-8">
        <Link href="/" className="text-zinc-400 text-sm hover:text-zinc-600 mb-4 inline-block">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">New profile</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Define a topic and add the sources Claude should read.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">
            Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. European payments regulation, OpenAI, Nvidia"
            className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-zinc-700">Sources</label>
            <button
              type="button"
              onClick={addSource}
              className="text-xs text-zinc-500 hover:text-zinc-700 font-medium"
            >
              + Add source
            </button>
          </div>
          <div className="space-y-2">
            {sources.map((s, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={s.label}
                  onChange={(e) => updateSource(i, "label", e.target.value)}
                  placeholder="Label (e.g. Reuters)"
                  className="w-32 border border-zinc-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
                />
                <input
                  type="url"
                  value={s.url}
                  onChange={(e) => updateSource(i, "url", e.target.value)}
                  placeholder="https://example.com/topic"
                  className="flex-1 border border-zinc-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
                />
                {sources.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSource(i)}
                    className="text-zinc-300 hover:text-zinc-500 px-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Add public URLs — articles, Wikipedia pages, company sites, news feeds.
          </p>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-zinc-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Creating…" : "Create profile"}
        </button>
      </form>
    </main>
  );
}
