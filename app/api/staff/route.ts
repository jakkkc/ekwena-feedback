import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { logActivity } from '@/lib/activity'
import { isBranch } from '@/lib/venues'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('staff')
    .select('id, name, role, branch, active')
    .order('active', { ascending: false })
    .order('role', { ascending: false })
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ staff: data })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ').slice(0, 100) : ''
  const role = body.role
  const branch = body.branch
  const pin = body.pin

  if (!name) return NextResponse.json({ error: 'Please enter a name' }, { status: 400 })
  if (role !== 'manager' && role !== 'waiter') {
    return NextResponse.json({ error: 'Please choose a role' }, { status: 400 })
  }
  if (role === 'waiter' && !isBranch(branch)) {
    return NextResponse.json({ error: 'Please choose a branch for a waiter' }, { status: 400 })
  }
  if (typeof pin !== 'string' || !/^\d{4,6}$/.test(pin)) {
    return NextResponse.json({ error: 'PIN must be 4-6 digits' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: everyone } = await supabase.from('staff').select('pin_hash')
  for (const s of everyone || []) {
    if (await bcrypt.compare(pin, s.pin_hash)) {
      return NextResponse.json(
        { error: 'This PIN is already used by another account. Choose a different one.' },
        { status: 409 }
      )
    }
  }

  const pin_hash = await bcrypt.hash(pin, 10)
  const { error } = await supabase
    .from('staff')
    .insert({ name, role, branch: role === 'waiter' ? branch : null, pin_hash })

  if (error) {
    return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
  }

  await logActivity(session, 'staff.add', name, { role, branch: role === 'waiter' ? branch : null })
  return NextResponse.json({ success: true })
}
