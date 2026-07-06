import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'

const ROLE_GROUPS = ['Manager', 'Supervisor', 'Hostess', 'Bartender', 'Waiters', 'Waitress']

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('roster')
    .select('id, name, role_group, active')
    .eq('active', true)
    .order('role_group')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const grouped = ROLE_GROUPS.map((group) => ({
    group,
    names: (data || []).filter((r) => r.role_group === group).map((r) => r.name),
  })).filter((g) => g.names.length > 0)

  return NextResponse.json({ roster: grouped, raw: data })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, roleGroup } = await req.json()

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (!ROLE_GROUPS.includes(roleGroup)) {
    return NextResponse.json({ error: 'Invalid role group' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase.from('roster').insert({ name: name.trim(), role_group: roleGroup })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
