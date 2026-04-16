import { NextRequest } from 'next/server'
import { getProfile, saveProfile } from '@/lib/store'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = getProfile(id)
  if (!profile) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(profile)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = getProfile(id)
  if (!profile) return Response.json({ error: 'Not found' }, { status: 404 })
  const updates = await req.json()
  const updated = { ...profile, ...updates }
  saveProfile(updated)
  return Response.json(updated)
}
