'use client'

import { useRouter } from 'next/navigation'
import { getAuthClient } from '@/lib/auth-client'

export function LogoutButton({ isAdmin }: { isAdmin?: boolean }) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = getAuthClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      {isAdmin && (
        <a
          href="/admin/users"
          className="px-3 py-1.5 text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
        >
          👥 Users
        </a>
      )}
      <button
        onClick={handleLogout}
        className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
      >
        Sign Out
      </button>
    </div>
  )
}
