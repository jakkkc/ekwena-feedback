import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServiceClient } from '@/lib/supabase/server'
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/session'

export async function POST(req: NextRequest) {
  const { pin } = await req.json()

  if (!pin || typeof pin !== 'string') {
    return NextResponse.json({ error: 'PIN is required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: staffList, error } = await supabase.from('staff').select('*')

  if (error || !staffList) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  let matched = null
  for (const staff of staffList) {
    const isMatch = await bcrypt.compare(pin, staff.pin_hash)
    if (isMatch) {
      matched = staff
      break
    }
  }

  if (!matched) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  const token = await createSessionToken({
    staffId: matched.id,
    name: matched.name,
    role: matched.role,
    branch: matched.branch,
  })

  const response = NextResponse.json({
    role: matched.role,
    branch: matched.branch,
    name: matched.name,
  })

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return response
}
