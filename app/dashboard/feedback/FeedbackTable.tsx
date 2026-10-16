'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Download, Search, ChevronDown, ChevronUp, ArrowUpDown, RotateCcw } from 'lucide-react'
import { BRANCHES, OUTLETS, BRANCH_LABELS, OUTLET_LABELS } from '@/lib/venues'
import { ResolveButton } from '../ResolveControls'

type Row = {
  id: string
  branch: string
  outlet: string | null
  source: string | null
  bill_number: string | null
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
  served_by: string | null
  collected_by: string | null
  comment: string | null
  guest_name: string | null
  guest_phone: string | null
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
  resolution_note: string | null
}

type SortKey = 'date' | 'bill' | 'overall' | 'nps'

const PAGE_SIZE = 50
const HOW_HEARD: Record<string, string> = {
  online: 'Online',
  referral: 'Referral',
  repeat_guest: 'Repeat Guest',
  other: 'Other',
}

function ratingsOf(r: Row) {
  return [
    r.food_rating,
    r.service_rating,
    r.ambiance_rating,
    r.hostess_rating,
    r.cleanliness_rating,
    r.value_rating,
    r.wait_time_rating,
  ].filter((v): v is number => v != null)
}

function overallOf(r: Row) {
  const v = ratingsOf(r)
  if (v.length === 0) return 0
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10
}

function isLow(r: Row) {
  return ratingsOf(r).some((v) => v <= 2) || (r.nps_score != null && r.nps_score <= 6)
}

function statusOf(r: Row): 'resolved' | 'open' | 'ok' {
  if (r.resolved_at) return 'resolved'
  return isLow(r) ? 'open' : 'ok'
}

function fmtDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function csvCell(v: string | number | null | undefined) {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
  return '"' + s.replace(/"/g, '""') + '"'
}

function cmpBill(a: string, b: string) {
  return a.length - b.length || a.localeCompare(b)
}

export function FeedbackTable() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [branch, setBranch] = useState('all')
  const [outlet, setOutlet] = useState('all')
  const [source, setSource] = useState('all')
  const [status, setStatus] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/feedback')
      if (!res.ok) {
        setError('Could not load feedback.')
        setLoading(false)
        return
      }
      const data = await res.json()
      setRows(data.rows || [])
      setError('')
    } catch {
      setError('Could not load feedback. Check your connection.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const fromD = from ? new Date(from + 'T00:00:00') : null
    const toD = to ? new Date(to + 'T23:59:59.999') : null
    const list = rows.filter((r) => {
      if (branch !== 'all' && r.branch !== branch) return false
      if (outlet !== 'all' && r.outlet !== outlet) return false
      if (source !== 'all' && (r.source || 'tablet') !== source) return false
      if (status !== 'all' && statusOf(r) !== status) return false
      const d = new Date(r.created_at)
      if (fromD && d < fromD) return false
      if (toD && d > toD) return false
      if (q) {
        const hay = [r.guest_name, r.guest_phone, r.bill_number, r.comment, r.served_by, r.collected_by, r.resolution_note]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    const dir = sortDir === 'asc' ? 1 : -1
    list.sort((a, b) => {
      if (sortKey === 'bill') return cmpBill(a.bill_number || '', b.bill_number || '') * dir
      if (sortKey === 'overall') return (overallOf(a) - overallOf(b)) * dir
      if (sortKey === 'nps') {
        if (a.nps_score == null && b.nps_score == null) return 0
        if (a.nps_score == null) return 1
        if (b.nps_score == null) return -1
        return (a.nps_score - b.nps_score) * dir
      }
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir
    })
    return list
  }, [rows, search, branch, outlet, source, status, from, to, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'bill' ? 'asc' : 'desc')
    }
    setPage(1)
  }

  async function reopen(id: string) {
    setBusyId(id)
    try {
      await fetch(`/api/feedback/${id}/resolve`, { method: 'DELETE' })
      await load()
    } finally {
      setBusyId('')
    }
  }

  function exportCsv() {
    const header = [
      'Date', 'Bill Number', 'Branch', 'Outlet', 'Source', 'Food', 'Service', 'Ambiance', 'Hostess',
      'Ambiance & Cleanliness', 'Menu Variety', 'Beverage', 'Overall', 'NPS', 'How Heard', 'Served By',
      'Collected By', 'Guest Name', 'Phone/Email', 'Comment', 'Status', 'Resolved By', 'Resolution Note',
    ]
    const lines = [header.map(csvCell).join(',')]
    filtered.forEach((r) => {
      const st = statusOf(r)
      lines.push(
        [
          fmtDate(r.created_at),
          r.bill_number,
          BRANCH_LABELS[r.branch as keyof typeof BRANCH_LABELS] || r.branch,
          r.outlet ? OUTLET_LABELS[r.outlet as keyof typeof OUTLET_LABELS] || r.outlet : '',
          (r.source || 'tablet') === 'qr' ? 'Guest QR' : 'Tablet',
          r.food_rating,
          r.service_rating,
          r.ambiance_rating,
          r.hostess_rating,
          r.cleanliness_rating,
          r.value_rating,
          r.wait_time_rating,
          overallOf(r),
          r.nps_score,
          r.how_heard ? (r.how_heard === 'other' && r.how_heard_other ? r.how_heard_other : HOW_HEARD[r.how_heard] || r.how_heard) : '',
          r.served_by,
          r.collected_by,
          r.guest_name,
          r.guest_phone,
          r.comment,
          st === 'resolved' ? 'Resolved' : st === 'open' ? 'Needs attention' : 'OK',
          r.resolved_by,
          r.resolution_note,
        ]
          .map(csvCell)
          .join(',')
      )
    })
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'all-feedback.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectCls =
    'rounded-full border border-beige bg-white px-3 py-2 text-sm font-body text-brown focus:outline-none focus:border-orange'

  function SortHead({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k
    return (
      <button onClick={() => toggleSort(k)} className="flex items-center gap-1 font-semibold">
        {label}
        {active ? (
          sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
        ) : (
          <ArrowUpDown size={12} className="opacity-40" />
        )}
      </button>
    )
  }

  const badge: Record<string, string> = {
    open: 'bg-orange/15 text-orange',
    resolved: 'bg-green-100 text-green-800',
    ok: 'bg-beige-light text-brown-light',
  }
  const badgeText: Record<string, string> = { open: 'Needs attention', resolved: 'Resolved', ok: 'OK' }

  return (
    <main className="min-h-dvh bg-beige-light p-4 md:p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <a href="/dashboard" className="flex items-center gap-1.5 text-sm font-body text-brown-light hover:text-brown transition">
            <ArrowLeft size={16} /> Back to dashboard
          </a>
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="ml-auto flex items-center gap-1.5 bg-brown text-cream px-4 py-2 rounded-full font-body text-sm font-semibold hover:bg-brown-light transition disabled:opacity-50"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>

        <div>
          <h1 className="font-heading text-brown text-3xl">All Feedback</h1>
          <p className="font-body text-brown-light text-sm mt-1">
            {loading ? 'Loading...' : `${filtered.length} of ${rows.length} responses`}
          </p>
        </div>

        <div className="bg-cream rounded-2xl p-4 shadow-sm flex flex-col gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-light" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search guest name, phone, bill number, comment, staff..."
              className="w-full rounded-full border border-beige bg-white pl-9 pr-4 py-2 text-sm font-body text-brown placeholder:text-brown-light/60 focus:outline-none focus:border-orange"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <select value={branch} onChange={(e) => { setBranch(e.target.value); setPage(1) }} className={selectCls}>
              <option value="all">All branches</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>{BRANCH_LABELS[b]}</option>
              ))}
            </select>
            <select value={outlet} onChange={(e) => { setOutlet(e.target.value); setPage(1) }} className={selectCls}>
              <option value="all">All outlets</option>
              {OUTLETS.map((o) => (
                <option key={o} value={o}>{OUTLET_LABELS[o]}</option>
              ))}
            </select>
            <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1) }} className={selectCls}>
              <option value="all">Tablet and QR</option>
              <option value="tablet">Tablet only</option>
              <option value="qr">Guest QR only</option>
            </select>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className={selectCls}>
              <option value="all">Any status</option>
              <option value="open">Needs attention</option>
              <option value="resolved">Resolved</option>
              <option value="ok">No issues</option>
            </select>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} className={selectCls} aria-label="From date" />
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} className={selectCls} aria-label="To date" />
            {(search || branch !== 'all' || outlet !== 'all' || source !== 'all' || status !== 'all' || from || to) && (
              <button
                onClick={() => {
                  setSearch(''); setBranch('all'); setOutlet('all'); setSource('all'); setStatus('all'); setFrom(''); setTo(''); setPage(1)
                }}
                className="text-xs text-brown-light underline font-body"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-700 font-body">{error}</p>}

        <div className="bg-cream rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm font-body text-brown min-w-[820px]">
            <thead>
              <tr className="text-left text-xs text-brown-light border-b border-beige">
                <th className="p-3"><SortHead label="Date" k="date" /></th>
                <th className="p-3"><SortHead label="Bill #" k="bill" /></th>
                <th className="p-3">Where</th>
                <th className="p-3">Source</th>
                <th className="p-3"><SortHead label="Overall" k="overall" /></th>
                <th className="p-3"><SortHead label="NPS" k="nps" /></th>
                <th className="p-3">Guest</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {!loading && pageRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-brown-light">No feedback matches your search.</td>
                </tr>
              )}
              {pageRows.map((r) => {
                const st = statusOf(r)
                const open = openId === r.id
                const detail: { label: string; value: number | null }[] = [
                  { label: 'Food', value: r.food_rating },
                  { label: 'Service', value: r.service_rating },
                  { label: 'Ambiance', value: r.ambiance_rating },
                  { label: 'Hostess', value: r.hostess_rating },
                  { label: 'Beverage', value: r.wait_time_rating },
                  { label: 'Menu Variety', value: r.value_rating },
                  { label: 'Ambiance & Cleanliness', value: r.cleanliness_rating },
                ].filter((d) => d.value != null)
                return (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => setOpenId(open ? '' : r.id)}
                      className="border-b border-beige/60 cursor-pointer hover:bg-beige-light/60"
                    >
                      <td className="p-3 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                      <td className="p-3">{r.bill_number || '-'}</td>
                      <td className="p-3">
                        <span className="block">{r.outlet ? OUTLET_LABELS[r.outlet as keyof typeof OUTLET_LABELS] || r.outlet : '-'}</span>
                        <span className="block text-xs text-brown-light">{BRANCH_LABELS[r.branch as keyof typeof BRANCH_LABELS] || r.branch}</span>
                      </td>
                      <td className="p-3">{(r.source || 'tablet') === 'qr' ? 'Guest QR' : 'Tablet'}</td>
                      <td className="p-3 font-semibold">{overallOf(r)} ★</td>
                      <td className="p-3">{r.nps_score ?? '-'}</td>
                      <td className="p-3">{r.guest_name || '-'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${badge[st]}`}>
                          {badgeText[st]}
                        </span>
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-b border-beige/60 bg-beige-light/40">
                        <td colSpan={8} className="p-4">
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-2">
                            {detail.map((d) => (
                              <span key={d.label} className={(d.value as number) <= 2 ? 'text-red-700 font-semibold' : 'text-brown-light'}>
                                {d.label} {d.value} ★
                              </span>
                            ))}
                          </div>
                          {r.comment && <p className="text-sm mb-2">{r.comment}</p>}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-brown-light">
                            {r.served_by && <span>Served by {r.served_by}</span>}
                            {r.collected_by && <span>Collected by {r.collected_by}</span>}
                            {r.guest_phone && <span>{r.guest_phone}</span>}
                            {r.how_heard && (
                              <span>
                                Heard via {r.how_heard === 'other' && r.how_heard_other ? r.how_heard_other : HOW_HEARD[r.how_heard] || r.how_heard}
                              </span>
                            )}
                          </div>
                          {st === 'resolved' && (
                            <div className="bg-green-50 rounded-lg p-2 mt-3">
                              <p className="text-xs text-green-800 font-semibold">
                                Resolved by {r.resolved_by || 'Manager'}{r.resolved_at ? ` on ${fmtDate(r.resolved_at)}` : ''}
                              </p>
                              {r.resolution_note && <p className="text-sm mt-0.5">{r.resolution_note}</p>}
                              <button
                                onClick={() => reopen(r.id)}
                                disabled={busyId === r.id}
                                className="mt-2 flex items-center gap-1.5 text-xs text-brown-light hover:text-brown transition disabled:opacity-50"
                              >
                                <RotateCcw size={13} /> {busyId === r.id ? 'Reopening...' : 'Reopen'}
                              </button>
                            </div>
                          )}
                          {st === 'open' && <ResolveButton id={r.id} onDone={load} />}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 font-body text-sm text-brown">
            <button
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-1.5 rounded-full bg-cream shadow-sm disabled:opacity-40"
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-1.5 rounded-full bg-cream shadow-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
