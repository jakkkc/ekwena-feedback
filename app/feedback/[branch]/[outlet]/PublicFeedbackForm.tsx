'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { GOOGLE_REVIEW_LINKS, type Branch } from '@/lib/venues'

function StarRating({
  label,
  optional,
  value,
  onChange,
}: {
  label: string
  optional?: boolean
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-body text-brown text-sm">
        {label}
        {optional && <span className="text-brown-light font-normal"> (optional)</span>}
      </span>
      <div className="flex gap-1 shrink-0">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star} star${star > 1 ? 's' : ''} for ${label}`}
            onClick={() => onChange(star)}
          >
            <Star
              size={24}
              className={star <= value ? 'fill-orange text-orange' : 'text-beige'}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

const HOW_HEARD_OPTIONS: { value: string; label: string }[] = [
  { value: 'online', label: 'Online (Google, Instagram, Facebook)' },
  { value: 'referral', label: 'Referral (Friend or Family)' },
  { value: 'repeat_guest', label: 'Repeat Guest' },
  { value: 'other', label: 'Other' },
]

type RosterGroup = { group: string; names: string[] }

export function PublicFeedbackForm({
  branch,
  outlet,
  branchName,
  outletName,
}: {
  branch: Branch
  outlet: string
  branchName: string
  outletName: string
}) {
  const TOTAL_STEPS = 5
  const [phase, setPhase] = useState<'form' | 'thankyou'>('form')
  const [step, setStep] = useState(1)
  const [roster, setRoster] = useState<RosterGroup[]>([])

  const [billNumber, setBillNumber] = useState('')
  const [checkingBill, setCheckingBill] = useState(false)

  const [hostess, setHostess] = useState(0)
  const [beverage, setBeverage] = useState(0)
  const [foodQuality, setFoodQuality] = useState(0)
  const [menuVariety, setMenuVariety] = useState(0)
  const [service, setService] = useState(0)
  const [generalAmbiance, setGeneralAmbiance] = useState(0)
  const [ambianceCleanliness, setAmbianceCleanliness] = useState(0)

  const [nps, setNps] = useState<number | null>(null)
  const [howHeard, setHowHeard] = useState('')
  const [howHeardOther, setHowHeardOther] = useState('')

  const [servedBy, setServedBy] = useState<string[]>([])

  const [comment, setComment] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestContact, setGuestContact] = useState('')

  // Honeypot: hidden from real guests, bots tend to fill it in.
  const [website, setWebsite] = useState('')

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/roster')
      .then((res) => res.json())
      .then((data) => setRoster(data.roster || []))
      .catch(() => setRoster([]))
  }, [])

  function toggleServedBy(name: string) {
    setServedBy((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]))
  }

  async function goNext() {
    if (step === 1) {
      if (!/^\d{1,20}$/.test(billNumber)) {
        setError('Please enter the bill number from your receipt (numbers only)')
        return
      }
      setCheckingBill(true)
      setError('')
      try {
        const res = await fetch(`/api/public/check-bill?bill_number=${billNumber}`)
        const data = await res.json()
        setCheckingBill(false)
        if (!res.ok) {
          setError(data.error || 'Could not verify the bill number')
          return
        }
        if (!data.available) {
          setError('This bill number has already been used. Please check your receipt.')
          return
        }
      } catch {
        setCheckingBill(false)
        setError('Could not verify the bill number. Check your connection and try again.')
        return
      }
      setError('')
      setStep(2)
      return
    }

    if (step === 2 && (foodQuality === 0 || service === 0 || generalAmbiance === 0)) {
      setError('Please rate Food Quality, Quality of Service, and General Ambiance to continue')
      return
    }
    if (step === 3 && !howHeard) {
      setError('Please let us know how you heard about us')
      return
    }
    setError('')
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  function goBack() {
    setError('')
    setStep((s) => Math.max(s - 1, 1))
  }

  async function handleSubmit() {
    if (!howHeard) {
      setError('Please let us know how you heard about us')
      setStep(3)
      return
    }
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/public/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch,
          outlet,
          website,
          bill_number: billNumber,
          food_rating: foodQuality,
          service_rating: service,
          ambiance_rating: generalAmbiance,
          hostess_rating: hostess || undefined,
          cleanliness_rating: ambianceCleanliness || undefined,
          value_rating: menuVariety || undefined,
          wait_time_rating: beverage || undefined,
          nps_score: nps ?? undefined,
          how_heard: howHeard,
          how_heard_other: howHeardOther,
          served_by: servedBy.length > 0 ? servedBy.join(', ') : undefined,
          comment,
          guest_name: guestName,
          guest_phone: guestContact,
        }),
      })

      setSubmitting(false)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Something went wrong. Please try again.')
        if (res.status === 409) setStep(1)
        return
      }

      setPhase('thankyou')
    } catch {
      setSubmitting(false)
      setError('Could not send your feedback. Check your connection and try again.')
    }
  }

  if (phase === 'thankyou') {
    return (
      <main className="min-h-dvh bg-beige-light flex flex-col items-center justify-center gap-6 p-6 text-center">
        <Logo size={120} />
        <h1 className="text-3xl font-heading text-brown">Thank You!</h1>
        <p className="text-brown-light max-w-sm">
          We appreciate your feedback and hope you enjoyed your time at {outletName}.
        </p>

        <div className="w-full max-w-sm bg-cream rounded-3xl p-6 shadow-sm flex flex-col items-center gap-4">
          <p className="text-brown font-body text-sm">
            If you have a moment, we&apos;d be grateful if you shared your experience on Google. It
            helps other guests find us.
          </p>
          <a
            href={GOOGLE_REVIEW_LINKS[branch]}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-orange text-cream px-6 py-3 rounded-full font-body font-semibold hover:bg-orange-light transition inline-block"
          >
            Leave us a Google Review
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-beige-light flex flex-col items-center p-5 gap-5">
      <Logo size={80} />

      <div className="text-center">
        <h1 className="text-2xl font-heading text-brown">How was your visit?</h1>
        <p className="text-brown font-body text-xs font-semibold mt-1">
          {outletName} — {branchName}
        </p>
        <p className="text-brown-light text-xs mt-1">
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>

      <div className="w-full max-w-md h-1.5 bg-beige rounded-full overflow-hidden">
        <div className="h-full bg-orange transition-all" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
      </div>

      <div className="w-full max-w-md flex flex-col gap-5 bg-cream rounded-3xl p-6 shadow-sm">
        {/* Honeypot field: invisible to guests */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="absolute -left-[9999px] w-px h-px opacity-0"
        />

        {step === 1 && (
          <>
            <p className="text-center text-brown font-heading text-lg">Bill Number</p>
            <p className="text-center text-brown-light text-xs font-body -mt-3">
              You&apos;ll find it on your receipt
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={20}
              placeholder="e.g. 10234"
              value={billNumber}
              onChange={(e) => {
                setBillNumber(e.target.value.replace(/\D/g, ''))
                setError('')
              }}
              className="w-full text-center text-2xl rounded-2xl border border-beige px-4 py-4 font-heading text-brown placeholder:text-brown-light/40 focus:outline-none focus:border-orange tracking-widest"
            />
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-center text-brown font-heading text-lg">Hospitality & Quality</p>
            <StarRating label="Hostess Reception" optional value={hostess} onChange={setHostess} />
            <StarRating label="Beverage Quality" optional value={beverage} onChange={setBeverage} />
            <StarRating label="Food Quality & Options" value={foodQuality} onChange={setFoodQuality} />
            <StarRating label="Menu Variety & Options" optional value={menuVariety} onChange={setMenuVariety} />
            <StarRating label="Quality of Service" value={service} onChange={setService} />
            <StarRating label="General Ambiance" value={generalAmbiance} onChange={setGeneralAmbiance} />
            <StarRating
              label="Ambiance & Cleanliness"
              optional
              value={ambianceCleanliness}
              onChange={setAmbianceCleanliness}
            />
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex flex-col items-center gap-3">
              <span className="font-body font-semibold text-brown text-center">
                How likely are you to recommend us?{' '}
                <span className="text-brown-light font-normal text-xs">(optional)</span>
              </span>
              <div className="grid grid-cols-6 gap-2 w-full">
                {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNps(n)}
                    className={`aspect-square rounded-xl text-sm font-body font-semibold transition ${
                      nps === n ? 'bg-orange text-cream' : 'bg-beige-light text-brown-light hover:bg-beige'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between w-full text-[10px] text-brown-light font-body px-1">
                <span>Not likely</span>
                <span>Very likely</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-body font-semibold text-brown text-center">How did you hear about us?</span>
              <div className="flex flex-col gap-2">
                {HOW_HEARD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setHowHeard(opt.value)}
                    className={`text-left px-4 py-2.5 rounded-2xl border font-body text-sm transition ${
                      howHeard === opt.value
                        ? 'bg-orange text-cream border-orange'
                        : 'bg-beige-light text-brown border-beige hover:bg-beige'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {howHeard === 'other' && (
                <input
                  type="text"
                  maxLength={200}
                  placeholder="Please specify"
                  value={howHeardOther}
                  onChange={(e) => setHowHeardOther(e.target.value)}
                  className="w-full rounded-full border border-beige px-4 py-2 font-body text-brown placeholder:text-brown-light/60 focus:outline-none focus:border-orange"
                />
              )}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <p className="text-center text-brown font-heading text-lg">Who Served You?</p>
            <p className="text-center text-brown-light text-xs font-body -mt-3">
              Optional. Select everyone who helped (you can pick more than one)
            </p>
            <div className="flex flex-col gap-4 max-h-80 overflow-y-auto pr-1">
              {roster.map((group) => (
                <div key={group.group}>
                  <p className="text-xs font-semibold text-orange font-body mb-1.5 uppercase tracking-wide">
                    {group.group}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {group.names.map((name) => {
                      const checked = servedBy.includes(name)
                      return (
                        <button
                          key={name}
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          onClick={() => toggleServedBy(name)}
                          className={`flex items-center gap-2.5 text-left px-4 py-2.5 rounded-2xl border font-body text-sm transition ${
                            checked
                              ? 'bg-orange text-cream border-orange'
                              : 'bg-beige-light text-brown border-beige hover:bg-beige'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border-2 ${
                              checked ? 'bg-cream border-cream' : 'border-brown-light'
                            }`}
                          >
                            {checked && <span className="w-2 h-2 bg-orange rounded-sm" />}
                          </span>
                          {name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            {servedBy.length > 0 && (
              <p className="text-xs text-brown-light font-body text-center">Selected: {servedBy.join(', ')}</p>
            )}
          </>
        )}

        {step === 5 && (
          <>
            <p className="text-center text-brown font-heading text-lg">Final Thoughts</p>
            <textarea
              maxLength={2000}
              placeholder="What can we improve or keep doing? (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-beige p-3 font-body text-brown placeholder:text-brown-light/60 focus:outline-none focus:border-orange resize-none"
            />
            <div className="flex flex-col gap-3">
              <p className="text-xs text-brown-light font-body">
                Optional. Leave your details if you&apos;d like us to follow up
              </p>
              <input
                type="text"
                maxLength={100}
                placeholder="Name (optional)"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full rounded-full border border-beige px-4 py-2 font-body text-brown placeholder:text-brown-light/60 focus:outline-none focus:border-orange"
              />
              <input
                type="text"
                maxLength={100}
                placeholder="Phone or Email (optional)"
                value={guestContact}
                onChange={(e) => setGuestContact(e.target.value)}
                className="w-full rounded-full border border-beige px-4 py-2 font-body text-brown placeholder:text-brown-light/60 focus:outline-none focus:border-orange"
              />
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-700 text-center">{error}</p>}

        <div className="flex gap-3 mt-2">
          {step > 1 && (
            <button
              onClick={goBack}
              disabled={submitting || checkingBill}
              className="flex-1 bg-beige-light text-brown-light px-6 py-3 rounded-full font-body font-semibold hover:bg-beige transition disabled:opacity-50"
            >
              Back
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              onClick={goNext}
              disabled={checkingBill}
              className="flex-1 bg-orange text-cream px-6 py-3 rounded-full font-body font-semibold hover:bg-orange-light transition disabled:opacity-50"
            >
              {checkingBill ? 'Checking...' : 'Next'}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-orange text-cream px-6 py-3 rounded-full font-body font-semibold hover:bg-orange-light transition disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
