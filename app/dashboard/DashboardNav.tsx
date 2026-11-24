'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, RefreshCw } from 'lucide-react'
import { Logo } from '@/components/Logo'

export const DASHBOARD_REFRESH_EVENT = 'dashboard-refresh'

const LINKS = [
  { href: '/dashboard', label: 'Analytics', short: 'Analytics', badge: false },
  { href: '/dashboard/feedback', label: 'Feedback', short: 'Feedback', badge: true },
  { href: '/dashboard/qr', label: 'QR Codes', short: 'QR Codes', badge: false },
  { href: '/dashboard/settings', label: 'Settings', short: 'Settings', badge: false },
]

function isActive(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
}

export function DashboardNav() {
  const pathname = usePathname() || ''
  const router = useRouter()
  const [count, setCount] = useState<number | null>(null)
  const [updated, setUpdated] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const loadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/stats?branch=all&outlet=all')
      if (res.ok) {
        const data = await res.json()
        setCount(typeof data.needsAttentionCount === 'number' ? data.needsAttentionCount : null)
      }
    } catch {}
    setUpdated(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
  }, [])

  useEffect(() => {
    loadCount()
  }, [loadCount, pathname])

  async function refresh() {
    setRefreshing(true)
    window.dispatchEvent(new Event(DASHBOARD_REFRESH_EVENT))
    await loadCount()
    router.refresh()
    setRefreshing(false)
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-30 bg-cream shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between gap-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Logo size={36} />
            <span className="font-heading text-brown text-sm sm:text-base truncate">F&B Guest Feedback</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {updated && (
              <span className="hidden sm:inline text-xs text-brown-light font-body">Updated {updated}</span>
            )}
            <button
              onClick={refresh}
              disabled={refreshing}
              aria-label="Refresh data"
              className="flex items-center gap-1 text-sm text-brown-light hover:text-brown transition font-body disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1 text-sm text-brown-light hover:text-brown transition font-body whitespace-nowrap"
            >
              <LogOut size={15} /> Log Out
            </button>
          </div>
        </div>
        <nav className="grid grid-cols-4" aria-label="Management pages">
          {LINKS.map((l) => {
            const active = isActive(pathname, l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center justify-center gap-1 py-2.5 text-xs sm:text-sm font-body border-b-2 transition ${
                  active
                    ? 'border-orange text-brown font-semibold'
                    : 'border-transparent text-brown-light hover:text-brown'
                }`}
              >
                <span className="sm:hidden">{l.short}</span>
                <span className="hidden sm:inline">{l.label}</span>
                {l.badge && count != null && count > 0 && (
                  <span
                    aria-label={`${count} need attention`}
                    className="min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-semibold flex items-center justify-center"
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
        {updated && (
          <p className="sm:hidden text-[11px] text-brown-light font-body text-center pb-1">Updated {updated}</p>
        )}
      </div>
    </header>
  )
}
