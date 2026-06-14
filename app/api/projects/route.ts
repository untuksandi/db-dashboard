export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET() {
  try {
    const db = getServiceClient()
    const { data, error } = await db
      .from('projects')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const db = getServiceClient()

    // Auto-assign next display_order
    const { data: last } = await db
      .from('projects')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (last?.display_order ?? 0) + 1

    const { data, error } = await db
      .from('projects')
      .insert({ ...body, display_order: nextOrder })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message
      : typeof e === 'object' && e !== null && 'message' in e ? String((e as { message: unknown }).message)
      : 'Failed to create project'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
