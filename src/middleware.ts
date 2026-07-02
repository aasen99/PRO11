import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/session-edge'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!(await getAdminSession(request))) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/admin'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/live', '/admin/matches/:path*']
}
