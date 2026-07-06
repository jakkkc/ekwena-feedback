import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'

const HOW_HEARD_OPTIONS = ['online', 'referral', 'repeat_guest', 'other']

function isValidOptionalRating(value: unknown, min: number, max: number) {
  if (value === undefined || value === null) return true
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session || session.role !== 'waiter' || !session.branch) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    bill_number,
    food_rating,
    service_rating,
    ambiance_rating,
    hostess_rating,
    cleanliness_rating,
    value_rating,
    wait_time_rating,
    nps_score,
    how_heard,
    how_heard_other,
    served_by,
    comment,
    guest_name,
    guest_phone,
  } = body

  if (!bill_number || !/^\d+$/.test(bill_number)) {
    return NextResponse.json({ error: 'A valid bill number (numbers only) is required' }, { status: 400 })
  }

  const coreValid = [food_rating, service_rating, ambiance_rating].every(
    (r) => Number.isInteger(r) && r >= 1 && r <= 5
  )
  if (!coreValid) {
    return NextResponse.json({ error: 'Food Quality, Quality of Service, and General Ambiance are required' }, { status: 400 })
  }

  if (
    !isValidOptionalRating(hostess_rating, 1, 5) ||
    !isValidOptionalRating(cleanliness_rating, 1, 5) ||
    !isValidOptionalRating(value_rating, 1, 5) ||
    !isValidOptionalRating(wait_time_rating, 1, 5) ||
    !isValidOptionalRating(nps_score, 0, 10)
  ) {
    return NextResponse.json({ error: 'Optional ratings are out of range' }, { status: 400 })
  }

  if (!how_heard || !HOW_HEARD_OPTIONS.includes(how_heard)) {
    return NextResponse.json({ error: 'Please select how you heard about us' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase.from('feedback').insert({
    bill_number,
    branch: session.branch,
    outlet: session.outlet || null,
    collected_by: session.collectedBy || null,
    submitted_by_staff_id: session.staffId,
    food_rating,
    service_rating,
    ambiance_rating,
    hostess_rating: hostess_rating || null,
    cleanliness_rating: cleanliness_rating || null,
    value_rating: value_rating || null,
    wait_time_rating: wait_time_rating || null,
    nps_score: nps_score ?? null,
    how_heard,
    how_heard_other: how_heard === 'other' ? (how_heard_other || null) : null,
    served_by: served_by || null,
    comment: comment || null,
    guest_name: guest_name || null,
    guest_phone: guest_phone || null,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'This bill number has already been used. Please check the receipt.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
