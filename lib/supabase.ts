import { createClient } from '@supabase/supabase-js'

export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Supabase credentials not configured')
  return createClient(url, serviceKey, {
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  })
}

export function getBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('Supabase public credentials not configured')
  return createClient(url, anonKey)
}

export type AttentionFlag = 'CRITICAL' | 'HIGH' | 'MONITOR' | 'ON TRACK' | 'CANCELLED' | 'ON HOLD'

export type ProjectStatus =
  | 'Action Req.'
  | 'Escalate'
  | 'Review'
  | 'Clarify'
  | 'Monitor'
  | 'Follow-up'
  | 'Invoice'
  | 'Chase'
  | 'Pending'
  | 'Urgent'
  | 'Normal'
  | 'Verify'
  | 'Closed'
  | 'On Hold'

export type Region = '2020' | '2021' | '2022' | '2023' | '2024' | '2025' | '2026' | '2027' | '2028' | '2029' | '2030'
export const REGIONS: Region[] = ['2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030']

export type Team = 'Delivery' | 'CSM' | 'Product' | 'Technical' | 'Sales'
export const TEAMS: Team[] = ['Delivery', 'CSM', 'Product', 'Technical', 'Sales']

export type PhaseRow = {
  id: number
  phase: string
  initial_go_live: string
  actual_go_live: string
  remark: string
}

export type IssueType = 'Tech Issue' | 'Sales Issue' | 'Client Issue' | 'Consultant Issue' | '3rd Party Issue' | 'Partner Issue' | ''

export type RiskRow = {
  id: number
  description: string
  issue_type: IssueType
  impact: 'High' | 'Med' | 'Low' | ''
  mitigation: string
  pic: string
  deadline: string
  status: 'Open' | 'In Progress' | 'Pending' | 'Closed' | ''
}

export type Project = {
  id: string
  display_order: number
  project_name: string
  region: Region | null
  team: Team | null
  pm: string
  stage: string
  attention_flag: AttentionFlag
  wpr_count: number | null
  last_meeting: string
  key_risk: string
  notes: string
  status: ProjectStatus
  go_live_date: string | null
  weekly_progress_url: string | null
  risks: RiskRow[]
  phases: PhaseRow[]
  created_at: string
  updated_at: string
}

export type AuditLog = {
  id: string
  project_id: string
  field_name: string
  old_value: string | null
  new_value: string | null
  created_at: string
}

export const ATTENTION_FLAGS: AttentionFlag[] = [
  'CRITICAL',
  'HIGH',
  'MONITOR',
  'ON TRACK',
  'CANCELLED',
  'ON HOLD',
]

export const PROJECT_STATUSES: ProjectStatus[] = [
  'Action Req.',
  'Escalate',
  'Review',
  'Clarify',
  'Monitor',
  'Follow-up',
  'Invoice',
  'Chase',
  'Pending',
  'Urgent',
  'Normal',
  'Verify',
  'Closed',
  'On Hold',
]

export const STAGES = [
  'Pre-Implementation',
  'New Prospect',
  'Solution Definition',
  'Pre-BRD / Solution Def.',
  'Solution Build',
  'Training & Testing',
  'Deployment & Go Live',
  'Post Go Live',
  'Post Go Live & Optimization',
  'Post Go Live (Closed)',
  'Mixed Stages',
  'CANCELLED',
  'ON HOLD',
] as const

export const FLAG_META: Record<AttentionFlag, { emoji: string; color: string; bg: string; text: string }> = {
  CRITICAL:   { emoji: '🔴', color: 'text-red-700',    bg: 'bg-red-50 border-red-200',    text: 'CRITICAL' },
  HIGH:       { emoji: '🟠', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', text: 'HIGH' },
  MONITOR:    { emoji: '🟡', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', text: 'MONITOR' },
  'ON TRACK': { emoji: '✅', color: 'text-green-700',  bg: 'bg-green-50 border-green-200',  text: 'ON TRACK' },
  CANCELLED:  { emoji: '⛔', color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-200',   text: 'CANCELLED' },
  'ON HOLD':  { emoji: '⏸️', color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200',   text: 'ON HOLD' },
}
