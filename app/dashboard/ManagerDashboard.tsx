'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts'
import {
  Star, MessageSquare, Users2, TrendingUp, LogOut, KeyRound, ThumbsUp,
  Compass, Award, AlertTriangle, Download, Activity, Smile, FileDown, Sparkles,
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { RosterManager } from './RosterManager'

const BRANCH_NAMES: Record<string, string> = {
  cottages: 'Cottages',
  tuuti: 'Tuuti',
}

const OUTLET_NAMES: Record<string, string> = {
  ekwena_restaurant: 'Ekwena Restaurant',
  duma_bar: 'Duma Bar',
  eswara_conference_hall: 'Eswara Conference Hall',
  ekwena_gardens: 'Ekwena Gardens',
}

function npsLabel(score: number | null): string {
  if (score == null) return ''
  if (score >= 70) return 'Excellent'
  if (score >= 30) return 'Great'
  if (score >= 0) return 'Good'
  return 'Needs Improvement'
}

type Stats = {
  grandAverageOverall: { avg: number; count: number }
  grandAverageByBranch: { branch: string; avg: number; count: number }[]
  grandAverageByOutlet: { outlet: string; avg: number; count: number }[]
  totalCount: number
  avgOverall: number
  avgHostess: number
  avgBeverage: number
  avgFoodQuality: number
  avgMenuVariety: number
  avgService: number
  avgGeneralAmbiance: number
  avgAmbianceCleanliness: number
  lowestCategory: { label: string; value: number } | null
  branchComparison: { branch: string; avgFood: number; avgService: number; avgAmbiance: number; count: number }[]
  outletComparison: { outlet: string; avgFood: number; avgService: number; avgAmbiance: number; count: number }[]
  trend: { date: string; avgOverall: number | null; count: number }[]
  recentComments: {
    id: string; branch: string; outlet: string | null; guestName: string | null; comment: string
    foodRating: number; serviceRating: number; ambianceRating: number; servedBy: string | null; createdAt: string
  }[]
  csat: { percent: number | null; satisfiedCount: number; totalRatings: number }
  npsTrend: { date: string; score: number | null; responses: number }[]
  nps: { score: number | null; promoters: number; passives: number; detractors: number; responses: number }
  howHeard: { label: string; count: number }[]
  staffLeaderboard: { name: string; avgOverall: number; count: number }[]
  collectionVolume: { name: string; count: number }[]
  bestFeedback: {
    id: string; branch: string; outlet: string | null; foodRating: number; serviceRating: number
    ambianceRating: number; hostessRating: number | null; cleanlinessRating: number | null
    valueRating: number | null; waitTimeRating: number | null; npsScore: number | null
    comment: string | null; servedBy: string | null
    collectedBy: string | null; guestName: string | null; guestPhone: string | null; createdAt: string
  }[]
  needsAttention: {
    id: string; branch: string; outlet: string | null; foodRating: number; serviceRating: number
    ambianceRating: number; hostessRating: number | null; cleanlinessRating: number | null
    valueRating: number | null; waitTimeRating: number | null; npsScore: number | null
    comment: string | null; servedBy: string | null
    collectedBy: string | null; guestName: string | null; guestPhone: string | null; createdAt: string
  }[]
  guestList: { name: string | null; phone: string | null; branch: string; outlet: string | null; createdAt: string; isRepeat: boolean }[]
  repeatGuestCount: number
}

type StaffMember = { id: string; name: string; role: 'manager' | 'waiter'; branch: string | null }

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-cream rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
      <div className="text-orange">{icon}</div>
      <p className="text-2xl font-heading text-brown">{value}</p>
      <p className="text-xs text-brown-light font-body">{label}</p>
    </div>
  )
}

function downloadCSV(rows: Stats['guestList']) {
  const header = ['Name', 'Phone/Email', 'Branch', 'Outlet', 'Date', 'Repeat Guest']
  const csvRows = [header.join(',')]
  rows.forEach((r) => {
    const line = [
      r.name || '',
      r.phone || '',
      BRANCH_NAMES[r.branch] || r.branch,
      r.outlet ? OUTLET_NAMES[r.outlet] || r.outlet : '',
      new Date(r.createdAt).toLocaleDateString(),
      r.isRepeat ? 'Yes' : 'No',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
    csvRows.push(line)
  })
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ekwena-guest-contacts.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function ManagerDashboard({ managerName }: { managerName: string }) {
  const [branchFilter, setBranchFilter] = useState<'all' | 'cottages' | 'tuuti'>('all')
  const [outletFilter, setOutletFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null)
  const [newPin, setNewPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSaving, setPinSaving] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const router = useRouter()

  const branchComparisonRef = useRef<HTMLDivElement>(null)
  const outletComparisonRef = useRef<HTMLDivElement>(null)
  const ratingTrendRef = useRef<HTMLDivElement>(null)
  const feedbackVolumeRef = useRef<HTMLDivElement>(null)
  const npsBreakdownRef = useRef<HTMLDivElement>(null)
  const npsTrendRef = useRef<HTMLDivElement>(null)
  const howHeardRef = useRef<HTMLDivElement>(null)

  const loadStats = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ branch: branchFilter, outlet: outletFilter })
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    const res = await fetch(`/api/dashboard/stats?${params.toString()}`)
    if (res.ok) setStats(await res.json())
    setLoading(false)
  }, [branchFilter, outletFilter, startDate, endDate])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    fetch('/api/staff')
      .then((res) => res.json())
      .then((data) => setStaff(data.staff || []))
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  async function handleSavePin() {
    if (!editingStaffId) return
    if (!/^\d{4,6}$/.test(newPin)) {
      setPinError('PIN must be 4-6 digits')
      return
    }
    setPinSaving(true)
    setPinError('')
    const res = await fetch(`/api/staff/${editingStaffId}/pin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPin }),
    })
    setPinSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setPinError(data.error || 'Failed to update PIN')
      return
    }
    setEditingStaffId(null)
    setNewPin('')
  }

  async function handleDownloadReport() {
    if (!stats) return
    setGeneratingReport(true)
    try {
      const { default: JsPDF } = await import('jspdf')
      const html2canvas = (await import('html2canvas')).default
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new JsPDF({ unit: 'pt', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 44
      const contentWidth = pageWidth - margin * 2
      let y = margin

      const BROWN = '#3E2723'
      const BROWN_LIGHT = '#5D4037'
      const ORANGE = '#BF6B34'
      const ORANGE_LIGHT = '#D68A52'
      const BEIGE = '#F3E5D3'
      const BEIGE_LIGHT = '#FAF3E9'
      const CREAM = '#FFFDF9'
      const CAPTION = '#8a7266'

      let logoDataUrl: string | null = null
      try {
        const logoRes = await fetch('/logo.png')
        const logoBlob = await logoRes.blob()
        logoDataUrl = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(logoBlob)
        })
      } catch {
        // Logo is optional
      }

      function ensureSpace(height: number) {
        if (y + height > pageHeight - margin - 20) {
          doc.addPage()
          y = margin
        }
      }

      function addSectionHeader(text: string) {
        ensureSpace(30)
        doc.setFillColor(ORANGE)
        doc.roundedRect(margin, y - 12, 4, 16, 1, 1, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(13)
        doc.setTextColor(BROWN)
        doc.text(text, margin + 12, y)
        y += 20
      }

      function addLine(text: string, opts?: { bold?: boolean; italic?: boolean; size?: number; color?: string }) {
        ensureSpace(16)
        doc.setFont('helvetica', opts?.italic ? 'italic' : opts?.bold ? 'bold' : 'normal')
        doc.setFontSize(opts?.size || 10)
        doc.setTextColor(opts?.color || BROWN_LIGHT)
        const lines = doc.splitTextToSize(text, contentWidth)
        doc.text(lines, margin, y)
        y += lines.length * (opts?.size ? opts.size * 1.35 : 14)
      }

      function addStatCards(cards: { label: string; value: string }[]) {
        const gap = 8
        const cardWidth = (contentWidth - gap * (cards.length - 1)) / cards.length
        const cardHeight = 54
        ensureSpace(cardHeight + 14)
        cards.forEach((c, i) => {
          const x = margin + i * (cardWidth + gap)
          doc.setFillColor(CREAM)
          doc.setDrawColor(BEIGE)
          doc.roundedRect(x, y, cardWidth, cardHeight, 6, 6, 'FD')
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(15)
          doc.setTextColor(BROWN)
          doc.text(c.value, x + cardWidth / 2, y + 26, { align: 'center' })
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7.5)
          doc.setTextColor(CAPTION)
          const labelLines = doc.splitTextToSize(c.label, cardWidth - 10)
          doc.text(labelLines, x + cardWidth / 2, y + 40, { align: 'center' })
        })
        y += cardHeight + 16
      }

      function addAlertBox(text: string) {
        ensureSpace(40)
        const lines = doc.splitTextToSize(text, contentWidth - 20)
        const boxHeight = lines.length * 13 + 16
        doc.setFillColor('#FDF0E4')
        doc.setDrawColor(ORANGE)
        doc.roundedRect(margin, y, contentWidth, boxHeight, 6, 6, 'FD')
        doc.setFillColor(ORANGE)
        doc.roundedRect(margin + 10, y + 10, 4, boxHeight - 20, 1, 1, 'F')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9.5)
        doc.setTextColor(BROWN)
        doc.text(lines, margin + 22, y + 18)
        y += boxHeight + 16
      }

      function addNpsBreakdownVisual() {
        const total = stats!.nps.promoters + stats!.nps.passives + stats!.nps.detractors
        const boxHeight = total > 0 ? 100 : 60
        ensureSpace(boxHeight + 16)
        doc.setFillColor(CREAM)
        doc.setDrawColor(BEIGE)
        doc.roundedRect(margin, y, contentWidth, boxHeight, 6, 6, 'FD')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(BROWN)
        doc.text('NPS Breakdown', margin + 14, y + 20)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(CAPTION)
        doc.text(
          stats!.nps.responses > 0
            ? `Score: ${stats!.nps.score} (${npsLabel(stats!.nps.score)}) from ${stats!.nps.responses} responses`
            : 'No NPS responses yet',
          margin + 14,
          y + 34
        )

        if (total > 0) {
          const barX = margin + 14
          const barY = y + 46
          const barWidth = contentWidth - 28
          const barHeight = 16
          const promoWidth = (stats!.nps.promoters / total) * barWidth
          const passWidth = (stats!.nps.passives / total) * barWidth
          const detrWidth = (stats!.nps.detractors / total) * barWidth

          doc.setFillColor(ORANGE)
          doc.rect(barX, barY, promoWidth, barHeight, 'F')
          doc.setFillColor(ORANGE_LIGHT)
          doc.rect(barX + promoWidth, barY, passWidth, barHeight, 'F')
          doc.setFillColor(BROWN)
          doc.rect(barX + promoWidth + passWidth, barY, detrWidth, barHeight, 'F')

          const legendY = barY + barHeight + 20
          const legendItems = [
            { label: `Promoters (9-10): ${stats!.nps.promoters}`, color: ORANGE },
            { label: `Passives (7-8): ${stats!.nps.passives}`, color: ORANGE_LIGHT },
            { label: `Detractors (0-6): ${stats!.nps.detractors}`, color: BROWN },
          ]
          let lx = barX
          doc.setFontSize(8.5)
          legendItems.forEach((item) => {
            doc.setFillColor(item.color)
            doc.rect(lx, legendY - 8, 8, 8, 'F')
            doc.setTextColor(BROWN_LIGHT)
            doc.text(item.label, lx + 12, legendY)
            lx += doc.getTextWidth(item.label) + 34
          })
        }

        y += boxHeight + 16
      }

      function addEntryCard(blocks: { text: string; bold?: boolean; italic?: boolean; size?: number; color?: string }[]) {
        const size = 9
        doc.setFontSize(size)
        const wrapped = blocks.map((b) => doc.splitTextToSize(b.text, contentWidth - 20))
        const totalLines = wrapped.reduce((sum, l) => sum + l.length, 0)
        const cardHeight = totalLines * 12 + 16
        ensureSpace(cardHeight + 8)
        doc.setFillColor(BEIGE_LIGHT)
        doc.setDrawColor(BEIGE)
        doc.roundedRect(margin, y, contentWidth, cardHeight, 5, 5, 'FD')
        let cy = y + 14
        blocks.forEach((b, i) => {
          doc.setFont('helvetica', b.italic ? 'italic' : b.bold ? 'bold' : 'normal')
          doc.setFontSize(b.size || size)
          doc.setTextColor(b.color || BROWN_LIGHT)
          doc.text(wrapped[i], margin + 10, cy)
          cy += wrapped[i].length * 12
        })
        y += cardHeight + 8
      }

      function drawPageChrome(pageNum: number, pageCount: number) {
        doc.setDrawColor(BEIGE)
        doc.setLineWidth(0.5)
        doc.line(margin, margin - 20, pageWidth - margin, margin - 20)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(ORANGE)
        doc.text('EKWENA FEEDBACK REPORT', margin, margin - 26)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(CAPTION)
        doc.text(`Page ${pageNum} of ${pageCount}`, pageWidth - margin, pageHeight - 24, { align: 'right' })
      }

      // === COVER PAGE ===
      doc.setFillColor(BEIGE)
      doc.rect(0, 0, pageWidth, pageHeight, 'F')
      doc.setFillColor(BROWN)
      doc.rect(0, 0, pageWidth, 10, 'F')
      doc.setFillColor(ORANGE)
      doc.rect(0, pageHeight - 10, pageWidth, 10, 'F')

      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', pageWidth / 2 - 75, 110, 150, 75)
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(24)
      doc.setTextColor(BROWN)
      doc.text('Ekwena Feedback Report', pageWidth / 2, 232, { align: 'center' })

      doc.setDrawColor(ORANGE)
      doc.setLineWidth(1.5)
      doc.line(pageWidth / 2 - 40, 244, pageWidth / 2 + 40, 244)

      const scopeLine = `${branchFilter === 'all' ? 'All Branches' : BRANCH_NAMES[branchFilter]}  ·  ${
        outletFilter === 'all' ? 'All Outlets' : OUTLET_NAMES[outletFilter]
      }`
      const dateLine =
        startDate || endDate ? `${startDate || 'Start'} → ${endDate || 'Now'}` : 'All-time (no date filter)'

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(12)
      doc.setTextColor(BROWN_LIGHT)
      doc.text(scopeLine, pageWidth / 2, 268, { align: 'center' })
      doc.setFontSize(10)
      doc.setTextColor(CAPTION)
      doc.text(dateLine, pageWidth / 2, 286, { align: 'center' })

      doc.setFillColor(CREAM)
      doc.roundedRect(pageWidth / 2 - 100, 320, 200, 60, 8, 8, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(20)
      doc.setTextColor(ORANGE)
      doc.text(`${stats.avgOverall || '-'} / 5`, pageWidth / 2, 350, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(CAPTION)
      doc.text('OVERALL RATING THIS PERIOD', pageWidth / 2, 366, { align: 'center' })

      doc.setFontSize(9)
      doc.setTextColor(CAPTION)
      doc.text(`Generated ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 40, { align: 'center' })

      doc.addPage()
      y = margin

      // === EXECUTIVE SUMMARY ===
      addSectionHeader('Executive Summary')
      addStatCards([
        { label: 'Total Feedback', value: String(stats.totalCount) },
        { label: 'Overall Avg', value: `${stats.avgOverall || '-'}/5` },
        { label: `NPS (${stats.nps.responses})`, value: String(stats.nps.score ?? '-') },
        { label: `CSAT (${stats.csat.totalRatings})`, value: stats.csat.percent != null ? `${stats.csat.percent}%` : '-' },
        { label: 'Repeat Guests', value: String(stats.repeatGuestCount) },
      ])
      if (stats.lowestCategory) {
        addAlertBox(
          `Lowest-scoring area: ${stats.lowestCategory.label} at ${stats.lowestCategory.value}/5 — worth prioritizing this period.`
        )
      }

      // === ALL-TIME OVERALL EXPERIENCE ===
      ensureSpace(120)
      addSectionHeader('All-Time Overall Experience (Unfiltered)')
      addLine('Combines all 7 rating categories across every submission ever received, regardless of the filters above.', {
        size: 8.5,
        italic: true,
        color: CAPTION,
      })
      y += 4
      const bigCardHeight = 70
      ensureSpace(bigCardHeight + 10)
      doc.setFillColor(BROWN)
      doc.roundedRect(margin, y, contentWidth, bigCardHeight, 8, 8, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(24)
      doc.setTextColor(CREAM)
      doc.text(`${stats.grandAverageOverall.avg || '-'}`, margin + 20, y + 42)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(BEIGE)
      doc.text(`/ 5  ·  ${stats.grandAverageOverall.count} reviews all-time`, margin + 20, y + 58)

      let bx = margin + 170
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(ORANGE_LIGHT)
      doc.text('BY BRANCH', bx, y + 20)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(CREAM)
      let by = y + 34
      stats.grandAverageByBranch.forEach((b) => {
        doc.text(`${BRANCH_NAMES[b.branch] || b.branch}: ${b.avg || '-'}/5 (${b.count})`, bx, by)
        by += 13
      })

      bx = margin + 350
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(ORANGE_LIGHT)
      doc.text('BY OUTLET', bx, y + 20)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(CREAM)
      by = y + 34
      if (stats.grandAverageByOutlet.length === 0) {
        doc.text('No outlet data yet.', bx, by)
      } else {
        stats.grandAverageByOutlet.forEach((o) => {
          doc.text(`${OUTLET_NAMES[o.outlet] || o.outlet}: ${o.avg || '-'}/5`, bx, by)
          by += 13
        })
      }
      y += bigCardHeight + 20

      // === CHARTS ===
      doc.addPage()
      y = margin
      addSectionHeader('Visual Breakdown')

      async function addChart(ref: React.RefObject<HTMLDivElement | null>, caption: string) {
        if (!ref.current) return
        try {
          const canvas = await html2canvas(ref.current, {
            backgroundColor: '#FAF3E9',
            scale: 2,
            onclone: (clonedDoc) => {
              // html2canvas can't parse modern CSS color functions (e.g. oklch),
              // which some Tailwind v4 defaults use elsewhere on the page even
              // though our own components use plain hex. Strip any stylesheet
              // rules using unsupported color functions from the cloned document
              // used for rendering, so they can't interfere with this capture.
              const styleSheets = Array.from(clonedDoc.styleSheets)
              styleSheets.forEach((sheet) => {
                try {
                  const rules = sheet.cssRules
                  for (let i = rules.length - 1; i >= 0; i--) {
                    const ruleText = rules[i].cssText || ''
                    if (ruleText.includes('oklch') || ruleText.includes('lab(') || ruleText.includes('lch(')) {
                      sheet.deleteRule(i)
                    }
                  }
                } catch {
                  // Cross-origin or inaccessible stylesheet - skip it
                }
              })
            },
          })
          const imgData = canvas.toDataURL('image/png')
          const imgWidth = contentWidth
          const imgHeight = (canvas.height / canvas.width) * imgWidth
          ensureSpace(imgHeight + 34)
          doc.setFillColor(CREAM)
          doc.setDrawColor(BEIGE)
          doc.roundedRect(margin, y, imgWidth, imgHeight + 6, 6, 6, 'FD')
          doc.addImage(imgData, 'PNG', margin + 3, y + 3, imgWidth - 6, imgHeight)
          y += imgHeight + 10
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(8.5)
          doc.setTextColor(CAPTION)
          const capLines = doc.splitTextToSize(caption, contentWidth)
          doc.text(capLines, margin, y)
          y += capLines.length * 11 + 12
        } catch (chartErr) {
          console.error('Chart capture failed for:', caption, chartErr)
          ensureSpace(40)
          doc.setFillColor(BEIGE_LIGHT)
          doc.setDrawColor(BEIGE)
          doc.roundedRect(margin, y, contentWidth, 30, 6, 6, 'FD')
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(8.5)
          doc.setTextColor(CAPTION)
          doc.text('(Chart could not be captured - see live dashboard)', margin + 10, y + 18)
          y += 40
        }
      }

      await addChart(branchComparisonRef, 'Branch Comparison — average Food Quality, Service, and Ambiance side by side.')
      await addChart(outletComparisonRef, 'Outlet Comparison — the same three core ratings, broken out by outlet.')
      await addChart(ratingTrendRef, 'Rating Trend — average overall rating per day across the selected period.')
      await addChart(feedbackVolumeRef, 'Feedback Volume — number of submissions received per day.')
      addNpsBreakdownVisual()
      await addChart(npsTrendRef, 'NPS Trend — Net Promoter Score over time.')
      await addChart(howHeardRef, 'How guests report hearing about Ekwena.')

      // === STAFF LEADERBOARD ===
      doc.addPage()
      y = margin
      addSectionHeader('Staff Leaderboard (Who Served You)')
      if (stats.staffLeaderboard.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Rank', 'Staff', 'Avg Rating', 'Reviews']],
          body: stats.staffLeaderboard.map((s, i) => [`#${i + 1}`, s.name, `${s.avgOverall}★`, s.count]),
          margin: { left: margin, right: margin },
          theme: 'striped',
          styles: { font: 'helvetica', fontSize: 9, textColor: BROWN, cellPadding: 6 },
          headStyles: { fillColor: BROWN, textColor: CREAM, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: BEIGE_LIGHT },
        })
        // @ts-expect-error - lastAutoTable is added to the doc instance by the plugin at runtime
        y = doc.lastAutoTable.finalY + 24
      } else {
        addLine('No "Who Served You" data yet.', { italic: true, color: CAPTION })
        y += 10
      }

      // === DATA COLLECTION VOLUME ===
      ensureSpace(60)
      addSectionHeader('Data Collection Volume')
      if (stats.collectionVolume.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Staff', 'Submissions Collected']],
          body: stats.collectionVolume.map((c) => [c.name, c.count]),
          margin: { left: margin, right: margin },
          theme: 'striped',
          styles: { font: 'helvetica', fontSize: 9, textColor: BROWN, cellPadding: 6 },
          headStyles: { fillColor: ORANGE, textColor: CREAM, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: BEIGE_LIGHT },
        })
        // @ts-expect-error - lastAutoTable is added to the doc instance by the plugin at runtime
        y = doc.lastAutoTable.finalY + 20
      } else {
        addLine('No collection data yet.', { italic: true, color: CAPTION })
      }

      // === BEST FEEDBACK ===
      doc.addPage()
      y = margin
      addSectionHeader(`Best Feedback (${stats.bestFeedback.length} standout reviews)`)
      if (stats.bestFeedback.length === 0) {
        addLine('No standout 4-5 star reviews yet.', { italic: true, color: CAPTION })
      } else {
        stats.bestFeedback.slice(0, 15).forEach((n) => {
          const blocks: { text: string; bold?: boolean; italic?: boolean; size?: number; color?: string }[] = [
            {
              text: `${BRANCH_NAMES[n.branch] || n.branch}${n.outlet ? ' · ' + (OUTLET_NAMES[n.outlet] || n.outlet) : ''}  —  ${new Date(n.createdAt).toLocaleDateString()}`,
              bold: true,
              color: '#3E8B5C',
            },
            {
              text: `Food ${n.foodRating}★  Service ${n.serviceRating}★  Ambiance ${n.ambianceRating}★${n.npsScore != null ? '  ·  NPS ' + n.npsScore : ''}`,
            },
          ]
          if (n.comment) blocks.push({ text: `“${n.comment}”`, italic: true, color: BROWN })
          addEntryCard(blocks)
        })
        if (stats.bestFeedback.length > 15) {
          addLine(`...and ${stats.bestFeedback.length - 15} more. See the live dashboard for the full list.`, {
            size: 8.5,
            italic: true,
            color: CAPTION,
          })
        }
      }

      // === NEEDS ATTENTION ===
      doc.addPage()
      y = margin
      addSectionHeader(`Needs Attention (${stats.needsAttention.length} flagged)`)
      if (stats.needsAttention.length === 0) {
        addLine('Nothing flagged in this period — great work!', { italic: true, color: CAPTION })
      } else {
        stats.needsAttention.slice(0, 15).forEach((n) => {
          const blocks: { text: string; bold?: boolean; italic?: boolean; size?: number; color?: string }[] = [
            {
              text: `${BRANCH_NAMES[n.branch] || n.branch}${n.outlet ? ' · ' + (OUTLET_NAMES[n.outlet] || n.outlet) : ''}  —  ${new Date(n.createdAt).toLocaleDateString()}`,
              bold: true,
              color: ORANGE,
            },
            {
              text: `Food ${n.foodRating}★  Service ${n.serviceRating}★  Ambiance ${n.ambianceRating}★${n.npsScore != null ? '  ·  NPS ' + n.npsScore : ''}`,
            },
          ]
          if (n.comment) blocks.push({ text: `“${n.comment}”`, italic: true, color: BROWN })
          addEntryCard(blocks)
        })
        if (stats.needsAttention.length > 15) {
          addLine(`...and ${stats.needsAttention.length - 15} more. See the live dashboard for the full list.`, {
            size: 8.5,
            italic: true,
            color: CAPTION,
          })
        }
      }

      // === STAFF ROSTER CHANGES ===
      ensureSpace(50)
      addSectionHeader('Staff Roster Changes')
      try {
        const params = new URLSearchParams()
        if (startDate) params.set('startDate', startDate)
        if (endDate) params.set('endDate', endDate)
        const rosterRes = await fetch(`/api/roster/history?${params.toString()}`)
        const rosterData = await rosterRes.json()
        const changes = rosterData.changes || []
        if (changes.length === 0) {
          addLine('No staff roster changes recorded in this period.', { italic: true, color: CAPTION })
        } else {
          changes.forEach((c: { name: string; roleGroup: string; action: string; createdAt: string }) => {
            const color = c.action === 'added' ? '#3E8B5C' : '#B45309'
            addLine(`${new Date(c.createdAt).toLocaleDateString()}  —  ${c.name} (${c.roleGroup}) was ${c.action}`, {
              size: 9,
              color,
            })
          })
        }
      } catch {
        addLine('Could not load roster change history.', { italic: true, color: CAPTION })
      }
      y += 10

      // === RECENT COMMENTS ===
      ensureSpace(50)
      addSectionHeader('Recent Comments')
      if (stats.recentComments.length === 0) {
        addLine('No comments in this period.', { italic: true, color: CAPTION })
      } else {
        stats.recentComments.forEach((c) => {
          addEntryCard([
            {
              text: `${BRANCH_NAMES[c.branch] || c.branch}${c.outlet ? ' · ' + (OUTLET_NAMES[c.outlet] || c.outlet) : ''}  —  ${new Date(c.createdAt).toLocaleDateString()}`,
              bold: true,
              color: ORANGE,
            },
            { text: `“${c.comment}”`, italic: true, color: BROWN },
            {
              text: `Food ${c.foodRating}★  Service ${c.serviceRating}★  Ambiance ${c.ambianceRating}★${c.servedBy ? '  ·  Served by ' + c.servedBy : ''}`,
              size: 8,
              color: CAPTION,
            },
          ])
        })
      }

      // === PAGE CHROME (skip cover page) ===
      const pageCount = doc.getNumberOfPages()
      for (let i = 2; i <= pageCount; i++) {
        doc.setPage(i)
        drawPageChrome(i - 1, pageCount - 1)
      }

      doc.save(`ekwena-report-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('Report generation failed', err)
      const message = err instanceof Error ? err.message : String(err)
      alert('Report generation failed: ' + message)
    } finally {
      setGeneratingReport(false)
    }
  }
  const trendFormatted = stats?.trend.map((t) => ({
    ...t,
    label: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  const npsTrendFormatted = stats?.npsTrend.map((t) => ({
    ...t,
    label: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  const branchComparisonFormatted = stats?.branchComparison.map((b) => ({
    ...b,
    label: BRANCH_NAMES[b.branch] || b.branch,
  }))

  const outletComparisonFormatted = stats?.outletComparison.map((o) => ({
    ...o,
    label: OUTLET_NAMES[o.outlet] || o.outlet,
  }))

  return (
    <main className="min-h-screen bg-beige-light p-4 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo size={56} />
            <div>
              <h1 className="text-xl font-heading text-brown">Ekwena Dashboard</h1>
              <p className="text-xs text-brown-light font-body">Welcome, {managerName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm text-brown-light hover:text-brown transition font-body"
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>

        <div className="bg-cream rounded-2xl p-4 shadow-sm flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'cottages', 'tuuti'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBranchFilter(b)}
                className={`px-4 py-2 rounded-full font-body text-sm font-semibold transition ${
                  branchFilter === b ? 'bg-orange text-cream' : 'bg-beige-light text-brown-light hover:bg-beige'
                }`}
              >
                {b === 'all' ? 'All Branches' : BRANCH_NAMES[b]}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setOutletFilter('all')}
              className={`px-3 py-1.5 rounded-full font-body text-xs font-semibold transition ${
                outletFilter === 'all' ? 'bg-brown text-cream' : 'bg-beige-light text-brown-light hover:bg-beige'
              }`}
            >
              All Outlets
            </button>
            {Object.entries(OUTLET_NAMES).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setOutletFilter(value)}
                className={`px-3 py-1.5 rounded-full font-body text-xs font-semibold transition ${
                  outletFilter === value ? 'bg-brown text-cream' : 'bg-beige-light text-brown-light hover:bg-beige'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <label className="text-xs text-brown-light font-body">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-full border border-beige px-3 py-1.5 text-xs font-body text-brown bg-cream focus:outline-none focus:border-orange"
            />
            <label className="text-xs text-brown-light font-body">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-full border border-beige px-3 py-1.5 text-xs font-body text-brown bg-cream focus:outline-none focus:border-orange"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate('') }}
                className="text-xs text-brown-light underline font-body"
              >
                Clear dates
              </button>
            )}
            <button
              onClick={handleDownloadReport}
              disabled={generatingReport || loading || !stats}
              className="ml-auto flex items-center gap-1.5 bg-brown text-cream px-4 py-2 rounded-full font-body text-sm font-semibold hover:bg-brown-light transition disabled:opacity-50"
            >
              <FileDown size={16} /> {generatingReport ? 'Generating Report...' : 'Download Report (PDF)'}
            </button>
          </div>
        </div>

        {loading || !stats ? (
          <p className="text-brown-light font-body">Loading stats...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard icon={<MessageSquare size={20} />} label="Total Feedback" value={stats.totalCount} />
              <StatCard icon={<Star size={20} />} label="Overall Avg" value={stats.avgOverall || '—'} />
              <StatCard
                icon={<ThumbsUp size={20} />}
                label={`NPS (${stats.nps.responses} resp.)`}
                value={stats.nps.score ?? '—'}
              />
              <StatCard
                icon={<Smile size={20} />}
                label={`CSAT (${stats.csat.totalRatings} ratings)`}
                value={stats.csat.percent != null ? `${stats.csat.percent}%` : '—'}
              />
              <StatCard icon={<Users2 size={20} />} label="Repeat Guests" value={stats.repeatGuestCount} />
            </div>

            <div className="bg-brown rounded-2xl p-5 md:p-6 shadow-sm text-cream">
              <h2 className="font-heading text-lg mb-1">All-Time Overall Experience</h2>
              <p className="text-xs text-beige-light/80 font-body mb-4">
                Combines all 7 rating categories, across every submission ever received. Not affected by the filters above.
              </p>
              <div className="flex items-end gap-3 mb-5">
                <span className="text-5xl font-heading">{stats.grandAverageOverall.avg || '-'}</span>
                <span className="text-sm text-beige-light/80 font-body mb-1">
                  / 5 - {stats.grandAverageOverall.count} reviews
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-beige-light/80 font-body mb-2">By Branch</p>
                  <div className="flex flex-col gap-1">
                    {stats.grandAverageByBranch.map((b) => (
                      <div key={b.branch} className="flex justify-between text-sm font-body">
                        <span>{BRANCH_NAMES[b.branch] || b.branch}</span>
                        <span className="font-semibold">
                          {b.avg || '-'} <span className="text-xs font-normal text-beige-light/70">({b.count})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-beige-light/80 font-body mb-2">By Outlet</p>
                  <div className="flex flex-col gap-1">
                    {stats.grandAverageByOutlet.length === 0 && (
                      <span className="text-sm font-body text-beige-light/70">No outlet data yet.</span>
                    )}
                    {stats.grandAverageByOutlet.map((o) => (
                      <div key={o.outlet} className="flex justify-between text-sm font-body">
                        <span>{OUTLET_NAMES[o.outlet] || o.outlet}</span>
                        <span className="font-semibold">
                          {o.avg || '-'} <span className="text-xs font-normal text-beige-light/70">({o.count})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<Star size={18} />} label="Hostess Reception" value={stats.avgHostess || '—'} />
              <StatCard icon={<Star size={18} />} label="Beverage Quality" value={stats.avgBeverage || '—'} />
              <StatCard icon={<Star size={18} />} label="Menu Variety" value={stats.avgMenuVariety || '—'} />
              <StatCard
                icon={<Star size={18} />}
                label="Ambiance & Cleanliness"
                value={stats.avgAmbianceCleanliness || '—'}
              />
            </div>

            {stats.lowestCategory && (
              <div className="bg-orange/10 border border-orange rounded-2xl p-4 flex items-center gap-3">
                <AlertTriangle size={20} className="text-orange shrink-0" />
                <p className="font-body text-sm text-brown">
                  Your lowest-scoring area right now is{' '}
                  <span className="font-semibold">{stats.lowestCategory.label}</span> at{' '}
                  <span className="font-semibold">{stats.lowestCategory.value}/5</span>.
                </p>
              </div>
            )}

            <div ref={branchComparisonRef} className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
              <h2 className="font-heading text-lg text-brown mb-4">Branch Comparison</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={branchComparisonFormatted}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3E5D3" />
                  <XAxis dataKey="label" stroke="#5D4037" fontSize={12} />
                  <YAxis domain={[0, 5]} stroke="#5D4037" fontSize={12} />
                  <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontFamily: 'var(--font-body)', fontSize: 12 }} />
                  <Bar dataKey="avgFood" name="Food Quality" fill="#BF6B34" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="avgService" name="Service" fill="#D68A52" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="avgAmbiance" name="Ambiance" fill="#3E2723" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div ref={outletComparisonRef} className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
              <h2 className="font-heading text-lg text-brown mb-4">Outlet Comparison</h2>
              {outletComparisonFormatted && outletComparisonFormatted.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={outletComparisonFormatted}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3E5D3" />
                    <XAxis dataKey="label" stroke="#5D4037" fontSize={11} />
                    <YAxis domain={[0, 5]} stroke="#5D4037" fontSize={12} />
                    <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontFamily: 'var(--font-body)', fontSize: 12 }} />
                    <Bar dataKey="avgFood" name="Food Quality" fill="#BF6B34" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="avgService" name="Service" fill="#D68A52" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="avgAmbiance" name="Ambiance" fill="#3E2723" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-brown-light text-sm font-body">No outlet data yet.</p>
              )}
            </div>

            <div ref={ratingTrendRef} className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
              <h2 className="font-heading text-lg text-brown mb-4 flex items-center gap-2">
                <TrendingUp size={18} /> Rating Trend
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendFormatted}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3E5D3" />
                  <XAxis dataKey="label" stroke="#5D4037" fontSize={11} />
                  <YAxis domain={[0, 5]} stroke="#5D4037" fontSize={12} />
                  <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', borderRadius: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="avgOverall"
                    name="Avg Rating"
                    stroke="#BF6B34"
                    strokeWidth={3}
                    dot={{ fill: '#BF6B34', r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div ref={feedbackVolumeRef} className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
              <h2 className="font-heading text-lg text-brown mb-4 flex items-center gap-2">
                <Activity size={18} /> Feedback Volume
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trendFormatted}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3E5D3" />
                  <XAxis dataKey="label" stroke="#5D4037" fontSize={11} />
                  <YAxis allowDecimals={false} stroke="#5D4037" fontSize={12} />
                  <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', borderRadius: 12 }} />
                  <Bar dataKey="count" name="Responses" fill="#D68A52" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div ref={npsTrendRef} className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
              <h2 className="font-heading text-lg text-brown mb-1 flex items-center gap-2">
                <ThumbsUp size={18} /> NPS Trend
              </h2>
              <p className="text-xs text-brown-light font-body mb-4">
                {stats.nps.score != null
                  ? `Currently ${npsLabel(stats.nps.score).toLowerCase()} (${stats.nps.score})`
                  : 'Not enough NPS responses yet'}
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={npsTrendFormatted}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3E5D3" />
                  <XAxis dataKey="label" stroke="#5D4037" fontSize={11} />
                  <YAxis domain={[-100, 100]} stroke="#5D4037" fontSize={12} />
                  <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', borderRadius: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="NPS"
                    stroke="#3E2723"
                    strokeWidth={3}
                    dot={{ fill: '#3E2723', r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div ref={npsBreakdownRef} className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
                <h2 className="font-heading text-lg text-brown mb-4 flex items-center gap-2">
                  <ThumbsUp size={18} /> NPS Breakdown
                </h2>
                {stats.nps.responses === 0 ? (
                  <p className="text-brown-light text-sm font-body">No NPS responses yet.</p>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-32 h-32 shrink-0 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Promoters', value: stats.nps.promoters },
                              { name: 'Passives', value: stats.nps.passives },
                              { name: 'Detractors', value: stats.nps.detractors },
                            ]}
                            dataKey="value"
                            innerRadius={38}
                            outerRadius={58}
                            startAngle={90}
                            endAngle={-270}
                          >
                            <Cell fill="#BF6B34" />
                            <Cell fill="#D68A52" />
                            <Cell fill="#3E2723" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-heading text-brown">{stats.nps.score ?? '—'}</span>
                        <span className="text-[10px] text-brown-light font-body">{npsLabel(stats.nps.score)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-1 w-full">
                      <div className="flex justify-between text-sm font-body">
                        <span className="text-brown flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#BF6B34' }} />
                          Promoters (9–10)
                        </span>
                        <span className="text-brown-light">{stats.nps.promoters}</span>
                      </div>
                      <div className="flex justify-between text-sm font-body">
                        <span className="text-brown flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#D68A52' }} />
                          Passives (7–8)
                        </span>
                        <span className="text-brown-light">{stats.nps.passives}</span>
                      </div>
                      <div className="flex justify-between text-sm font-body">
                        <span className="text-brown flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#3E2723' }} />
                          Detractors (0–6)
                        </span>
                        <span className="text-brown-light">{stats.nps.detractors}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div ref={howHeardRef} className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
                <h2 className="font-heading text-lg text-brown mb-4 flex items-center gap-2">
                  <Compass size={18} /> How Guests Hear About Us
                </h2>
                {stats.howHeard.length === 0 ? (
                  <p className="text-brown-light text-sm font-body">No data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={stats.howHeard} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3E5D3" />
                      <XAxis type="number" stroke="#5D4037" fontSize={12} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" stroke="#5D4037" fontSize={12} width={90} />
                      <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', borderRadius: 12 }} />
                      <Bar dataKey="count" fill="#BF6B34" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
                <h2 className="font-heading text-lg text-brown mb-4 flex items-center gap-2">
                  <Award size={18} /> Staff Leaderboard
                </h2>
                {stats.staffLeaderboard.length === 0 ? (
                  <p className="text-brown-light text-sm font-body">No &quot;who served you&quot; data yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {stats.staffLeaderboard.map((s, i) => (
                      <div key={s.name} className="flex justify-between items-center border-b border-beige pb-2 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-heading text-orange w-5">#{i + 1}</span>
                          <span className="font-body text-sm text-brown">{s.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-body font-semibold text-brown text-sm">{s.avgOverall}★</span>
                          <span className="text-xs text-brown-light font-body ml-1">({s.count})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
                <h2 className="font-heading text-lg text-brown mb-4">Data Collection Volume</h2>
                {stats.collectionVolume.length === 0 ? (
                  <p className="text-brown-light text-sm font-body">No data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(160, stats.collectionVolume.length * 32)}>
                    <BarChart data={stats.collectionVolume} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3E5D3" />
                      <XAxis type="number" stroke="#5D4037" fontSize={12} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" stroke="#5D4037" fontSize={11} width={100} />
                      <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', borderRadius: 12 }} />
                      <Bar dataKey="count" fill="#D68A52" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm border-2 border-green-600/40">
              <h2 className="font-heading text-lg text-brown mb-4 flex items-center gap-2">
                <Sparkles size={18} className="text-green-600" /> Best Feedback
              </h2>
              {stats.bestFeedback.length === 0 ? (
                <p className="text-brown-light text-sm font-body">No standout 4-5 star reviews yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {stats.bestFeedback.map((n) => {
                    const optionalRatings: { label: string; value: number | null }[] = [
                      { label: 'Hostess', value: n.hostessRating },
                      { label: 'Beverage', value: n.waitTimeRating },
                      { label: 'Menu Variety', value: n.valueRating },
                      { label: 'Ambiance & Cleanliness', value: n.cleanlinessRating },
                    ].filter((r) => r.value != null)
                    return (
                      <div key={n.id} className="border border-green-600/40 bg-green-50 rounded-xl p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-green-700 font-body">
                            {BRANCH_NAMES[n.branch] || n.branch}
                            {n.outlet ? ` · ${OUTLET_NAMES[n.outlet] || n.outlet}` : ''}
                          </span>
                          <span className="text-xs text-brown-light font-body">
                            {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-green-700 font-body mb-1">
                          <span>Food {n.foodRating}★</span>
                          <span>Service {n.serviceRating}★</span>
                          <span>Ambiance {n.ambianceRating}★</span>
                          {n.npsScore != null && <span>NPS {n.npsScore}</span>}
                        </div>
                        {optionalRatings.length > 0 && (
                          <div className="flex flex-wrap gap-3 text-xs text-green-700 font-body mb-1">
                            {optionalRatings.map((r) => (
                              <span key={r.label}>{r.label} {r.value}★</span>
                            ))}
                          </div>
                        )}
                        {n.comment && <p className="text-brown font-body text-sm mb-1">{n.comment}</p>}
                        <div className="flex flex-wrap gap-3 text-xs text-brown-light font-body">
                          {n.servedBy && <span>Served by {n.servedBy}</span>}
                          {n.guestName && <span>— {n.guestName}</span>}
                          {n.guestPhone && <span>{n.guestPhone}</span>}
                        </div>
                      </div>
                   )
                  })}
                </div>
              )}
            </div>

            <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm border-2 border-orange/40">
              <h2 className="font-heading text-lg text-brown mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange" /> Needs Attention
              </h2>
              {stats.needsAttention.length === 0 ? (
                <p className="text-brown-light text-sm font-body">Nothing flagged - great work!</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {stats.needsAttention.map((n) => {
                    const optionalRatings: { label: string; value: number | null }[] = [
                      { label: 'Hostess', value: n.hostessRating },
                      { label: 'Beverage', value: n.waitTimeRating },
                      { label: 'Menu Variety', value: n.valueRating },
                      { label: 'Ambiance & Cleanliness', value: n.cleanlinessRating },
                    ].filter((r) => r.value != null)
                    return (
                      <div key={n.id} className="border border-orange/40 bg-orange/5 rounded-xl p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-orange font-body">
                            {BRANCH_NAMES[n.branch] || n.branch}
                            {n.outlet ? ` · ${OUTLET_NAMES[n.outlet] || n.outlet}` : ''}
                          </span>
                          <span className="text-xs text-brown-light font-body">
                            {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-brown-light font-body mb-1">
                          <span className={n.foodRating <= 2 ? 'text-red-700 font-semibold' : ''}>
                            Food {n.foodRating}★
                          </span>
                          <span className={n.serviceRating <= 2 ? 'text-red-700 font-semibold' : ''}>
                            Service {n.serviceRating}★
                          </span>
                          <span className={n.ambianceRating <= 2 ? 'text-red-700 font-semibold' : ''}>
                            Ambiance {n.ambianceRating}★
                          </span>
                          {n.npsScore != null && (
                            <span className={n.npsScore <= 6 ? 'text-red-700 font-semibold' : ''}>NPS {n.npsScore}</span>
                          )}
                        </div>
                        {optionalRatings.length > 0 && (
                          <div className="flex flex-wrap gap-3 text-xs text-brown-light font-body mb-1">
                            {optionalRatings.map((r) => (
                              <span
                                key={r.label}
                                className={(r.value as number) <= 2 ? 'text-red-700 font-semibold' : ''}
                              >
                                {r.label} {r.value}★
                              </span>
                            ))}
                          </div>
                        )}
                        {n.comment && <p className="text-brown font-body text-sm mb-1">{n.comment}</p>}
                        <div className="flex flex-wrap gap-3 text-xs text-brown-light font-body">
                          {n.servedBy && <span>Served by {n.servedBy}</span>}
                          {n.guestName && <span>— {n.guestName}</span>}
                          {n.guestPhone && <span>{n.guestPhone}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
              <h2 className="font-heading text-lg text-brown mb-4">Recent Comments</h2>
              {stats.recentComments.length === 0 ? (
                <p className="text-brown-light text-sm font-body">No comments yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {stats.recentComments.map((c) => (
                    <div key={c.id} className="border border-beige rounded-xl p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-orange font-body">
                          {BRANCH_NAMES[c.branch] || c.branch}
                          {c.outlet ? ` · ${OUTLET_NAMES[c.outlet] || c.outlet}` : ''}
                        </span>
                        <span className="text-xs text-brown-light font-body">
                          {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-brown font-body text-sm mb-1">{c.comment}</p>
                      <div className="flex gap-3 text-xs text-brown-light font-body">
                        <span>Food {c.foodRating}★</span>
                        <span>Service {c.serviceRating}★</span>
                        <span>Ambiance {c.ambianceRating}★</span>
                        {c.servedBy && <span>Served by {c.servedBy}</span>}
                        {c.guestName && <span>— {c.guestName}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-heading text-lg text-brown">Guest Contact List</h2>
                <button
                  onClick={() => downloadCSV(stats.guestList)}
                  disabled={stats.guestList.length === 0}
                  className="flex items-center gap-1 text-xs bg-orange text-cream px-3 py-1.5 rounded-full font-body font-semibold hover:bg-orange-light transition disabled:opacity-40"
                >
                  <Download size={14} /> Download CSV
                </button>
              </div>
              <p className="text-xs text-brown-light font-body mb-3">
                Contains guest names and phone/email left voluntarily - handle with care.
              </p>
              {stats.guestList.length === 0 ? (
                <p className="text-brown-light text-sm font-body">No guest contacts collected yet.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                  {stats.guestList.map((g, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-beige pb-2 last:border-0 text-sm font-body">
                      <div>
                        <span className="text-brown">{g.name || 'Anonymous'}</span>
                        {g.isRepeat && (
                          <span className="ml-2 text-[10px] bg-orange text-cream px-2 py-0.5 rounded-full">Repeat</span>
                        )}
                        <p className="text-xs text-brown-light">{g.phone}</p>
                      </div>
                      <span className="text-xs text-brown-light">
                        {new Date(g.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <RosterManager />

        <div className="bg-cream rounded-2xl p-4 md:p-6 shadow-sm">
          <h2 className="font-heading text-lg text-brown mb-4 flex items-center gap-2">
            <Users2 size={18} /> Staff & PINs
          </h2>
          <div className="flex flex-col gap-3">
            {staff.map((s) => (
              <div key={s.id} className="flex justify-between items-center border border-beige rounded-xl p-3">
                <div>
                  <p className="font-body font-semibold text-brown text-sm">{s.name}</p>
                  <p className="text-xs text-brown-light font-body capitalize">
                    {s.role}
                    {s.branch ? ` — ${BRANCH_NAMES[s.branch]}` : ''}
                  </p>
                </div>
                {editingStaffId === s.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="New PIN"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      className="w-24 rounded-full border border-beige px-3 py-1 text-sm font-body focus:outline-none focus:border-orange"
                    />
                    <button
                      onClick={handleSavePin}
                      disabled={pinSaving}
                      className="text-xs bg-orange text-cream px-3 py-1.5 rounded-full font-body font-semibold hover:bg-orange-light transition disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingStaffId(null); setNewPin(''); setPinError('') }}
                      className="text-xs text-brown-light font-body"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingStaffId(s.id); setNewPin(''); setPinError('') }}
                    className="flex items-center gap-1 text-xs text-brown-light hover:text-orange transition font-body"
                  >
                    <KeyRound size={14} /> Change PIN
                  </button>
                )}
              </div>
            ))}
          </div>
          {pinError && <p className="text-sm text-red-700 font-body mt-2">{pinError}</p>}
        </div>
      </div>
    </main>
  )
}
