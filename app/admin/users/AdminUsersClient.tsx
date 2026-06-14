'use client'

import { useState } from 'react'
import Link from 'next/link'

type UserProfile = {
  id: string
  email: string
  full_name: string
  status: 'pending' | 'approved' | 'rejected'
  role: 'admin' | 'user'
  created_at: string
}

const STATUS_STYLE = {
  pending:  'bg-yellow-100 text-yellow-700 border-yellow-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
}

const STATUS_ICON = { pending: '⏳', approved: '✅', rejected: '❌' }

export function AdminUsersClient({ users: initial }: { users: UserProfile[] }) {
  const [users, setUsers] = useState<UserProfile[]>(initial)
  const [loading, setLoading] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleAction(userId: string, action: 'approve' | 'reject') {
    setLoading(`${userId}-${action}`)
    try {
      const res = await fetch(`/api/auth/approve/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (!res.ok) { showToast(`❌ ${json.error}`); return }
      setUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, status: action === 'approve' ? 'approved' : 'rejected' } : u)
      )
      showToast(`✅ User ${action}d successfully`)
    } catch {
      showToast('❌ Action failed')
    } finally {
      setLoading(null)
    }
  }

  const filtered = filterStatus === 'all' ? users : users.filter((u) => u.status === filterStatus)
  const counts = { all: users.length, pending: users.filter(u => u.status === 'pending').length, approved: users.filter(u => u.status === 'approved').length, rejected: users.filter(u => u.status === 'rejected').length }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">User Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">Approve or reject user access requests</p>
        </div>
        <Link href="/" className="text-sm text-sky-600 hover:text-sky-800 font-medium border border-sky-200 rounded-lg px-3 py-1.5 hover:bg-sky-50 transition-colors">
          ← Back to Dashboard
        </Link>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-xl border px-4 py-3 text-left transition-all ${
                filterStatus === s ? 'ring-2 ring-sky-400 border-sky-300' : 'border-gray-200 hover:border-gray-300'
              } bg-white`}
            >
              <div className="text-2xl font-bold text-gray-900">{counts[s]}</div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1 capitalize">{s}</div>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Registered</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-400">No users found.</td>
                </tr>
              )}
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-gray-900">{u.full_name}</div>
                    {u.role === 'admin' && (
                      <span className="text-xs text-purple-600 font-semibold">ADMIN</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs font-mono">
                    {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${STATUS_STYLE[u.status]}`}>
                      {STATUS_ICON[u.status]} {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {u.role !== 'admin' && (
                      <div className="flex items-center gap-2">
                        {u.status !== 'approved' && (
                          <button
                            onClick={() => handleAction(u.id, 'approve')}
                            disabled={loading === `${u.id}-approve`}
                            className="px-3 py-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white rounded-lg transition-colors"
                          >
                            {loading === `${u.id}-approve` ? '…' : '✓ Approve'}
                          </button>
                        )}
                        {u.status !== 'rejected' && (
                          <button
                            onClick={() => handleAction(u.id, 'reject')}
                            disabled={loading === `${u.id}-reject`}
                            className="px-3 py-1 text-xs font-semibold bg-red-100 hover:bg-red-200 disabled:opacity-60 text-red-700 rounded-lg transition-colors"
                          >
                            {loading === `${u.id}-reject` ? '…' : '✕ Reject'}
                          </button>
                        )}
                        {u.status === 'approved' && (
                          <span className="text-xs text-gray-400">Active</span>
                        )}
                      </div>
                    )}
                    {u.role === 'admin' && <span className="text-xs text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
