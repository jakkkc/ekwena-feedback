'use client'

import { useCallback, useEffect, useState } from 'react'
import { KeyRound, UserPlus, UserX, UserCheck } from 'lucide-react'

type Member = {
  id: string
  name: string
  role: 'manager' | 'waiter'
  branch: string | null
  active: boolean
}

const BRANCHES: Record<string, string> = { cottages: 'Cottages', tuuti: 'Tuuti' }
const inputCls =
  'rounded-lg border border-beige px-3 py-2 text-sm font-body text-brown bg-cream focus:outline-none focus:border-orange'

export function LoginsManager() {
  const [staff, setStaff] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'waiter' | 'manager'>('waiter')
  const [branch, setBranch] = useState('cottages')
  const [pin, setPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [newPin, setNewPin] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/staff')
    if (res.ok) setStaff((await res.json()).staff || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function call(url: string, method: string, body: unknown) {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || 'Something went wrong')
      return false
    }
    setError('')
    return true
  }

  async function add() {
    setSaving(true)
    const ok = await call('/api/staff', 'POST', {
      name,
      role,
      branch: role === 'waiter' ? branch : null,
      pin,
    })
    setSaving(false)
    if (ok) {
      setName('')
      setPin('')
      load()
    }
  }

  async function savePin(id: string) {
    if (await call(`/api/staff/${id}/pin`, 'PATCH', { newPin })) {
      setEditId(null)
      setNewPin('')
    }
  }

  async function setActive(m: Member, active: boolean) {
    if (!active && !window.confirm(`Disable ${m.name}? They will not be able to log in. Feedback they collected is kept.`)) return
    if (await call(`/api/staff/${m.id}`, 'PATCH', { active })) load()
  }

  return (
    <div className="bg-white rounded-2xl border border-beige p-4 md:p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-brown">Logins</h2>
        <p className="text-sm text-brown-light">
          Add staff, change PINs, and switch accounts off when someone leaves. Every PIN must be different.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" maxLength={100} className={`${inputCls} col-span-2 sm:flex-1 sm:min-w-[10rem]`} />
        <select value={role} onChange={(e) => setRole(e.target.value as 'waiter' | 'manager')} className={inputCls}>
          <option value="waiter">Waiter</option>
          <option value="manager">Manager</option>
        </select>
        {role === 'waiter' && (
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className={inputCls}>
            <option value="cottages">Cottages</option>
            <option value="tuuti">Tuuti</option>
          </select>
        )}
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={6} placeholder="PIN (4-6 digits)" className={`${inputCls} w-36`} />
        <button onClick={add} disabled={saving} className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1 bg-orange text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
          <UserPlus size={16} /> Add
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="text-sm text-brown-light">Loading...</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {staff.map((m) => (
            <li key={m.id} className={`flex flex-wrap items-center justify-between gap-2 border border-beige rounded-xl p-3 ${m.active ? '' : 'opacity-60'}`}>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brown">
                  {m.name}
                  {!m.active && <span className="ml-2 text-xs font-normal text-red-700">Disabled</span>}
                </p>
                <p className="text-xs text-brown-light capitalize">
                  {m.role}
                  {m.branch ? ` - ${BRANCHES[m.branch] || m.branch}` : ''}
                </p>
              </div>
              {editId === m.id ? (
                <div className="flex items-center gap-2">
                  <input value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={6} placeholder="New PIN" className={`${inputCls} w-28 py-1`} />
                  <button onClick={() => savePin(m.id)} className="text-xs bg-orange text-white px-3 py-1.5 rounded-full font-semibold">Save</button>
                  <button onClick={() => { setEditId(null); setNewPin(''); setError('') }} className="text-xs text-brown-light">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-4 text-xs text-brown-light">
                  <button onClick={() => { setEditId(m.id); setNewPin(''); setError('') }} className="flex items-center gap-1 hover:text-orange">
                    <KeyRound size={14} /> Change PIN
                  </button>
                  {m.active ? (
                    <button onClick={() => setActive(m, false)} className="flex items-center gap-1 hover:text-red-700">
                      <UserX size={14} /> Disable
                    </button>
                  ) : (
                    <button onClick={() => setActive(m, true)} className="flex items-center gap-1 hover:text-green-700">
                      <UserCheck size={14} /> Enable
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
