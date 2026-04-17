import fs from 'fs'
import path from 'path'
import { OrgData, StoredReport, RepoSummary } from './types'

const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'orgs.json')

// Demo org pre-seeded so the dashboard looks alive on first load
const DEMO_ORG: OrgData = {
  orgId: 'demo',
  name: 'Demo Organization',
  apiKey: 'demo-key',
  createdAt: new Date().toISOString(),
  reports: [],
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

export function readOrgs(): OrgData[] {
  ensureDataDir()
  if (!fs.existsSync(DATA_FILE)) {
    const orgs = [DEMO_ORG]
    fs.writeFileSync(DATA_FILE, JSON.stringify(orgs, null, 2))
    return orgs
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
}

function writeOrgs(orgs: OrgData[]) {
  ensureDataDir()
  fs.writeFileSync(DATA_FILE, JSON.stringify(orgs, null, 2))
}

export function getOrgByKey(apiKey: string): OrgData | null {
  return readOrgs().find(o => o.apiKey === apiKey) ?? null
}

export function getOrg(orgId: string): OrgData | null {
  return readOrgs().find(o => o.orgId === orgId) ?? null
}

export function saveReport(orgId: string, report: StoredReport): void {
  const orgs = readOrgs()
  const org = orgs.find(o => o.orgId === orgId)
  if (!org) throw new Error(`Org ${orgId} not found`)
  // keep last 50 reports per org
  org.reports = [report, ...org.reports].slice(0, 50)
  writeOrgs(orgs)
}

export function getRepoSummaries(orgId: string): RepoSummary[] {
  const org = getOrg(orgId)
  if (!org) return []

  const byRepo = new Map<string, StoredReport[]>()
  for (const r of org.reports) {
    const arr = byRepo.get(r.source) ?? []
    arr.push(r)
    byRepo.set(r.source, arr)
  }

  return Array.from(byRepo.entries()).map(([repo, reports]) => {
    reports.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
    const latest = reports[0]
    const prev = reports[1]

    let trend: RepoSummary['trend'] = 'new'
    if (prev) {
      const latestTotal = latest.riskSummary.total
      const prevTotal = prev.riskSummary.total
      trend = latestTotal < prevTotal ? 'improving' : latestTotal > prevTotal ? 'worsening' : 'stable'
    }

    return { repo, latestReport: latest, reportCount: reports.length, trend }
  }).sort((a, b) => {
    // sort: non-compliant first, then by critical count
    const aScore = scoreCompliance(a.latestReport)
    const bScore = scoreCompliance(b.latestReport)
    if (aScore !== bScore) return bScore - aScore
    return b.latestReport.riskSummary.critical - a.latestReport.riskSummary.critical
  })
}

export function getRepoReports(orgId: string, repo: string): StoredReport[] {
  const org = getOrg(orgId)
  if (!org) return []
  return org.reports
    .filter(r => r.source === repo)
    .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
}

function scoreCompliance(r: StoredReport): number {
  // higher = worse (for sorting most-urgent first)
  const hasNonCompliant = Object.values(r.compliance).some(v => v === 'NON-COMPLIANT')
  const hasAtRisk = Object.values(r.compliance).some(v => v === 'AT RISK')
  return hasNonCompliant ? 2 : hasAtRisk ? 1 : 0
}
