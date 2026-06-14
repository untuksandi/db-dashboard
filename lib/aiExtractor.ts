import Anthropic from '@anthropic-ai/sdk'

export type ExtractedActionItem = {
  action: string
  owner: string
  dueDate: string | null
}

const client = new Anthropic()

export async function extractActionItems(
  text: string,
  projectCode: string
): Promise<ExtractedActionItem[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const prompt = `You are reviewing a project communication for project ${projectCode}.

Extract all action items, owners, and due dates from the following text. Return a JSON array only — no explanation, no markdown.

Each item must have exactly these fields:
- "action": string (the task/action to be done)
- "owner": string (person responsible, or "" if unknown)
- "dueDate": string in YYYY-MM-DD format, or null if not mentioned

Text to analyze:
"""
${text.slice(0, 8000)}
"""

Return only valid JSON array, e.g.: [{"action":"...","owner":"...","dueDate":"2026-06-01"}]`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : '[]'

  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    const items = JSON.parse(jsonMatch[0]) as ExtractedActionItem[]
    return items.filter(
      (item) => typeof item.action === 'string' && item.action.trim().length > 0
    )
  } catch {
    return []
  }
}
