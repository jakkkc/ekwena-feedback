import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'

type FeedbackRow = {
  id: string
  branch: 'cottages' | 'tuuti'
  outlet: string | null
  collected_by: string | null
  served_by: string | null
  food_rating: number
  service_rating: number
  ambiance_rating: number
  hostess_rating: number | null
  cleanliness_rating: number | null
  value_rating: number | null
  wait_time_rating: number | null
  nps_score: number | null
  how_heard: string | null
  how_heard_other: string | null
  comment: string | null
  guest_name: string | null
  guest_phone: string | null
  created_at: string
}

function average(nums: number[]) {
  if (nums.length === 0) return 0
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

function overallOf(f: FeedbackRow) {
  return (f.food_rating + f.service_rating + f.ambiance_rating) / 3
}

function allCategoriesOverallOf(f: FeedbackRow) {
  const values: number[] = [f.food_rating, f.service_rating, f.ambiance_rating]
  if (f.hostess_rating != null) values.push(f.hostess_rating)
  if (f.cleanliness_rating != null) values.push(f.cleanliness_rating)
  if (f.value_rating != null) values.push(f.value_rating)
  if (f.wait_time_rating != null) values.push(f.wait_time_rating)
  return values.reduce((a, b) => a + b, 0) / values.length
}

function normalizeContact(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

const HOW_HEARD_LABELS: Record<string, string> = {
  online: 'Online',
  referral: 'Referral',
  repeat_guest: 'Repeat Guest',
  other: 'Other',
}

const OUTLETS = ['ekwena_restaurant', 'duma_bar', 'eswara_conference_hall', 'ekwena_gardens'] as const

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const branchFilter = searchParams.get('branch') || 'all'
  const outletFilter = searchParams.get('outlet') || 'all'
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Failed to load feedback' }, { status: 500 })
  }

  const all = data as FeedbackRow[]

  const matchesDate = (f: FeedbackRow) => {
    if (!startDate && !endDate) return true
    const d = f.created_at.slice(0, 10)
    if (startDate && d < startDate) return false
    if (endDate && d > endDate) return false
    return true
  }
  const matchesBranch = (f: FeedbackRow) => branchFilter === 'all' || f.branch === branchFilter
  const matchesOutlet = (f: FeedbackRow) => outletFilter === 'all' || f.outlet === outletFilter

  const filtered = all.filter((f) => matchesBranch(f) && matchesOutlet(f) && matchesDate(f))

  // --- Core stats (fully filtered scope) ---
  const totalCount = filtered.length
  const avgFoodQuality = average(filtered.map((f) => f.food_rating))
  const avgService = average(filtered.map((f) => f.service_rating))
  const avgGeneralAmbiance = average(filtered.map((f) => f.ambiance_rating))
  const avgHostess = average(filtered.filter((f) => f.hostess_rating != null).map((f) => f.hostess_rating as number))
  const avgAmbianceCleanliness = average(filtered.filter((f) => f.cleanliness_rating != null).map((f) => f.cleanliness_rating as number))
  const avgMenuVariety = average(filtered.filter((f) => f.value_rating != null).map((f) => f.value_rating as number))
  const avgBeverage = average(filtered.filter((f) => f.wait_time_rating != null).map((f) => f.wait_time_rating as number))
  const avgOverall = average(filtered.map(overallOf))

  const categoryAverages = [
    { label: 'Hostess Reception', value: avgHostess },
    { label: 'Beverage Quality', value: avgBeverage },
    { label: 'Food Quality & Options', value: avgFoodQuality },
    { label: 'Menu Variety & Options', value: avgMenuVariety },
    { label: 'Quality of Service', value: avgService },
    { label: 'General Ambiance', value: avgGeneralAmbiance },
    { label: 'Ambiance & Cleanliness', value: avgAmbianceCleanliness },
  ].filter((c) => c.value > 0)
  const lowestCategory = categoryAverages.length
    ? categoryAverages.reduce((min, c) => (c.value < min.value ? c : min))
    : null

  // --- Branch comparison (respects outlet+date filters, ignores branch filter) ---
  const branchScope = all.filter((f) => matchesOutlet(f) && matchesDate(f))
  const branchComparison = (['cottages', 'tuuti'] as const).map((branch) => {
    const rows = branchScope.filter((f) => f.branch === branch)
    return {
      branch,
      avgFood: average(rows.map((f) => f.food_rating)),
      avgService: average(rows.map((f) => f.service_rating)),
      avgAmbiance: average(rows.map((f) => f.ambiance_rating)),
      count: rows.length,
    }
  })

  // --- Outlet comparison (respects branch+date filters, ignores outlet filter) ---
  const outletScope = all.filter((f) => matchesBranch(f) && matchesDate(f))
  const outletComparison = OUTLETS.map((outlet) => {
    const rows = outletScope.filter((f) => f.outlet === outlet)
    return {
      outlet,
      avgFood: average(rows.map((f) => f.food_rating)),
      avgService: average(rows.map((f) => f.service_rating)),
      avgAmbiance: average(rows.map((f) => f.ambiance_rating)),
      count: rows.length,
    }
  }).filter((o) => o.count > 0)

  // --- Trend (custom range if given, else last 14 days) ---
  const trendDates: string[] = []
  if (startDate && endDate) {
    const d = new Date(startDate)
    const end = new Date(endDate)
    let guard = 0
    while (d <= end && guard < 366) {
      trendDates.push(d.toISOString().slice(0, 10))
      d.setDate(d.getDate() + 1)
      guard++
    }
  } else {
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      trendDates.push(d.toISOString().slice(0, 10))
    }
  }
  const trend = trendDates.map((day) => {
    const rows = filtered.filter((f) => f.created_at.slice(0, 10) === day)
    return {
      date: day,
      avgOverall: rows.length ? average(rows.map(overallOf)) : null,
      count: rows.length,
    }
  })

  // --- Recent comments ---
  const recentComments = filtered
    .filter((f) => f.comment && f.comment.trim().length > 0)
    .slice(0, 10)
    .map((f) => ({
      id: f.id,
      branch: f.branch,
      outlet: f.outlet,
      guestName: f.guest_name,
      comment: f.comment,
      foodRating: f.food_rating,
      serviceRating: f.service_rating,
      ambianceRating: f.ambiance_rating,
      servedBy: f.served_by,
      createdAt: f.created_at,
    }))

  // --- NPS ---
  const npsResponses = filtered.filter((f) => f.nps_score != null)
  const promoters = npsResponses.filter((f) => (f.nps_score as number) >= 9).length
  const passives = npsResponses.filter((f) => (f.nps_score as number) >= 7 && (f.nps_score as number) <= 8).length
  const detractors = npsResponses.filter((f) => (f.nps_score as number) <= 6).length
  const npsScore = npsResponses.length > 0 ? Math.round(((promoters - detractors) / npsResponses.length) * 100) : null

  // --- How heard ---
  const howHeardCounts: Record<string, number> = {}
  filtered.forEach((f) => {
    if (!f.how_heard) return
    howHeardCounts[f.how_heard] = (howHeardCounts[f.how_heard] || 0) + 1
  })
  const howHeard = Object.entries(howHeardCounts).map(([key, count]) => ({
    label: HOW_HEARD_LABELS[key] || key,
    count,
  }))

  // --- Staff leaderboard (based on who served the guest) ---
  const staffGroups: Record<string, FeedbackRow[]> = {}
  filtered.forEach((f) => {
    if (!f.served_by) return
    if (!staffGroups[f.served_by]) staffGroups[f.served_by] = []
    staffGroups[f.served_by].push(f)
  })
  const staffLeaderboard = Object.entries(staffGroups)
    .map(([name, rows]) => ({
      name,
      avgOverall: average(rows.map(overallOf)),
      count: rows.length,
    }))
    .sort((a, b) => b.avgOverall - a.avgOverall)

  // --- Data collection volume (who logged in and ran the device) ---
  const collectionCounts: Record<string, number> = {}
  filtered.forEach((f) => {
    if (!f.collected_by) return
    collectionCounts[f.collected_by] = (collectionCounts[f.collected_by] || 0) + 1
  })
  const collectionVolume = Object.entries(collectionCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // --- Needs attention (any low individual rating or low NPS) ---
  const needsAttention = filtered
    .filter((f) => {
      const coreLow = [f.food_rating, f.service_rating, f.ambiance_rating].some((r) => r <= 2)
      const optionalLow = [f.hostess_rating, f.cleanliness_rating, f.value_rating, f.wait_time_rating].some(
        (r) => r != null && r <= 2
      )
      const npsLow = f.nps_score != null && f.nps_score <= 6
      return coreLow || optionalLow || npsLow
    })
    .slice(0, 20)
    .map((f) => ({
      id: f.id,
      branch: f.branch,
      outlet: f.outlet,
      foodRating: f.food_rating,
      serviceRating: f.service_rating,
      ambianceRating: f.ambiance_rating,
      hostessRating: f.hostess_rating,
      cleanlinessRating: f.cleanliness_rating,
      valueRating: f.value_rating,
      waitTimeRating: f.wait_time_rating,
      npsScore: f.nps_score,
      comment: f.comment,
      servedBy: f.served_by,
      collectedBy: f.collected_by,
      guestName: f.guest_name,
      guestPhone: f.guest_phone,
      createdAt: f.created_at,
    }))

  // --- Guest contact list + repeat guest detection ---
  const guestRows = filtered.filter((f) => f.guest_name || f.guest_phone)
  const contactCounts: Record<string, number> = {}
  guestRows.forEach((f) => {
    if (!f.guest_phone) return
    const norm = normalizeContact(f.guest_phone)
    contactCounts[norm] = (contactCounts[norm] || 0) + 1
  })
  const guestList = guestRows.map((f) => ({
    name: f.guest_name,
    phone: f.guest_phone,
    branch: f.branch,
    outlet: f.outlet,
    createdAt: f.created_at,
    isRepeat: f.guest_phone ? contactCounts[normalizeContact(f.guest_phone)] > 1 : false,
  }))
  const repeatGuestCount = Object.values(contactCounts).filter((c) => c > 1).length

  // --- All-time grand average across ALL 7 rating categories, ignoring every filter ---
  const grandAverageOverall = {
    avg: average(all.map(allCategoriesOverallOf)),
    count: all.length,
  }
  const grandAverageByBranch = (['cottages', 'tuuti'] as const).map((branch) => {
    const rows = all.filter((f) => f.branch === branch)
    return { branch, avg: average(rows.map(allCategoriesOverallOf)), count: rows.length }
  })
  const grandAverageByOutlet = OUTLETS.map((outlet) => {
    const rows = all.filter((f) => f.outlet === outlet)
    return { outlet, avg: average(rows.map(allCategoriesOverallOf)), count: rows.length }
  }).filter((o) => o.count > 0)

  return NextResponse.json({
    grandAverageOverall,
    grandAverageByBranch,
    grandAverageByOutlet,
    totalCount,
    avgOverall,
    avgHostess,
    avgBeverage,
    avgFoodQuality,
    avgMenuVariety,
    avgService,
    avgGeneralAmbiance,
    avgAmbianceCleanliness,
    lowestCategory,
    branchComparison,
    outletComparison,
    trend,
    recentComments,
    nps: { score: npsScore, promoters, passives, detractors, responses: npsResponses.length },
    howHeard,
    staffLeaderboard,
    collectionVolume,
    needsAttention,
    guestList,
    repeatGuestCount,
  })
}
