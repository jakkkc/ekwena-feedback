'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/Logo'

export default function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function handleDigit(digit: string) {
    if (pin.length >= 6) return
    setPin(pin + digit)
    setError('')
  }

  function handleClear() {
    setPin('')
    setError('')
  }

  function handleBackspace() {
    setPin(pin.slice(0, -1))
    setError('')
  }

  async function handleSubmit() {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Login failed')
      setPin('')
      setLoading(false)
      return
    }

    router.push(data.role === 'manager' ? '/dashboard' : '/waiter')
  }

  return (
    <main className="min-h-screen bg-beige-light flex flex-col items-center justify-center gap-8 p-8">
      <Logo size={140} />

      <div className="text-center">
        <h1 className="text-2xl font-heading text-brown mb-1">Staff Login</h1>
        <p className="text-brown-light text-sm">Enter your PIN</p>
      </div>

      <div className="flex gap-3">
        {Array.from({ length: Math.max(pin.length, 4) }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 border-orange ${
              i < pin.length ? 'bg-orange' : 'bg-transparent'
            }`}
          />
        ))}
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            onClick={() => handleDigit(digit)}
            disabled={loading}
            className="aspect-square rounded-full bg-cream border-2 border-beige text-brown text-2xl font-heading hover:bg-beige transition disabled:opacity-50"
          >
            {digit}
          </button>
        ))}
        <button
          onClick={handleClear}
          disabled={loading}
          className="aspect-square rounded-full text-brown-light text-sm font-body hover:bg-beige transition disabled:opacity-50"
        >
          Clear
        </button>
        <button
          onClick={() => handleDigit('0')}
          disabled={loading}
          className="aspect-square rounded-full bg-cream border-2 border-beige text-brown text-2xl font-heading hover:bg-beige transition disabled:opacity-50"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          disabled={loading}
          className="aspect-square rounded-full text-brown-light text-sm font-body hover:bg-beige transition disabled:opacity-50"
        >
          ⌫
        </button>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || pin.length < 4}
        className="bg-orange text-cream px-10 py-3 rounded-full font-body font-semibold hover:bg-orange-light transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Checking...' : 'Log In'}
      </button>
    </main>
  )
}
