import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'

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
  const max = (await getSettings()).max_responses_per_bill
  return NextResponse.json({ available: used < max, used, max })
}
