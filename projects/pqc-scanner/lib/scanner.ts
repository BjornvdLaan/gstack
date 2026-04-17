import Anthropic from '@anthropic-ai/sdk'
import { Finding, Language, ScanReport, RiskSummary, ComplianceStatus, AIRiskScore, Severity } from './types'
import { loadRules } from './rules'
import { randomUUID } from 'crypto'

const EXTENSIONS: Record<string, Language> = {
  '.java': 'java',
  '.py': 'python',
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.go': 'go',
}

export function detectLanguage(filename: string): Language {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
  return EXTENSIONS[ext] ?? 'unknown'
}

// Returns 5 lines of context around a match (no more — privacy boundary)
function extractSnippet(lines: string[], matchLine: number): string {
  const start = Math.max(0, matchLine - 2)
  const end = Math.min(lines.length - 1, matchLine + 2)
  return lines.slice(start, end + 1).join('\n')
}

export function scanFile(
  content: string,
  filename: string,
  projectDir?: string
): Finding[] {
  const language = detectLanguage(filename)
  if (language === 'unknown') return []

  const rules = loadRules(projectDir)
  const lines = content.split('\n')
  const findings: Finding[] = []

  for (const rule of rules) {
    if (rule.language !== 'any' && rule.language !== language) continue

    const regex = new RegExp(rule.pattern, 'i')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const match = regex.exec(line)
      if (!match) continue

      findings.push({
        ruleId: rule.id,
        file: filename,
        line: i + 1,
        column: match.index + 1,
        algorithm: rule.algorithm,
        severity: rule.severity,
        confidence: 8, // regex match — high base confidence
        snippet: extractSnippet(lines, i),
        message: rule.message,
        migration: rule.migration,
      })
    }
  }

  return findings
}

export async function scoreWithAI(
  finding: Finding,
  apiKey: string
): Promise<AIRiskScore | null> {
  try {
    const client = new Anthropic({ apiKey })

    // Only send the snippet (5 lines max) — not the full file
    const prompt = `You are a post-quantum cryptography expert. Analyze this code snippet and assess the quantum risk.

Algorithm detected: ${finding.algorithm}
File: ${finding.file}
Code snippet (5 lines max):
\`\`\`
${finding.snippet}
\`\`\`

Respond in JSON only:
{
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "reasoning": "1-2 sentence explanation of the risk level based on what this code likely does",
  "dataLifetime": "short-lived|medium|long-lived"
}

Consider: what is this crypto protecting? How long does that data need to stay secret?
CRITICAL = long-lived sensitive data (health records, financial transactions, state secrets)
HIGH = medium-lived data or unclear context
MEDIUM = short-lived data (session tokens, ephemeral keys)
LOW = test code, constants, non-sensitive`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    const severity = parsed.severity?.toUpperCase()
    const validSeverities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'SAFE']

    return {
      severity: validSeverities.includes(severity) ? severity : finding.severity,
      reasoning: parsed.reasoning ?? '',
      dataLifetime: parsed.dataLifetime ?? 'unknown',
    }
  } catch {
    return null
  }
}

function buildRiskSummary(findings: Finding[]): RiskSummary {
  const summary: RiskSummary = { critical: 0, high: 0, medium: 0, low: 0, safe: 0, total: findings.length }
  for (const f of findings) {
    const sev = (f.aiRisk?.severity ?? f.severity).toLowerCase() as keyof Omit<RiskSummary, 'total'>
    if (sev in summary) summary[sev]++
  }
  return summary
}

function buildCompliance(findings: Finding[]): ComplianceStatus {
  const hasHighOrCritical = findings.some(f => {
    const sev = f.aiRisk?.severity ?? f.severity
    return sev === 'HIGH' || sev === 'CRITICAL'
  })
  const status = hasHighOrCritical ? 'NON-COMPLIANT' : findings.length > 0 ? 'AT RISK' : 'COMPLIANT'
  return {
    nist_fips_203: status,
    nist_fips_204: status,
    nis2: hasHighOrCritical ? 'AT RISK' : 'COMPLIANT',
    dora: hasHighOrCritical ? 'AT RISK' : 'COMPLIANT',
  }
}

export function buildReport(
  source: string,
  findings: Finding[],
  filesScanned: number,
  languagesScanned: Language[],
  durationMs: number,
  aiScoringEnabled: boolean
): ScanReport {
  return {
    id: randomUUID(),
    source,
    scannedAt: new Date().toISOString(),
    durationMs,
    findings,
    riskSummary: buildRiskSummary(findings),
    compliance: buildCompliance(findings),
    languagesScanned: [...new Set(languagesScanned)],
    filesScanned,
    aiScoringEnabled,
  }
}
