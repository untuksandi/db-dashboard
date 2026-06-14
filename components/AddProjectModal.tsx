'use client'

import { useState } from 'react'
import type { Project, AttentionFlag, ProjectStatus, Region, Team } from '@/lib/supabase'
import { ATTENTION_FLAGS, PROJECT_STATUSES, STAGES, REGIONS, TEAMS, FLAG_META } from '@/lib/supabase'

type Props = {
  onClose: () => void
  onCreated: (project: Project) => void
}

const EMPTY = {
  project_name: '',
  region: '' as Region | '',
  team: '' as Team | '',
  pm: '',
  stage: 'Pre-Implementation' as string,
  attention_flag: 'MONITOR' as AttentionFlag,
  go_live_date: '',
  last_meeting: '',
  key_risk: '',
  notes: '',
  status: 'Normal' as ProjectStatus,
  risks: [] as import('@/lib/supabase').RiskRow[],
  phases: [] as import('@/lib/supabase').PhaseRow[],
}

export function AddProjectModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.project_name.trim()) { setError('Project Name is required'); return }

    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        region: form.region || null,
        go_live_date: form.go_live_date || null,
      }
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to create project'); return }
      onCreated(json as Project)
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-base font-bold text-gray-900">Add New Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.project_name}
              onChange={(e) => set('project_name', e.target.value)}
              placeholder="e.g. PRJ-Company Name (System)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          {/* Row: Region + Team */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Year</label>
              <select
                value={form.region}
                onChange={(e) => set('region', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="">— Select year —</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Team</label>
              <select
                value={form.team}
                onChange={(e) => set('team', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="">— Select team —</option>
                {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Row: Stage + Flag */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Stage</label>
              <select
                value={form.stage}
                onChange={(e) => set('stage', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Attention Flag</label>
              <select
                value={form.attention_flag}
                onChange={(e) => set('attention_flag', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {ATTENTION_FLAGS.map((f) => (
                  <option key={f} value={f}>{FLAG_META[f].emoji} {f}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Status + Go-Live */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Go-Live Date</label>
              <input
                type="date"
                value={form.go_live_date}
                onChange={(e) => set('go_live_date', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>

          {/* Last Meeting */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Last Meeting / Update</label>
            <input
              type="text"
              value={form.last_meeting}
              onChange={(e) => set('last_meeting', e.target.value)}
              placeholder="e.g. Weekly Sync 5 Jun 2026"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          {/* Key Risk */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Key Risk / Issue</label>
            <textarea
              rows={2}
              value={form.key_risk}
              onChange={(e) => set('key_risk', e.target.value)}
              placeholder="Main risks or blockers"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Additional notes"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-60 rounded-lg transition-colors"
            >
              {saving ? '⟳ Saving…' : '+ Add Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
