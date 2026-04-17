import { getOrg, getRepoSummaries } from '@/lib/store'
import { ensureSeeded } from '@/lib/seed'
import Link from 'next/link'
import { ComplianceStatus, RepoSummary, RiskSummary } from '@/lib/types'

const COMPLIANCE_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  'COMPLIANT':     { label: 'Compliant',     bg: '#f0fff4', color: '#1e8449' },
  'AT RISK':       { label: 'At Risk',       bg: '#fffbf0', color: '#9a7d0a' },
  'NON-COMPLIANT': { label: 'Non-Compliant', bg: '#fff1f0', color: '#c0392b' },
}

function OverallBadge({ compliance }: { compliance: ComplianceStatus }) {
  const values = Object.values(compliance)
  const worst = values.includes('NON-COMPLIANT') ? 'NON-COMPLIANT'
    : values.includes('AT RISK') ? 'AT RISK' : 'COMPLIANT'
  const c = COMPLIANCE_LABEL[worst]
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.color }}>
      {c.label}
    </span>
  )
}

function RiskBar({ summary }: { summary: RiskSummary }) {
  if (summary.total === 0) return <span className="text-xs" style={{ color: '#27ae60' }}>✓ Clean</span>
  return (
    <span className="inline-flex items-center gap-2 text-xs font-mono">
      {summary.critical > 0 && <span style={{ color: '#c0392b' }}>CR {summary.critical}</span>}
      {summary.high > 0 && <span style={{ color: '#d35400' }}>HI {summary.high}</span>}
      {summary.medium > 0 && <span style={{ color: '#9a7d0a' }}>ME {summary.medium}</span>}
      {summary.low > 0 && <span style={{ color: '#1e8449' }}>LO {summary.low}</span>}
    </span>
  )
}

function TrendBadge({ trend }: { trend: RepoSummary['trend'] }) {
  if (trend === 'new') return null
  const map = {
    improving: { icon: '↓', color: '#27ae60' },
    worsening:  { icon: '↑', color: '#c0392b' },
    stable:     { icon: '→', color: '#aaa' },
  }
  const t = map[trend]
  return <span className="text-xs" style={{ color: t.color }}>{t.icon} {trend}</span>
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function summarize(summaries: RepoSummary[]) {
  let nonCompliant = 0, atRisk = 0, compliant = 0
  for (const s of summaries) {
    const v = Object.values(s.latestReport.compliance)
    if (v.includes('NON-COMPLIANT')) nonCompliant++
    else if (v.includes('AT RISK')) atRisk++
    else compliant++
  }
  return { nonCompliant, atRisk, compliant, total: summaries.length }
}

export default function DashboardPage() {
  ensureSeeded()
  const summaries = getRepoSummaries('demo')
  const counts = summarize(summaries)
  const totalFindings = summaries.reduce((a, s) => a + s.latestReport.riskSummary.total, 0)
  const totalCritical = summaries.reduce((a, s) => a + s.latestReport.riskSummary.critical, 0)
  const totalHigh = summaries.reduce((a, s) => a + s.latestReport.riskSummary.high, 0)

  return (
    <div className="space-y-6 fade-in">
      {/* Overview strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Repositories', value: counts.total, color: '#1a1a1a' },
          { label: 'Non-Compliant', value: counts.nonCompliant, color: '#c0392b' },
          { label: 'At Risk', value: counts.atRisk, color: '#9a7d0a' },
          { label: 'Findings', value: totalFindings, color: totalCritical > 0 ? '#c0392b' : totalHigh > 0 ? '#d35400' : '#1e8449' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #ebe8e3' }}>
            <p className="text-2xl font-bold" style={{ color, letterSpacing: '-0.03em' }}>{value}</p>
            <p className="text-xs font-semibold uppercase tracking-wide mt-0.5" style={{ color: '#aaa' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Framework summary */}
      <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #ebe8e3' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#bbb' }}>
          Framework status across all repos
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['nist_fips_203', 'nist_fips_204', 'nis2', 'dora'] as const).map(key => {
            const ncCount = summaries.filter(s => s.latestReport.compliance[key] === 'NON-COMPLIANT').length
            const arCount = summaries.filter(s => s.latestReport.compliance[key] === 'AT RISK').length
            const worst = ncCount > 0 ? 'NON-COMPLIANT' : arCount > 0 ? 'AT RISK' : 'COMPLIANT'
            const c = COMPLIANCE_LABEL[worst]
            return (
              <div key={key} className="rounded-xl p-3" style={{ background: c.bg }}>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: c.color }}>
                  {key.replace(/_/g, ' ').toUpperCase()}
                </p>
                <p className="text-sm font-semibold mt-1" style={{ color: c.color }}>{c.label}</p>
                {ncCount > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: c.color }}>
                    {ncCount} repo{ncCount !== 1 ? 's' : ''} failing
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Repo list */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: '#bbb' }}>
          {summaries.length} repositor{summaries.length !== 1 ? 'ies' : 'y'}
        </p>
        <div className="space-y-2">
          {summaries.map(s => (
            <Link
              key={s.repo}
              href={`/repos/${encodeURIComponent(s.repo)}`}
              className="block rounded-xl p-4 transition-all hover:shadow-sm"
              style={{ background: '#fff', border: '1px solid #ebe8e3' }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold font-mono" style={{ color: '#1a1a1a' }}>{s.repo}</p>
                    <OverallBadge compliance={s.latestReport.compliance} />
                    <TrendBadge trend={s.trend} />
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <RiskBar summary={s.latestReport.riskSummary} />
                    <span className="text-xs" style={{ color: '#bbb' }}>
                      {s.latestReport.filesScanned} files · {timeAgo(s.latestReport.scannedAt)}
                      {s.reportCount > 1 && ` · ${s.reportCount} scans`}
                    </span>
                  </div>
                </div>
                <span className="text-xs shrink-0" style={{ color: '#ddd' }}>→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Connection hint */}
      <div className="rounded-xl p-4" style={{ background: '#f9f7f4', border: '1px solid #ebe8e3' }}>
        <p className="text-xs font-semibold mb-1" style={{ color: '#888' }}>Connect your GitHub Action</p>
        <p className="text-xs font-mono" style={{ color: '#aaa' }}>report-url: https://your-domain.com/api/reports</p>
        <p className="text-xs font-mono" style={{ color: '#aaa' }}>report-token: demo-key</p>
      </div>
    </div>
  )
}
