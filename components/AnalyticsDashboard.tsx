'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { parseISO, format, addMonths, startOfMonth, isSameMonth } from 'date-fns'
import type { Project, AttentionFlag } from '@/lib/supabase'
import { FLAG_META } from '@/lib/supabase'

// ── helpers ───────────────────────────────────────────────────────────────

function countBy<T>(arr: T[], key: (item: T) => string): Record<string, number> {
  return arr.reduce((acc, item) => {
    const k = key(item)
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
}

function pct(val: number, total: number) {
  return total === 0 ? 0 : Math.round((val / total) * 100)
}

// ── sub-components ────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="relative rounded-2xl border border-[#1a3d50] bg-[#0c1e2a] overflow-hidden group hover:border-[#00c9a7]/40 transition-colors duration-300">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: 'radial-gradient(ellipse at top left, rgba(0,201,167,0.06) 0%, transparent 70%)' }} />
      {accent && (
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: accent }} />
      )}
      <div className="px-6 py-5">
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#4a7a8a] mb-2">{label}</p>
        <p className="font-['var(--font-bebas)'] text-5xl leading-none text-white" style={{ fontFamily: 'var(--font-bebas)' }}>{value}</p>
        {sub && <p className="text-xs text-[#4a7a8a] mt-1.5">{sub}</p>}
      </div>
    </div>
  )
}

function HBar({ label, value, max, color, count }: { label: string; value: number; max: number; color: string; count: number }) {
  const w = max === 0 ? 0 : Math.max(2, (value / max) * 100)
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#6b9aaa] w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-5 bg-[#0a1820] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${w}%`, background: color }}
        />
      </div>
      <span className="text-xs font-semibold text-white w-6 text-right">{count}</span>
    </div>
  )
}

function DonutChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  if (total === 0) return <div className="w-32 h-32 rounded-full bg-[#0a1820] mx-auto" />

  let cumulative = 0
  const paths = slices.map((s) => {
    const startAngle = (cumulative / total) * 360 - 90
    const endAngle = ((cumulative + s.value) / total) * 360 - 90
    cumulative += s.value

    const r = 50; const cx = 60; const cy = 60; const inner = 30
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const x1 = cx + r * Math.cos(toRad(startAngle))
    const y1 = cy + r * Math.sin(toRad(startAngle))
    const x2 = cx + r * Math.cos(toRad(endAngle))
    const y2 = cy + r * Math.sin(toRad(endAngle))
    const ix1 = cx + inner * Math.cos(toRad(startAngle))
    const iy1 = cy + inner * Math.sin(toRad(startAngle))
    const ix2 = cx + inner * Math.cos(toRad(endAngle))
    const iy2 = cy + inner * Math.sin(toRad(endAngle))
    const large = endAngle - startAngle > 180 ? 1 : 0

    return (
      <path
        key={s.label}
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1} Z`}
        fill={s.color}
        opacity={0.9}
      />
    )
  })

  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32">
      {paths}
      <circle cx="60" cy="60" r="26" fill="#0c1e2a" />
      <text x="60" y="56" textAnchor="middle" fill="#00c9a7" fontSize="13" fontWeight="bold" style={{ fontFamily: 'var(--font-bebas)' }}>{total}</text>
      <text x="60" y="68" textAnchor="middle" fill="#4a7a8a" fontSize="7">PROJECTS</text>
    </svg>
  )
}

function GoLiveTimeline({ projects }: { projects: Project[] }) {
  const now = new Date()
  const months = Array.from({ length: 8 }, (_, i) => addMonths(startOfMonth(now), i))

  const counts = months.map((m) => ({
    label: format(m, 'MMM yy'),
    count: projects.filter((p) => {
      if (!p.go_live_date) return false
      try { return isSameMonth(parseISO(p.go_live_date), m) } catch { return false }
    }).length,
  }))

  const max = Math.max(...counts.map((c) => c.count), 1)

  return (
    <div className="flex items-end gap-2 h-24">
      {counts.map((c) => (
        <div key={c.label} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] font-semibold text-[#00c9a7]">{c.count > 0 ? c.count : ''}</span>
          <div className="w-full rounded-t-md transition-all duration-700" style={{
            height: `${Math.max(4, (c.count / max) * 64)}px`,
            background: c.count > 0 ? 'linear-gradient(to top, #00c9a7, #00e5cc)' : '#0a1820',
          }} />
          <span className="text-[9px] text-[#3a6070] text-center whitespace-nowrap">{c.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────

export function AnalyticsDashboard({ projects }: { projects: Project[] }) {
  const now = new Date().toLocaleDateString('en-SG', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Singapore',
  })

  const stats = useMemo(() => {
    const total = projects.length
    const flagCounts = countBy(projects, (p) => p.attention_flag)
    const regionCounts = countBy(projects, (p) => p.region ?? 'Unset')
    const stageCounts = countBy(projects, (p) => p.stage)
    const pmCounts = countBy(projects, (p) => p.pm || 'Unassigned')

    const onTrack = flagCounts['Low'] ?? 0
    const critical = flagCounts['Critical'] ?? 0

    // upcoming go-lives in next 30 days
    const soon = projects.filter((p) => {
      if (!p.go_live_date) return false
      try {
        const d = parseISO(p.go_live_date)
        const diff = (d.getTime() - Date.now()) / 86400000
        return diff >= 0 && diff <= 30
      } catch { return false }
    }).length

    // sort stage counts
    const topStages = Object.entries(stageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)

    // sort PM counts
    const topPMs = Object.entries(pmCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)

    // year slices for donut
    const YEAR_COLORS: Record<string, string> = {
      '2020': '#94A3B8', '2021': '#64748B', '2022': '#6366F1',
      '2023': '#3B82F6', '2024': '#8B5CF6', '2025': '#00c9a7',
      '2026': '#14B8A6', '2027': '#0EA5E9', '2028': '#6366F1',
      '2029': '#F97316', '2030': '#F43F5E', Unset: '#2a4a5a',
    }
    const regionSlices = Object.entries(regionCounts).map(([label, value]) => ({
      label, value, color: YEAR_COLORS[label] ?? '#2a4a5a',
    }))

    // critical projects list
    const criticalProjects = projects.filter((p) => p.attention_flag === 'Critical' || p.attention_flag === 'High')

    const totalValue = projects.reduce((s, p) => s + (p.project_value ?? 0), 0)

    return { total, flagCounts, onTrack, critical, soon, topStages, topPMs, regionCounts, regionSlices, criticalProjects, totalValue }
  }, [projects])

  const flagOrder: AttentionFlag[] = ['Critical', 'High', 'Medium', 'Low', 'On Hold', 'Cancelled', 'Closed']
  const flagColors: Record<AttentionFlag, string> = {
    Critical:  '#FF4757',
    High:      '#FF6B2B',
    Medium:    '#FFB800',
    Low:       '#00c9a7',
    'On Hold': '#4A90D9',
    Cancelled: '#2a4a5a',
    Closed:    '#1a5a4a',
  }

  return (
    <div className="min-h-screen" style={{
      background: '#06111a',
      fontFamily: 'var(--font-outfit), system-ui, sans-serif',
      color: '#e0f0f6',
    }}>
      {/* Ambient bg glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #00c9a7 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #4A90D9 0%, transparent 70%)' }} />
      </div>

      {/* Header */}
      <header className="relative border-b border-[#0e2535] bg-[#06111a]/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.05em' }}
                className="text-2xl text-white leading-none">
                ASABA <span style={{ color: '#00c9a7' }}>ANALYTICS</span>
              </h1>
              <p className="text-[11px] text-[#3a6070] tracking-widest uppercase mt-0.5">As of {now}</p>
            </div>

            {/* Nav */}
            <nav className="flex items-center gap-1 ml-6">
              <Link href="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#4a7a8a] hover:text-white hover:bg-[#0c1e2a] transition-all">
                ☰ Projects Table
              </Link>
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0c1e2a] border border-[#1a3d50]">
                ◎ Dashboard
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#3a6070]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00c9a7] animate-pulse inline-block" />
            Live data
          </div>
        </div>
      </header>

      <main className="relative max-w-[1400px] mx-auto px-6 py-8 space-y-6">

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard label="Total Projects" value={stats.total} sub="across all years" accent="linear-gradient(90deg,#00c9a7,#4A90D9)" />
          <KpiCard label="Critical" value={stats.critical}
            sub={`${pct(stats.critical, stats.total)}% of portfolio`}
            accent="#FF4757" />
          <KpiCard label="Low Risk" value={stats.onTrack}
            sub={`${pct(stats.onTrack, stats.total)}% of portfolio`}
            accent="#00c9a7" />
          <KpiCard label="Go-Live ≤ 30 days" value={stats.soon}
            sub="upcoming launches"
            accent="#FFB800" />
          <KpiCard
            label="Total Portfolio Value"
            sub="combined project value"
            accent="linear-gradient(90deg,#f59e0b,#ef4444)" />
        </div>

        {/* Middle row: flag breakdown + region donut + stage bars */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Attention flags */}
          <div className="rounded-2xl border border-[#1a3d50] bg-[#0c1e2a] p-5">
            <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#3a6070] mb-4">Attention Flags</p>
            <div className="space-y-2.5">
              {flagOrder.map((flag) => {
                const count = stats.flagCounts[flag] ?? 0
                const meta = FLAG_META[flag]
                return (
                  <HBar
                    key={flag}
                    label={`${meta.emoji} ${flag}`}
                    value={count}
                    max={stats.total}
                    color={flagColors[flag]}
                    count={count}
                  />
                )
              })}
            </div>
          </div>

          {/* Region donut */}
          <div className="rounded-2xl border border-[#1a3d50] bg-[#0c1e2a] p-5">
            <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#3a6070] mb-4">Year Distribution</p>
            <div className="flex items-center gap-6">
              <DonutChart slices={stats.regionSlices} />
              <div className="flex-1 space-y-2 overflow-y-auto max-h-48">
                {stats.regionSlices.length === 0
                  ? <span className="text-xs text-[#3a6070]">No year data yet</span>
                  : stats.regionSlices.map(({ label, color }) => {
                    const count = stats.regionCounts[label] ?? 0
                    return (
                      <div key={label} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                        <span className="text-xs text-[#6b9aaa] flex-1">{label}</span>
                        <span className="text-xs font-bold text-white">{count}</span>
                        <span className="text-[10px] text-[#3a6070] w-8 text-right">{pct(count, stats.total)}%</span>
                      </div>
                    )
                  })
                }
              </div>
            </div>
          </div>

          {/* Stage breakdown */}
          <div className="rounded-2xl border border-[#1a3d50] bg-[#0c1e2a] p-5">
            <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#3a6070] mb-4">Stage Distribution</p>
            <div className="space-y-2.5">
              {stats.topStages.map(([stage, count]) => (
                <HBar
                  key={stage}
                  label={stage}
                  value={count}
                  max={stats.topStages[0]?.[1] ?? 1}
                  color="linear-gradient(90deg,#1a5a6a,#00c9a7)"
                  count={count}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row: PM workload + Go-live timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* PM workload */}
          <div className="rounded-2xl border border-[#1a3d50] bg-[#0c1e2a] p-5">
            <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#3a6070] mb-4">PM Workload</p>
            <div className="space-y-2.5">
              {stats.topPMs.map(([pm, count]) => (
                <HBar
                  key={pm}
                  label={pm}
                  value={count}
                  max={stats.topPMs[0]?.[1] ?? 1}
                  color="linear-gradient(90deg,#1a3a6a,#4A90D9)"
                  count={count}
                />
              ))}
            </div>
          </div>

          {/* Go-live timeline */}
          <div className="rounded-2xl border border-[#1a3d50] bg-[#0c1e2a] p-5">
            <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#3a6070] mb-4">Go-Live Timeline — Next 8 Months</p>
            <GoLiveTimeline projects={projects} />
            <p className="text-[10px] text-[#3a6070] mt-3">Projects scheduled for go-live by month</p>
          </div>
        </div>

        {/* Critical & High priority projects */}
        {stats.criticalProjects.length > 0 && (
          <div className="rounded-2xl border border-[#FF4757]/20 bg-[#0c1e2a] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a3d50] flex items-center justify-between">
              <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#3a6070]">
                🔴 Critical & High Priority Projects
              </p>
              <span className="text-xs font-bold text-[#FF4757]">{stats.criticalProjects.length} projects need attention</span>
            </div>
            <div className="divide-y divide-[#0e2535]">
              {stats.criticalProjects.map((p) => {
                const meta = FLAG_META[p.attention_flag]
                return (
                  <div key={p.id} className="px-5 py-3 flex items-center gap-4 hover:bg-[#0e2535] transition-colors">
                    <span className={`w-1.5 h-8 rounded-full shrink-0`} style={{ background: flagColors[p.attention_flag] }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{p.project_name}</p>
                      <p className="text-xs text-[#4a7a8a] truncate">{p.key_risk || '—'}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {p.region && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#1a3d50] text-[#6b9aaa]">{p.region}</span>
                      )}
                      <span className="text-xs text-[#6b9aaa]">{p.pm}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full`}
                        style={{ background: `${flagColors[p.attention_flag]}20`, color: flagColors[p.attention_flag] }}>
                        {meta.emoji} {p.attention_flag}
                      </span>
                      {p.go_live_date && (
                        <span className="text-[10px] font-mono text-[#FFB800]">
                          {(() => { try { return format(parseISO(p.go_live_date), 'dd MMM yy') } catch { return p.go_live_date } })()}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <p className="text-center text-[10px] text-[#1a3d50] pb-4 tracking-widest uppercase">
          ASABA · Project Intelligence Dashboard
        </p>
      </main>
    </div>
  )
}
