import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getOrgByKey, saveReport, getOrg } from '@/lib/store'
import { ensureSeeded } from '@/lib/seed'
import { StoredReport } from '@/lib/types'

export async function POST(req: NextRequest) {
  ensureSeeded()

  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth

  if (!token) {
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
  }

  const org = getOrgByKey(token)
  if (!org) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const report = body as Partial<StoredReport>
  if (!report.source || !report.findings || !report.riskSummary || !report.compliance) {
    return NextResponse.json({ error: 'Missing required fields: source, findings, riskSummary, compliance' }, { status: 400 })
  }

  const stored: StoredReport = {
    id: report.id ?? randomUUID(),
    orgId: org.orgId,
    source: report.source,
    ref: report.ref,
    sha: report.sha,
    scannedAt: report.scannedAt ?? new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    filesScanned: report.filesScanned ?? 0,
    rulesApplied: report.rulesApplied,
    findings: report.findings,
    riskSummary: report.riskSummary,
    compliance: report.compliance,
    languagesScanned: report.languagesScanned,
    aiScoringEnabled: report.aiScoringEnabled ?? false,
  }

  saveReport(org.orgId, stored)

  return NextResponse.json({ id: stored.id, receivedAt: stored.receivedAt }, { status: 201 })
}

export async function GET(req: NextRequest) {
  ensureSeeded()
  // For the demo: return all reports for the demo org (no auth required)
  const org = getOrg('demo')
  return NextResponse.json(org?.reports ?? [])
}
