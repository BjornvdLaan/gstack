import Link from "next/link";
import { readProfiles } from "@/lib/store";
import { Profile } from "@/lib/types";

export default function Home() {
  const profiles: Profile[] = readProfiles();

  return (
    <main>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Your profiles</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Each profile tracks a topic and delivers synthesized briefings.
          </p>
        </div>
        <Link
          href="/profiles/new"
          className="bg-zinc-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors"
        >
          + New profile
        </Link>
      </div>

      {profiles.length === 0 ? (
        <div className="border-2 border-dashed border-zinc-200 rounded-xl p-16 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📋</span>
          </div>
          <p className="text-zinc-600 font-medium mb-1">No profiles yet</p>
          <p className="text-zinc-400 text-sm mb-6">
            Create a profile to start tracking a topic.
          </p>
          <Link
            href="/profiles/new"
            className="bg-zinc-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Create your first profile
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {profiles.map((p) => (
            <Link
              key={p.id}
              href={`/profiles/${p.id}`}
              className="bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-400 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-zinc-900 group-hover:text-zinc-700">
                    {p.topic}
                  </h2>
                  <p className="text-zinc-400 text-sm mt-1">
                    {p.sources.length} source{p.sources.length !== 1 ? "s" : ""} ·{" "}
                    {p.briefings.length} briefing{p.briefings.length !== 1 ? "s" : ""}
                  </p>
                </div>
                {p.briefings.length > 0 && (
                  <span className="text-xs text-zinc-400 mt-0.5">
                    Last:{" "}
                    {new Date(p.briefings.at(-1)!.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
