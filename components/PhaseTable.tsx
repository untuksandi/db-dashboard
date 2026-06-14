'use client'

import { useState } from 'react'
import type { PhaseRow } from '@/lib/supabase'

type Props = {
  phases: PhaseRow[]
  onSave: (rows: PhaseRow[]) => void
}

function nextId(rows: PhaseRow[]) {
  return rows.length === 0 ? 1 : Math.max(...rows.map((r) => r.id)) + 1
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: '2-digit',
    })
  } catch { return iso }
}

export function PhaseTable({ phases, onSave }: Props) {
  const [rows, setRows] = useState<PhaseRow[]>(phases)
  const [editCell, setEditCell] = useState<{ row: number; col: string } | null>(null)
  const [draft, setDraft] = useState('')

  function commit(rowIdx: number, col: string) {
    const updated = rows.map((r, i) => i === rowIdx ? { ...r, [col]: draft } : r)
    setRows(updated)
    onSave(updated)
    setEditCell(null)
  }

  function startEdit(rowIdx: number, col: string, current: string) {
    setEditCell({ row: rowIdx, col })
    setDraft(current)
  }

  function addRow() {
    const updated = [
      ...rows,
      { id: nextId(rows), phase: '', initial_go_live: '', actual_go_live: '', remark: '' },
    ]
    setRows(updated)
    onSave(updated)
  }

  function deleteRow(rowIdx: number) {
    const updated = rows.filter((_, i) => i !== rowIdx)
    setRows(updated)
    onSave(updated)
  }

  const isEditing = (rowIdx: number, col: string) =>
    editCell?.row === rowIdx && editCell?.col === col

  // determine variance colour for Actual vs Initial
  function varianceClass(initial: string, actual: string) {
    if (!initial || !actual) return 'text-gray-500'
    try {
      const diff = new Date(actual).getTime() - new Date(initial).getTime()
      if (diff > 0) return 'text-red-600 font-semibold'   // delayed
      if (diff < 0) return 'text-emerald-600 font-semibold' // early
      return 'text-gray-700'
    } catch { return 'text-gray-500' }
  }

  return (
    <div className="mt-1">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs" style={{ minWidth: '700px', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '32px' }} />   {/* # */}
            <col style={{ width: '140px' }} />  {/* Phase */}
            <col style={{ width: '110px' }} />  {/* Initial Go Live */}
            <col style={{ width: '110px' }} />  {/* Actual Go Live */}
            <col />                             {/* Remark */}
            <col style={{ width: '32px' }} />   {/* delete */}
          </colgroup>
          <thead>
            <tr className="bg-[#00BFBF] text-white text-xs font-semibold">
              <th className="px-2 py-2 text-center">#</th>
              <th className="px-3 py-2 text-left">Phase</th>
              <th className="px-2 py-2 text-center">Initial Go Live</th>
              <th className="px-2 py-2 text-center">Actual Go Live</th>
              <th className="px-3 py-2 text-left">Remark</th>
              <th className="px-1 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400 italic">
                  No phases yet — click &ldquo;+ Add Row&rdquo; below
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={row.id} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>

                {/* # */}
                <td className="px-2 py-2 text-center text-gray-400 font-mono">{i + 1}</td>

                {/* Phase */}
                <td className="px-2 py-2 cursor-pointer" onClick={() => startEdit(i, 'phase', row.phase)}>
                  {isEditing(i, 'phase') ? (
                    <input
                      autoFocus type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => commit(i, 'phase')}
                      onKeyDown={(e) => { if (e.key === 'Enter') commit(i, 'phase'); if (e.key === 'Escape') setEditCell(null) }}
                      className="w-full border border-sky-400 rounded px-1 py-0.5 text-xs focus:outline-none"
                    />
                  ) : (
                    <span className={`block hover:bg-sky-50 rounded px-1 -mx-1 font-medium ${row.phase ? 'text-gray-800' : 'text-gray-300 italic'}`}>
                      {row.phase || 'Click to edit…'}
                    </span>
                  )}
                </td>

                {/* Initial Go Live */}
                <td className="px-2 py-2 text-center cursor-pointer" onClick={() => startEdit(i, 'initial_go_live', row.initial_go_live)}>
                  {isEditing(i, 'initial_go_live') ? (
                    <input
                      autoFocus type="date"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => commit(i, 'initial_go_live')}
                      className="w-full border border-sky-400 rounded px-1 py-0.5 text-xs focus:outline-none"
                    />
                  ) : (
                    <span className="block hover:bg-sky-50 rounded px-1 font-mono text-gray-600">
                      {fmtDate(row.initial_go_live)}
                    </span>
                  )}
                </td>

                {/* Actual Go Live */}
                <td className="px-2 py-2 text-center cursor-pointer" onClick={() => startEdit(i, 'actual_go_live', row.actual_go_live)}>
                  {isEditing(i, 'actual_go_live') ? (
                    <input
                      autoFocus type="date"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => commit(i, 'actual_go_live')}
                      className="w-full border border-sky-400 rounded px-1 py-0.5 text-xs focus:outline-none"
                    />
                  ) : (
                    <span className={`block hover:bg-sky-50 rounded px-1 font-mono ${varianceClass(row.initial_go_live, row.actual_go_live)}`}>
                      {fmtDate(row.actual_go_live)}
                    </span>
                  )}
                </td>

                {/* Remark */}
                <td className="px-2 py-2 cursor-pointer" onClick={() => startEdit(i, 'remark', row.remark)}>
                  {isEditing(i, 'remark') ? (
                    <textarea
                      autoFocus rows={2}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => commit(i, 'remark')}
                      onKeyDown={(e) => { if (e.key === 'Escape') setEditCell(null) }}
                      className="w-full border border-sky-400 rounded px-1 py-0.5 text-xs focus:outline-none resize-none"
                    />
                  ) : (
                    <span className={`block min-h-[1.5rem] hover:bg-sky-50 rounded px-1 -mx-1 ${row.remark ? 'text-gray-700' : 'text-gray-300 italic'}`}>
                      {row.remark || '—'}
                    </span>
                  )}
                </td>

                {/* Delete */}
                <td className="px-1 py-2 text-center">
                  <button
                    onClick={() => deleteRow(i)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-xs leading-none"
                    title="Remove row"
                  >✕</button>
                </td>
              </tr>
            ))}
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
