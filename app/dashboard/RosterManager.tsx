'use client'

import { useEffect, useState } from 'react'
import { UserPlus, Trash2 } from 'lucide-react'

const ROLE_GROUPS = ['Manager', 'Supervisor', 'Hostess', 'Bartender', 'Waiters', 'Waitress']

type RosterMember = { id: string; name: string; role_group: string; active: boolean }

export function RosterManager() {
  const [members, setMembers] = useState<RosterMember[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newGroup, setNewGroup] = useState(ROLE_GROUPS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadRoster() {
    setLoading(true)
    const res = await fetch('/api/roster')
    if (res.ok) {
      const data = await res.json()
      setMembers(data.raw || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadRoster()
  }, [])

  async function handleAdd() {
    if (!newName.trim()) {
      setError('Please enter a name')
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch('/api/roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), roleGroup: newGroup }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to add staff member')
      return
    }
    setNewName('')
    loadRoster()
  }

  async function handleRemove(id: string, name: string) {
    if (!window.confirm(`Remove ${name} from the roster? Past feedback records won't be affected.`)) {
      return
    }
    const res = await fetch(`/api/roster/${id}`, { method: 'DELETE' })
    if (res.ok) loadRoster()
  }

  const grouped = ROLE_GROUPS.map((group) => ({
    group,
    members: members.filter((m) => m.role_group === group),
  })).filter((g) => g.members.length > 0)

  return (
    <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
      <h2 className="font-heading text-lg text-brown mb-4 flex items-center gap-2">
        <UserPlus size={18} /> Staff Roster
      </h2>
      <p className="text-xs text-brown-light font-body mb-4">
        Powers the &quot;Who Served You&quot; and &quot;Who is collecting feedback&quot; dropdowns.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <input
          type="text"
          placeholder="Full name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 rounded-full border border-beige px-4 py-2 text-sm font-body text-brown focus:outline-none focus:border-orange"
        />
        <select
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          className="rounded-full border border-beige px-4 py-2 text-sm font-body text-brown bg-cream focus:outline-none focus:border-orange"
        >
          {ROLE_GROUPS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={saving}
          className="bg-orange text-cream px-5 py-2 rounded-full font-body font-semibold text-sm hover:bg-orange-light transition disabled:opacity-50 whitespace-nowrap"
        >
          {saving ? 'Adding...' : 'Add Staff'}
        </button>
      </div>
      {error && <p className="text-sm text-red-700 font-body mb-3">{error}</p>}

      {loading ? (
        <p className="text-brown-light text-sm font-body">Loading roster...</p>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map((g) => (
            <div key={g.group}>
              <p className="text-xs font-semibold text-orange font-body mb-2 uppercase tracking-wide">{g.group}</p>
              <div className="flex flex-col gap-2">
                {g.members.map((m) => (
                  <div key={m.id} className="flex justify-between items-center border border-beige rounded-xl px-3 py-2">
                    <span className="font-body text-sm text-brown">{m.name}</span>
                    <button
                      onClick={() => handleRemove(m.id, m.name)}
                      className="flex items-center gap-1 text-xs text-brown-light hover:text-red-700 transition font-body"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {members.length === 0 && <p className="text-brown-light text-sm font-body">No staff in the roster yet.</p>}
        </div>
      )}
    </div>
  )
}
