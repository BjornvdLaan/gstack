import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { Rule, Language, Severity } from './types'
import { BUILT_IN_RULES } from './patterns'

interface RawRule {
  id: string
  language?: string
  pattern: string
  algorithm?: string
  severity?: string
  message: string
  migration: string
  references?: string[]
}

function isValidSeverity(s: string): s is Severity {
  return ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'SAFE'].includes(s)
}

function parseCustomRules(dir: string): Rule[] {
  const rulesDir = path.join(dir, '.pqc', 'rules')
  if (!fs.existsSync(rulesDir)) return []

  const rules: Rule[] = []
  const files = fs.readdirSync(rulesDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(rulesDir, file), 'utf-8')
      const parsed = yaml.load(content)
      const raw = Array.isArray(parsed) ? parsed : [parsed]

      for (const r of raw as RawRule[]) {
        if (!r.id || !r.pattern || !r.message || !r.migration) continue
        const severity = r.severity?.toUpperCase() ?? 'HIGH'
        rules.push({
          id: `custom:${r.id}`,
          language: (r.language as Language) ?? 'any',
          pattern: r.pattern,
          algorithm: r.algorithm ?? 'Unknown',
          severity: isValidSeverity(severity) ? severity : 'HIGH',
          message: r.message,
          migration: r.migration,
          references: r.references,
        })
      }
    } catch {
      // Malformed rule file — skip silently
    }
  }

  return rules
}

export function loadRules(projectDir?: string): Rule[] {
  const custom = projectDir ? parseCustomRules(projectDir) : []
  return [...BUILT_IN_RULES, ...custom]
}
