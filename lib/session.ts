import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secret = new TextEncoder().encode(process.env.SESSION_SECRET!)
export const SESSION_COOKIE_NAME = 'ekwena_session'

export type SessionPayload = {
  staffId: string
  name: string
  role: 'manager' | 'waiter'
  branch: 'cottages' | 'tuuti' | null
  outlet?: string | null
  collectedBy?: string | null
}

export async function createSessionToken(payload: SessionPayload) {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret)
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

// A disabled or removed account loses access straight away, even with a valid cookie.
// If Supabase can't be reached we let the request through rather than lock everyone out.
async function isStillActive(staffId: string): Promise<boolean> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return true
    const res = await fetch(`${url}/rest/v1/staff?id=eq.${encodeURIComponent(staffId)}&select=active`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    })
    if (!res.ok) return true
    const rows = await res.json()
    if (!Array.isArray(rows)) return true
    if (rows.length === 0) return false
    return rows[0].active !== false
  } catch {
    return true
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null
  const session = await verifySessionToken(token)
  if (!session) return null
  if (!(await isStillActive(session.staffId))) return null
  return session
}
