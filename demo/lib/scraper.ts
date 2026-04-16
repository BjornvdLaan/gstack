export interface ScrapedSource {
  url: string
  label: string
  content: string
  error?: string
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{3,}/g, '\n\n')
    .trim()
    .slice(0, 8000)
}

export async function scrapeUrl(url: string, label: string): Promise<ScrapedSource> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IntelBriefBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return { url, label, content: '', error: `HTTP ${res.status}` }
    const html = await res.text()
    const content = stripHtml(html)
    return { url, label, content }
  } catch (err) {
    return { url, label, content: '', error: String(err) }
  }
}
