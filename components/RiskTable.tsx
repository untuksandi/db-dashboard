'use client'

import { useState, useMemo } from 'react'
import type { RiskRow, IssueType } from '@/lib/supabase'

type Props = {
  risks: RiskRow[]
  onSave: (rows: RiskRow[]) => void
}

const ISSUE_TYPES: IssueType[] = [
  'Tech Issue', 'Sales Issue', 'Client Issue',
  'Consultant Issue', '3rd Party Issue', 'Partner Issue',
]

const ISSUE_COLORS: Record<string, string> = {
  'Tech Issue':        'bg-blue-100 text-blue-700',
  'Sales Issue':       'bg-purple-100 text-purple-700',
  'Client Issue':      'bg-orange-100 text-orange-700',
  'Consultant Issue':  'bg-teal-100 text-teal-700',
  '3rd Party Issue':   'bg-pink-100 text-pink-700',
  'Partner Issue':     'bg-indigo-100 text-indigo-700',
  '':                  'bg-gray-100 text-gray-400',
}

const IMPACT_COLORS: Record<string, string> = {
  High: 'bg-red-100 text-red-700',
  Med:  'bg-yellow-100 text-yellow-700',
  Low:  'bg-green-100 text-green-700',
  '':   'bg-gray-100 text-gray-400',
}

const STATUS_COLORS: Record<string, string> = {
  Open:          'bg-red-100 text-red-700',
  'In Progress': 'bg-yellow-100 text-yellow-700',
  Pending:       'bg-orange-100 text-orange-700',
  Closed:        'bg-emerald-100 text-emerald-700',
  '':            'bg-gray-100 text-gray-400',
}

const IMPACT_ORDER: Record<string, number> = { High: 0, Med: 1, Low: 2, '': 3 }
const STATUS_ORDER: Record<string, number> = { Open: 0, 'In Progress': 1, Pending: 2, Closed: 3, '': 4 }

type SortCol = 'issue_type' | 'impact' | 'status' | 'deadline' | null
type SortDir = 'asc' | 'desc'

function nextId(rows: RiskRow[]) {
  return rows.length === 0 ? 1 : Math.max(...rows.map((r) => r.id)) + 1
}

export function RiskTable({ risks, onSave }: Props) {
  const [rows, setRows] = useState<RiskRow[]>(risks)
  const [editCell, setEditCell] = useState<{ row: number; col: string } | null>(null)
  const [draft, setDraft] = useState('')

  const [filterIssue, setFilterIssue] = useState('')
  const [filterImpact, setFilterImpact] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortCol, setSortCol] = useState<SortCol>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  const displayed = useMemo(() => {
    let list = rows.map((r, i) => ({ ...r, _origIdx: i }))
    if (filterIssue)  list = list.filter((r) => r.issue_type === filterIssue)
    if (filterImpact) list = list.filter((r) => r.impact === filterImpact)
    if (filterStatus) list = list.filter((r) => r.status === filterStatus)
    if (sortCol) {
      const dir = sortDir === 'asc' ? 1 : -1
      list = [...list].sort((a, b) => {
        if (sortCol === 'issue_type') return dir * (a.issue_type ?? '').localeCompare(b.issue_type ?? '')
        if (sortCol === 'impact')    return dir * (IMPACT_ORDER[a.impact]  - IMPACT_ORDER[b.impact])
        if (sortCol === 'status')    return dir * (STATUS_ORDER[a.status]  - STATUS_ORDER[b.status])
        if (sortCol === 'deadline') {
          if (!a.deadline && !b.deadline) return 0
          if (!a.deadline) return 1
          if (!b.deadline) return -1
          return dir * a.deadline.localeCompare(b.deadline)
        }
        return 0
      })
    }
    return list
  }, [rows, filterIssue, filterImpact, filterStatus, sortCol, sortDir])

  function commit(origIdx: number, col: string) {
    const updated = rows.map((r, i) => i === origIdx ? { ...r, [col]: draft } : r)
    setRows(updated)
    onSave(updated)
    setEditCell(null)
  }

  function startEdit(origIdx: number, col: string, current: string) {
    setEditCell({ row: origIdx, col })
    setDraft(current)
  }

  function addRow() {
    const updated = [
      ...rows,
      { id: nextId(rows), description: '', issue_type: '' as IssueType, impact: '' as const, mitigation: '', pic: '', deadline: '', status: '' as const },
    ]
    setRows(updated)
    onSave(updated)
  }

  function deleteRow(origIdx: number) {
    const updated = rows.filter((_, i) => i !== origIdx)
    setRows(updated)
    onSave(updated)
  }

  const isEditing = (origIdx: number, col: string) =>
    editCell?.row === origIdx && editCell?.col === col

  function SortIcon({ col }: { col: SortCol }) {
    const active = sortCol === col
    return (
      <span
        className={`ml-0.5 text-[9px] cursor-pointer select-none ${active ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
        onClick={(e) => { e.stopPropagation(); toggleSort(col) }}
      >
        {active && sortDir === 'desc' ? '▼' : '▲'}
      </span>
    )
  }

  const hasFilters = filterIssue || filterImpact || filterStatus

  return (
    <div className="mt-1">
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <select
          value={filterIssue}
          onChange={(e) => setFilterIssue(e.target.value)}
          className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400 bg-white"
        >
          <option value="">All Issue Types</option>
          {ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filterImpact}
          onChange={(e) => setFilterImpact(e.target.value)}
          className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400 bg-white"
        >
          <option value="">All Impact</option>
          <option value="High">High</option>
          <option value="Med">Med</option>
          <option value="Low">Low</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400 bg-white"
        >
          <option value="">All Status</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Pending">Pending</option>
          <option value="Closed">Closed</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => { setFilterIssue(''); setFilterImpact(''); setFilterStatus('') }}
            className="text-xs text-gray-400 hover:text-gray-600 px-1"
          >
            ✕ Clear
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{displayed.length} / {rows.length} risks</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs" style={{ minWidth: '980px', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '28px' }} />   {/* # */}
            <col style={{ width: '190px' }} />  {/* Risk Description */}
            <col style={{ width: '100px' }} />  {/* Issue Type */}
            <col style={{ width: '66px' }} />   {/* Impact */}
            <col style={{ width: '185px' }} />  {/* Mitigation */}
            <col style={{ width: '90px' }} />   {/* PIC */}
            <col style={{ width: '86px' }} />   {/* Deadline */}
            <col style={{ width: '76px' }} />   {/* Status */}
            <col style={{ width: '28px' }} />   {/* delete */}
          </colgroup>
          <thead>
            <tr className="bg-[#00BFBF] text-white text-xs font-semibold">
              <th className="px-2 py-2 text-center">#</th>
              <th className="px-3 py-2 text-left">Risk Description</th>
              <th className="px-2 py-2 text-center cursor-pointer" onClick={() => toggleSort('issue_type')}>
                Issue Type <SortIcon col="issue_type" />
              </th>
              <th className="px-2 py-2 text-center cursor-pointer" onClick={() => toggleSort('impact')}>
                Impact <SortIcon col="impact" />
              </th>
              <th className="px-3 py-2 text-left">Mitigation Action</th>
              <th className="px-3 py-2 text-left">PIC</th>
              <th className="px-2 py-2 text-center cursor-pointer" onClick={() => toggleSort('deadline')}>
                Deadline <SortIcon col="deadline" />
              </th>
              <th className="px-2 py-2 text-center cursor-pointer" onClick={() => toggleSort('status')}>
                Status <SortIcon col="status" />
              </th>
              <th className="px-1 py-2" />
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-gray-400 italic">
                  {rows.length === 0 ? 'No risks logged yet — click "+ Add Row" below' : 'No risks match the current filters'}
                </td>
              </tr>
            )}
            {displayed.map((row, visIdx) => {
              const origIdx = row._origIdx
              return (
                <tr key={row.id} className={`border-t border-gray-100 ${visIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  {/* # */}
                  <td className="px-2 py-1.5 text-center text-gray-400 font-mono">{visIdx + 1}</td>

                  {/* Risk Description */}
                  <td className="px-2 py-1.5 cursor-pointer" onClick={() => startEdit(origIdx, 'description', row.description)}>
                    {isEditing(origIdx, 'description') ? (
                      <textarea autoFocus rows={2} value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => commit(origIdx, 'description')}
                        onKeyDown={(e) => { if (e.key === 'Escape') setEditCell(null) }}
                        className="w-full border border-sky-400 rounded px-1 py-0.5 text-xs focus:outline-none resize-none"
                      />
                    ) : (
                      <span className={`block min-h-[1.5rem] hover:bg-sky-50 rounded px-1 -mx-1 ${row.description ? 'text-gray-700' : 'text-gray-300 italic'}`}>
                        {row.description || 'Click to edit…'}
                      </span>
                    )}
                  </td>

                  {/* Issue Type */}
                  <td className="px-2 py-1.5 text-center">
                    {isEditing(origIdx, 'issue_type') ? (
                      <select autoFocus value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => commit(origIdx, 'issue_type')}
                        className="w-full border border-sky-400 rounded px-1 py-0.5 text-xs focus:outline-none bg-white"
                      >
                        <option value="">—</option>
                        {ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <span
                        onClick={() => startEdit(origIdx, 'issue_type', row.issue_type ?? '')}
                        className={`inline-block px-1.5 py-0.5 rounded-full font-medium cursor-pointer text-[10px] leading-tight ${ISSUE_COLORS[row.issue_type ?? '']}`}
                      >
                        {row.issue_type || '—'}
                      </span>
                    )}
                  </td>

                  {/* Impact */}
                  <td className="px-2 py-1.5 text-center">
                    {isEditing(origIdx, 'impact') ? (
                      <select autoFocus value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => commit(origIdx, 'impact')}
                        className="w-full border border-sky-400 rounded px-1 py-0.5 text-xs focus:outline-none bg-white"
                      >
                        <option value="">—</option>
                        <option value="High">High</option>
                        <option value="Med">Med</option>
                        <option value="Low">Low</option>
                      </select>
                    ) : (
                      <span
                        onClick={() => startEdit(origIdx, 'impact', row.impact)}
                        className={`inline-block px-2 py-0.5 rounded-full font-medium cursor-pointer ${IMPACT_COLORS[row.impact]}`}
                      >
                        {row.impact || '—'}
                      </span>
                    )}
                  </td>

                  {/* Mitigation */}
                  <td className="px-2 py-1.5 cursor-pointer" onClick={() => startEdit(origIdx, 'mitigation', row.mitigation)}>
                    {isEditing(origIdx, 'mitigation') ? (
                      <textarea autoFocus rows={2} value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => commit(origIdx, 'mitigation')}
                        onKeyDown={(e) => { if (e.key === 'Escape') setEditCell(null) }}
                        className="w-full border border-sky-400 rounded px-1 py-0.5 text-xs focus:outline-none resize-none"
                      />
                    ) : (
                      <span className={`block min-h-[1.5rem] hover:bg-sky-50 rounded px-1 -mx-1 ${row.mitigation ? 'text-gray-700' : 'text-gray-300 italic'}`}>
                        {row.mitigation || 'Click to edit…'}
                      </span>
                    )}
                  </td>

                  {/* PIC */}
                  <td className="px-2 py-1.5 cursor-pointer" onClick={() => startEdit(origIdx, 'pic', row.pic)}>
                    {isEditing(origIdx, 'pic') ? (
                      <input autoFocus type="text" value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => commit(origIdx, 'pic')}
                        onKeyDown={(e) => { if (e.key === 'Enter') commit(origIdx, 'pic'); if (e.key === 'Escape') setEditCell(null) }}
                        className="w-full border border-sky-400 rounded px-1 py-0.5 text-xs focus:outline-none"
                      />
                    ) : (
                      <span className={`block hover:bg-sky-50 rounded px-1 -mx-1 ${row.pic ? 'text-gray-700' : 'text-gray-300 italic'}`}>
                        {row.pic || '—'}
                      </span>
                    )}
                  </td>

                  {/* Deadline */}
                  <td className="px-2 py-1.5 text-center cursor-pointer" onClick={() => startEdit(origIdx, 'deadline', row.deadline)}>
                    {isEditing(origIdx, 'deadline') ? (
                      <input autoFocus type="date" value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => commit(origIdx, 'deadline')}
                        className="w-full border border-sky-400 rounded px-1 py-0.5 text-xs focus:outline-none"
                      />
                    ) : (
                      <span className={`block hover:bg-sky-50 rounded px-1 -mx-1 font-mono ${row.deadline ? 'text-gray-700' : 'text-gray-300'}`}>
                        {row.deadline
                          ? new Date(row.deadline + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                          : '—'}
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-2 py-1.5 text-center">
                    {isEditing(origIdx, 'status') ? (
                      <select autoFocus value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => commit(origIdx, 'status')}
                        className="w-full border border-sky-400 rounded px-1 py-0.5 text-xs focus:outline-none bg-white"
                      >
                        <option value="">—</option>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Pending">Pending</option>
                        <option value="Closed">Closed</option>
                      </select>
                    ) : (
                      <span
                        onClick={() => startEdit(origIdx, 'status', row.status)}
                        className={`inline-block px-2 py-0.5 rounded-full font-medium cursor-pointer ${STATUS_COLORS[row.status]}`}
                      >
                        {row.status || '—'}
                      </span>
                    )}
                  </td>

                  {/* Delete */}
                  <td className="px-1 py-1.5 text-center">
                    <button
                      onClick={() => deleteRow(origIdx)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-xs leading-none"
                      title="Remove row"
                    >✕</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <button
        onClick={addRow}
        className="mt-2 flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-800 transition-colors"
      >
        <span className="text-base leading-none">＋</span> Add Row
      </button>
    </div>
  )
}
