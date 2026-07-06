'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silent fail is fine - the app works perfectly without the service worker,
        // it just won't be installable as a PWA on that browser.
      })
    }
  }, [])

  return null
}
