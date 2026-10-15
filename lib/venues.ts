export const BRANCHES = ['cottages', 'tuuti'] as const
export const OUTLETS = [
  'ekwena_restaurant',
  'duma_bar',
  'eswara_conference_hall',
  'ekwena_gardens',
] as const

export type Branch = (typeof BRANCHES)[number]
export type Outlet = (typeof OUTLETS)[number]

export const BRANCH_LABELS: Record<Branch, string> = {
  cottages: 'Hunters Paradise Cottages',
  tuuti: 'Hunters Paradise Tuuti',
}

export const OUTLET_LABELS: Record<Outlet, string> = {
  ekwena_restaurant: 'Ekwena Restaurant',
  duma_bar: 'Duma Bar',
  eswara_conference_hall: 'Eswara Conference Hall',
  ekwena_gardens: 'Ekwena Gardens',
}

export const GOOGLE_REVIEW_LINKS: Record<Branch, string> = {
  cottages: 'https://g.page/r/CVPEsVcvizLmEBM/review',
  tuuti: 'https://g.page/r/CRZGx1PtGtqoEBM/review',
}

export function isBranch(value: unknown): value is Branch {
  return typeof value === 'string' && (BRANCHES as readonly string[]).includes(value)
}

export function isOutlet(value: unknown): value is Outlet {
  return typeof value === 'string' && (OUTLETS as readonly string[]).includes(value)
}
