'use client'

import { useState } from 'react'
import { CheckCircle2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'

export type ResolvedItem = {
  id: string
  branch: string
  outlet: string | null
  foodRating: number
  serviceRating: number
  ambianceRating: number
  npsScore: number | null
  comment: string | null
  servedBy: string | null
  guestName: string | null
  createdAt: string
  resolvedAt: string | null
  resolvedBy: string | null
  resolutionNote: string | null
}

function shortDate(value: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ResolveButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!note.trim()) {
      setError('Please add a note about what was done')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/feedback/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Could not save. Please try again.')
        setBusy(false)
        return
      }
      setBusy(false)
      onDone()
    } catch {
      setBusy(false)
      setError('Could not save. Check your connection and try again.')
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 flex items-center gap-1.5 text-xs font-body font-semibold text-orange hover:text-brown transition"
      >
        <CheckCircle2 size={14} /> Resolve
      </button>
    )
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
        rows={2}
        placeholder="What was done? e.g. Called the guest and apologised"
        className="w-full rounded-xl border border-beige p-2 text-sm font-body text-brown placeholder:text-brown-light/60 focus:outline-none focus:border-orange resize-none bg-white"
      />
      {error && <p className="text-xs text-red-700 font-body">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="bg-orange text-cream px-4 py-1.5 rounded-full text-xs font-body font-semibold hover:bg-orange-light transition disabled:opacity-50"
        >
          {busy ? 'Saving...' : 'Mark resolved'}
        </button>
        <button
          onClick={() => {
            setOpen(false)
            setNote('')
            setError('')
          }}
          disabled={busy}
          className="text-xs font-body text-brown-light underline"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export function ResolvedList({
  items,
  branchNames,
  outletNames,
  onDone,
}: {
  items: ResolvedItem[]
  branchNames: Record<string, string>
  outletNames: Record<string, string>
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  async function reopen(id: string) {
    setBusyId(id)
    setError('')
    try {
      const res = await fetch(`/api/feedback/${id}/resolve`, { method: 'DELETE' })
      if (!res.ok) {
        setError('Could not reopen. Please try again.')
        setBusyId('')
        return
      }
      setBusyId('')
      onDone()
    } catch {
      setBusyId('')
      setError('Could not reopen. Check your connection and try again.')
    }
  }

  return (
    <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between font-heading text-lg text-brown"
      >
        <span className="flex items-center gap-2">
          <CheckCircle2 size={18} className="text-green-700" /> Resolved ({items.length})
        </span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open && (
        <div className="flex flex-col gap-3 mt-4">
          {error && <p className="text-xs text-red-700 font-body">{error}</p>}
          {items.map((n) => (
            <div key={n.id} className="border border-beige rounded-xl p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-brown-light font-body">
                  {branchNames[n.branch] || n.branch}
                  {n.outlet ? ` - ${outletNames[n.outlet] || n.outlet}` : ''}
                </span>
                <span className="text-xs text-brown-light font-body">{shortDate(n.createdAt)}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-brown-light font-body mb-1">
                <span>Food {n.foodRating}*</span>
                <span>Service {n.serviceRating}*</span>
                <span>Ambiance {n.ambianceRating}*</span>
                {n.npsScore != null && <span>NPS {n.npsScore}</span>}
              </div>
              {n.comment && <p className="text-brown font-body text-sm mb-1">{n.comment}</p>}
              <div className="bg-green-50 rounded-lg p-2 mt-1">
                <p className="text-xs text-green-800 font-body font-semibold">
                  Resolved by {n.resolvedBy || 'Manager'} on {shortDate(n.resolvedAt)}
                </p>
                {n.resolutionNote && <p className="text-sm text-brown font-body mt-0.5">{n.resolutionNote}</p>}
              </div>
              <button
                onClick={() => reopen(n.id)}
                disabled={busyId === n.id}
                className="mt-2 flex items-center gap-1.5 text-xs font-body text-brown-light hover:text-brown transition disabled:opacity-50"
              >
                <RotateCcw size={13} /> {busyId === n.id ? 'Reopening...' : 'Reopen'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
