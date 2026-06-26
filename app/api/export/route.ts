export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getServiceClient } from '@/lib/supabase'
import type { Project } from '@/lib/supabase'

const COLUMNS = [
  { key: 'display_order',  header: '#',                  width: 5  },
  { key: 'project_name',   header: 'Project Name',       width: 45 },
  { key: 'region',         header: 'Year',               width: 10 },
  { key: 'team',           header: 'Team',               width: 12 },
  { key: 'pm',             header: 'PM',                 width: 22 },
  { key: 'stage',          header: 'Stage / Phase',      width: 28 },
  { key: 'attention_flag', header: 'Attention Flag',     width: 12 },
  { key: 'wpr_count',      header: 'WPR Count',          width: 10 },
  { key: 'last_meeting',   header: 'Last Meeting',       width: 28 },
  { key: 'key_risk',       header: 'Key Risk / Issue',   width: 50 },
  { key: 'notes',          header: 'Notes',              width: 50 },
  { key: 'status',         header: 'Status',             width: 14 },
  { key: 'go_live_date',   header: 'Go-Live Date',       width: 14 },
  { key: 'project_value', header: 'Project Value (Rp)', width: 20 },
] as const

export async function GET() {
  try {
    const db = getServiceClient()
    const { data, error } = await db
      .from('projects')
      .select('*')
      .order('display_order', { ascending: true })
    if (error) throw error

    const projects: Project[] = data ?? []

    // Build rows
    const headers = COLUMNS.map((c) => c.header)
    const rows = projects.map((p) =>
      COLUMNS.map(({ key }) => {
        const v = p[key as keyof Project]
        return v === null || v === undefined ? '' : v
      })
    )

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

    // Column widths
    ws['!cols'] = COLUMNS.map((c) => ({ wch: c.width }))

    // Style header row (bold via cell format — basic)
    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c })
      if (!ws[addr]) continue
      ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'E2E8F0' } } }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'All Projects Status')

    // Add a README sheet
    const readme = XLSX.utils.aoa_to_sheet([
      ['ASABA Dashboard — Bulk Update Template'],
      [''],
      ['HOW TO USE:'],
      ['1. Edit any cell in the "All Projects Status" sheet'],
      ['2. Do NOT change the # column (used to match rows)'],
      ['3. Do NOT add or remove rows'],
      ['4. Save the file and upload via the dashboard'],
      [''],
      ['YEAR values: 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 | 2027 | 2028 | 2029 | 2030'],
      ['PROJECT VALUE: numeric value in Rupiah, e.g. 500000000 (no formatting, digits only)'],
      ['ATTENTION FLAG values: Critical | High | Medium | Low | Cancelled | On Hold | Closed'],
      ['STATUS values: Action Req. | Escalate | Review | Clarify | Monitor | Follow-up | Invoice | Chase | Pending | Urgent | Normal | Verify | Closed | On Hold'],
      ['GO-LIVE DATE format: YYYY-MM-DD (e.g. 2026-12-31)'],
    ])
    readme['!cols'] = [{ wch: 80 }]
    XLSX.utils.book_append_sheet(wb, readme, 'README')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="ASABA_Projects_Update.xlsx"',
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Export failed' },
      { status: 500 }
    )
  }
}
