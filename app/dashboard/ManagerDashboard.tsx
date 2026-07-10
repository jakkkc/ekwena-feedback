'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'
import {
  Star, MessageSquare, Users2, TrendingUp, LogOut, KeyRound, ThumbsUp,
  Compass, Award, AlertTriangle, Download, Activity,
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { RosterManager } from './RosterManager'

const BRANCH_NAMES: Record<string, string> = {
  cottages: 'Cottages',
  tuuti: 'Tuuti',
}

const OUTLET_NAMES: Record<string, string> = {
  ekwena_restaurant: 'Ekwena Restaurant',
  duma_bar: 'Duma Bar',
  eswara_conference_hall: 'Eswara Conference Hall',
  ekwena_gardens: 'Ekwena Gardens',
}

type Stats = {
  grandAverageOverall: { avg: number; count: number }
  grandAverageByBranch: { branch: string; avg: number; count: number }[]
  grandAverageByOutlet: { outlet: string; avg: number; count: number }[]
  totalCount: number
  avgOverall: number
  avgHostess: number
  avgBeverage: number
  avgFoodQuality: number
  avgMenuVariety: number
  avgService: number
  avgGeneralAmbiance: number
  avgAmbianceCleanliness: number
  lowestCategory: { label: string; value: number } | null
  branchComparison: { branch: string; avgFood: number; avgService: number; avgAmbiance: number; count: number }[]
  outletComparison: { outlet: string; avgFood: number; avgService: number; avgAmbiance: number; count: number }[]
  trend: { date: string; avgOverall: number | null; count: number }[]
  recentComments: {
    id: string; branch: string; outlet: string | null; guestName: string | null; comment: string
    foodRating: number; serviceRating: number; ambianceRating: number; servedBy: string | null; createdAt: string
  }[]
  nps: { score: number | null; promoters: number; passives: number; detractors: number; responses: number }
  howHeard: { label: string; count: number }[]
  staffLeaderboard: { name: string; avgOverall: number; count: number }[]
  collectionVolume: { name: string; count: number }[]
  needsAttention: {
    id: string; branch: string; outlet: string | null; foodRating: number; serviceRating: number
    ambianceRating: number; hostessRating: number | null; cleanlinessRating: number | null
    valueRating: number | null; waitTimeRating: number | null; npsScore: number | null
    comment: string | null; servedBy: string | null
    collectedBy: string | null; guestName: string | null; guestPhone: string | null; createdAt: string
  }[]
  guestList: { name: string | null; phone: string | null; branch: string; outlet: string | null; createdAt: string; isRepeat: boolean }[]
  repeatGuestCount: number
}

type StaffMember = { id: string; name: string; role: 'manager' | 'waiter'; branch: string | null }

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-cream rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
      <div className="text-orange">{icon}</div>
      <p className="text-2xl font-heading text-brown">{value}</p>
      <p className="text-xs text-brown-light font-body">{label}</p>
    </div>
  )
}

function downloadCSV(rows: Stats['guestList']) {
  const header = ['Name', 'Phone/Email', 'Branch', 'Outlet', 'Date', 'Repeat Guest']
  const csvRows = [header.join(',')]
  rows.forEach((r) => {
    const line = [
      r.name || '',
      r.phone || '',
      BRANCH_NAMES[r.branch] || r.branch,
      r.outlet ? OUTLET_NAMES[r.outlet] || r.outlet : '',
      new Date(r.createdAt).toLocaleDateString(),
      r.isRepeat ? 'Yes' : 'No',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
    csvRows.push(line)
  })
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ekwena-guest-contacts.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function ManagerDashboard({ managerName }: { managerName: string }) {
  const [branchFilter, setBranchFilter] = useState<'all' | 'cottages' | 'tuuti'>('all')
  const [outletFilter, setOutletFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null)
  const [newPin, setNewPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSaving, setPinSaving] = useState(false)
  const router = useRouter()

  const loadStats = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ branch: branchFilter, outlet: outletFilter })
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    const res = await fetch(`/api/dashboard/stats?${params.toString()}`)
    if (res.ok) setStats(await res.json())
    setLoading(false)
  }, [branchFilter, outletFilter, startDate, endDate])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    fetch('/api/staff')
      .then((res) => res.json())
      .then((data) => setStaff(data.staff || []))
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  async function handleSavePin() {
    if (!editingStaffId) return
    if (!/^\d{4,6}$/.test(newPin)) {
      setPinError('PIN must be 4-6 digits')
      return
    }
    setPinSaving(true)
    setPinError('')
    const res = await fetch(`/api/staff/${editingStaffId}/pin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPin }),
    })
    setPinSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setPinError(data.error || 'Failed to update PIN')
      return
    }
    setEditingStaffId(null)
    setNewPin('')
  }

  const trendFormatted = stats?.trend.map((t) => ({
    ...t,
    label: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  const branchComparisonFormatted = stats?.branchComparison.map((b) => ({
    ...b,
    label: BRANCH_NAMES[b.branch] || b.branch,
  }))

  const outletComparisonFormatted = stats?.outletComparison.map((o) => ({
    ...o,
    label: OUTLET_NAMES[o.outlet] || o.outlet,
  }))

  return (
    <main className="min-h-screen bg-beige-light p-4 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo size={56} />
            <div>
              <h1 className="text-xl font-heading text-brown">Ekwena Dashboard</h1>
              <p className="text-xs text-brown-light font-body">Welcome, {managerName}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-brown-light hover:text-brown transition font-body">
            <LogOut size={16} /> Log Out
          </button>
        </div>

        {/* Filters */}
        <div className="bg-cream rounded-2xl p-4 shadow-sm flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'cottages', 'tuuti'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBranchFilter(b)}
                className={`px-4 py-2 rounded-full font-body text-sm font-semibold transition ${
                  branchFilter === b ? 'bg-orange text-cream' : 'bg-beige-light text-brown-light hover:bg-beige'
                }`}
              >
                {b === 'all' ? 'All Branches' : BRANCH_NAMES[b]}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setOutletFilter('all')}
              className={`px-3 py-1.5 rounded-full font-body text-xs font-semibold transition ${
                outletFilter === 'all' ? 'bg-brown text-cream' : 'bg-beige-light text-brown-light hover:bg-beige'
              }`}
            >
              All Outlets
            </button>
            {Object.entries(OUTLET_NAMES).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setOutletFilter(value)}
                className={`px-3 py-1.5 rounded-full font-body text-xs font-semibold transition ${
                  outletFilter === value ? 'bg-brown text-cream' : 'bg-beige-light text-brown-light hover:bg-beige'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <label className="text-xs text-brown-light font-body">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-full border border-beige px-3 py-1.5 text-xs font-body text-brown bg-cream focus:outline-none focus:border-orange"
            />
            <label className="text-xs text-brown-light font-body">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-full border border-beige px-3 py-1.5 text-xs font-body text-brown bg-cream focus:outline-none focus:border-orange"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate('') }}
                className="text-xs text-brown-light underline font-body"
              >
                Clear dates
              </button>
            )}
          </div>
        </div>

        {loading || !stats ? (
          <p className="text-brown-light font-body">Loading stats...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<MessageSquare size={20} />} label="Total Feedback" value={stats.totalCount} />
              <StatCard icon={<Star size={20} />} label="Overall Avg" value={stats.avgOverall || '—'} />
              <StatCard icon={<ThumbsUp size={20} />} label={`NPS (${stats.nps.responses} resp.)`} value={stats.nps.score ?? '—'} />
              <StatCard icon={<Users2 size={20} />} label="Repeat Guests" value={stats.repeatGuestCount} />
            </div>

            <div className="bg-brown rounded-2xl p-5 md:p-6 shadow-sm text-cream">
              <h2 className="font-heading text-lg mb-1">All-Time Overall Experience</h2>
              <p className="text-xs text-beige-light/80 font-body mb-4">
                Combines all 7 rating categories, across every submission ever received. Not affected by the filters above.
              </p>
              <div className="flex items-end gap-3 mb-5">
                <span className="text-5xl font-heading">{stats.grandAverageOverall.avg || '-'}</span>
                <span className="text-sm text-beige-light/80 font-body mb-1">/ 5 - {stats.grandAverageOverall.count} reviews</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-beige-light/80 font-body mb-2">By Branch</p>
                  <div className="flex flex-col gap-1">
                    {stats.grandAverageByBranch.map((b) => (
                      <div key={b.branch} className="flex justify-between text-sm font-body">
                        <span>{BRANCH_NAMES[b.branch] || b.branch}</span>
                        <span className="font-semibold">{b.avg || '-'} <span className="text-xs font-normal text-beige-light/70">({b.count})</span></span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-beige-light/80 font-body mb-2">By Outlet</p>
                  <div className="flex flex-col gap-1">
                    {stats.grandAverageByOutlet.length === 0 && (
                      <span className="text-sm font-body text-beige-light/70">No outlet data yet.</span>
                    )}
                    {stats.grandAverageByOutlet.map((o) => (
                      <div key={o.outlet} className="flex justify-between text-sm font-body">
                        <span>{OUTLET_NAMES[o.outlet] || o.outlet}</span>
                        <span className="font-semibold">{o.avg || '-'} <span className="text-xs font-normal text-beige-light/70">({o.count})</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<Star size={18} />} label="Hostess Reception" value={stats.avgHostess || '—'} />
              <StatCard icon={<Star size={18} />} label="Beverage Quality" value={stats.avgBeverage || '—'} />
              <StatCard icon={<Star size={18} />} label="Menu Variety" value={stats.avgMenuVariety || '—'} />
              <StatCard icon={<Star size={18} />} label="Ambiance & Cleanliness" value={stats.avgAmbianceCleanliness || '—'} />
            </div>

            {stats.lowestCategory && (
              <div className="bg-orange/10 border border-orange rounded-2xl p-4 flex items-center gap-3">
                <AlertTriangle size={20} className="text-orange shrink-0" />
                <p className="font-body text-sm text-brown">
                  Your lowest-scoring area right now is <span className="font-semibold">{stats.lowestCategory.label}</span> at{' '}
                  <span className="font-semibold">{stats.lowestCategory.value}/5</span>.
                </p>
              </div>
            )}

            <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
              <h2 className="font-heading text-lg text-brown mb-4">Branch Comparison</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={branchComparisonFormatted}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3E5D3" />
                  <XAxis dataKey="label" stroke="#5D4037" fontSize={12} />
                  <YAxis domain={[0, 5]} stroke="#5D4037" fontSize={12} />
                  <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontFamily: 'var(--font-body)', fontSize: 12 }} />
                  <Bar dataKey="avgFood" name="Food Quality" fill="#BF6B34" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="avgService" name="Service" fill="#D68A52" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="avgAmbiance" name="Ambiance" fill="#3E2723" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
              <h2 className="font-heading text-lg text-brown mb-4">Outlet Comparison</h2>
              {outletComparisonFormatted && outletComparisonFormatted.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={outletComparisonFormatted}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3E5D3" />
                    <XAxis dataKey="label" stroke="#5D4037" fontSize={11} />
                    <YAxis domain={[0, 5]} stroke="#5D4037" fontSize={12} />
                    <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontFamily: 'var(--font-body)', fontSize: 12 }} />
                    <Bar dataKey="avgFood" name="Food Quality" fill="#BF6B34" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="avgService" name="Service" fill="#D68A52" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="avgAmbiance" name="Ambiance" fill="#3E2723" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-brown-light text-sm font-body">No outlet data yet.</p>
              )}
            </div>

            <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
              <h2 className="font-heading text-lg text-brown mb-4 flex items-center gap-2">
                <TrendingUp size={18} /> Rating Trend
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendFormatted}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3E5D3" />
                  <XAxis dataKey="label" stroke="#5D4037" fontSize={11} />
                  <YAxis domain={[0, 5]} stroke="#5D4037" fontSize={12} />
                  <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', borderRadius: 12 }} />
                  <Line type="monotone" dataKey="avgOverall" name="Avg Rating" stroke="#BF6B34" strokeWidth={3} dot={{ fill: '#BF6B34', r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
              <h2 className="font-heading text-lg text-brown mb-4 flex items-center gap-2">
                <Activity size={18} /> Feedback Volume
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trendFormatted}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3E5D3" />
                  <XAxis dataKey="label" stroke="#5D4037" fontSize={11} />
                  <YAxis allowDecimals={false} stroke="#5D4037" fontSize={12} />
                  <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', borderRadius: 12 }} />
                  <Bar dataKey="count" name="Responses" fill="#D68A52" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
                <h2 className="font-heading text-lg text-brown mb-4 flex items-center gap-2">
                  <ThumbsUp size={18} /> NPS Breakdown
                </h2>
                {stats.nps.responses === 0 ? (
                  <p className="text-brown-light text-sm font-body">No NPS responses yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between text-sm font-body"><span className="text-brown">Promoters (9–10)</span><span className="text-brown-light">{stats.nps.promoters}</span></div>
                    <div className="flex justify-between text-sm font-body"><span className="text-brown">Passives (7–8)</span><span className="text-brown-light">{stats.nps.passives}</span></div>
                    <div className="flex justify-between text-sm font-body"><span className="text-brown">Detractors (0–6)</span><span className="text-brown-light">{stats.nps.detractors}</span></div>
                  </div>
                )}
              </div>

              <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
                <h2 className="font-heading text-lg text-brown mb-4 flex items-center gap-2">
                  <Compass size={18} /> How Guests Hear About Us
                </h2>
                {stats.howHeard.length === 0 ? (
                  <p className="text-brown-light text-sm font-body">No data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={stats.howHeard} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3E5D3" />
                      <XAxis type="number" stroke="#5D4037" fontSize={12} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" stroke="#5D4037" fontSize={12} width={90} />
                      <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', borderRadius: 12 }} />
                      <Bar dataKey="count" fill="#BF6B34" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
                <h2 className="font-heading text-lg text-brown mb-4 flex items-center gap-2">
                  <Award size={18} /> Staff Leaderboard
                </h2>
                {stats.staffLeaderboard.length === 0 ? (
                  <p className="text-brown-light text-sm font-body">No "who served you" data yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {stats.staffLeaderboard.map((s, i) => (
                      <div key={s.name} className="flex justify-between items-center border-b border-beige pb-2 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-heading text-orange w-5">#{i + 1}</span>
                          <span className="font-body text-sm text-brown">{s.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-body font-semibold text-brown text-sm">{s.avgOverall}★</span>
                          <span className="text-xs text-brown-light font-body ml-1">({s.count})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
                <h2 className="font-heading text-lg text-brown mb-4">Data Collection Volume</h2>
                {stats.collectionVolume.length === 0 ? (
                  <p className="text-brown-light text-sm font-body">No data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(160, stats.collectionVolume.length * 32)}>
                    <BarChart data={stats.collectionVolume} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3E5D3" />
                      <XAxis type="number" stroke="#5D4037" fontSize={12} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" stroke="#5D4037" fontSize={11} width={100} />
                      <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', borderRadius: 12 }} />
                      <Bar dataKey="count" fill="#D68A52" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm border-2 border-orange/40">
              <h2 className="font-heading text-lg text-brown mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange" /> Needs Attention
              </h2>
              {stats.needsAttention.length === 0 ? (
                <p className="text-brown-light text-sm font-body">Nothing flagged — great work!</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {stats.needsAttention.map((n) => {
                    const optionalRatings: { label: string; value: number | null }[] = [
                      { label: 'Hostess', value: n.hostessRating },
                      { label: 'Beverage', value: n.waitTimeRating },
                      { label: 'Menu Variety', value: n.valueRating },
                      { label: 'Ambiance & Cleanliness', value: n.cleanlinessRating },
                    ].filter((r) => r.value != null)
                    return (
                    <div key={n.id} className="border border-orange/40 bg-orange/5 rounded-xl p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-orange font-body">
                          {BRANCH_NAMES[n.branch] || n.branch}{n.outlet ? ` · ${OUTLET_NAMES[n.outlet] || n.outlet}` : ''}
                        </span>
                        <span className="text-xs text-brown-light font-body">
                          {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-brown-light font-body mb-1">
                        <span className={n.foodRating <= 2 ? 'text-red-700 font-semibold' : ''}>Food {n.foodRating}★</span>
                        <span className={n.serviceRating <= 2 ? 'text-red-700 font-semibold' : ''}>Service {n.serviceRating}★</span>
                        <span className={n.ambianceRating <= 2 ? 'text-red-700 font-semibold' : ''}>Ambiance {n.ambianceRating}★</span>
                        {n.npsScore != null && (
                          <span className={n.npsScore <= 6 ? 'text-red-700 font-semibold' : ''}>NPS {n.npsScore}</span>
                        )}
                      </div>
                      {optionalRatings.length > 0 && (
                        <div className="flex flex-wrap gap-3 text-xs text-brown-light font-body mb-1">
                          {optionalRatings.map((r) => (
                            <span key={r.label} className={(r.value as number) <= 2 ? 'text-red-700 font-semibold' : ''}>
                              {r.label} {r.value}★
                            </span>
                          ))}
                        </div>
                      )}
                      {n.comment && <p className="text-brown font-body text-sm mb-1">{n.comment}</p>}
                      <div className="flex flex-wrap gap-3 text-xs text-brown-light font-body">
                        {n.servedBy && <span>Served by {n.servedBy}</span>}
                        {n.guestName && <span>— {n.guestName}</span>}
                        {n.guestPhone && <span>{n.guestPhone}</span>}
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
              <h2 className="font-heading text-lg text-brown mb-4">Recent Comments</h2>
              {stats.recentComments.length === 0 ? (
                <p className="text-brown-light text-sm font-body">No comments yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {stats.recentComments.map((c) => (
                    <div key={c.id} className="border border-beige rounded-xl p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-orange font-body">
                          {BRANCH_NAMES[c.branch] || c.branch}{c.outlet ? ` · ${OUTLET_NAMES[c.outlet] || c.outlet}` : ''}
                        </span>
                        <span className="text-xs text-brown-light font-body">
                          {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-brown font-body text-sm mb-1">{c.comment}</p>
                      <div className="flex gap-3 text-xs text-brown-light font-body">
                        <span>Food {c.foodRating}★</span>
                        <span>Service {c.serviceRating}★</span>
                        <span>Ambiance {c.ambianceRating}★</span>
                        {c.servedBy && <span>Served by {c.servedBy}</span>}
                        {c.guestName && <span>— {c.guestName}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-heading text-lg text-brown">Guest Contact List</h2>
                <button
                  onClick={() => downloadCSV(stats.guestList)}
                  disabled={stats.guestList.length === 0}
                  className="flex items-center gap-1 text-xs bg-orange text-cream px-3 py-1.5 rounded-full font-body font-semibold hover:bg-orange-light transition disabled:opacity-40"
                >
                  <Download size={14} /> Download CSV
                </button>
              </div>
              <p className="text-xs text-brown-light font-body mb-3">
                Contains guest names and phone/email left voluntarily — handle with care.
              </p>
              {stats.guestList.length === 0 ? (
                <p className="text-brown-light text-sm font-body">No guest contacts collected yet.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                  {stats.guestList.map((g, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-beige pb-2 last:border-0 text-sm font-body">
                      <div>
                        <span className="text-brown">{g.name || 'Anonymous'}</span>
                        {g.isRepeat && <span className="ml-2 text-[10px] bg-orange text-cream px-2 py-0.5 rounded-full">Repeat</span>}
                        <p className="text-xs text-brown-light">{g.phone}</p>
                      </div>
                      <span className="text-xs text-brown-light">
                        {new Date(g.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <RosterManager />

        <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
          <h2 className="font-heading text-lg text-brown mb-4 flex items-center gap-2">
            <Users2 size={18} /> Staff & PINs
          </h2>
          <div className="flex flex-col gap-3">
            {staff.map((s) => (
              <div key={s.id} className="flex justify-between items-center border border-beige rounded-xl p-3">
                <div>
                  <p className="font-body font-semibold text-brown text-sm">{s.name}</p>
                  <p className="text-xs text-brown-light font-body capitalize">
                    {s.role}{s.branch ? ` — ${BRANCH_NAMES[s.branch]}` : ''}
                  </p>
                </div>
                {editingStaffId === s.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="New PIN"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      className="w-24 rounded-full border border-beige px-3 py-1 text-sm font-body focus:outline-none focus:border-orange"
                    />
                    <button onClick={handleSavePin} disabled={pinSaving} className="text-xs bg-orange text-cream px-3 py-1.5 rounded-full font-body font-semibold hover:bg-orange-light transition disabled:opacity-50">
                      Save
                    </button>
                    <button onClick={() => { setEditingStaffId(null); setNewPin(''); setPinError('') }} className="text-xs text-brown-light font-body">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { setEditingStaffId(s.id); setNewPin(''); setPinError('') }} className="flex items-center gap-1 text-xs text-brown-light hover:text-orange transition font-body">
                    <KeyRound size={14} /> Change PIN
                  </button>
                )}
              </div>
            ))}
          </div>
          {pinError && <p className="text-sm text-red-700 font-body mt-2">{pinError}</p>}
        </div>
      </div>
    </main>
  )
}
