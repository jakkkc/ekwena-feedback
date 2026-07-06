'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/Logo'

const OUTLET_OPTIONS = [
  { value: 'ekwena_restaurant', label: 'Ekwena Restaurant' },
  { value: 'duma_bar', label: 'Duma Bar' },
  { value: 'eswara_conference_hall', label: 'Eswara Conference Hall' },
  { value: 'ekwena_gardens', label: 'Ekwena Gardens' },
]

type RosterGroup = { group: string; names: string[] }

export default function LoginPage() {
  const [phase, setPhase] = useState<'pin' | 'details'>('pin')
  const [pin, setPin] = useState('')
  const [outlet, setOutlet] = useState('')
  const [collectedBy, setCollectedBy] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [roster, setRoster] = useState<RosterGroup[]>([])
  const router = useRouter()

  useEffect(() => {
    fetch('/api/roster')
      .then((res) => res.json())
      .then((data) => setRoster(data.roster || []))
      .catch(() => setRoster([]))
  }, [])

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

  async function submitLogin(extra?: { outlet: string; collectedBy: string }) {
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, ...extra }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Login failed')
      setPin('')
      return
    }

    if (data.needsDetails) {
      setPhase('details')
      return
    }

    router.push(data.role === 'manager' ? '/dashboard' : '/waiter')
  }

  async function handlePinSubmit() {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }
    await submitLogin()
  }

  async function handleDetailsSubmit() {
    if (!outlet || !collectedBy) {
      setError('Please select both an outlet and your name')
      return
    }
    await submitLogin({ outlet, collectedBy })
  }

  if (phase === 'details') {
    return (
      <main className="min-h-dvh bg-beige-light flex flex-col items-center justify-center gap-6 p-4">
        <Logo size={90} />
        <div className="text-center">
          <h1 className="text-xl font-heading text-brown mb-1">One More Thing</h1>
          <p className="text-brown-light text-sm">Set up this device for your shift</p>
        </div>

        <div className="w-full max-w-xs flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-brown-light font-body">Which outlet is this?</label>
            <select
              value={outlet}
              onChange={(e) => setOutlet(e.target.value)}
              className="w-full rounded-full border border-beige px-4 py-3 text-base font-body text-brown bg-cream focus:outline-none focus:border-orange"
            >
              <option value="">Select outlet</option>
              {OUTLET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-brown-light font-body">Who is collecting feedback?</label>
            <select
              value={collectedBy}
              onChange={(e) => setCollectedBy(e.target.value)}
              className="w-full rounded-full border border-beige px-4 py-3 text-base font-body text-brown bg-cream focus:outline-none focus:border-orange"
            >
              <option value="">Select your name</option>
              {roster.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.names.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-700 text-center">{error}</p>}

          <button
            onClick={handleDetailsSubmit}
            disabled={loading}
            className="bg-orange text-cream px-6 py-3 rounded-full font-body font-semibold hover:bg-orange-light transition disabled:opacity-50"
          >
            {loading ? 'Starting shift...' : 'Start Collecting Feedback'}
          </button>
          <button
            onClick={() => { setPhase('pin'); setPin(''); setOutlet(''); setCollectedBy(''); setError('') }}
            className="text-xs text-brown-light underline font-body"
          >
            Back to PIN
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="h-dvh bg-beige-light flex flex-col items-center justify-center gap-3 p-4 overflow-y-auto">
      <Logo size={84} />

      <div className="text-center">
        <h1 className="text-xl font-heading text-brown mb-0.5">Staff Login</h1>
        <p className="text-brown-light text-xs">Enter your PIN</p>
      </div>

      <div className="flex gap-2.5">
        {Array.from({ length: Math.max(pin.length, 4) }).map((_, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 border-orange ${
              i < pin.length ? 'bg-orange' : 'bg-transparent'
            }`}
          />
        ))}
      </div>

      {error && <p className="text-xs text-red-700">{error}</p>}

      <div className="grid grid-cols-3 gap-2.5 w-full max-w-[15rem]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            onClick={() => handleDigit(digit)}
            disabled={loading}
            className="aspect-square rounded-full bg-cream border-2 border-beige text-brown text-xl font-heading hover:bg-beige active:bg-beige transition disabled:opacity-50"
          >
            {digit}
          </button>
        ))}
        <button
          onClick={handleClear}
          disabled={loading}
          className="aspect-square rounded-full text-brown-light text-xs font-body hover:bg-beige active:bg-beige transition disabled:opacity-50"
        >
          Clear
        </button>
        <button
          onClick={() => handleDigit('0')}
          disabled={loading}
          className="aspect-square rounded-full bg-cream border-2 border-beige text-brown text-xl font-heading hover:bg-beige active:bg-beige transition disabled:opacity-50"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          disabled={loading}
          className="aspect-square rounded-full text-brown-light text-xs font-body hover:bg-beige active:bg-beige transition disabled:opacity-50"
        >
          ⌫
        </button>
      </div>

      <button
        onClick={handlePinSubmit}
        disabled={loading || pin.length < 4}
        className="bg-orange text-cream px-8 py-2.5 rounded-full font-body font-semibold text-sm hover:bg-orange-light transition disabled:opacity-40 disabled:cursor-not-allowed mt-1"
      >
        {loading ? 'Checking...' : 'Log In'}
      </button>
    </main>
  )
}
