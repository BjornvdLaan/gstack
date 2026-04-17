'use strict'

const core = require('@actions/core')
const glob = require('@actions/glob')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const yaml = require('js-yaml')

// ─── Language detection ──────────────────────────────────────────────────────

const EXTENSIONS = {
  '.java': 'java', '.py': 'python',
  '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.ts': 'typescript', '.tsx': 'typescript',
  '.go': 'go',
}

function detectLanguage(filename) {
  const ext = path.extname(filename).toLowerCase()
  return EXTENSIONS[ext] || 'unknown'
}

// ─── Built-in rule set (default) ─────────────────────────────────────────────
// These are the same as lib/patterns.ts — duplicated here so the action is
// self-contained when split to its own repo.
// V2: this moves to a separate github.com/pqcscanner/pqc-rules repo and gets
// fetched via the rule-sets input.

const BUILT_IN_RULES = [
  // JAVA — JCA
  { id: 'java-rsa-keygen',      language: 'java',   pattern: 'KeyPairGenerator\\.getInstance\\s*\\(\\s*["\']RSA["\']',     algorithm: 'RSA',       severity: 'HIGH', message: 'RSA key generation is quantum-vulnerable',               migration: 'Replace with ML-DSA (FIPS 204) or ML-KEM (FIPS 203).' },
  { id: 'java-rsa-cipher',      language: 'java',   pattern: 'Cipher\\.getInstance\\s*\\(\\s*["\']RSA',                    algorithm: 'RSA',       severity: 'HIGH', message: 'RSA cipher is quantum-vulnerable',                       migration: 'Replace with ML-KEM (FIPS 203) for key encapsulation.' },
  { id: 'java-ecdh',            language: 'java',   pattern: 'KeyAgreement\\.getInstance\\s*\\(\\s*["\']ECDH["\']',        algorithm: 'ECDH',      severity: 'HIGH', message: 'ECDH key agreement is quantum-vulnerable',               migration: 'Replace with ML-KEM (FIPS 203).' },
  { id: 'java-ecdsa',           language: 'java',   pattern: 'KeyPairGenerator\\.getInstance\\s*\\(\\s*["\']EC["\']',      algorithm: 'ECDSA',     severity: 'HIGH', message: 'EC key generation is quantum-vulnerable',                migration: 'Signatures: ML-DSA (FIPS 204). Key agreement: ML-KEM (FIPS 203).' },
  { id: 'java-sha1-signature',  language: 'java',   pattern: 'Signature\\.getInstance\\s*\\(\\s*["\']SHA1with',            algorithm: 'SHA-1',     severity: 'HIGH', message: 'SHA-1 signature scheme is broken',                      migration: 'Replace with ML-DSA (FIPS 204).' },
  { id: 'java-dsa',             language: 'java',   pattern: 'KeyPairGenerator\\.getInstance\\s*\\(\\s*["\']DSA["\']',     algorithm: 'DSA',       severity: 'HIGH', message: 'DSA is quantum-vulnerable',                             migration: 'Replace with ML-DSA (FIPS 204).' },
  { id: 'java-dh',              language: 'java',   pattern: 'KeyPairGenerator\\.getInstance\\s*\\(\\s*["\']DH["\']',      algorithm: 'DH',        severity: 'HIGH', message: 'Diffie-Hellman is quantum-vulnerable',                  migration: 'Replace with ML-KEM (FIPS 203).' },
  // JAVA — Bouncy Castle
  { id: 'java-bc-rsa-params',   language: 'java',   pattern: 'RSAKeyGenerationParameters|RSAPrivateCrtKeyParameters|RSAKeyParameters', algorithm: 'RSA', severity: 'HIGH', message: 'Bouncy Castle RSA usage is quantum-vulnerable', migration: 'Replace with ML-DSA or ML-KEM from org.bouncycastle.pqc.crypto.' },
  { id: 'java-bc-ecdh',         language: 'java',   pattern: 'ECDHBasicAgreement|ECDHCBasicAgreement',                    algorithm: 'ECDH',      severity: 'HIGH', message: 'Bouncy Castle ECDH is quantum-vulnerable',               migration: 'Replace with KyberKEM from Bouncy Castle PQC module.' },
  // PYTHON
  { id: 'python-rsa-generate',  language: 'python', pattern: 'rsa\\.generate_private_key|RSA\\.generate|generate_private_key.*rsa', algorithm: 'RSA', severity: 'HIGH', message: 'RSA key generation is quantum-vulnerable', migration: 'Use pqcrypto or liboqs-python for ML-DSA/ML-KEM.' },
  { id: 'python-ec-generate',   language: 'python', pattern: 'ec\\.generate_private_key|ECDH\\(|ECDSA\\(',                algorithm: 'ECDSA/ECDH',severity: 'HIGH', message: 'Elliptic curve crypto is quantum-vulnerable',            migration: 'Signatures: ML-DSA. Key agreement: ML-KEM. Use liboqs-python.' },
  { id: 'python-rsa-import',    language: 'python', pattern: 'from cryptography.*import.*RSA|import rsa\\b',              algorithm: 'RSA',       severity: 'MEDIUM', message: 'RSA import — verify usage is not for long-lived keys',  migration: 'Audit all uses. Migrate to ML-KEM/ML-DSA.' },
  { id: 'python-paramiko-rsa',  language: 'python', pattern: 'paramiko\\.RSAKey|RSAKey\\.generate',                       algorithm: 'RSA',       severity: 'HIGH', message: 'Paramiko RSA SSH key is quantum-vulnerable',             migration: 'Migrate to ML-KEM hybrid SSH (OpenSSH 9.0+).' },
  // JAVASCRIPT / TYPESCRIPT
  { id: 'js-webcrypto-rsa',     language: 'any',    pattern: 'generateKey.*RSA-OAEP|generateKey.*RSASSA-PKCS1|generateKey.*RSA-PSS', algorithm: 'RSA', severity: 'HIGH', message: 'Web Crypto RSA is quantum-vulnerable', migration: 'Use liboqs-js WASM for ML-KEM/ML-DSA.' },
  { id: 'js-webcrypto-ecdh',    language: 'any',    pattern: 'generateKey.*ECDH|generateKey.*ECDSA',                      algorithm: 'ECDH/ECDSA',severity: 'HIGH', message: 'Web Crypto EC key generation is quantum-vulnerable',     migration: 'Use liboqs-js for ML-KEM or ML-DSA.' },
  { id: 'js-node-rsa',          language: 'any',    pattern: 'generateKeyPair.*rsa|createSign.*RSA|createVerify.*RSA',    algorithm: 'RSA',       severity: 'HIGH', message: 'Node.js RSA usage is quantum-vulnerable',               migration: 'Replace with ML-DSA or ML-KEM via liboqs-node.' },
  { id: 'js-node-ecdh',         language: 'any',    pattern: 'createECDH\\(|generateKeyPair.*ec\\b',                      algorithm: 'ECDH',      severity: 'HIGH', message: 'Node.js ECDH is quantum-vulnerable',                    migration: 'Replace with ML-KEM via liboqs-node.' },
  { id: 'js-jose-rsa',          language: 'any',    pattern: 'generateKeyPair.*RS256|RS384|RS512|PS256|PS384|PS512',      algorithm: 'RSA',       severity: 'HIGH', message: 'JOSE/JWT RSA signing algorithm is quantum-vulnerable',   migration: 'Migrate JWT signing to ML-DSA.' },
  // GO
  { id: 'go-rsa-generate',      language: 'go',     pattern: 'rsa\\.GenerateKey|rsa\\.GenerateMultiPrimeKey',             algorithm: 'RSA',       severity: 'HIGH', message: 'Go RSA key generation is quantum-vulnerable',           migration: 'Replace with ML-KEM/ML-DSA via github.com/cloudflare/circl.' },
  { id: 'go-ecdh',              language: 'go',     pattern: 'ecdh\\.P256\\(\\)|ecdh\\.P384\\(\\)|ecdh\\.P521\\(\\)|ecdh\\.X25519\\(\\)', algorithm: 'ECDH', severity: 'HIGH', message: 'Go ECDH is quantum-vulnerable', migration: 'Replace with ML-KEM via golang.org/x/crypto/mlkem (Go 1.24+).' },
  { id: 'go-ecdsa',             language: 'go',     pattern: 'ecdsa\\.GenerateKey|ecdsa\\.Sign|ecdsa\\.Verify',           algorithm: 'ECDSA',     severity: 'HIGH', message: 'Go ECDSA is quantum-vulnerable',                        migration: 'Replace with ML-DSA via github.com/cloudflare/circl/sign/mldsa.' },
  { id: 'go-dsa',               language: 'go',     pattern: 'dsa\\.GenerateKey|dsa\\.Sign',                              algorithm: 'DSA',       severity: 'HIGH', message: 'Go DSA is quantum-vulnerable (deprecated since Go 1.15)', migration: 'Replace with ML-DSA via cloudflare/circl.' },
  { id: 'go-tls-rsa-cipher',    language: 'go',     pattern: 'tls\\.TLS_RSA_WITH|tls\\.TLS_ECDHE_RSA',                   algorithm: 'RSA',       severity: 'HIGH', message: 'TLS cipher suite using RSA is quantum-vulnerable',      migration: 'Use TLS 1.3 with X25519MLKEM768 (Go 1.24+).' },
]

// ─── Custom rule loading (from .pqc/rules/*.yaml in the scanned repo) ────────

function loadCustomRules(workspaceDir) {
  const rulesDir = path.join(workspaceDir, '.pqc', 'rules')
  if (!fs.existsSync(rulesDir)) return []

  const rules = []
  const files = fs.readdirSync(rulesDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(rulesDir, file), 'utf-8')
      const parsed = yaml.load(content)
      const raw = Array.isArray(parsed) ? parsed : [parsed]
      for (const r of raw) {
        if (!r || !r.id || !r.pattern || !r.message || !r.migration) continue
        const severity = (r.severity || 'HIGH').toUpperCase()
        rules.push({
          id: `custom:${r.id}`,
          language: r.language || 'any',
          pattern: r.pattern,
          algorithm: r.algorithm || 'Unknown',
          severity: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'SAFE'].includes(severity) ? severity : 'HIGH',
          message: r.message,
          migration: r.migration,
        })
      }
    } catch {
      // malformed rule file — skip
    }
  }

  core.info(`Loaded ${rules.length} custom rule(s) from .pqc/rules/`)
  return rules
}

// ─── Scanner ─────────────────────────────────────────────────────────────────

function extractSnippet(lines, matchLine) {
  const start = Math.max(0, matchLine - 2)
  const end = Math.min(lines.length - 1, matchLine + 2)
  return lines.slice(start, end + 1).join('\n')
}

function scanFile(content, filename, rules) {
  const language = detectLanguage(filename)
  if (language === 'unknown') return []

  const lines = content.split('\n')
  const findings = []

  for (const rule of rules) {
    if (rule.language !== 'any' && rule.language !== language) continue
    const regex = new RegExp(rule.pattern, 'i')
    for (let i = 0; i < lines.length; i++) {
      const match = regex.exec(lines[i])
      if (!match) continue
      findings.push({
        ruleId: rule.id,
        file: filename,
        line: i + 1,
        column: match.index + 1,
        algorithm: rule.algorithm,
        severity: rule.severity,
        confidence: 8,
        snippet: extractSnippet(lines, i),
        message: rule.message,
        migration: rule.migration,
      })
    }
  }

  return findings
}

// ─── Compliance mapping ───────────────────────────────────────────────────────

function buildCompliance(findings) {
  const hasHighOrCritical = findings.some(f => f.severity === 'HIGH' || f.severity === 'CRITICAL')
  const status = hasHighOrCritical ? 'NON-COMPLIANT' : findings.length > 0 ? 'AT RISK' : 'COMPLIANT'
  return {
    nist_fips_203: status,
    nist_fips_204: status,
    nis2: hasHighOrCritical ? 'AT RISK' : 'COMPLIANT',
    dora: hasHighOrCritical ? 'AT RISK' : 'COMPLIANT',
  }
}

// ─── HTTP POST ────────────────────────────────────────────────────────────────

async function postReport(url, report, token) {
  const data = JSON.stringify(report)
  const parsed = new URL(url)
  const options = {
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path: parsed.pathname + parsed.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'User-Agent': 'pqc-scanner-action/1.0',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }
  const transport = parsed.protocol === 'https:' ? require('https') : require('http')
  return new Promise((resolve, reject) => {
    const req = transport.request(options, res => {
      res.resume()
      res.on('end', () => resolve(res.statusCode))
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, SAFE: 4 }

async function run() {
  try {
    const failOn = (core.getInput('fail-on') || 'HIGH').toUpperCase()
    const reportUrl = core.getInput('report-url')
    const reportToken = core.getInput('report-token')
    const paths = core.getInput('paths') || '**/*.java **/*.py **/*.js **/*.mjs **/*.ts **/*.tsx **/*.go'
    const exclude = core.getInput('exclude') || ''
    const workspace = process.env.GITHUB_WORKSPACE || process.cwd()

    core.info('PQC Scanner — detecting quantum-vulnerable cryptography')
    core.info(`Fail on: ${failOn} and above`)

    // Load rules: built-in + local custom
    const customRules = loadCustomRules(workspace)
    const allRules = [...BUILT_IN_RULES, ...customRules]
    core.info(`Rules loaded: ${BUILT_IN_RULES.length} built-in, ${customRules.length} custom`)

    // Glob files
    const includePatterns = paths.split(/\s+/).filter(Boolean)
    const excludePatterns = exclude.split(/\s+/).filter(Boolean).map(p => `!${p}`)
    const globber = await glob.create([...includePatterns, ...excludePatterns].join('\n'), {
      followSymbolicLinks: false,
      matchDirectories: false,
    })
    const files = await globber.glob()
    core.info(`Scanning ${files.length} files...`)

    // Scan
    const allFindings = []
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8')
        const relPath = path.relative(workspace, file)
        const findings = scanFile(content, relPath, allRules)
        if (findings.length > 0) core.info(`  ${relPath}: ${findings.length} finding(s)`)
        allFindings.push(...findings)
      } catch { /* skip unreadable */ }
    }

    // Counts
    const counts = { critical: 0, high: 0, medium: 0, low: 0, safe: 0 }
    for (const f of allFindings) {
      const sev = f.severity.toLowerCase()
      if (sev in counts) counts[sev]++
    }

    // Build report
    const report = {
      id: crypto.randomUUID(),
      source: process.env.GITHUB_REPOSITORY || 'unknown',
      ref: process.env.GITHUB_REF || 'unknown',
      sha: process.env.GITHUB_SHA || 'unknown',
      scannedAt: new Date().toISOString(),
      findings: allFindings,
      riskSummary: { ...counts, total: allFindings.length },
      compliance: buildCompliance(allFindings),
      filesScanned: files.length,
      rulesApplied: allRules.length,
    }

    // Outputs
    const threshold = SEVERITY_ORDER[failOn] ?? 1
    const hasFailing = allFindings.some(f => (SEVERITY_ORDER[f.severity] ?? 99) <= threshold)
    core.setOutput('critical-count', String(counts.critical))
    core.setOutput('high-count', String(counts.high))
    core.setOutput('total-count', String(allFindings.length))
    core.setOutput('compliant', String(!hasFailing))

    const reportPath = path.join(process.env.RUNNER_TEMP || '/tmp', 'pqc-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    core.setOutput('report-json', reportPath)

    // Job summary
    const complianceRows = Object.entries(report.compliance).map(([k, v]) => [
      k.replace(/_/g, ' ').toUpperCase(),
      v === 'COMPLIANT' ? '✅ COMPLIANT' : v === 'NON-COMPLIANT' ? '🔴 NON-COMPLIANT' : '🟡 AT RISK',
    ])
    await core.summary
      .addHeading('PQC Scanner Results', 2)
      .addRaw(`Scanned **${files.length}** files · **${allFindings.length}** finding(s)\n\n`)
      .addTable([
        [{ data: 'Severity', header: true }, { data: 'Count', header: true }],
        ['🔴 CRITICAL', String(counts.critical)],
        ['🟠 HIGH',     String(counts.high)],
        ['🟡 MEDIUM',   String(counts.medium)],
        ['🟢 LOW',      String(counts.low)],
      ])
      .addHeading('Compliance', 3)
      .addTable([
        [{ data: 'Framework', header: true }, { data: 'Status', header: true }],
        ...complianceRows,
      ])
      .write()

    // POST to compliance server
    if (reportUrl) {
      core.info(`Posting report to ${reportUrl}`)
      try {
        const status = await postReport(reportUrl, report, reportToken)
        core.info(`Report accepted (HTTP ${status})`)
      } catch (err) {
        core.warning(`Failed to post report: ${err}`)
      }
    }

    // Fail check
    if (hasFailing) {
      core.setFailed(
        `Found ${failOn}+ severity quantum-vulnerable cryptography. ` +
        `CRITICAL: ${counts.critical}, HIGH: ${counts.high}. ` +
        `See job summary for migration guidance.`
      )
    } else {
      core.info(`✓ No ${failOn}+ severity findings across ${files.length} files.`)
    }
  } catch (err) {
    core.setFailed(String(err))
  }
}

run()
