const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2'

type ClickUpTask = {
  id: string
  name: string
  status: { status: string }
  due_date: string | null
  assignees: { username: string; email: string }[]
  list: { name: string }
  custom_fields: { name: string; value: unknown }[]
}

type ClickUpTasksResponse = {
  tasks: ClickUpTask[]
}

function getHeaders() {
  const token = process.env.CLICKUP_API_TOKEN
  if (!token) throw new Error('CLICKUP_API_TOKEN not configured')
  return { Authorization: token, 'Content-Type': 'application/json' }
}

export async function fetchClickUpTasks(projectCodes: string[]): Promise<
  { task: ClickUpTask; matchedCode: string }[]
> {
  const teamId = process.env.CLICKUP_TEAM_ID
  if (!teamId) throw new Error('CLICKUP_TEAM_ID not configured')

  const headers = getHeaders()

  // Fetch all tasks from all spaces
  const spacesRes = await fetch(`${CLICKUP_API_BASE}/team/${teamId}/space`, {
    headers,
  })
  if (!spacesRes.ok) throw new Error(`ClickUp spaces error: ${spacesRes.status}`)
  const spacesData = await spacesRes.json() as { spaces: { id: string }[] }

  const matched: { task: ClickUpTask; matchedCode: string }[] = []

  for (const space of spacesData.spaces) {
    const listsRes = await fetch(
      `${CLICKUP_API_BASE}/space/${space.id}/list`,
      { headers }
    )
    if (!listsRes.ok) continue
    const listsData = await listsRes.json() as { lists: { id: string }[] }

    for (const list of listsData.lists) {
      const tasksRes = await fetch(
        `${CLICKUP_API_BASE}/list/${list.id}/task?include_closed=true`,
        { headers }
      )
      if (!tasksRes.ok) continue
      const tasksData = await tasksRes.json() as ClickUpTasksResponse

      for (const task of tasksData.tasks) {
        const code = findProjectCode(task, projectCodes)
        if (code) matched.push({ task, matchedCode: code })
      }
    }
  }

  return matched
}

function findProjectCode(task: ClickUpTask, codes: string[]): string | null {
  for (const code of codes) {
    if (
      task.name.includes(code) ||
      task.list.name.includes(code) ||
      task.custom_fields.some((f) => String(f.value ?? '').includes(code))
    ) {
      return code
    }
  }
  return null
}

export function mapClickUpStatus(
  clickUpStatus: string
): 'Open' | 'In Progress' | 'Done' | 'Blocked' | 'Deferred' {
  const s = clickUpStatus.toLowerCase()
  if (s === 'in progress' || s === 'in-progress') return 'In Progress'
  if (s === 'complete' || s === 'done' || s === 'closed') return 'Done'
  if (s === 'blocked') return 'Blocked'
  if (s === 'deferred' || s === 'cancelled') return 'Deferred'
  return 'Open'
}
