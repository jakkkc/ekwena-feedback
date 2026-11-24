'use client'

import { useEffect, useState } from 'react'

type Form = {
  attention_rating_max: string
  attention_nps_enabled: boolean
  attention_nps_max: string
  attention_categories: string[]
  max_responses_per_bill: string
  rate_limit_max: string
  rate_limit_group_max: string
  rate_limit_window_minutes: string
}

const QUESTIONS = [
  { key: 'food', label: 'Food Quality' },
  { key: 'service', label: 'Quality of Service' },
  { key: 'ambiance', label: 'General Ambiance' },
  { key: 'hostess', label: 'Hostess Reception' },
  { key: 'cleanliness', label: 'Ambiance & Cleanliness' },
  { key: 'value', label: 'Menu Variety' },
  { key: 'wait_time', label: 'Beverage Quality' },
  { key: 'wifi', label: 'Wifi Connectivity' },
]

function toForm(s: Record<string, unknown>): Form {
  return {
    attention_rating_max: String(s.attention_rating_max),
    attention_nps_enabled: Boolean(s.attention_nps_enabled),
    attention_nps_max: String(s.attention_nps_max),
    attention_categories: (s.attention_categories as string[]) || [],
    max_responses_per_bill: String(s.max_responses_per_bill),
    rate_limit_max: String(s.rate_limit_max),
    rate_limit_group_max: String(s.rate_limit_group_max),
    rate_limit_window_minutes: String(s.rate_limit_window_minutes),
  }
}

function Field({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-body text-brown">
      <span className="font-semibold">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-28 rounded-lg border border-beige px-3 py-2 bg-cream focus:outline-none focus:border-orange"
      />
      <span className="text-xs text-brown-light">{hint}</span>
    </label>
  )
}

export function RulesManager() {
  const [form, setForm] = useState<Form | null>(null)
  const [defaults, setDefaults] = useState<Form | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        setForm(toForm(d.settings))
        setDefaults(toForm(d.defaults))
      })
      .catch(() => setError('Could not load the rules'))
  }, [])

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f))
    setMessage('')
    setError('')
  }

  function toggleQuestion(k: string) {
    if (!form) return
    const has = form.attention_categories.includes(k)
    set('attention_categories', has ? form.attention_categories.filter((x) => x !== k) : [...form.attention_categories, k])
  }

  async function save() {
    if (!form) return
    const numbers = [form.attention_rating_max, form.attention_nps_max, form.max_responses_per_bill, form.rate_limit_max, form.rate_limit_group_max, form.rate_limit_window_minutes]
    if (numbers.some((n) => n.trim() === '')) {
      setError('Please fill in every number')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attention_rating_max: Number(form.attention_rating_max),
        attention_nps_enabled: form.attention_nps_enabled,
        attention_nps_max: Number(form.attention_nps_max),
        attention_categories: form.attention_categories,
        max_responses_per_bill: Number(form.max_responses_per_bill),
        rate_limit_max: Number(form.rate_limit_max),
        rate_limit_group_max: Number(form.rate_limit_group_max),
        rate_limit_window_minutes: Number(form.rate_limit_window_minutes),
      }),
    })
    setSaving(false)
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || 'Could not save')
      return
    }
    setMessage('Saved. The new rules apply from now on.')
  }

  if (!form) return <p className="text-sm text-brown-light">{error || 'Loading...'}</p>

  const card = 'bg-white rounded-2xl border border-beige p-4 md:p-5 flex flex-col gap-4'
  return (
    <div className="flex flex-col gap-5">
      <div className={card}>
        <div>
          <h2 className="text-lg font-semibold text-brown">What counts as Needs Attention</h2>
          <p className="text-sm text-brown-light">A feedback is flagged when any checked question is at or below the level, or when NPS is low.</p>
        </div>
        <div className="flex flex-wrap gap-5">
          <Field label="Flag ratings of" hint="stars or lower (1 to 4)" value={form.attention_rating_max} onChange={(v) => set('attention_rating_max', v)} />
          <Field label="Flag NPS of" hint="or lower (0 to 8)" value={form.attention_nps_max} onChange={(v) => set('attention_nps_max', v)} />
        </div>
        <label className="flex items-center gap-2 text-sm font-body text-brown">
          <input type="checkbox" checked={form.attention_nps_enabled} onChange={(e) => set('attention_nps_enabled', e.target.checked)} />
          Also flag a low NPS score
        </label>
        <div>
          <p className="text-sm font-semibold text-brown mb-2">Questions that can flag</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUESTIONS.map((q) => (
              <label key={q.key} className="flex items-center gap-2 text-sm font-body text-brown">
                <input type="checkbox" checked={form.attention_categories.includes(q.key)} onChange={() => toggleQuestion(q.key)} />
                {q.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className={card}>
        <div>
          <h2 className="text-lg font-semibold text-brown">Bill and spam limits</h2>
          <p className="text-sm text-brown-light">Limits how many responses one bill and one internet connection can send.</p>
        </div>
        <div className="flex flex-wrap gap-5">
          <Field label="Responses per bill" hint="most one bill can have" value={form.max_responses_per_bill} onChange={(v) => set('max_responses_per_bill', v)} />
          <Field label="Per connection" hint="guest forms, normal outlets" value={form.rate_limit_max} onChange={(v) => set('rate_limit_max', v)} />
          <Field label="Per connection, Eswara" hint="a whole room shares one" value={form.rate_limit_group_max} onChange={(v) => set('rate_limit_group_max', v)} />
          <Field label="Time window" hint="minutes for the two limits above" value={form.rate_limit_window_minutes} onChange={(v) => set('rate_limit_window_minutes', v)} />
        </div>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}
      <div className="flex flex-wrap gap-3">
        <button onClick={save} disabled={saving} className="bg-orange text-white rounded-lg px-5 py-2 text-sm font-medium disabled:opacity-50">
          {saving ? 'Saving...' : 'Save rules'}
        </button>
        <button onClick={() => defaults && setForm(defaults)} className="text-sm text-brown-light underline">
          Reset to the original values
        </button>
      </div>
    </div>
  )
}
