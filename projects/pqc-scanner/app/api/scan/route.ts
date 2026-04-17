import { NextRequest } from 'next/server'
import { scanFile, scoreWithAI, buildReport, detectLanguage } from '@/lib/scanner'
import { Finding, Language } from '@/lib/types'

const MAX_FILE_SIZE = 512 * 1024   // 512 KB per file
const MAX_REPO_FILES = 200

async function fetchGithubFiles(repoUrl: string): Promise<{ name: string; content: string }[]> {
  // Parse github.com/owner/repo or owner/repo
  const match = repoUrl.match(/(?:github\.com\/)?([^/]+\/[^/\s#?]+)/)
  if (!match) throw new Error('Invalid GitHub URL. Use github.com/owner/repo format.')

  const slug = match[1].replace(/\.git$/, '')
  const apiBase = `https://api.github.com/repos/${slug}`

  const repoRes = await fetch(apiBase, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(10000),
  })
  if (repoRes.status === 404) throw new Error(`Repository "${slug}" not found or is private.`)
  if (!repoRes.ok) throw new Error(`GitHub API error: ${repoRes.status}`)

  const repo = await repoRes.json()
  const branch = repo.default_branch ?? 'main'

  const treeRes = await fetch(`${apiBase}/git/trees/${branch}?recursive=1`, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(15000),
  })
  if (!treeRes.ok) throw new Error('Could not fetch repository tree.')

  const tree = await treeRes.json()
  const scannable = (tree.tree as { path: string; type: string; size?: number }[])
    .filter(f =>
      f.type === 'blob' &&
      detectLanguage(f.path) !== 'unknown' &&
      (f.size ?? 0) < MAX_FILE_SIZE
    )
    .slice(0, MAX_REPO_FILES)

  const files: { name: string; content: string }[] = []
  await Promise.all(
    scannable.map(async f => {
      try {
        const raw = await fetch(
          `https://raw.githubusercontent.com/${slug}/${branch}/${f.path}`,
          { signal: AbortSignal.timeout(8000) }
        )
        if (!raw.ok) return
        files.push({ name: f.path, content: await raw.text() })
      } catch { /* skip unreachable files */ }
    })
  )

  return files
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { repoUrl, fileContent, fileName, apiKey, aiScoring } = body

  const encoder = new TextEncoder()
  const startMs = Date.now()

  const stream = new ReadableStream({
    async start(controller) {
      function send(type: string, payload: unknown) {
        controller.enqueue(encoder.encode(JSON.stringify({ type, ...payload as object }) + '\n'))
      }

      try {
        let files: { name: string; content: string }[] = []

        if (repoUrl) {
          send('status', { message: 'Fetching repository…' })
          files = await fetchGithubFiles(repoUrl)
          send('status', { message: `Scanning ${files.length} files…` })
        } else if (fileContent && fileName) {
          files = [{ name: fileName, content: fileContent }]
          send('status', { message: `Scanning ${fileName}…` })
        } else {
          throw new Error('Provide a GitHub URL or file content.')
        }

        const allFindings: Finding[] = []
        const languages: Language[] = []

        for (const file of files) {
          const lang = detectLanguage(file.name)
          if (lang !== 'unknown') languages.push(lang)

          const findings = scanFile(file.content, file.name)
          allFindings.push(...findings)

          if (findings.length > 0) {
            send('findings', { file: file.name, findings })
          }
        }

        // AI scoring (optional, snippets only — no full files)
        if (aiScoring && apiKey && allFindings.length > 0) {
          send('status', { message: 'Scoring risk with AI…' })
          await Promise.all(
            allFindings.map(async finding => {
              const score = await scoreWithAI(finding, apiKey)
              if (score) finding.aiRisk = score
            })
          )
        }

        const report = buildReport(
          repoUrl ?? fileName,
          allFindings,
          files.length,
          languages,
          Date.now() - startMs,
          !!(aiScoring && apiKey)
        )

        send('report', { report })
        controller.close()
      } catch (err) {
        send('error', { message: String(err).replace('Error: ', '') })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
  })
}
