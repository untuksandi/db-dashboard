export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerAuthClient } from '@/lib/auth-server'

export async function POST() {
  const auth = getServerAuthClient()
  await auth.auth.signOut()
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'http://localhost:3000' : 'http://localhost:3000'))
}
