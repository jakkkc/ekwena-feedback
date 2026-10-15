import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { isBranch, isOutlet } from '@/lib/venues'

const HOW_HEARD_OPTIONS = ['online', 'referral', 'repeat_guest', 'other']
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_MINUTES = 10

function isRating(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

function isOptionalRating(value: unknown, min: number, max: number) {
  return value === undefined || value === null || isRating(value, min, max)
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

function clientHash(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for') || ''
  const ip = forwarded.split(',')[0].trim() || 'unknown'
  return createHash('sha256')
    .update(ip + (process.env.SESSION_SECRET || ''))
    .digest('hex')
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Honeypot: real guests never see or fill this field. Bots usually do.
  // Pretend it worked so the bot doesn't learn anything.
  if (typeof body.website === 'string' && body.website.length > 0) {
    return NextResponse.json({ success: true })
  }

  const {
    branch, outlet, bill_number,
    food_rating, service_rating, ambiance_rating,
    hostess_rating, cleanliness_rating, value_rating, wait_time_rating,
    nps_score, how_heard,
  } = body

  if (!isBranch(branch) || !isOutlet(outlet)) {
    return NextResponse.json({ error: 'Invalid location' }, { status: 400 })
  }

  if (typeof bill_number !== 'string' || !/^\d{1,20}$/.test(bill_number)) {
    return NextResponse.json({ error: 'A valid bill number (numbers only) is required' }, { status: 400 })
  }

  if (![food_rating, service_rating, ambiance_rating].every((r) => isRating(r, 1, 5))) {
    return NextResponse.json(
      { error: 'Food Quality, Quality of Service, and General Ambiance are required' },
      { status: 400 }
    )
  }

  if (
    !isOptionalRating(hostess_rating, 1, 5) ||
    !isOptionalRating(cleanliness_rating, 1, 5) ||
    !isOptionalRating(value_rating, 1, 5) ||
    !isOptionalRating(wait_time_rating, 1, 5) ||
    !isOptionalRating(nps_score, 0, 10)
  ) {
    return NextResponse.json({ error: 'Optional ratings are out of range' }, { status: 400 })
  }

  if (typeof how_heard !== 'string' || !HOW_HEARD_OPTIONS.includes(how_heard)) {
    return NextResponse.json({ error: 'Please select how you heard about us' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const hash = clientHash(req)

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('feedback')
    .select('id', { count: 'exact', head: true })
    .eq('client_hash', hash)
    .gte('created_at', since)

  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: 'Too many submissions from this connection. Please try again in a few minutes.' },
      { status: 429 }
    )
  }

  const { error } = await supabase.from('feedback').insert({
    bill_number,
    branch,
    outlet,
    source: 'qr',
    collected_by: 'Guest (QR)',
    submitted_by_staff_id: null,
    client_hash: hash,
    food_rating,
    service_rating,
    ambiance_rating,
    hostess_rating: hostess_rating ?? null,
    cleanliness_rating: cleanliness_rating ?? null,
    value_rating: value_rating ?? null,
    wait_time_rating: wait_time_rating ?? null,
    nps_score: nps_score ?? null,
    how_heard,
    how_heard_other: how_heard === 'other' ? cleanText(body.how_heard_other, 200) : null,
    served_by: cleanText(body.served_by, 500),
    comment: cleanText(body.comment, 2000),
    guest_name: cleanText(body.guest_name, 100),
    guest_phone: cleanText(body.guest_phone, 100),
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'This bill number has already been used. Please check the receipt.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
