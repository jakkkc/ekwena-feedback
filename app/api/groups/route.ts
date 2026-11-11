import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'

async function requireManager() {
  const session = await getSession()
  if (!session || session.role !== 'manager') return null
  return session
}

export async function GET() {
  if (!(await requireManager())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('event_groups')
    .select('id, name, active, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Could not load groups' }, { status: 500 })
  return NextResponse.json({ groups: data || [] })
}

export async function POST(req: Request) {
  if (!(await requireManager())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ').slice(0, 100) : ''
  if (!name) return NextResponse.json({ error: 'Please enter a group name' }, { status: 400 })

  const supabase = createServiceClient()
  const { error } = await supabase.from('event_groups').insert({ name })
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This group already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
