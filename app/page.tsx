export const dynamic = 'force-dynamic'

import { DashboardClient } from '@/components/DashboardClient'
import { getServiceClient } from '@/lib/supabase'
import { getServerAuthClient } from '@/lib/auth-server'
import type { Project } from '@/lib/supabase'

async function getProjects(): Promise<Project[]> {
  try {
    const db = getServiceClient()
    const { data, error } = await db
      .from('projects')
      .select('*')
      .order('display_order', { ascending: true })
    if (error) throw error
    return data ?? []
  } catch {
    return []
  }
}

export default async function HomePage() {
  const [projects, auth] = await Promise.all([getProjects(), getServerAuthClient()])
  const { data: { user } } = await auth.auth.getUser()

  let isAdmin = false
  if (user) {
    const db = getServiceClient()
    const { data: profile } = await db.from('user_profiles').select('role').eq('id', user.id).single()
    isAdmin = profile?.role === 'admin'
  }

  return <DashboardClient initialProjects={projects} isAdmin={isAdmin} userEmail={user?.email} />
}
