import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const billNumber = new URL(req.url).searchParams.get('bill_number') || ''

  if (!/^\d{1,20}$/.test(billNumber)) {
    return NextResponse.json({ error: 'Bill number must contain numbers only' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('feedback')
    .select('id')
    .eq('bill_number', billNumber)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Could not verify bill number' }, { status: 500 })
  }

  return NextResponse.json({ available: !data })
}
