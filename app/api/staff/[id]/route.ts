import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { logActivity } from '@/lib/activity'

// Disable or re-enable an account: PATCH { active: boolean }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const body = await req.json().catch(() => ({}))
  if (typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: target } = await supabase.from('staff').select('name, role').eq('id', id).maybeSingle()
  if (!target) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  if (!body.active) {
    if (id === session.staffId) {
      return NextResponse.json({ error: 'You cannot disable your own account' }, { status: 400 })
    }
    if (target.role === 'manager') {
      const { count } = await supabase
        .from('staff')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'manager')
        .eq('active', true)
        .neq('id', id)
      if ((count ?? 0) < 1) {
        return NextResponse.json({ error: 'At least one manager account must stay active' }, { status: 400 })
      }
    }
  }

  const { error } = await supabase
    .from('staff')
    .update({ active: body.active, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })

  await logActivity(session, body.active ? 'staff.enable' : 'staff.disable', target.name)
  return NextResponse.json({ success: true })
}
