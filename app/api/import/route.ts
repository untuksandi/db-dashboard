export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getServiceClient } from '@/lib/supabase'

const UPDATABLE_FIELDS = [
  'project_name',
  'region',
  'project_value',
  'team',
  'pm',
  'stage',
  'attention_flag',
  'wpr_count',
  'last_meeting',
  'key_risk',
  'notes',
  'status',
  'go_live_date',
] as const

const VALID_REGIONS = new Set(['2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'])
const VALID_TEAMS = new Set(['Delivery', 'CSM', 'Product', 'Technical', 'Sales'])

// Map header labels → field keys
const HEADER_MAP: Record<string, string> = {
  '#':                  'display_order',
  'Project Name':       'project_name',
  'Year':               'region',
  'Region':             'region',
  'Team':               'team',
  'PM':                 'pm',
  'Stage / Phase':      'stage',
  'Attention Flag':     'attention_flag',
  'WPR Count':          'wpr_count',
  'Last Meeting':       'last_meeting',
  'Key Risk / Issue':   'key_risk',
  'Notes':              'notes',
  'Status':             'status',
  'Go-Live Date':       'go_live_date',
  'Project Value (Rp)': 'project_value',
  'Project Value':      'project_value',
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    const buf = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: false })

    // Use first sheet (All Projects Status)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][]

    if (rows.length < 2) {
      return NextResponse.json({ error: 'File has no data rows' }, { status: 400 })
    }

    // Map headers
    const headers = rows[0].map((h) => String(h).trim())
    const orderIdx = headers.findIndex((h) => HEADER_MAP[h] === 'display_order')
    if (orderIdx === -1) {
      return NextResponse.json({ error: 'Missing # column — use the downloaded template' }, { status: 400 })
    }

    const db = getServiceClient()
    let updated = 0
    const errors: string[] = []

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const orderRaw = row[orderIdx]
      const displayOrder = parseInt(String(orderRaw), 10)
      if (isNaN(displayOrder)) continue

      const patch: Record<string, unknown> = {}

      for (let c = 0; c < headers.length; c++) {
        const field = HEADER_MAP[headers[c]]
        if (!field || field === 'display_order') continue
        if (!(UPDATABLE_FIELDS as readonly string[]).includes(field)) continue

        let val: unknown = row[c] === '' ? null : row[c]

        if (field === 'wpr_count') {
          val = val === null ? null : parseInt(String(val), 10)
          if (isNaN(val as number)) val = null
        }

        if (field === 'region') {
          const s = val ? String(val).trim() : ''
          val = VALID_REGIONS.has(s) ? s : null
        }

        if (field === 'project_value') {
          const n = val === null ? null : parseFloat(String(val).replace(/[^0-9.]/g, ''))
          val = isNaN(n as number) || n === null ? null : n
        }

        if (field === 'team') {
          const s = val ? String(val).trim() : ''
          val = VALID_TEAMS.has(s) ? s : null
        }

        if (field === 'go_live_date') {
          if (val instanceof Date) {
            // cellDates:true converted it already
            val = val.toISOString().slice(0, 10)
          } else if (typeof val === 'number' && val > 0) {
            // Excel date serial → JS Date (Excel epoch offset = 25569 days from 1970-01-01)
            const d = new Date((val - 25569) * 86400 * 1000)
            val = d.toISOString().slice(0, 10)
          } else if (val && typeof val === 'string') {
            val = val.trim() || null
          } else {
            val = null
          }
        }

        patch[field] = val
      }

      if (Object.keys(patch).length === 0) continue

      const { error } = await db
        .from('projects')
        .update(patch)
        .eq('display_order', displayOrder)

      if (error) {
        errors.push(`Row ${i + 1} (#${displayOrder}): ${error.message}`)
      } else {
        updated++
      }
    }

    return NextResponse.json({
      updated,
      errors,
      message: `${updated} project(s) updated${errors.length ? `, ${errors.length} error(s)` : ''}`,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Import failed' },
      { status: 500 }
    )
  }
}
