"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateBriefing({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem("anthropic_api_key") ?? "") : ""
  );
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const [tempKey, setTempKey] = useState("");
  const [state, setState] = useState<"idle" | "fetching" | "writing" | "done">("idle");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  async function generate(key?: string) {
    const effectiveKey = key ?? apiKey;
    if (!effectiveKey.trim()) {
      setShowKeyPrompt(true);
      return;
    }
    setState("fetching");
    setOutput("");
    setError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, apiKey: effectiveKey }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(err.error ?? "Generation failed");
      }

      setState("writing");
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        const clean = accumulated.replace(/\n\n__BRIEFING_ID__:[a-f0-9-]+$/, "");
        setOutput(clean);
      }

      setState("done");
      router.refresh();
    } catch (err) {
      setError(String(err).replace("Error: ", ""));
      setState("idle");
    }
  }

  function handleSaveKey() {
    const key = tempKey.trim();
    if (!key) return;
    localStorage.setItem("anthropic_api_key", key);
    setApiKey(key);
    setShowKeyPrompt(false);
    setTempKey("");
    generate(key);
  }

  if (showKeyPrompt) {
    return (
      <div className="fade-in">
        <p className="text-sm font-semibold mb-1" style={{ color: "#1a1a1a" }}>
          Enter your Anthropic API key
        </p>
        <p className="text-xs mb-4" style={{ color: "#aaa" }}>
          Stored in your browser only. Get one at console.anthropic.com.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={tempKey}
            onChange={(e) => setTempKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
            placeholder="sk-ant-..."
            autoFocus
            className="flex-1 text-sm rounded-lg px-3 py-2.5"
            style={{
              border: "1px solid #e5e2dc",
              background: "#faf8f5",
              color: "#1a1a1a",
              outline: "none",
            }}
          />
          <button
            onClick={handleSaveKey}
            className="text-sm font-medium px-4 py-2 rounded-lg"
            style={{ background: "#1a1a1a", color: "#fff" }}
          >
            Continue →
          </button>
        </div>
        <button
          onClick={() => setShowKeyPrompt(false)}
          className="mt-3 text-xs"
          style={{ color: "#ccc" }}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (state === "fetching") {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "#d4d0ca",
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        <span className="text-sm" style={{ color: "#aaa" }}>
          Fetching sources…
        </span>
        <style>{`
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
            40% { transform: scale(1.2); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  if (state === "writing" || state === "done") {
    return (
      <div className="fade-in">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {state === "writing" && (
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
            )}
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#bbb" }}>
              {state === "writing" ? "Writing…" : "Briefing"}
            </span>
          </div>
          {state === "done" && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigator.clipboard.writeText(output)}
                className="text-xs"
                style={{ color: "#bbb" }}
              >
                Copy
              </button>
              <button
                onClick={() => { setState("idle"); setOutput(""); }}
                className="text-xs"
                style={{ color: "#bbb" }}
              >
                ↺ Regenerate
              </button>
            </div>
          )}
        </div>

        <div
          className="briefing-body text-sm leading-relaxed"
          style={{ color: "#2a2a2a", fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {renderBriefing(output)}
          {state === "writing" && (
            <span className="cursor-blink inline-block w-0.5 h-3.5 ml-0.5 align-middle" style={{ background: "#1a1a1a" }} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {error && (
        <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: "#fff5f5", color: "#c53030" }}>
          {error}
        </p>
      )}
      <button
        onClick={() => generate()}
        className="w-full text-sm font-medium py-3.5 rounded-xl transition-all hover:opacity-90 flex items-center justify-center gap-2"
        style={{ background: "#1a1a1a", color: "#fff" }}
      >
        <span style={{ opacity: 0.6 }}>✦</span>
        Generate briefing
      </button>
      {apiKey && (
        <button
          onClick={() => { setApiKey(""); localStorage.removeItem("anthropic_api_key"); }}
          className="mt-2.5 w-full text-xs text-center"
          style={{ color: "#ccc" }}
        >
          Change API key
        </button>
      )}
    </div>
  );
}

function renderBriefing(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="pl-4 space-y-1 mb-3.5">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  }

  lines.forEach((line, i) => {
    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={i} className="font-bold mt-6 mb-2 first:mt-0" style={{ fontFamily: "var(--font-geist-sans), sans-serif", fontSize: "14px", letterSpacing: "-0.01em", color: "#1a1a1a" }}>
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      flushList();
      elements.push(
        <h1 key={i} className="font-bold mb-3" style={{ fontFamily: "var(--font-geist-sans), sans-serif", fontSize: "16px", letterSpacing: "-0.02em", color: "#1a1a1a" }}>
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      listItems.push(
        <li key={i} className="list-disc" style={{ color: "#3a3a3a" }}>
          {renderInline(line.slice(2))}
        </li>
      );
    } else if (line.trim() === "") {
      flushList();
      if (elements.length > 0) {
        elements.push(<div key={`sp-${i}`} className="h-1" />);
      }
    } else {
      flushList();
      elements.push(
        <p key={i} className="mb-3.5 last:mb-0" style={{ color: "#2a2a2a" }}>
          {renderInline(line)}
        </p>
      );
    }
  });

  flushList();
  return elements;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) =>
    /^\[\d+\]$/.test(part) ? (
      <sup key={i} className="font-semibold" style={{ fontFamily: "var(--font-geist-sans), sans-serif", color: "#2563eb", fontSize: "10px" }}>
        {part}
      </sup>
    ) : (
      part
    )
  );
}
