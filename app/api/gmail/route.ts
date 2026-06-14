import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { extractActionItems } from '@/lib/aiExtractor'

function getOAuth2Client() {
  const clientId = process.env.GMAIL_CLIENT_ID
  const clientSecret = process.env.GMAIL_CLIENT_SECRET
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Gmail OAuth credentials not configured in .env.local')
  }
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret)
  oauth2.setCredentials({ refresh_token: refreshToken })
  return oauth2
}

function extractBody(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const p = payload as Record<string, unknown>
  if (p.body && typeof p.body === 'object') {
    const body = p.body as Record<string, unknown>
    if (typeof body.data === 'string' && body.data) {
      return Buffer.from(body.data, 'base64url').toString('utf-8')
    }
  }
  if (Array.isArray(p.parts)) {
    for (const part of p.parts) {
      const text = extractBody(part)
      if (text) return text
    }
  }
  return ''
}

export async function POST(req: NextRequest) {
  try {
    const { projectCode, projectName, clientName, days = 30 } = await req.json()

    const auth = getOAuth2Client()
    const gmail = google.gmail({ version: 'v1', auth })

    // Build a broad search: project code OR project name OR client name
    const terms: string[] = []
    if (projectCode) terms.push(`"${projectCode}"`)
    if (projectName) terms.push(`"${projectName}"`)
    if (clientName) terms.push(`"${clientName}"`)

    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const dateStr = `${sinceDate.getFullYear()}/${String(sinceDate.getMonth() + 1).padStart(2, '0')}/${String(sinceDate.getDate()).padStart(2, '0')}`
    const query = `(${terms.join(' OR ')}) after:${dateStr}`

    const listRes = await gmail.users.threads.list({
      userId: 'me',
      q: query,
      maxResults: 20,
    })

    const threads = listRes.data.threads ?? []
    const results: {
      threadId: string
      subject: string
      from: string
      date: string
      snippet: string
      actionItems: { action: string; owner: string; dueDate: string | null }[]
    }[] = []

    for (const t of threads) {
      if (!t.id) continue
      const detail = await gmail.users.threads.get({
        userId: 'me',
        id: t.id,
        format: 'full',
      })

      const messages = detail.data.messages ?? []
      const firstMsg = messages[0]
      if (!firstMsg) continue

      const hdrs = firstMsg.payload?.headers ?? []
      const subject = hdrs.find((h) => h.name?.toLowerCase() === 'subject')?.value ?? '(no subject)'
      const from = hdrs.find((h) => h.name?.toLowerCase() === 'from')?.value ?? ''
      const date = hdrs.find((h) => h.name?.toLowerCase() === 'date')?.value ?? ''
      const body = extractBody(firstMsg.payload)
      const snippet = detail.data.messages?.[0]?.snippet ?? ''

      // Use Claude to extract action items (gracefully skip if API unavailable)
      let actionItems: { action: string; owner: string; dueDate: string | null }[] = []
      if (body.trim().length > 20 && process.env.ANTHROPIC_API_KEY) {
        try {
          actionItems = await extractActionItems(body, projectCode ?? projectName ?? '')
        } catch {
          // AI extraction unavailable — user can still see the email and add items manually
        }
      }

      results.push({ threadId: t.id, subject, from, date, snippet, actionItems })
    }

    return NextResponse.json({ threads: results, query, count: results.length })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Gmail fetch failed' },
      { status: 500 }
    )
  }
}
