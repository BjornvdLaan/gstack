import Link from "next/link";
import { readProfiles } from "@/lib/store";

export default function Home() {
  const profiles = readProfiles();

  return (
    <main>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#1a1a1a", letterSpacing: "-0.03em" }}>
            Your briefings
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#888" }}>
            One profile per topic. Claude synthesizes sources on your schedule.
          </p>
        </div>
        <Link
          href="/profiles/new"
          className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
          style={{ background: "#1a1a1a", color: "#fff" }}
        >
          New profile
        </Link>
      </div>

      {profiles.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: "#fff", border: "1px solid #ebe8e3" }}
        >
          <p className="text-sm font-medium" style={{ color: "#1a1a1a" }}>No profiles yet</p>
          <p className="mt-1 text-sm" style={{ color: "#aaa" }}>
            Create a profile to start tracking a topic.
          </p>
          <Link
            href="/profiles/new"
            className="inline-block mt-5 text-sm font-medium px-4 py-2 rounded-lg"
            style={{ background: "#1a1a1a", color: "#fff" }}
          >
            Create your first profile
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {profiles.map((p) => (
            <Link
              key={p.id}
              href={`/profiles/${p.id}`}
              className="flex items-center justify-between rounded-xl px-5 py-4 transition-all group"
              style={{ background: "#fff", border: "1px solid #ebe8e3" }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>
                  {p.topic}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "#aaa" }}>
                  {p.sources.length} source{p.sources.length !== 1 ? "s" : ""}
                  {p.briefings.length > 0 && (
                    <> · last {new Date(p.briefings.at(-1)!.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
                  )}
                </p>
              </div>
              <span className="text-sm transition-transform group-hover:translate-x-0.5" style={{ color: "#ccc" }}>
                →
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
