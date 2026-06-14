'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { DashboardTable } from './DashboardTable'
import { AddProjectModal } from './AddProjectModal'
import { LogoutButton } from './LogoutButton'
import type { Project } from '@/lib/supabase'

type Props = {
  initialProjects: Project[]
  isAdmin?: boolean
  userEmail?: string
}

export function DashboardClient({ initialProjects, isAdmin, userEmail }: Props) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [syncing, setSyncing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleUpdate(id: string, patch: Partial<Project>) {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      const msg = json.error ?? `Save failed (${res.status})`
      showToast(msg, false)
      throw new Error(msg)
    }
  }

  function handleProjectCreated(p: Project) {
    setProjects((prev) => [...prev, p])
    setShowAddModal(false)
    showToast(`Project "${p.project_name}" added`, true)
  }

  async function handleRefresh() {
    setSyncing(true)
    window.location.reload()
  }

  function handleDownload() {
    window.location.href = '/api/export'
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/import', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        showToast(json.error ?? 'Upload failed', false)
      } else {
        showToast(json.message, true)
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch {
      showToast('Upload failed — network error', false)
    } finally {
      setUploading(false)
    }
  }

  const now = new Date().toLocaleDateString('en-SG', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Singapore',
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {showAddModal && (
        <AddProjectModal
          onClose={() => setShowAddModal(false)}
          onCreated={handleProjectCreated}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-[#0F172A] to-[#1E3A5F] shadow-lg">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              ASABA PROJECT STATUS DASHBOARD
            </h1>
            <p className="text-sky-400 text-xs mt-0.5">
              All Projects Overview · As of {now}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {/* Dashboard link */}
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 bg-[#0c2a38] hover:bg-[#113344] border border-[#1a4a5a] text-[#00c9a7] text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
              title="View analytics dashboard"
            >
              ◎ Dashboard
            </Link>

            {/* Add Project */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
              title="Add a new project manually"
            >
              ＋ Add Project
            </button>

            {/* Download template */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
              title="Download current data as Excel template"
            >
              ⬇ Download XLS
            </button>

            {/* Upload XLS */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
              title="Upload edited Excel file to bulk-update projects"
            >
              {uploading ? '⟳ Uploading…' : '⬆ Upload XLS'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleUpload}
              className="hidden"
            />

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={syncing}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              {syncing ? '⟳ Refreshing…' : '↻ Refresh'}
            </button>

            {/* User + Logout */}
            <div className="flex items-center gap-2 border-l border-white/10 pl-2 ml-1">
              {userEmail && (
                <span className="text-xs text-slate-400 hidden sm:block truncate max-w-[120px]">{userEmail}</span>
              )}
              <LogoutButton isAdmin={isAdmin} />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {projects.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-gray-500 text-sm font-medium mb-2">No projects loaded yet.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-3 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors"
            >
              ＋ Add your first project
            </button>
          </div>
        ) : (
          <DashboardTable projects={projects} onUpdate={handleUpdate} onError={(msg) => showToast(msg, false)} />
        )}
      </main>
    </div>
  )
}
