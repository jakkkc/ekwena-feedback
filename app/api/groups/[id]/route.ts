import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'

async function requireManager() {
  const session = await getSession()
  if (!session || session.role !== 'manager') return null
  return session
}

// Archive or restore a group: PATCH { active: boolean }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireManager())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await req.json().catch(() => ({}))
  if (typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase.from('event_groups').update({ active: body.active }).eq('id', id)
  if (error) return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
  return NextResponse.json({ success: true })
}

// Delete a group from the list. Feedback already given keeps its group name.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireManager())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const supabase = createServiceClient()
  const { error } = await supabase.from('event_groups').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Could not delete. Please try again.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
