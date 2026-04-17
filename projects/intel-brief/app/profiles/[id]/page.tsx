import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/store";
import GenerateBriefing from "@/components/GenerateBriefing";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = getProfile(id);
  if (!profile) notFound();

  return (
    <main>
      <Link href="/" className="inline-block text-sm mb-6" style={{ color: "#aaa" }}>
        ← All profiles
      </Link>

      {/* Hero */}
      <div className="mb-8">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "#1a1a1a", letterSpacing: "-0.03em" }}
        >
          {profile.topic}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#aaa" }}>
          {profile.sources.length} source{profile.sources.length !== 1 ? "s" : ""}
          {profile.briefings.length > 0 && (
            <> · {profile.briefings.length} briefing{profile.briefings.length !== 1 ? "s" : ""}</>
          )}
        </p>
      </div>

      <div className="space-y-4">
        {/* Generate section */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "#fff", border: "1px solid #ebe8e3" }}
        >
          <GenerateBriefing profileId={profile.id} />
        </div>

        {/* Sources */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "#fff", border: "1px solid #ebe8e3" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#bbb" }}>
            Sources
          </p>
          <ul className="space-y-3">
            {profile.sources.map((s) => (
              <li key={s.id} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "#d4d0ca" }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: "#1a1a1a" }}>
                    {s.label || "Source"}
                  </p>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs truncate block hover:underline"
                    style={{ color: "#aaa" }}
                  >
                    {s.url}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Past briefings */}
        {profile.briefings.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: "#bbb" }}>
              Past briefings
            </p>
            <div className="space-y-1.5">
              {[...profile.briefings].reverse().map((b, i) => (
                <Link
                  key={b.id}
                  href={`/profiles/${profile.id}/briefings/${b.id}`}
                  className="flex items-center justify-between rounded-xl px-5 py-3.5 transition-all group"
                  style={{ background: "#fff", border: "1px solid #ebe8e3" }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#1a1a1a" }}>
                      {i === 0 ? "Latest" : `Briefing ${profile.briefings.length - i}`}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#bbb" }}>
                      {new Date(b.createdAt).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="text-sm transition-transform group-hover:translate-x-0.5" style={{ color: "#d4d0ca" }}>
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
