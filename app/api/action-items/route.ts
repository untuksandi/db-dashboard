export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get('project_id')
    const db = getServiceClient()

    let query = db.from('action_items').select('*').order('sequence', { ascending: true })
    if (projectId) query = query.eq('project_id', projectId)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch action items' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const db = getServiceClient()

    // Get next sequence for project
    const { data: existing } = await db
      .from('action_items')
      .select('sequence')
      .eq('project_id', body.project_id)
      .order('sequence', { ascending: false })
      .limit(1)

    const nextSeq = existing && existing.length > 0 ? (existing[0].sequence ?? 0) + 1 : 1

    const { data, error } = await db
      .from('action_items')
      .insert({
        project_id: body.project_id,
        sequence: body.sequence ?? nextSeq,
        action: body.action ?? '',
        owner: body.owner ?? '',
        due_date: body.due_date ?? null,
        status: body.status ?? 'Open',
        source: body.source ?? 'Manual',
        external_id: body.external_id ?? null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create action item' },
      { status: 500 }
    )
  }
}
