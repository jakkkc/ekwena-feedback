'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'
import { Star, MessageSquare, Users2, TrendingUp, LogOut, KeyRound } from 'lucide-react'
import { Logo } from '@/components/Logo'

const BRANCH_NAMES: Record<string, string> = {
  cottages: 'Cottages',
  tuuti: 'Tuuti',
}

type Stats = {
  totalCount: number
  avgFood: number
  avgService: number
  avgAmbiance: number
  avgOverall: number
  branchComparison: { branch: string; avgFood: number; avgService: number; avgAmbiance: number; count: number }[]
  trend: { date: string; avgOverall: number | null; count: number }[]
  recentComments: {
    id: string
    branch: string
    guestName: string | null
    comment: string
    foodRating: number
    serviceRating: number
    ambianceRating: number
    createdAt: string
  }[]
}

type StaffMember = {
  id: string
  name: string
  role: 'manager' | 'waiter'
  branch: string | null
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-cream rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
      <div className="text-orange">{icon}</div>
      <p className="text-2xl font-heading text-brown">{value}</p>
      <p className="text-xs text-brown-light font-body">{label}</p>
    </div>
  )
}

export function ManagerDashboard({ managerName }: { managerName: string }) {
  const [branchFilter, setBranchFilter] = useState<'all' | 'cottages' | 'tuuti'>('all')
  const [stats, setStats] = useState<Stats | null>(null)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null)
  const [newPin, setNewPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSaving, setPinSaving] = useState(false)
  const router = useRouter()

  const loadStats = useCallback(async (branch: string) => {
    setLoading(true)
    const res = await fetch(`/api/dashboard/stats?branch=${branch}`)
    if (res.ok) {
      setStats(await res.json())
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadStats(branchFilter)
  }, [branchFilter, loadStats])

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

  const comparisonFormatted = stats?.branchComparison.map((b) => ({
    ...b,
    label: BRANCH_NAMES[b.branch] || b.branch,
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
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm text-brown-light hover:text-brown transition font-body"
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>

        <div className="flex gap-2">
          {(['all', 'cottages', 'tuuti'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBranchFilter(b)}
              className={`px-4 py-2 rounded-full font-body text-sm font-semibold transition ${
                branchFilter === b
                  ? 'bg-orange text-cream'
                  : 'bg-cream text-brown-light hover:bg-beige'
              }`}
            >
              {b === 'all' ? 'All Branches' : BRANCH_NAMES[b]}
            </button>
          ))}
        </div>

        {loading || !stats ? (
          <p className="text-brown-light font-body">Loading stats...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard icon={<MessageSquare size={20} />} label="Total Feedback" value={stats.totalCount} />
              <StatCard icon={<Star size={20} />} label="Overall Avg" value={stats.avgOverall || '—'} />
              <StatCard icon={<Star size={20} />} label="Food Avg" value={stats.avgFood || '—'} />
              <StatCard icon={<Star size={20} />} label="Service Avg" value={stats.avgService || '—'} />
              <StatCard icon={<Star size={20} />} label="Ambiance Avg" value={stats.avgAmbiance || '—'} />
            </div>

            <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
              <h2 className="font-heading text-lg text-brown mb-4">Branch Comparison</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={comparisonFormatted}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3E5D3" />
                  <XAxis dataKey="label" stroke="#5D4037" fontSize={12} />
                  <YAxis domain={[0, 5]} stroke="#5D4037" fontSize={12} />
                  <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontFamily: 'var(--font-body)', fontSize: 12 }} />
                  <Bar dataKey="avgFood" name="Food" fill="#BF6B34" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="avgService" name="Service" fill="#D68A52" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="avgAmbiance" name="Ambiance" fill="#3E2723" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
              <h2 className="font-heading text-lg text-brown mb-4 flex items-center gap-2">
                <TrendingUp size={18} /> Rating Trend (Last 14 Days)
              </h2>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendFormatted}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3E5D3" />
                  <XAxis dataKey="label" stroke="#5D4037" fontSize={12} />
                  <YAxis domain={[0, 5]} stroke="#5D4037" fontSize={12} />
                  <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', borderRadius: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="avgOverall"
                    name="Avg Rating"
                    stroke="#BF6B34"
                    strokeWidth={3}
                    dot={{ fill: '#BF6B34', r: 4 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
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
                          {BRANCH_NAMES[c.branch] || c.branch}
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
                        {c.guestName && <span>— {c.guestName}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

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
                    <button
                      onClick={handleSavePin}
                      disabled={pinSaving}
                      className="text-xs bg-orange text-cream px-3 py-1.5 rounded-full font-body font-semibold hover:bg-orange-light transition disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingStaffId(null); setNewPin(''); setPinError('') }}
                      className="text-xs text-brown-light font-body"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingStaffId(s.id); setNewPin(''); setPinError('') }}
                    className="flex items-center gap-1 text-xs text-brown-light hover:text-orange transition font-body"
                  >
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
