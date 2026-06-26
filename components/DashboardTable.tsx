'use client'

import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import type { Project, AttentionFlag, ProjectStatus, Region, Team, RiskRow, PhaseRow } from '@/lib/supabase'
import { ATTENTION_FLAGS, PROJECT_STATUSES, STAGES, REGIONS, TEAMS, FLAG_META } from '@/lib/supabase'
import { RiskTable } from './RiskTable'
import { PhaseTable } from './PhaseTable'

// ── Inline cell ────────────────────────────────────────────────────────────

type CellProps = {
  value: string
  onSave: (v: string) => void
  type?: 'text' | 'select' | 'textarea'
  options?: readonly string[]
  className?: string
}

function InlineCell({ value, onSave, type = 'text', options = [], className = '' }: CellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function commit() {
    if (draft !== value) onSave(draft)
    setEditing(false)
  }

  if (!editing) {
    return (
      <span
        title="Click to edit"
        onClick={() => { setDraft(value); setEditing(true) }}
        className={`cursor-pointer hover:bg-sky-50 hover:ring-1 hover:ring-sky-300 rounded px-1 -mx-1 transition-all text-sm ${className}`}
      >
        {value || <span className="text-gray-300">—</span>}
      </span>
    )
  }

  if (type === 'select') {
    return (
      <select
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { onSave(draft); setEditing(false) }}
        className="border border-sky-400 rounded px-1 py-0.5 text-xs focus:outline-none bg-white"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }

  if (type === 'textarea') {
    return (
      <textarea
        autoFocus
        value={draft}
        rows={3}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false) }}
        className="border border-sky-400 rounded px-1 py-0.5 text-xs focus:outline-none w-full min-w-[180px]"
      />
    )
  }

  return (
    <input
      autoFocus
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      className="border border-sky-400 rounded px-1 py-0.5 text-sm focus:outline-none w-full min-w-[120px]"
    />
  )
}

// ── Go-live date input ─────────────────────────────────────────────────────

function GoLiveDateInput({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(value)

  function commit() {
    if (draft !== value) onSave(draft)
  }

  return (
    <input
      type="date"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
    />
  )
}

// ── Flag badge ─────────────────────────────────────────────────────────────

function FlagBadge({ flag, onSave }: { flag: AttentionFlag; onSave: (v: AttentionFlag) => void }) {
  const [editing, setEditing] = useState(false)
  const meta = FLAG_META[flag] ?? { emoji: '❓', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', text: flag ?? '—' }

  if (editing) {
    return (
      <select
        autoFocus
        value={flag}
        onChange={(e) => { onSave(e.target.value as AttentionFlag); setEditing(false) }}
        onBlur={() => setEditing(false)}
        className="border border-sky-400 rounded px-1 py-0.5 text-xs focus:outline-none bg-white"
      >
        {ATTENTION_FLAGS.map((f) => (
          <option key={f} value={f}>{FLAG_META[f].emoji} {f}</option>
        ))}
      </select>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Click to change"
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold whitespace-nowrap ${meta.bg} ${meta.color}`}
    >
      {meta.emoji} {meta.text}
    </button>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────

const REGION_COLORS: Record<string, string> = {
  '2020': 'bg-slate-50 text-slate-700 border-slate-200',
  '2021': 'bg-gray-50 text-gray-700 border-gray-200',
  '2022': 'bg-zinc-50 text-zinc-700 border-zinc-200',
  '2023': 'bg-blue-50 text-blue-700 border-blue-200',
  '2024': 'bg-violet-50 text-violet-700 border-violet-200',
  '2025': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '2026': 'bg-teal-50 text-teal-700 border-teal-200',
  '2027': 'bg-sky-50 text-sky-700 border-sky-200',
  '2028': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  '2029': 'bg-orange-50 text-orange-700 border-orange-200',
  '2030': 'bg-rose-50 text-rose-700 border-rose-200',
}

const TEAM_COLORS: Record<string, string> = {
  Delivery:  'bg-sky-50 text-sky-700 border-sky-200',
  CSM:       'bg-purple-50 text-purple-700 border-purple-200',
  Product:   'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  Technical: 'bg-slate-100 text-slate-700 border-slate-300',
  Sales:     'bg-orange-50 text-orange-700 border-orange-200',
}

const STATUS_COLORS: Record<string, string> = {
  'Action Req.': 'bg-red-100 text-red-700',
  'Escalate':    'bg-red-200 text-red-800',
  'Urgent':      'bg-red-100 text-red-700',
  'Chase':       'bg-orange-100 text-orange-700',
  'Review':      'bg-orange-100 text-orange-700',
  'Clarify':     'bg-yellow-100 text-yellow-700',
  'Monitor':     'bg-yellow-100 text-yellow-700',
  'Follow-up':   'bg-blue-100 text-blue-700',
  'Pending':     'bg-blue-100 text-blue-700',
  'Invoice':     'bg-purple-100 text-purple-700',
  'Verify':      'bg-indigo-100 text-indigo-700',
  'Normal':      'bg-green-100 text-green-700',
  'Closed':      'bg-gray-100 text-gray-500',
  'On Hold':     'bg-gray-100 text-gray-500',
}

// ── Sortable th ───────────────────────────────────────────────────────────

function SortTh({
  label, sk, sortKey, sortDir, onSort,
}: {
  label: string
  sk: SortKey
  sortKey: SortKey | null
  sortDir: SortDir
  onSort: (k: SortKey) => void
}) {
  const active = sortKey === sk
  return (
    <th
      className="px-3 py-3 text-left text-xs font-semibold text-gray-400 cursor-pointer select-none hover:text-gray-600 whitespace-nowrap group"
      onClick={() => onSort(sk)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-[10px] transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
          {active && sortDir === 'desc' ? '▼' : '▲'}
        </span>
      </span>
    </th>
  )
}

// ── Summary stats ──────────────────────────────────────────────────────────

function SummaryBar({ projects }: { projects: Project[] }) {
  const counts = useMemo(() => {
    const c: Record<AttentionFlag, number> = {
      Critical: 0, High: 0, Medium: 0, Low: 0, Cancelled: 0, 'On Hold': 0, Closed: 0,
    }
    projects.forEach((p) => { c[p.attention_flag] = (c[p.attention_flag] ?? 0) + 1 })
    return c
  }, [projects])

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
      {(Object.keys(FLAG_META) as AttentionFlag[]).map((flag) => {
        const meta = FLAG_META[flag]
        return (
          <div key={flag} className={`rounded-xl border px-4 py-3 ${meta.bg}`}>
            <div className="text-2xl font-bold leading-none">{counts[flag]}</div>
            <div className={`text-xs font-semibold mt-1 ${meta.color}`}>{meta.emoji} {meta.text}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main table ─────────────────────────────────────────────────────────────

type Props = {
  projects: Project[]
  onUpdate: (id: string, patch: Partial<Project>) => Promise<void>
  onError?: (msg: string) => void
}

type SortKey = 'project_name' | 'pm' | 'stage' | 'attention_flag' | 'go_live_date' | 'status' | 'region'
type SortDir = 'asc' | 'desc'

const FLAG_ORDER: Record<AttentionFlag, number> = {
  Critical: 0, High: 1, Medium: 2, Low: 3, 'On Hold': 4, Cancelled: 5, Closed: 6,
}

export function DashboardTable({ projects: initial, onUpdate, onError }: Props) {
  const [projects, setProjects] = useState<Project[]>(initial)
  const [search, setSearch] = useState('')
  const [filterFlag, setFilterFlag] = useState<AttentionFlag | ''>('')
  const [filterPM, setFilterPM] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [filterRegion, setFilterRegion] = useState<Region | ''>('')
  const [filterTeam, setFilterTeam] = useState<Team | ''>('')
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const pms = useMemo(() => [...new Set(projects.map((p) => p.pm).filter(Boolean))].sort(), [projects])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    let list = projects
    if (filterFlag)   list = list.filter((p) => p.attention_flag === filterFlag)
    if (filterPM)     list = list.filter((p) => p.pm === filterPM)
    if (filterStage)  list = list.filter((p) => p.stage === filterStage)
    if (filterRegion) list = list.filter((p) => p.region === filterRegion)
    if (filterTeam)   list = list.filter((p) => p.team === filterTeam)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((p) =>
        p.project_name.toLowerCase().includes(q) ||
        p.pm.toLowerCase().includes(q) ||
        p.key_risk.toLowerCase().includes(q) ||
        p.notes.toLowerCase().includes(q)
      )
    }
    if (sortKey) {
      const dir = sortDir === 'asc' ? 1 : -1
      list = [...list].sort((a, b) => {
        if (sortKey === 'attention_flag') {
          return dir * (FLAG_ORDER[a.attention_flag] - FLAG_ORDER[b.attention_flag])
        }
        if (sortKey === 'go_live_date') {
          const av = a.go_live_date ?? ''
          const bv = b.go_live_date ?? ''
          if (!av && !bv) return 0
          if (!av) return 1   // nulls last
          if (!bv) return -1
          return dir * av.localeCompare(bv)
        }
        const av = String(a[sortKey as keyof Project] ?? '').toLowerCase()
        const bv = String(b[sortKey as keyof Project] ?? '').toLowerCase()
        return dir * av.localeCompare(bv)
      })
    }
    return list
  }, [projects, filterFlag, filterPM, filterStage, filterRegion, filterTeam, search, sortKey, sortDir])

  async function handleUpdate(id: string, field: keyof Project, value: unknown) {
    const prev_snapshot = projects.find((p) => p.id === id)
    setProjects((prev) =>
      prev.map((p) => p.id === id ? { ...p, [field]: value, updated_at: new Date().toISOString() } : p)
    )
    try {
      await onUpdate(id, { [field]: value } as Partial<Project>)
    } catch {
      // Rollback optimistic update on failure
      if (prev_snapshot) {
        setProjects((prev) => prev.map((p) => p.id === id ? prev_snapshot : p))
      }
      onError?.(`Failed to save ${String(field)}`)
    }
  }

  function formatUpdated(iso: string) {
    try { return format(parseISO(iso), 'dd/MM/yyyy  HH:mm') } catch { return iso }
  }

  function clearFilters() {
    setSearch(''); setFilterFlag(''); setFilterPM(''); setFilterStage(''); setFilterRegion(''); setFilterTeam('')
  }

  const hasFilters = search || filterFlag || filterPM || filterStage || filterRegion || filterTeam

  const totalValue = filtered.reduce((sum, p) => sum + (p.project_value ?? 0), 0)

  function formatRupiah(n: number) {
    if (n === 0) return '—'
    return `Rp ${Math.round(n).toLocaleString('id-ID')}`
  }

  function formatRupiahFull(n: number) {
    return `Rp ${Math.round(n).toLocaleString('id-ID')}`
  }

  return (
    <div>
      <SummaryBar projects={projects} />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="Search projects, PM, risks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        <select
          value={filterFlag}
          onChange={(e) => setFilterFlag(e.target.value as AttentionFlag | '')}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">All flags</option>
          {ATTENTION_FLAGS.map((f) => (
            <option key={f} value={f}>{FLAG_META[f].emoji} {f}</option>
          ))}
        </select>
        <select
          value={filterPM}
          onChange={(e) => setFilterPM(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">All PMs</option>
          {pms.map((pm) => <option key={pm} value={pm}>{pm}</option>)}
        </select>
        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value as Region | '')}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">All years</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value as Team | '')}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">All teams</option>
          {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-gray-400 hover:text-gray-600 px-2 py-2"
          >
            ✕ Clear
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {filtered.length} / {projects.length} projects
        </span>
      </div>

      {/* Value summary bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-teal-50 border border-teal-100 rounded-xl text-sm">
        <span className="text-teal-600 font-semibold text-xs uppercase tracking-wider">Total Project Value</span>
        <span className="text-teal-800 font-bold text-base">{formatRupiah(totalValue)}</span>
        {hasFilters && (
          <span className="text-teal-400 text-xs ml-1">· filtered view</span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: '1200px', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '36px' }} />       {/* # */}
            <col style={{ width: '210px' }} />      {/* Project Name */}
            <col style={{ width: '72px' }} />       {/* Year */}
            <col style={{ width: '88px' }} />       {/* Team */}
            <col style={{ width: '130px' }} />      {/* PM */}
            <col style={{ width: '155px' }} />      {/* Stage */}
            <col style={{ width: '110px' }} />      {/* Flag */}
            <col style={{ width: '130px' }} />      {/* Project Value */}
            <col style={{ width: '200px' }} />      {/* Key Risk */}
            <col style={{ width: '96px' }} />       {/* Go-Live */}
            <col style={{ width: '88px' }} />       {/* Status */}
          </colgroup>
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400">#</th>
              <SortTh label="Project Name" sk="project_name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortTh label="Year" sk="region" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400">Team</th>
              <SortTh label="PM"           sk="pm"           sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortTh label="Stage"        sk="stage"        sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortTh label="Flag"         sk="attention_flag" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400">Project Value (Rp)</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400">Key Risk / Issue</th>
              <SortTh label="Go-Live"      sk="go_live_date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortTh label="Status"       sk="status"       sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <>
                <tr
                  key={p.id}
                  className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-pointer ${expandedRow === p.id ? 'bg-sky-50/40' : ''}`}
                  onClick={() => setExpandedRow(expandedRow === p.id ? null : p.id)}
                >
                  <td className="px-3 py-2.5 text-xs text-gray-400 text-center">{p.display_order}</td>
                  <td className="px-3 py-2.5 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <InlineCell
                      value={p.project_name}
                      onSave={(v) => handleUpdate(p.id, 'project_name', v)}
                      className="font-medium text-gray-900 block truncate"
                    />
                  </td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    {p.region
                      ? <span className={`px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap ${REGION_COLORS[p.region] ?? 'bg-gray-100 text-gray-600'}`}>{p.region}</span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    {p.team
                      ? <span className={`px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap ${TEAM_COLORS[p.team] ?? 'bg-gray-100 text-gray-600'}`}>{p.team}</span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 overflow-hidden">
                    <span className="block truncate">{p.pm || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 overflow-hidden">
                    <span className="block truncate">{p.stage}</span>
                  </td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <FlagBadge
                      flag={p.attention_flag}
                      onSave={(v) => handleUpdate(p.id, 'attention_flag', v)}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-xs text-teal-700 font-medium overflow-hidden">
                    <span className="block truncate">{p.project_value ? formatRupiah(p.project_value) : '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 overflow-hidden">
                    <span className="line-clamp-2">{p.key_risk || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono text-gray-600 whitespace-nowrap">
                    {p.go_live_date
                      ? (() => { try { return format(parseISO(p.go_live_date), 'dd MMM yy') } catch { return p.go_live_date } })()
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
                {expandedRow === p.id && (
                  <tr key={`${p.id}-exp`} className="bg-sky-50/40 border-b border-sky-100">
                    <td />
                    <td colSpan={9} className="px-4 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        {/* Project Name (editable) */}
                        <div className="md:col-span-2">
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Project Name</div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <InlineCell value={p.project_name} onSave={(v) => handleUpdate(p.id, 'project_name', v)} />
                          </div>
                        </div>
                        {/* PM (editable) */}
                        <div>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">PM</div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <InlineCell value={p.pm} onSave={(v) => handleUpdate(p.id, 'pm', v)} />
                          </div>
                        </div>
                        {/* Year (editable) */}
                        <div>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Year</div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <InlineCell
                              value={p.region ?? ''}
                              onSave={(v) => handleUpdate(p.id, 'region', v || null)}
                              type="select"
                              options={['', ...REGIONS]}
                            />
                          </div>
                        </div>
                        {/* Team (editable) */}
                        <div>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Team</div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <InlineCell
                              value={p.team ?? ''}
                              onSave={(v) => handleUpdate(p.id, 'team', v || null)}
                              type="select"
                              options={['', ...TEAMS]}
                            />
                          </div>
                        </div>
                        {/* Stage (editable) */}
                        <div>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Stage</div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <InlineCell value={p.stage} onSave={(v) => handleUpdate(p.id, 'stage', v)} type="select" options={STAGES} />
                          </div>
                        </div>
                        {/* Status (editable) */}
                        <div>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <InlineCell value={p.status} onSave={(v) => handleUpdate(p.id, 'status', v as ProjectStatus)} type="select" options={PROJECT_STATUSES} />
                          </div>
                        </div>
                        {/* Go-Live Date (editable) */}
                        <div>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Go-Live Date</div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <GoLiveDateInput
                              value={p.go_live_date ?? ''}
                              onSave={(v) => handleUpdate(p.id, 'go_live_date', v || null)}
                            />
                          </div>
                        </div>
                        {/* Project Value (editable) */}
                        <div>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Project Value (Rp)</div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <InlineCell
                              value={p.project_value != null && p.project_value > 0 ? formatRupiah(p.project_value) : ''}
                              onSave={(v) => handleUpdate(p.id, 'project_value', v ? (parseFloat(v.replace(/[^0-9]/g, '')) || null) : null)}
                            />
                          </div>
                        </div>
                        {/* Last Meeting (editable) */}
                        <div>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Last Meeting / Update</div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <InlineCell value={p.last_meeting} onSave={(v) => handleUpdate(p.id, 'last_meeting', v)} />
                          </div>
                        </div>
                        {/* Weekly Progress GDrive Link */}
                        <div>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Weekly Progress (GDrive)</div>
                          <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                            <InlineCell
                              value={p.weekly_progress_url ?? ''}
                              onSave={(v) => handleUpdate(p.id, 'weekly_progress_url', v || null)}
                              className="text-sky-600 text-sm truncate flex-1"
                            />
                            {p.weekly_progress_url && (
                              <a
                                href={p.weekly_progress_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="shrink-0 text-xs text-sky-600 hover:text-sky-800 border border-sky-200 rounded px-2 py-0.5 hover:bg-sky-50 transition-colors whitespace-nowrap"
                              >
                                Open ↗
                              </a>
                            )}
                          </div>
                        </div>
                        {/* Key Risk — summary text (editable) */}
                        <div className="md:col-span-3">
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Key Risk Summary (shown in table row)</div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <InlineCell value={p.key_risk} onSave={(v) => handleUpdate(p.id, 'key_risk', v)} type="textarea" />
                          </div>
                        </div>
                        {/* Risk Log Table */}
                        <div className="md:col-span-3" onClick={(e) => e.stopPropagation()}>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Risk Log</div>
                          <RiskTable
                            risks={Array.isArray(p.risks) ? p.risks : []}
                            onSave={(rows: RiskRow[]) => handleUpdate(p.id, 'risks', rows)}
                          />
                        </div>
                        {/* Go-Live Phases Table */}
                        <div className="md:col-span-3" onClick={(e) => e.stopPropagation()}>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Go-Live Phases</div>
                          <PhaseTable
                            phases={Array.isArray(p.phases) ? p.phases : []}
                            onSave={(rows: PhaseRow[]) => handleUpdate(p.id, 'phases', rows)}
                          />
                        </div>
                        {/* Notes (editable) */}
                        <div className="md:col-span-3">
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <InlineCell value={p.notes} onSave={(v) => handleUpdate(p.id, 'notes', v)} type="textarea" />
                          </div>
                        </div>
                        {/* Last Updated */}
                        <div>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Last Updated</div>
                          <div className="text-sm font-mono text-gray-700">{formatUpdated(p.updated_at)}</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-5 py-12 text-center text-sm text-gray-400">
                  No projects match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
