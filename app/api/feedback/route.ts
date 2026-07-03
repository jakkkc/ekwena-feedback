import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session || session.role !== 'waiter' || !session.branch) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { food_rating, service_rating, ambiance_rating, comment, guest_name, guest_phone } = body

  const ratingsValid = [food_rating, service_rating, ambiance_rating].every(
    (r) => Number.isInteger(r) && r >= 1 && r <= 5
  )
  if (!ratingsValid) {
    return NextResponse.json({ error: 'Ratings must be between 1 and 5' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase.from('feedback').insert({
    branch: session.branch,
    submitted_by_staff_id: session.staffId,
    food_rating,
    service_rating,
    ambiance_rating,
    comment: comment || null,
    guest_name: guest_name || null,
    guest_phone: guest_phone || null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
