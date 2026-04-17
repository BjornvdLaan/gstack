import { getRepoReports } from '@/lib/store'
import { Finding, Severity, ComplianceStatus } from '@/lib/types'
import Link from 'next/link'

const SEVERITY_COLOR: Record<Severity, { bg: string; text: string; dot: string }> = {
  CRITICAL: { bg: '#fff1f0', text: '#c0392b', dot: '#e74c3c' },
  HIGH:     { bg: '#fff8f0', text: '#d35400', dot: '#e67e22' },
  MEDIUM:   { bg: '#fffbf0', text: '#9a7d0a', dot: '#f1c40f' },
  LOW:      { bg: '#f0fff4', text: '#1e8449', dot: '#27ae60' },
  SAFE:     { bg: '#f0f9ff', text: '#1a6fa8', dot: '#3498db' },
}

const COMPLIANCE_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  'COMPLIANT':     { label: 'Compliant',     bg: '#f0fff4', color: '#1e8449' },
  'AT RISK':       { label: 'At Risk',       bg: '#fffbf0', color: '#9a7d0a' },
  'NON-COMPLIANT': { label: 'Non-Compliant', bg: '#fff1f0', color: '#c0392b' },
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const c = SEVERITY_COLOR[severity] ?? SEVERITY_COLOR.LOW
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {severity}
    </span>
  )
}

function FindingCard({ finding }: { finding: Finding }) {
  const severity = finding.aiRisk?.severity ?? finding.severity
  return (
    <div className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #ebe8e3' }}>
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="min-w-0">
          <p className="text-xs font-mono" style={{ color: '#888' }}>
            {finding.file}<span className="ml-1" style={{ color: '#bbb' }}>:{finding.line}</span>
          </p>
          <p className="mt-0.5 text-sm font-semibold" style={{ color: '#1a1a1a' }}>{finding.algorithm}</p>
        </div>
        <SeverityBadge severity={severity} />
      </div>
      <p className="text-sm mb-2" style={{ color: '#555' }}>{finding.message}</p>
      {finding.aiRisk?.reasoning && (
        <p className="text-xs mb-2 italic" style={{ color: '#888' }}>AI: {finding.aiRisk.reasoning}</p>
      )}
      <div className="text-xs font-mono rounded-lg p-3 mb-3" style={{ background: '#f9f7f4', color: '#555', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
        {finding.snippet}
      </div>
      <div className="flex items-start gap-2">
        <span className="text-xs font-semibold shrink-0 mt-0.5" style={{ color: '#27ae60' }}>→</span>
        <p className="text-xs" style={{ color: '#555' }}>{finding.migration}</p>
      </div>
    </div>
  )
}

const SEVERITY_ORDER: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, SAFE: 4 }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function RepoPage({ params }: { params: { slug: string } }) {
  const repo = decodeURIComponent(params.slug)
  const reports = getRepoReports('demo', repo)
  const latest = reports[0]

  if (!latest) {
    return (
      <div className="text-center py-16">
        <p className="text-sm" style={{ color: '#aaa' }}>No reports found for {repo}</p>
        <Link href="/" className="mt-4 inline-block text-xs font-semibold" style={{ color: '#aaa' }}>← Back</Link>
      </div>
    )
  }

  const sortedFindings = [...latest.findings].sort(
    (a, b) => SEVERITY_ORDER[a.aiRisk?.severity ?? a.severity] - SEVERITY_ORDER[b.aiRisk?.severity ?? b.severity]
  )

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div>
        <Link href="/" className="text-xs font-semibold" style={{ color: '#aaa' }}>← Dashboard</Link>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold font-mono" style={{ color: '#1a1a1a', letterSpacing: '-0.02em' }}>{repo}</h1>
            <p className="text-xs mt-0.5" style={{ color: '#aaa' }}>
              {latest.filesScanned} files · {timeAgo(latest.scannedAt)}
              {latest.sha && ` · ${latest.sha.slice(0, 7)}`}
              {reports.length > 1 && ` · ${reports.length} scans`}
            </p>
          </div>
        </div>
      </div>

      {/* Risk summary */}
      <div className="grid grid-cols-4 gap-3">
        {(['critical', 'high', 'medium', 'low'] as const).map(level => (
          <div key={level} className="rounded-xl p-3 text-center" style={{ background: '#fff', border: '1px solid #ebe8e3' }}>
            <p className="text-2xl font-bold" style={{
              color: level === 'critical' ? '#c0392b' : level === 'high' ? '#d35400' : level === 'medium' ? '#9a7d0a' : '#1e8449',
              letterSpacing: '-0.03em',
            }}>
              {latest.riskSummary[level]}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide mt-0.5" style={{ color: '#aaa' }}>{level}</p>
          </div>
        ))}
      </div>

      {/* Compliance frameworks */}
      <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #ebe8e3' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#bbb' }}>Compliance</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.entries(latest.compliance) as [keyof ComplianceStatus, string][]).map(([key, val]) => {
            const c = COMPLIANCE_LABEL[val] ?? COMPLIANCE_LABEL['AT RISK']
            return (
              <div key={key} className="rounded-xl p-3" style={{ background: c.bg }}>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: c.color }}>
                  {key.replace(/_/g, ' ').toUpperCase()}
                </p>
                <p className="text-sm font-semibold mt-1" style={{ color: c.color }}>{c.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Scan history (if more than 1) */}
      {reports.length > 1 && (
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #ebe8e3' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#bbb' }}>Scan history</p>
          <div className="space-y-2">
            {reports.map((r, i) => (
              <div key={r.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {i === 0 && <span className="font-semibold" style={{ color: '#1a1a1a' }}>Latest</span>}
                  <span style={{ color: '#aaa' }}>{timeAgo(r.scannedAt)}</span>
                  {r.sha && <span className="font-mono" style={{ color: '#bbb' }}>{r.sha.slice(0, 7)}</span>}
                </div>
                <span style={{ color: r.riskSummary.total > 0 ? '#d35400' : '#27ae60' }}>
                  {r.riskSummary.total} finding{r.riskSummary.total !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Findings */}
      {sortedFindings.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: '#bbb' }}>
            {sortedFindings.length} finding{sortedFindings.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-3">
            {sortedFindings.map((f, i) => <FindingCard key={i} finding={f} />)}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-10 text-center" style={{ background: '#fff', border: '1px solid #ebe8e3' }}>
          <p className="text-lg font-semibold mb-1" style={{ color: '#1a1a1a' }}>No vulnerable crypto found</p>
          <p className="text-sm" style={{ color: '#aaa' }}>This repository appears quantum-safe in scanned files.</p>
        </div>
      )}
    </div>
  )
}
