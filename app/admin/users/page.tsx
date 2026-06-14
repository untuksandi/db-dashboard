export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getServerAuthClient } from '@/lib/auth-server'
import { getServiceClient } from '@/lib/supabase'
import { AdminUsersClient } from './AdminUsersClient'

export default async function AdminUsersPage() {
  const auth = getServerAuthClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login')

  const db = getServiceClient()
  const { data: caller } = await db.from('user_profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') redirect('/')

  const { data: users } = await db
    .from('user_profiles')
    .select('id, email, full_name, status, role, created_at')
    .order('created_at', { ascending: false })

  return <AdminUsersClient users={users ?? []} />
}
