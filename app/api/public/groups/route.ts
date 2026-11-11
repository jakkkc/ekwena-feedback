import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Names of active groups only, newest first, for the Eswara dropdown.
export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('event_groups')
    .select('name')
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ groups: [] }, { status: 500 })
  return NextResponse.json(
    { groups: (data || []).map((g) => g.name) },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
