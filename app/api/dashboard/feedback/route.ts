import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('feedback')
    .select(
      'id, branch, outlet, source, bill_number, food_rating, service_rating, ambiance_rating, hostess_rating, cleanliness_rating, value_rating, wait_time_rating, nps_score, how_heard, how_heard_other, served_by, collected_by, comment, guest_name, guest_phone, created_at, resolved_at, resolved_by, resolution_note'
    )
    .order('created_at', { ascending: false })
    .limit(5000)

  if (error) {
    return NextResponse.json({ error: 'Could not load feedback' }, { status: 500 })
  }
  return NextResponse.json({ rows: data || [] })
}
