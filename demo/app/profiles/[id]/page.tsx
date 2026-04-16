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

  const latestBriefing = profile.briefings.at(-1);

  return (
    <main>
      <div className="mb-8">
        <Link href="/" className="text-zinc-400 text-sm hover:text-zinc-600 mb-4 inline-block">
          ← All profiles
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{profile.topic}</h1>
            <p className="text-zinc-400 text-sm mt-1">
              {profile.sources.length} source{profile.sources.length !== 1 ? "s" : ""} ·{" "}
              {profile.briefings.length} briefing{profile.briefings.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Sources */}
        <section className="bg-white rounded-xl border border-zinc-200 p-5">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Sources
          </h2>
          <ul className="space-y-2">
            {profile.sources.map((s) => (
              <li key={s.id} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0" />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-zinc-700">{s.label || "Source"}</span>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-zinc-400 hover:text-blue-500 truncate"
                  >
                    {s.url}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Generate */}
        <section className="bg-white rounded-xl border border-zinc-200 p-5">
          <GenerateBriefing profileId={profile.id} />
        </section>

        {/* Briefing history */}
        {profile.briefings.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              Past briefings
            </h2>
            <div className="space-y-2">
              {[...profile.briefings].reverse().map((b, i) => (
                <Link
                  key={b.id}
                  href={`/profiles/${profile.id}/briefings/${b.id}`}
                  className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center justify-between hover:border-zinc-400 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900">
                      {i === 0 ? "Latest briefing" : `Briefing ${profile.briefings.length - i}`}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {new Date(b.createdAt).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="text-zinc-300 group-hover:text-zinc-500">→</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
