'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  QUEUE_CHANGED_EVENT,
  flushQueue,
  getQueue,
  removeItem,
  updateItem,
  type QueuedItem,
} from '@/lib/offlineQueue'

export function OfflineQueueBar({ scope }: { scope: string }) {
  const [items, setItems] = useState<QueuedItem[]>([])
  const [sending, setSending] = useState(false)
  const [authNeeded, setAuthNeeded] = useState(false)
  const [fixes, setFixes] = useState<Record<string, string>>({})

  const refresh = useCallback(() => setItems(getQueue(scope)), [scope])

  const sendNow = useCallback(async () => {
    setSending(true)
    const r = await flushQueue(scope)
    setAuthNeeded(r.auth)
    setSending(false)
    refresh()
  }, [scope, refresh])

  useEffect(() => {
    refresh()
    sendNow()
    const onChange = () => refresh()
    const onOnline = () => sendNow()
    window.addEventListener(QUEUE_CHANGED_EVENT, onChange)
    window.addEventListener('online', onOnline)
    const timer = setInterval(sendNow, 30000)
    return () => {
      window.removeEventListener(QUEUE_CHANGED_EVENT, onChange)
      window.removeEventListener('online', onOnline)
      clearInterval(timer)
    }
  }, [refresh, sendNow])

  const pending = items.filter((i) => i.status === 'pending')
  const conflicts = items.filter((i) => i.status === 'conflict')

  if (items.length === 0) return null

  function fixAndResend(item: QueuedItem) {
    const bill = (fixes[item.id] ?? String(item.payload.bill_number ?? '')).replace(/\D/g, '')
    if (!bill) return
    updateItem(item.id, {
      payload: { ...item.payload, bill_number: bill },
      status: 'pending',
      error: undefined,
    })
    sendNow()
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-2">
      {pending.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-orange/10 border border-orange/40 rounded-2xl px-4 py-2">
          <p className="text-xs font-body text-brown">
            {authNeeded
              ? `${pending.length} waiting to send. Please log in again to send.`
              : `${pending.length} waiting to send. It will send when the connection is back.`}
          </p>
          <button
            onClick={sendNow}
            disabled={sending}
            className="shrink-0 bg-orange text-cream px-3 py-1 rounded-full text-xs font-body font-semibold hover:bg-orange-light transition disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send now'}
          </button>
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="flex flex-col gap-2 bg-red-50 border border-red-300 rounded-2xl px-4 py-3">
          <p className="text-xs font-body font-semibold text-red-800">
            Needs fixing ({conflicts.length})
          </p>
          {conflicts.map((item) => (
            <div key={item.id} className="flex flex-col gap-1.5 border-t border-red-200 pt-2">
              <p className="text-xs font-body text-red-800">{item.error}</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={20}
                  value={fixes[item.id] ?? String(item.payload.bill_number ?? '')}
                  onChange={(e) =>
                    setFixes((f) => ({ ...f, [item.id]: e.target.value.replace(/\D/g, '') }))
                  }
                  className="w-32 rounded-full border border-red-300 bg-white px-3 py-1 text-sm font-body text-brown focus:outline-none focus:border-orange"
                  aria-label="Correct bill number"
                />
                <button
                  onClick={() => fixAndResend(item)}
                  className="bg-orange text-cream px-3 py-1 rounded-full text-xs font-body font-semibold hover:bg-orange-light transition"
                >
                  Fix and resend
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Delete this feedback? This cannot be undone.')) removeItem(item.id)
                  }}
                  className="text-xs font-body text-red-800 underline"
                >
                  Discard
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
