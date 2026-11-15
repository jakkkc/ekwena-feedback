import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isBranch } from '@/lib/venues'

export const dynamic = 'force-dynamic'

// Names of active groups only, newest first, for the Eswara dropdown.
export async function GET(req: Request) {
  const branch = new URL(req.url).searchParams.get('branch')
  if (!isBranch(branch)) return NextResponse.json({ groups: [] })
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('event_groups')
    .select('name')
    .eq('active', true)
    .eq('branch', branch)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ groups: [] }, { status: 500 })
  return NextResponse.json(
    { groups: (data || []).map((g) => g.name) },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
