"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Props {
  profileId: string;
}

export default function GenerateBriefing({ profileId }: Props) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("anthropic_api_key") ?? "" : ""
  );
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const briefingIdRef = useRef<string | null>(null);

  function saveKey(key: string) {
    setApiKey(key);
    localStorage.setItem("anthropic_api_key", key);
  }

  async function generate() {
    const key = apiKey.trim();
    if (!key) {
      setShowKeyInput(true);
      return;
    }

    setGenerating(true);
    setOutput("");
    setDone(false);
    setError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, apiKey: key }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Generation failed");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        // Extract briefing ID if present
        const idMatch = accumulated.match(/__BRIEFING_ID__:([a-f0-9-]+)/);
        if (idMatch) {
          briefingIdRef.current = idMatch[1];
          accumulated = accumulated.replace(/\n\n__BRIEFING_ID__:[a-f0-9-]+/, "");
        }

        setOutput(accumulated);
      }

      setDone(true);
      router.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setGenerating(false);
    }
  }

  if (done && output) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-zinc-900">Latest briefing</h2>
          <button
            onClick={() => {
              setOutput("");
              setDone(false);
            }}
            className="text-sm text-zinc-400 hover:text-zinc-600"
          >
            ↑ Hide
          </button>
        </div>
        <BriefingContent content={output} />
        <button
          onClick={generate}
          className="mt-6 text-sm text-zinc-500 hover:text-zinc-700 font-medium"
        >
          ↺ Regenerate
        </button>
      </div>
    );
  }

  return (
    <div>
      {showKeyInput && !apiKey && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm font-medium text-amber-800 mb-2">Anthropic API key required</p>
          <p className="text-xs text-amber-700 mb-3">
            Enter your key to enable Claude synthesis. Stored locally in your browser.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="sk-ant-..."
              className="flex-1 border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              onChange={(e) => setApiKey(e.target.value)}
            />
            <button
              onClick={() => {
                saveKey(apiKey);
                setShowKeyInput(false);
                generate();
              }}
              className="bg-amber-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-amber-700"
            >
              Save & generate
            </button>
          </div>
        </div>
      )}

      {generating && output && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-zinc-500">Generating briefing…</span>
          </div>
          <BriefingContent content={output} />
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!generating && (
        <button
          onClick={generate}
          className="w-full bg-zinc-900 text-white text-sm font-medium px-4 py-3 rounded-xl hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
        >
          <span>✦</span>
          Generate briefing
        </button>
      )}
    </div>
  );
}

function BriefingContent({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="prose prose-sm prose-zinc max-w-none">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <h2 key={i} className="text-base font-semibold text-zinc-900 mt-5 mb-2">
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <h1 key={i} className="text-lg font-semibold text-zinc-900 mb-3">
              {line.slice(2)}
            </h1>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <li key={i} className="text-zinc-700 ml-4 list-disc text-sm leading-relaxed">
              {formatInline(line.slice(2))}
            </li>
          );
        }
        if (line.trim() === "") {
          return <div key={i} className="h-2" />;
        }
        return (
          <p key={i} className="text-zinc-700 text-sm leading-relaxed">
            {formatInline(line)}
          </p>
        );
      })}
    </div>
  );
}

function formatInline(text: string): React.ReactNode {
  // Highlight citations like [1], [2], [3]
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) =>
    /^\[\d+\]$/.test(part) ? (
      <sup key={i} className="text-blue-600 font-medium text-xs">
        {part}
      </sup>
    ) : (
      part
    )
  );
}
