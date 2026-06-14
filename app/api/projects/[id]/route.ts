export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const db = getServiceClient()
    const { data, error } = await db
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Project not found' },
      { status: 404 }
    )
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json()
    const db = getServiceClient()

    // Fetch old values for audit log
    const { data: old } = await db
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .single()

    const { data, error } = await db
      .from('projects')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    // Write audit log entries
    if (old) {
      const auditEntries = Object.keys(body)
        .filter((k) => JSON.stringify(old[k as keyof typeof old]) !== JSON.stringify(body[k]))
        .map((k) => ({
          project_id: params.id,
          field_name: k,
          old_value: String(old[k as keyof typeof old] ?? ''),
          new_value: String(body[k] ?? ''),
        }))

      if (auditEntries.length > 0) {
        await db.from('audit_log').insert(auditEntries)
      }
    }

    return NextResponse.json(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message
      : typeof e === 'object' && e !== null && 'message' in e ? String((e as { message: unknown }).message)
      : 'Failed to update project'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const db = getServiceClient()
    const { error } = await db.from('projects').delete().eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to delete project' },
      { status: 500 }
    )
  }
}
