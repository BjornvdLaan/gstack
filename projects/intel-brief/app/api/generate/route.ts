import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { scrapeUrl } from '@/lib/scraper'
import { getProfile, saveProfile } from '@/lib/store'
import { Briefing, Citation } from '@/lib/types'
import { randomUUID } from 'crypto'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { profileId, apiKey } = await req.json()

  const effectiveApiKey = apiKey || process.env.ANTHROPIC_API_KEY
  if (!effectiveApiKey) {
    return Response.json({ error: 'No API key provided' }, { status: 400 })
  }

  const anthropic = apiKey ? new Anthropic({ apiKey }) : client
  const profile = getProfile(profileId)
  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 })

  const sources = await Promise.all(
    profile.sources.map(s => scrapeUrl(s.url, s.label))
  )

  const successfulSources = sources.filter(s => s.content.length > 0)
  if (successfulSources.length === 0) {
    return Response.json({ error: 'Could not fetch any sources' }, { status: 422 })
  }

  const previousBriefing = profile.briefings.at(-1)
  const memorySection = previousBriefing
    ? `\n\nPREVIOUS BRIEFING (${previousBriefing.createdAt.slice(0, 10)}):\n${previousBriefing.content.slice(0, 3000)}\n\nIMPORTANT: Focus only on what is NEW since the previous briefing. Open with a "What changed" section.`
    : ''

  const sourceBlocks = successfulSources
    .map((s, i) => `[SOURCE ${i + 1}] ${s.label} (${s.url})\n${s.content}`)
    .join('\n\n---\n\n')

  const systemPrompt = `You are an expert intelligence analyst. Your job is to synthesize information from multiple sources into a clear, professional briefing.

Rules:
- Write in clear, direct prose. No filler.
- Every factual claim must cite its source using [1], [2], etc. matching the source index.
- Structure: start with a 2-3 sentence executive summary, then cover key developments, then implications.
- End with a CITATIONS section listing each source used.
- If sources conflict, note the disagreement explicitly.
- Confidence: mark claims from a single source as (unverified) if significant.`

  const userPrompt = `Topic: ${profile.topic}${memorySection}

SOURCES:
${sourceBlocks}

Write a comprehensive intelligence briefing on "${profile.topic}". Use [1], [2], etc. to cite sources inline. End with a ## Citations section.`

  const encoder = new TextEncoder()
  let fullContent = ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          stream: true,
        })

        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            fullContent += event.delta.text
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }

        // Persist the briefing
        const citations: Citation[] = successfulSources.map((s, i) => ({
          index: i + 1,
          url: s.url,
          label: s.label,
          excerpt: s.content.slice(0, 200),
        }))

        const briefing: Briefing = {
          id: randomUUID(),
          content: fullContent,
          citations,
          createdAt: new Date().toISOString(),
        }

        const updated = {
          ...profile,
          briefings: [...profile.briefings, briefing],
        }
        saveProfile(updated)

        controller.enqueue(encoder.encode(`\n\n__BRIEFING_ID__:${briefing.id}`))
        controller.close()
      } catch (err) {
        controller.enqueue(encoder.encode(`\n\nError: ${String(err)}`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
