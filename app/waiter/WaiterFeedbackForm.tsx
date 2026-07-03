'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { Logo } from '@/components/Logo'

function StarRating({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="font-body font-semibold text-brown">{label}</span>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" onClick={() => onChange(star)}>
            <Star
              size={36}
              className={star <= value ? 'fill-orange text-orange' : 'text-beige'}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

export function WaiterFeedbackForm({
  staffName,
  branchName,
}: {
  staffName: string
  branchName: string
}) {
  const [step, setStep] = useState<'form' | 'thankyou'>('form')
  const [food, setFood] = useState(0)
  const [service, setService] = useState(0)
  const [ambiance, setAmbiance] = useState(0)
  const [comment, setComment] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  function resetForm() {
    setFood(0)
    setService(0)
    setAmbiance(0)
    setComment('')
    setGuestName('')
    setGuestPhone('')
    setError('')
    setStep('form')
  }

  async function handleSubmit() {
    if (food === 0 || service === 0 || ambiance === 0) {
      setError('Please rate all three categories')
      return
    }
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        food_rating: food,
        service_rating: service,
        ambiance_rating: ambiance,
        comment,
        guest_name: guestName,
        guest_phone: guestPhone,
      }),
    })

    setSubmitting(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Something went wrong. Please try again.')
      return
    }

    setStep('thankyou')
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (step === 'thankyou') {
    return (
      <main className="min-h-screen bg-beige-light flex flex-col items-center justify-center gap-6 p-8 text-center">
        <Logo size={120} />
        <h1 className="text-3xl font-heading text-brown">Thank You!</h1>
        <p className="text-brown-light max-w-sm">
          We appreciate your feedback and hope you enjoyed your time at Ekwena.
        </p>
        <button
          onClick={resetForm}
          className="bg-orange text-cream px-8 py-3 rounded-full font-body font-semibold hover:bg-orange-light transition"
        >
          Next Guest
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-beige-light flex flex-col items-center p-6 gap-8">
      <div className="w-full max-w-md flex justify-between items-center">
        <div className="text-xs text-brown-light font-body">
          <p>{staffName}</p>
          <p className="font-semibold text-brown">{branchName}</p>
        </div>
        <button onClick={handleLogout} className="text-xs text-brown-light underline font-body">
          Log Out
        </button>
      </div>

      <Logo size={100} />

      <div className="text-center">
        <h1 className="text-3xl font-heading text-brown">How was Ekwena?</h1>
        <p className="text-brown-light text-sm mt-1">We&apos;d love to hear about your experience</p>
      </div>

      <div className="w-full max-w-md flex flex-col gap-6 bg-cream rounded-3xl p-6 shadow-sm">
        <StarRating label="Food" value={food} onChange={setFood} />
        <StarRating label="Service" value={service} onChange={setService} />
        <StarRating label="Ambiance" value={ambiance} onChange={setAmbiance} />

        <textarea
          placeholder="Any comments? (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="w-full rounded-2xl border border-beige p-3 font-body text-brown placeholder:text-brown-light/60 focus:outline-none focus:border-orange resize-none"
        />

        <div className="flex flex-col gap-3">
          <p className="text-xs text-brown-light font-body">
            Optional — leave your details if you&apos;d like us to follow up
          </p>
          <input
            type="text"
            placeholder="Name (optional)"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full rounded-full border border-beige px-4 py-2 font-body text-brown placeholder:text-brown-light/60 focus:outline-none focus:border-orange"
          />
          <input
            type="tel"
            placeholder="Phone (optional)"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            className="w-full rounded-full border border-beige px-4 py-2 font-body text-brown placeholder:text-brown-light/60 focus:outline-none focus:border-orange"
          />
        </div>

        {error && <p className="text-sm text-red-700 text-center">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-orange text-cream px-6 py-3 rounded-full font-body font-semibold hover:bg-orange-light transition disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>
    </main>
  )
}
