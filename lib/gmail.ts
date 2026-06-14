import { google } from 'googleapis'

function getOAuth2Client() {
  const clientId = process.env.GMAIL_CLIENT_ID
  const clientSecret = process.env.GMAIL_CLIENT_SECRET
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Gmail OAuth credentials not configured')
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret)
  oauth2.setCredentials({ refresh_token: refreshToken })
  return oauth2
}

export type GmailThread = {
  threadId: string
  subject: string
  body: string
  date: string
}

export async function fetchRecentProjectThreads(
  projectCodes: string[],
  sinceDate: Date
): Promise<GmailThread[]> {
  const auth = getOAuth2Client()
  const gmail = google.gmail({ version: 'v1', auth })

  const codeQuery = projectCodes.map((c) => `"${c}"`).join(' OR ')
  const dateStr = formatGmailDate(sinceDate)
  const query = `(label:project-update OR subject:(${codeQuery})) after:${dateStr}`

  const listRes = await gmail.users.threads.list({
    userId: 'me',
    q: query,
    maxResults: 50,
  })

  const threads = listRes.data.threads ?? []
  const results: GmailThread[] = []

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

    const headers = firstMsg.payload?.headers ?? []
    const subject =
      headers.find((h) => h.name?.toLowerCase() === 'subject')?.value ?? ''
    const date =
      headers.find((h) => h.name?.toLowerCase() === 'date')?.value ?? ''

    const body = extractBody(firstMsg.payload)

    results.push({ threadId: t.id, subject, body, date })
  }

  return results
}

function extractBody(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const p = payload as Record<string, unknown>

  if (p.body && typeof p.body === 'object') {
    const body = p.body as Record<string, unknown>
    if (typeof body.data === 'string' && body.data) {
      return Buffer.from(body.data, 'base64').toString('utf-8')
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

function formatGmailDate(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}
