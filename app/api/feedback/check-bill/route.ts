import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { MAX_RESPONSES_PER_BILL } from '@/lib/venues'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'waiter') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const billNumber = searchParams.get('bill_number') || ''

  if (!/^\d+$/.test(billNumber)) {
    return NextResponse.json({ error: 'Bill number must contain numbers only' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { count, error } = await supabase
    .from('feedback')
    .select('id', { count: 'exact', head: true })
    .eq('bill_number', billNumber)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const used = count ?? 0
  return NextResponse.json({ available: used < MAX_RESPONSES_PER_BILL, used, max: MAX_RESPONSES_PER_BILL })
}
