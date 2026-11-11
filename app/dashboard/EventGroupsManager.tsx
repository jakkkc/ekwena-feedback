'use client'

import { useEffect, useState } from 'react'
import { Plus, Archive, RotateCcw, Trash2 } from 'lucide-react'

type EventGroup = { id: string; name: string; active: boolean }

export function EventGroupsManager() {
  const [groups, setGroups] = useState<EventGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const res = await fetch('/api/groups')
    if (res.ok) setGroups((await res.json()).groups || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function add() {
    if (!newName.trim()) {
      setError('Please enter a group name')
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    setSaving(false)
    if (!res.ok) {
      setError((await res.json()).error || 'Could not add group')
      return
    }
    setNewName('')
    load()
  }

  async function setActive(id: string, active: boolean) {
    const res = await fetch(`/api/groups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    })
    if (res.ok) load()
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete ${name} from the list? Feedback already given keeps its group name.`)) return
    const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' })
    if (res.ok) load()
  }

  const active = groups.filter((g) => g.active)
  const archived = groups.filter((g) => !g.active)

  return (
    <div className="bg-white rounded-2xl border border-beige p-5 mt-6">
      <h2 className="text-lg font-semibold text-brown">Eswara Event Groups</h2>
      <p className="text-sm text-brown-light mb-4">
        Guests at Eswara Conference Hall pick their group from this list. Archive a group when its event is over.
      </p>

      <div className="flex gap-2 mb-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="e.g. UNICEF"
          maxLength={100}
          className="flex-1 border border-beige rounded-lg px-3 py-2 text-brown bg-cream"
        />
        <button
          onClick={add}
          disabled={saving}
          className="flex items-center gap-1 bg-orange text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50"
        >
          <Plus size={16} /> Add
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      {loading ? (
        <p className="text-sm text-brown-light">Loading...</p>
      ) : (
        <>
          <ul className="divide-y divide-beige">
            {active.length === 0 && <li className="py-2 text-sm text-brown-light">No active groups yet.</li>}
            {active.map((g) => (
              <li key={g.id} className="flex items-center justify-between py-2 text-brown">
                <span>{g.name}</span>
                <button onClick={() => setActive(g.id, false)} className="flex items-center gap-1 text-sm text-brown-light hover:text-brown">
                  <Archive size={14} /> Archive
                </button>
              </li>
            ))}
          </ul>

          {archived.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-brown-light mt-4 mb-1">Archived</h3>
              <ul className="divide-y divide-beige">
                {archived.map((g) => (
                  <li key={g.id} className="flex items-center justify-between py-2 text-brown-light">
                    <span>{g.name}</span>
                    <span className="flex gap-3 text-sm">
                      <button onClick={() => setActive(g.id, true)} className="flex items-center gap-1 hover:text-brown">
                        <RotateCcw size={14} /> Restore
                      </button>
                      <button onClick={() => remove(g.id, g.name)} className="flex items-center gap-1 hover:text-red-600">
                        <Trash2 size={14} /> Delete
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}
