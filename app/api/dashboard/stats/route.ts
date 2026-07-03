import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'

type FeedbackRow = {
  id: string
  branch: 'cottages' | 'tuuti'
  food_rating: number
  service_rating: number
  ambiance_rating: number
  comment: string | null
  guest_name: string | null
  created_at: string
}

function average(nums: number[]) {
  if (nums.length === 0) return 0
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const branchFilter = searchParams.get('branch') || 'all'

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Failed to load feedback' }, { status: 500 })
  }

  const all = data as FeedbackRow[]
  const filtered = branchFilter === 'all' ? all : all.filter((f) => f.branch === branchFilter)

  const totalCount = filtered.length
  const avgFood = average(filtered.map((f) => f.food_rating))
  const avgService = average(filtered.map((f) => f.service_rating))
  const avgAmbiance = average(filtered.map((f) => f.ambiance_rating))
  const avgOverall = average(
    filtered.map((f) => (f.food_rating + f.service_rating + f.ambiance_rating) / 3)
  )

  const branchComparison = (['cottages', 'tuuti'] as const).map((branch) => {
    const rows = all.filter((f) => f.branch === branch)
    return {
      branch,
      avgFood: average(rows.map((f) => f.food_rating)),
      avgService: average(rows.map((f) => f.service_rating)),
      avgAmbiance: average(rows.map((f) => f.ambiance_rating)),
      count: rows.length,
    }
  })

  const days: string[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  const trend = days.map((day) => {
    const rows = filtered.filter((f) => f.created_at.slice(0, 10) === day)
    return {
      date: day,
      avgOverall: rows.length
        ? average(rows.map((f) => (f.food_rating + f.service_rating + f.ambiance_rating) / 3))
        : null,
      count: rows.length,
    }
  })

  const recentComments = filtered
    .filter((f) => f.comment && f.comment.trim().length > 0)
    .slice(0, 10)
    .map((f) => ({
      id: f.id,
      branch: f.branch,
      guestName: f.guest_name,
      comment: f.comment,
      foodRating: f.food_rating,
      serviceRating: f.service_rating,
      ambianceRating: f.ambiance_rating,
      createdAt: f.created_at,
    }))

  return NextResponse.json({
    totalCount,
    avgFood,
    avgService,
    avgAmbiance,
    avgOverall,
    branchComparison,
    trend,
    recentComments,
  })
}
