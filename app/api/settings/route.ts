import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { logActivity } from '@/lib/activity'
import { getSettings, DEFAULT_SETTINGS, type AppSettings } from '@/lib/settings'

const QUESTIONS = ['food', 'service', 'ambiance', 'hostess', 'cleanliness', 'value', 'wait_time', 'wifi']

function whole(v: unknown, min: number, max: number): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null
}

function clean(body: Record<string, unknown>): { values: Partial<AppSettings>; error?: string } {
  const values: Partial<AppSettings> = {}
  const nums: [keyof AppSettings, number, number, string][] = [
    ['attention_rating_max', 1, 4, 'The rating level must be 1 to 4'],
    ['attention_nps_max', 0, 8, 'The NPS level must be 0 to 8'],
    ['max_responses_per_bill', 1, 50, 'Responses per bill must be 1 to 50'],
    ['rate_limit_max', 1, 1000, 'The normal limit must be 1 to 1000'],
    ['rate_limit_group_max', 1, 5000, 'The Eswara limit must be 1 to 5000'],
    ['rate_limit_window_minutes', 1, 120, 'The time window must be 1 to 120 minutes'],
  ]
  for (const [key, min, max, message] of nums) {
    if (!(key in body)) continue
    const n = whole(body[key], min, max)
    if (n === null) return { values, error: message }
    ;(values as Record<string, unknown>)[key] = n
  }
  if ('attention_nps_enabled' in body) {
    if (typeof body.attention_nps_enabled !== 'boolean') return { values, error: 'Invalid NPS setting' }
    values.attention_nps_enabled = body.attention_nps_enabled
  }
  if ('attention_categories' in body) {
    const c = body.attention_categories
    if (!Array.isArray(c) || !c.every((x) => typeof x === 'string' && QUESTIONS.includes(x))) {
      return { values, error: 'Invalid list of questions' }
    }
    values.attention_categories = Array.from(new Set(c as string[]))
  }
  return { values }
}

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ settings: await getSettings(), defaults: DEFAULT_SETTINGS })
}

export async function PUT(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { values, error } = clean(body)
  if (error) return NextResponse.json({ error }, { status: 400 })

  const current = await getSettings()
  const merged = { ...current, ...values }
  if (merged.attention_categories.length === 0 && !merged.attention_nps_enabled) {
    return NextResponse.json({ error: 'Choose at least one question, or keep low NPS switched on' }, { status: 400 })
  }

  const before = current as unknown as Record<string, unknown>
  const changes: Record<string, unknown[]> = {}
  const rows: { key: string; value: unknown; updated_at: string; updated_by: string }[] = []
  for (const [key, value] of Object.entries(values)) {
    if (JSON.stringify(before[key]) === JSON.stringify(value)) continue
    changes[key] = [before[key], value]
    rows.push({ key, value, updated_at: new Date().toISOString(), updated_by: session.name })
  }
  if (rows.length === 0) return NextResponse.json({ success: true })

  const supabase = createServiceClient()
  const { error: dbError } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' })
  if (dbError) return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })

  await logActivity(session, 'settings.update', null, { changes })
  return NextResponse.json({ success: true })
}
