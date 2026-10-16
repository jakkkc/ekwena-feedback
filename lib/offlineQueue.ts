export type QueuedItem = {
  id: string
  scope: string
  payload: Record<string, unknown>
  createdAt: number
  status: 'pending' | 'conflict'
  error?: string
}

export type SendResult = { result: 'sent' | 'offline' | 'auth' | 'conflict'; error?: string }

const QUEUE_KEY = 'fb_offline_queue_v1'
const ROSTER_KEY = 'fb_roster_cache_v1'
const CHANGED_EVENT = 'fb-queue-changed'

function readAll(): QueuedItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(items: QueuedItem[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items))
  } catch {}
  try {
    window.dispatchEvent(new Event(CHANGED_EVENT))
  } catch {}
}

export const QUEUE_CHANGED_EVENT = CHANGED_EVENT

export function newSubmissionId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {}
  return 'sub-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12)
}

export function getQueue(scope: string): QueuedItem[] {
  return readAll().filter((i) => i.scope === scope)
}

export function hasQueuedBill(scope: string, bill: string) {
  return getQueue(scope).some((i) => String(i.payload.bill_number) === bill)
}

export function enqueue(id: string, scope: string, payload: Record<string, unknown>) {
  const items = readAll().filter((i) => i.id !== id)
  items.push({ id, scope, payload, createdAt: Date.now(), status: 'pending' })
  writeAll(items)
}

export function updateItem(id: string, patch: Partial<QueuedItem>) {
  writeAll(readAll().map((i) => (i.id === id ? { ...i, ...patch } : i)))
}

export function removeItem(id: string) {
  writeAll(readAll().filter((i) => i.id !== id))
}

export async function sendPayload(id: string, payload: Record<string, unknown>): Promise<SendResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, submission_id: id }),
      signal: controller.signal,
    })
    if (res.ok) return { result: 'sent' }
    if (res.status === 401) return { result: 'auth' }
    if (res.status >= 500) return { result: 'offline' }
    const data = await res.json().catch(() => ({}))
    return { result: 'conflict', error: data.error || 'This feedback could not be saved.' }
  } catch {
    return { result: 'offline' }
  } finally {
    clearTimeout(timer)
  }
}

// Try to send now. If the connection or login is the problem, keep it on the tablet.
export async function submitOrQueue(
  scope: string,
  payload: Record<string, unknown>
): Promise<{ result: 'sent' | 'queued' | 'conflict'; error?: string }> {
  const id = newSubmissionId()
  const sent = await sendPayload(id, payload)
  if (sent.result === 'sent') return { result: 'sent' }
  if (sent.result === 'conflict') return { result: 'conflict', error: sent.error }
  enqueue(id, scope, payload)
  return { result: 'queued' }
}

let flushing = false

export async function flushQueue(scope: string): Promise<{ sent: number; auth: boolean }> {
  if (flushing) return { sent: 0, auth: false }
  flushing = true
  let sent = 0
  let auth = false
  try {
    const pending = getQueue(scope)
      .filter((i) => i.status === 'pending')
      .sort((a, b) => a.createdAt - b.createdAt)
    for (const item of pending) {
      const r = await sendPayload(item.id, item.payload)
      if (r.result === 'sent') {
        removeItem(item.id)
        sent++
      } else if (r.result === 'conflict') {
        updateItem(item.id, { status: 'conflict', error: r.error })
      } else {
        if (r.result === 'auth') auth = true
        break
      }
    }
  } finally {
    flushing = false
  }
  return { sent, auth }
}

export function saveRosterCache(roster: unknown) {
  try {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(roster))
  } catch {}
}

export function loadRosterCache(): unknown[] {
  try {
    const raw = localStorage.getItem(ROSTER_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
