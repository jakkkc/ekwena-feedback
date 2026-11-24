import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { logActivity } from '@/lib/activity'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { newPin } = await req.json()

  if (!newPin || !/^\d{4,6}$/.test(newPin)) {
    return NextResponse.json({ error: 'PIN must be 4-6 digits' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: others } = await supabase.from('staff').select('id, pin_hash').neq('id', id)
  for (const o of others || []) {
    if (await bcrypt.compare(newPin, o.pin_hash)) {
      return NextResponse.json(
        { error: 'This PIN is already used by another account. Choose a different one.' },
        { status: 409 }
      )
    }
  }
  const { data: target } = await supabase.from('staff').select('name').eq('id', id).maybeSingle()
  const pin_hash = await bcrypt.hash(newPin, 10)
  const { error } = await supabase
    .from('staff')
    .update({ pin_hash, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logActivity(session, 'staff.pin_change', target?.name ?? id)
  return NextResponse.json({ success: true })
}
