export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { fetchClickUpTasks, mapClickUpStatus } from '@/lib/clickup'
import { fetchRecentProjectThreads } from '@/lib/gmail'
import { fetchRecentDriveFiles } from '@/lib/gdrive'
import { extractActionItems } from '@/lib/aiExtractor'

type SyncResult = {
  source: string
  created: number
  updated: number
  error?: string
}

function verifyCronSecret(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  const adminSecret = process.env.ADMIN_SECRET
  const header = req.headers.get('x-cron-secret') ?? req.headers.get('authorization')
  return !!(header && (header === cronSecret || header === adminSecret))
}

async function syncClickUp(
  db: ReturnType<typeof getServiceClient>,
  projects: { id: string; code: string }[],
  sinceDate: Date
): Promise<SyncResult> {
  let created = 0
  let updated = 0

  const codes = projects.map((p) => p.code)
  const codeToId = Object.fromEntries(projects.map((p) => [p.code, p.id]))

  const matched = await fetchClickUpTasks(codes)

  for (const { task, matchedCode } of matched) {
    const projectId = codeToId[matchedCode]
    if (!projectId) continue

    const status = mapClickUpStatus(task.status.status)
    const dueDate = task.due_date
      ? new Date(parseInt(task.due_date)).toISOString().split('T')[0]
      : null
    const owner = task.assignees[0]?.username ?? ''

    // Check if action item with this external_id already exists
    const { data: existing } = await db
      .from('action_items')
      .select('id, status, due_date')
      .eq('external_id', `clickup:${task.id}`)
      .maybeSingle()

    if (existing) {
      if (existing.status !== status || existing.due_date !== dueDate) {
        await db
          .from('action_items')
          .update({ status, due_date: dueDate })
          .eq('id', existing.id)
        updated++
      }
    } else {
      const { data: seq } = await db
        .from('action_items')
        .select('sequence')
        .eq('project_id', projectId)
        .order('sequence', { ascending: false })
        .limit(1)
        .maybeSingle()

      await db.from('action_items').insert({
        project_id: projectId,
        sequence: (seq?.sequence ?? 0) + 1,
        action: task.name,
        owner,
        due_date: dueDate,
        status,
        source: 'ClickUp',
        external_id: `clickup:${task.id}`,
      })
      created++
    }
  }

  await db.from('sync_log').insert({
    source: 'ClickUp',
    items_created: created,
    items_updated: updated,
  })

  return { source: 'ClickUp', created, updated }
}

async function syncGmail(
  db: ReturnType<typeof getServiceClient>,
  projects: { id: string; code: string }[],
  sinceDate: Date
): Promise<SyncResult> {
  let created = 0
  let updated = 0

  const codes = projects.map((p) => p.code)
  const threads = await fetchRecentProjectThreads(codes, sinceDate)

  for (const thread of threads) {
    // Match thread to project by code in subject
    const project = projects.find((p) =>
      thread.subject.includes(p.code) || thread.body.includes(p.code)
    )
    if (!project) continue

    // Check if thread already processed
    const { data: existing } = await db
      .from('action_items')
      .select('id')
      .eq('external_id', `gmail:${thread.threadId}`)
      .maybeSingle()

    if (existing) continue

    const extracted = await extractActionItems(thread.body, project.code)

    for (const item of extracted) {
      const { data: seq } = await db
        .from('action_items')
        .select('sequence')
        .eq('project_id', project.id)
        .order('sequence', { ascending: false })
        .limit(1)
        .maybeSingle()

      await db.from('action_items').insert({
        project_id: project.id,
        sequence: (seq?.sequence ?? 0) + 1,
        action: item.action,
        owner: item.owner ?? '',
        due_date: item.dueDate ?? null,
        status: 'Open',
        source: 'Gmail',
        external_id: `gmail:${thread.threadId}`,
      })
      created++
    }
  }

  await db.from('sync_log').insert({
    source: 'Gmail',
    items_created: created,
    items_updated: updated,
  })

  return { source: 'Gmail', created, updated }
}

async function syncGDrive(
  db: ReturnType<typeof getServiceClient>,
  projects: { id: string; code: string }[],
  sinceDate: Date
): Promise<SyncResult> {
  let created = 0
  let updated = 0

  const files = await fetchRecentDriveFiles(sinceDate)

  for (const file of files) {
    // Match file to project by code in filename or content
    const project = projects.find((p) =>
      file.name.includes(p.code) || file.content.includes(p.code)
    )
    if (!project) continue

    const { data: existing } = await db
      .from('action_items')
      .select('id')
      .eq('external_id', `gdrive:${file.fileId}`)
      .maybeSingle()

    if (existing) continue

    const extracted = await extractActionItems(file.content, project.code)

    for (const item of extracted) {
      const { data: seq } = await db
        .from('action_items')
        .select('sequence')
        .eq('project_id', project.id)
        .order('sequence', { ascending: false })
        .limit(1)
        .maybeSingle()

      await db.from('action_items').insert({
        project_id: project.id,
        sequence: (seq?.sequence ?? 0) + 1,
        action: item.action,
        owner: item.owner ?? '',
        due_date: item.dueDate ?? null,
        status: 'Open',
        source: 'GDrive',
        external_id: `gdrive:${file.fileId}`,
      })
      created++
    }
  }

  await db.from('sync_log').insert({
    source: 'GDrive',
    items_created: created,
    items_updated: updated,
  })

  return { source: 'GDrive', created, updated }
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getServiceClient()
  const sinceDate = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const { data: projects } = await db
    .from('projects')
    .select('id, code')
  const projectList = projects ?? []

  const results: SyncResult[] = []

  // ClickUp sync
  try {
    const r = await syncClickUp(db, projectList, sinceDate)
    results.push(r)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'ClickUp sync failed'
    results.push({ source: 'ClickUp', created: 0, updated: 0, error: msg })
    await db.from('sync_log').insert({ source: 'ClickUp', items_created: 0, items_updated: 0, error: msg })
  }

  // Gmail sync
  try {
    const r = await syncGmail(db, projectList, sinceDate)
    results.push(r)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Gmail sync failed'
    results.push({ source: 'Gmail', created: 0, updated: 0, error: msg })
    await db.from('sync_log').insert({ source: 'Gmail', items_created: 0, items_updated: 0, error: msg })
  }

  // GDrive sync
  try {
    const r = await syncGDrive(db, projectList, sinceDate)
    results.push(r)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'GDrive sync failed'
    results.push({ source: 'GDrive', created: 0, updated: 0, error: msg })
    await db.from('sync_log').insert({ source: 'GDrive', items_created: 0, items_updated: 0, error: msg })
  }

  return NextResponse.json({ results, synced_at: new Date().toISOString() })
}

// GET: return last sync info
export async function GET() {
  try {
    const db = getServiceClient()
    const { data } = await db
      .from('sync_log')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(10)

    return NextResponse.json(data ?? [])
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch sync log' },
      { status: 500 }
    )
  }
}
