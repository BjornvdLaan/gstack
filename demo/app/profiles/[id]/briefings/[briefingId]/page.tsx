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

  const lines = briefing.content.split("\n");

  return (
    <main className="max-w-2xl">
      <div className="mb-8">
        <Link
          href={`/profiles/${profile.id}`}
          className="text-zinc-400 text-sm hover:text-zinc-600 mb-4 inline-block"
        >
          ← {profile.topic}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">{profile.topic}</h1>
            <p className="text-zinc-400 text-sm mt-1">
              {new Date(briefing.createdAt).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      <article className="bg-white rounded-xl border border-zinc-200 p-6 mb-6">
        <div className="prose prose-sm prose-zinc max-w-none">
          {lines.map((line, i) => {
            if (line.startsWith("## "))
              return (
                <h2 key={i} className="text-base font-semibold text-zinc-900 mt-6 mb-2 first:mt-0">
                  {line.slice(3)}
                </h2>
              );
            if (line.startsWith("# "))
              return (
                <h1 key={i} className="text-lg font-semibold text-zinc-900 mb-3">
                  {line.slice(2)}
                </h1>
              );
            if (line.startsWith("- ") || line.startsWith("* "))
              return (
                <li key={i} className="text-zinc-700 ml-4 list-disc text-sm leading-relaxed">
                  {formatInline(line.slice(2))}
                </li>
              );
            if (line.trim() === "") return <div key={i} className="h-2" />;
            return (
              <p key={i} className="text-zinc-700 text-sm leading-relaxed">
                {formatInline(line)}
              </p>
            );
          })}
        </div>
      </article>

      {briefing.citations.length > 0 && (
        <section className="bg-white rounded-xl border border-zinc-200 p-5">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Sources
          </h2>
          <ol className="space-y-2">
            {briefing.citations.map((c) => (
              <li key={c.index} className="flex gap-3">
                <span className="text-xs font-medium text-blue-600 shrink-0 mt-0.5">
                  [{c.index}]
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-700">{c.label}</p>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-400 hover:text-blue-500 break-all"
                  >
                    {c.url}
                  </a>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}

function formatInline(text: string): React.ReactNode {
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
