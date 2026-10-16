'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { ArrowLeft, FileDown, Copy, Check } from 'lucide-react'
import { Logo } from '@/components/Logo'
import {
  BRANCHES,
  OUTLETS,
  BRANCH_LABELS,
  OUTLET_LABELS,
  GOOGLE_REVIEW_LINKS,
  type Branch,
} from '@/lib/venues'

type Card = {
  id: string
  kind: 'feedback' | 'google'
  branch: Branch
  title: string
  subtitle: string
  caption: string
  url: string
  dataUrl: string
}

const QR_OPTIONS = { margin: 1, width: 600, color: { dark: '#3E2723', light: '#FFFFFF' } }

export function QrCodesClient() {
  const [cards, setCards] = useState<Card[]>([])
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const base = window.location.origin
    setOrigin(base)
    async function build() {
      const list: Card[] = []
      for (const branch of BRANCHES) {
        for (const outlet of OUTLETS) {
          const url = `${base}/feedback/${branch}/${outlet}`
          list.push({
            id: `${branch}-${outlet}`,
            kind: 'feedback',
            branch,
            title: OUTLET_LABELS[outlet],
            subtitle: BRANCH_LABELS[branch],
            caption: 'Scan to share your experience',
            url,
            dataUrl: await QRCode.toDataURL(url, QR_OPTIONS),
          })
        }
      }
      for (const branch of BRANCHES) {
        const url = GOOGLE_REVIEW_LINKS[branch]
        list.push({
          id: `google-${branch}`,
          kind: 'google',
          branch,
          title: 'Google Review',
          subtitle: BRANCH_LABELS[branch],
          caption: 'Scan to leave us a Google review',
          url,
          dataUrl: await QRCode.toDataURL(url, QR_OPTIONS),
        })
      }
      setCards(list)
    }
    build().catch(() => setError('Could not generate the QR codes.'))
  }, [])

  async function copyLink(card: Card) {
    try {
      await navigator.clipboard.writeText(card.url)
      setCopied(card.id)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      setError('Could not copy the link.')
    }
  }

  async function loadLogo(): Promise<string | null> {
    try {
      const res = await fetch('/logo.png')
      const blob = await res.blob()
      return await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }

  async function downloadPdf() {
    setGenerating(true)
    setError('')
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a5' })
      const logo = await loadLogo()
      const W = doc.internal.pageSize.getWidth()
      const H = doc.internal.pageSize.getHeight()

      cards.forEach((card, i) => {
        if (i > 0) doc.addPage()
        doc.setFillColor(255, 255, 255)
        doc.rect(0, 0, W, H, 'F')
        doc.setDrawColor(191, 107, 52)
        doc.setLineWidth(0.8)
        doc.roundedRect(8, 8, W - 16, H - 16, 4, 4, 'S')

        if (logo) {
          try {
            doc.addImage(logo, 'PNG', W / 2 - 15, 16, 30, 30)
          } catch {}
        }

        doc.setTextColor(62, 39, 35)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(20)
        doc.text(card.title, W / 2, 58, { align: 'center' })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(12)
        doc.setTextColor(93, 64, 55)
        doc.text(card.subtitle, W / 2, 66, { align: 'center' })

        const size = 85
        doc.addImage(card.dataUrl, 'PNG', W / 2 - size / 2, 76, size, size)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.setTextColor(191, 107, 52)
        doc.text(card.caption, W / 2, 175, { align: 'center' })
      })

      doc.save('F&B-Guest-QR-Codes.pdf')
    } catch {
      setError('Could not create the PDF. Please try again.')
    }
    setGenerating(false)
  }

  function renderCard(card: Card) {
    return (
      <div
        key={card.id}
        className="bg-cream rounded-3xl p-5 shadow-sm flex flex-col items-center gap-3 text-center"
      >
        <Logo size={44} />
        <div>
          <p className="font-heading text-brown text-lg leading-tight">{card.title}</p>
          <p className="font-body text-brown-light text-xs mt-0.5">{card.subtitle}</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.dataUrl}
          alt={`QR code for ${card.title}, ${card.subtitle}`}
          className="w-44 h-44 rounded-xl bg-white"
        />
        <p className="font-body text-orange text-sm font-semibold">{card.caption}</p>
        <button
          onClick={() => copyLink(card)}
          className="flex items-center gap-1.5 text-xs font-body text-brown-light hover:text-brown transition"
        >
          {copied === card.id ? <Check size={14} /> : <Copy size={14} />}
          {copied === card.id ? 'Copied' : 'Copy link'}
        </button>
      </div>
    )
  }

  const feedbackCards = cards.filter((c) => c.kind === 'feedback')
  const googleCards = cards.filter((c) => c.kind === 'google')

  return (
    <main className="min-h-dvh bg-beige-light p-5 md:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-body text-brown-light hover:text-brown transition"
          >
            <ArrowLeft size={16} /> Back to dashboard
          </a>
          <button
            onClick={downloadPdf}
            disabled={generating || cards.length === 0}
            className="ml-auto flex items-center gap-1.5 bg-brown text-cream px-4 py-2 rounded-full font-body text-sm font-semibold hover:bg-brown-light transition disabled:opacity-50"
          >
            <FileDown size={16} /> {generating ? 'Creating PDF...' : 'Download PDF'}
          </button>
        </div>

        <div>
          <h1 className="font-heading text-brown text-3xl">QR Codes</h1>
          <p className="font-body text-brown-light text-sm mt-1">
            Print these and place them at each outlet. Guests scan with their own phone, no PIN needed.
          </p>
          {origin && (
            <p className="font-body text-brown-light text-xs mt-2">
              These codes point to <span className="font-semibold">{origin}</span>. If you ever change
              your website address, download them again and reprint.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-700 font-body">{error}</p>}
        {cards.length === 0 && !error && (
          <p className="font-body text-brown-light">Generating QR codes...</p>
        )}

        {BRANCHES.map((branch) => (
          <section key={branch} className="flex flex-col gap-3">
            <h2 className="font-heading text-brown text-xl">{BRANCH_LABELS[branch]}: Feedback</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {feedbackCards.filter((c) => c.branch === branch).map(renderCard)}
            </div>
          </section>
        ))}

        {googleCards.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-heading text-brown text-xl">Direct Google Review</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {googleCards.map(renderCard)}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
