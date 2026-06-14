export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { getServerAuthClient } from '@/lib/auth-server'

type Params = { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    // Verify caller is an admin
    const auth = getServerAuthClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getServiceClient()
    const { data: caller } = await db.from('user_profiles').select('role').eq('id', user.id).single()
    if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { action } = await req.json() // 'approve' | 'reject'
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { error } = await db
      .from('user_profiles')
      .update({ status: action === 'approve' ? 'approved' : 'rejected' })
      .eq('id', params.id)

    if (error) throw error
    return NextResponse.json({ message: `User ${action}d successfully` })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Action failed' }, { status: 500 })
  }
}
