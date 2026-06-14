export const dynamic = 'force-dynamic'

import { getServiceClient } from '@/lib/supabase'
import type { Project } from '@/lib/supabase'
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard'

async function getProjects(): Promise<Project[]> {
  try {
    const db = getServiceClient()
    const { data, error } = await db
      .from('projects')
      .select('*')
      .order('display_order', { ascending: true })
    if (error) throw error
    return data ?? []
  } catch { return [] }
}

export default async function DashboardPage() {
  const projects = await getProjects()
  return <AnalyticsDashboard projects={projects} />
}
