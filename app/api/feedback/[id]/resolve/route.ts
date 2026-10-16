import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'

async function requireManager() {
  const session = await getSession()
  if (!session || session.role !== 'manager') return null
  return session
}

function validId(id: string) {
  return id.length > 0 && id.length <= 64
}

// Resolve: POST { note }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireManager()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!validId(id)) return NextResponse.json({ error: 'Invalid feedback' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1000) : ''
  if (!note) {
    return NextResponse.json({ error: 'Please add a note about what was done' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('feedback')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: session.name,
      resolution_note: note,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}

// Reopen: DELETE
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireManager()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!validId(id)) return NextResponse.json({ error: 'Invalid feedback' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('feedback')
    .update({ resolved_at: null, resolved_by: null, resolution_note: null })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
