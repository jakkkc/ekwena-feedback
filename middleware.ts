import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session'

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = token ? await verifySessionToken(token) : null
  const { pathname } = req.nextUrl

  const isWaiterRoute = pathname.startsWith('/waiter')
  const isDashboardRoute = pathname.startsWith('/dashboard')

  if ((isWaiterRoute || isDashboardRoute) && !session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (isWaiterRoute && session?.role !== 'waiter') {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (isDashboardRoute && session?.role !== 'manager') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/waiter/:path*', '/dashboard/:path*'],
}
