import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/store";

export default async function BriefingPage({
  params,
}: {
  params: Promise<{ id: string; briefingId: string }>;
}) {
  const { id, briefingId } = await params;
  const profile = getProfile(id);
  if (!profile) notFound();
  const briefing = profile.briefings.find((b) => b.id === briefingId);
  if (!briefing) notFound();

  const date = new Date(briefing.createdAt).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const lines = briefing.content.split("\n");

  return (
    <main>
      <Link
        href={`/profiles/${profile.id}`}
        className="inline-block text-sm mb-8"
        style={{ color: "#aaa" }}
      >
        ← {profile.topic}
      </Link>

      {/* Masthead */}
      <div className="mb-8 pb-6" style={{ borderBottom: "1px solid #ebe8e3" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#bbb" }}>
          Intelligence Briefing
        </p>
        <h1
          className="text-2xl font-semibold mb-1"
          style={{ color: "#1a1a1a", letterSpacing: "-0.03em" }}
        >
          {profile.topic}
        </h1>
        <p className="text-sm" style={{ color: "#aaa" }}>
          {date}
        </p>
      </div>

      {/* Body */}
      <article
        className="briefing-body mb-10 text-sm leading-relaxed"
        style={{
          color: "#2a2a2a",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        {renderContent(lines)}
      </article>

      {/* Citations */}
      {briefing.citations.length > 0 && (
        <div
          className="rounded-2xl p-6"
          style={{ background: "#fff", border: "1px solid #ebe8e3" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#bbb" }}>
            Sources
          </p>
          <ol className="space-y-3">
            {briefing.citations.map((c) => (
              <li key={c.index} className="flex gap-3">
                <span
                  className="text-xs font-bold shrink-0 mt-0.5"
                  style={{ fontFamily: "var(--font-geist-sans), sans-serif", color: "#2563eb" }}
                >
                  [{c.index}]
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ fontFamily: "var(--font-geist-sans), sans-serif", color: "#1a1a1a" }}>
                    {c.label}
                  </p>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs break-all hover:underline"
                    style={{ color: "#aaa" }}
                  >
                    {c.url}
                  </a>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </main>
  );
}

function renderContent(lines: string[]) {
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="pl-4 space-y-1">
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
        <h2
          key={i}
          className="font-bold"
          style={{ fontFamily: "var(--font-geist-sans), sans-serif", fontSize: "14px", letterSpacing: "-0.01em", color: "#1a1a1a" }}
        >
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      flushList();
      elements.push(
        <h1
          key={i}
          className="font-bold"
          style={{ fontFamily: "var(--font-geist-sans), sans-serif", fontSize: "16px", letterSpacing: "-0.02em", color: "#1a1a1a" }}
        >
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
    } else {
      flushList();
      elements.push(
        <p key={i} style={{ color: "#2a2a2a" }}>
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
      <sup
        key={i}
        className="font-bold"
        style={{ fontFamily: "var(--font-geist-sans), sans-serif", color: "#2563eb", fontSize: "10px" }}
      >
        {part}
      </sup>
    ) : (
      part
    )
  );
}
