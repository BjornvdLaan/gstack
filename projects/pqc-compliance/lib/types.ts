export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE'
export type ComplianceValue = 'COMPLIANT' | 'AT RISK' | 'NON-COMPLIANT'

export interface Finding {
  ruleId: string
  file: string
  line: number
  column: number
  algorithm: string
  severity: Severity
  confidence: number
  snippet: string
  message: string
  migration: string
  aiRisk?: {
    severity: Severity
    reasoning: string
    dataLifetime: string
  }
}

export interface ComplianceStatus {
  nist_fips_203: ComplianceValue
  nist_fips_204: ComplianceValue
  nis2: ComplianceValue
  dora: ComplianceValue
}

export interface RiskSummary {
  critical: number
  high: number
  medium: number
  low: number
  safe: number
  total: number
}

export interface ScanReport {
  id: string
  source: string           // "owner/repo"
  ref?: string             // git ref
  sha?: string             // git sha
  scannedAt: string        // ISO 8601
  filesScanned: number
  rulesApplied?: number
  findings: Finding[]
  riskSummary: RiskSummary
  compliance: ComplianceStatus
  languagesScanned?: string[]
  aiScoringEnabled?: boolean
}

// Stored report with server-assigned metadata
export interface StoredReport extends ScanReport {
  receivedAt: string       // when the server received it
  orgId: string
}

// Per-repo rollup: latest report + trend
export interface RepoSummary {
  repo: string             // "owner/repo"
  latestReport: StoredReport
  reportCount: number
  trend: 'improving' | 'worsening' | 'stable' | 'new'
}

export interface OrgData {
  orgId: string
  name: string
  apiKey: string           // hashed in prod; plaintext for demo
  reports: StoredReport[]
  createdAt: string
}
