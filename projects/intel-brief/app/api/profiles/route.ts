import { NextRequest } from 'next/server'
import { readProfiles, saveProfile } from '@/lib/store'
import { Profile } from '@/lib/types'
import { randomUUID } from 'crypto'

export async function GET() {
  return Response.json(readProfiles())
}

export async function POST(req: NextRequest) {
  const { topic, sources } = await req.json()
  const profile: Profile = {
    id: randomUUID(),
    topic,
    sources: sources.map((s: { url: string; label: string }) => ({
      id: randomUUID(),
      url: s.url,
      label: s.label,
    })),
    briefings: [],
    createdAt: new Date().toISOString(),
  }
  saveProfile(profile)
  return Response.json(profile, { status: 201 })
}
