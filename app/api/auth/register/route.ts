export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name } = await req.json()

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Use service role to create user without sending confirmation email
    const adminAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: authData, error: authError } = await adminAuth.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm email so login works once approved
      user_metadata: { full_name },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Insert profile with pending status
    const db = getServiceClient()
    const { error: profileError } = await db.from('user_profiles').insert({
      id: authData.user.id,
      email,
      full_name,
      status: 'pending',
      role: 'user',
    })

    if (profileError) {
      // Cleanup auth user if profile insert fails
      await adminAuth.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Registration successful. Awaiting admin approval.' }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Registration failed' }, { status: 500 })
  }
}
