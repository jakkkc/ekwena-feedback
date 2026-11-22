import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { MAX_RESPONSES_PER_BILL } from '@/lib/venues'

export async function GET(req: NextRequest) {
  const billNumber = new URL(req.url).searchParams.get('bill_number') || ''

  if (!/^\d{1,20}$/.test(billNumber)) {
    return NextResponse.json({ error: 'Bill number must contain numbers only' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { count, error } = await supabase
    .from('feedback')
    .select('id', { count: 'exact', head: true })
    .eq('bill_number', billNumber)

  if (error) {
    return NextResponse.json({ error: 'Could not verify bill number' }, { status: 500 })
  }

  const used = count ?? 0
  return NextResponse.json({ available: used < MAX_RESPONSES_PER_BILL, used, max: MAX_RESPONSES_PER_BILL })
}
