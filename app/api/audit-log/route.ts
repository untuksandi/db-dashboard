export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const entityId = req.nextUrl.searchParams.get('entity_id')
    const db = getServiceClient()

    let query = db
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (entityId) {
      query = query.or(`entity_id.eq.${entityId},project_id.eq.${entityId}`)
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch audit log' },
      { status: 500 }
    )
  }
}
