import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''

  const supabase = createServiceClient()
  let query = supabase.from('roster_log').select('*').order('created_at', { ascending: false })

  if (startDate) query = query.gte('created_at', startDate)
  if (endDate) query = query.lte('created_at', endDate + 'T23:59:59')

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    changes: (data || []).map((r) => ({
      name: r.name,
      roleGroup: r.role_group,
      action: r.action,
      createdAt: r.created_at,
    })),
  })
}
