import { NextResponse } from 'next/server'

const BASE = 'https://api.clickup.com/api/v2'

function headers() {
  const token = process.env.CLICKUP_API_TOKEN
  if (!token) throw new Error('CLICKUP_API_TOKEN not configured')
  return { Authorization: token, 'Content-Type': 'application/json' }
}

export type ClickUpList = {
  id: string
  name: string
  space: { id: string; name: string }
  folder: { id: string; name: string; hidden: boolean } | null
  task_count: number
}

export async function GET() {
  try {
    const teamId = process.env.CLICKUP_TEAM_ID
    if (!teamId) throw new Error('CLICKUP_TEAM_ID not configured')

    const h = headers()

    // Fetch all spaces
    const spacesRes = await fetch(`${BASE}/team/${teamId}/space?archived=false`, { headers: h })
    if (!spacesRes.ok) throw new Error(`ClickUp error: ${spacesRes.status} ${await spacesRes.text()}`)
    const { spaces } = await spacesRes.json() as { spaces: { id: string; name: string }[] }

    const lists: ClickUpList[] = []

    for (const space of spaces) {
      // Fetch folderless lists directly in the space
      const fListRes = await fetch(`${BASE}/space/${space.id}/list?archived=false`, { headers: h })
      if (fListRes.ok) {
        const { lists: spaceLists } = await fListRes.json() as { lists: { id: string; name: string; task_count: number }[] }
        for (const l of spaceLists) {
          lists.push({
            id: l.id,
            name: l.name,
            space: { id: space.id, name: space.name },
            folder: null,
            task_count: l.task_count ?? 0,
          })
        }
      }

      // Fetch folders, then lists inside folders
      const foldersRes = await fetch(`${BASE}/space/${space.id}/folder?archived=false`, { headers: h })
      if (foldersRes.ok) {
        const { folders } = await foldersRes.json() as { folders: { id: string; name: string; hidden: boolean; lists: { id: string; name: string; task_count: number }[] }[] }
        for (const folder of folders) {
          for (const l of folder.lists ?? []) {
            lists.push({
              id: l.id,
              name: l.name,
              space: { id: space.id, name: space.name },
              folder: { id: folder.id, name: folder.name, hidden: folder.hidden },
              task_count: l.task_count ?? 0,
            })
          }
        }
      }
    }

    return NextResponse.json({ spaces, lists })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch ClickUp data' },
      { status: 500 }
    )
  }
}
