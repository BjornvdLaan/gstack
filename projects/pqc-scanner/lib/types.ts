export type Language = 'java' | 'python' | 'javascript' | 'typescript' | 'go' | 'unknown'

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE'

export interface Rule {
  id: string
  language: Language | 'any'
  pattern: string        // regex string
  algorithm: string      // human name: "RSA", "ECDH", etc.
  severity: Severity
  message: string
  migration: string
  references?: string[]
}

export interface Finding {
  ruleId: string
  file: string
  line: number
  column: number
  algorithm: string
  severity: Severity
  confidence: number     // 1-10
  snippet: string        // 5 lines of context, no more
  message: string
  migration: string
  aiRisk?: AIRiskScore   // populated if AI scoring enabled
}

export interface AIRiskScore {
  severity: Severity
  reasoning: string      // 1-2 sentences
  dataLifetime: string   // "short-lived" | "medium" | "long-lived"
}

export interface ComplianceStatus {
  nist_fips_203: 'COMPLIANT' | 'NON-COMPLIANT' | 'AT RISK' | 'UNKNOWN'
  nist_fips_204: 'COMPLIANT' | 'NON-COMPLIANT' | 'AT RISK' | 'UNKNOWN'
  nis2: 'COMPLIANT' | 'AT RISK' | 'UNKNOWN'
  dora: 'COMPLIANT' | 'AT RISK' | 'UNKNOWN'
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
  source: string          // repo URL or filename
  scannedAt: string
  durationMs: number
  findings: Finding[]
  riskSummary: RiskSummary
  compliance: ComplianceStatus
  languagesScanned: Language[]
  filesScanned: number
  aiScoringEnabled: boolean
}
