import { NextResponse } from 'next/server'
import { clearCaptainSessionCookie } from '@/lib/session'

export async function POST() {
  const response = NextResponse.json({ success: true })
  clearCaptainSessionCookie(response)
  return response
}
