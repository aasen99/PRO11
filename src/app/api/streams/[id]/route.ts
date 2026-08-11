import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isUnauthorized, requireAdmin } from '@/lib/session'

function hashDeleteToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const deleteToken =
      body.deleteToken ||
      body.delete_token ||
      new URL(request.url).searchParams.get('deleteToken') ||
      new URL(request.url).searchParams.get('delete_token')

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const admin = requireAdmin(request)
    if (!isUnauthorized(admin)) {
      const { error } = await supabase.from('team_streams').delete().eq('id', id)
      if (error) {
        return NextResponse.json({ error: 'Failed to delete stream: ' + error.message }, { status: 400 })
      }
      return NextResponse.json({ success: true })
    }

    if (!deleteToken || typeof deleteToken !== 'string') {
      return NextResponse.json({ error: 'Missing delete token' }, { status: 401 })
    }

    const { data: stream, error: fetchError } = await supabase
      .from('team_streams')
      .select('id, delete_token_hash')
      .eq('id', id)
      .single()

    if (fetchError || !stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 })
    }

    const tokenHash = hashDeleteToken(deleteToken.trim())
    if (tokenHash !== stream.delete_token_hash) {
      return NextResponse.json({ error: 'Invalid delete token' }, { status: 403 })
    }

    const { error: deleteError } = await supabase.from('team_streams').delete().eq('id', id)
    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete stream: ' + deleteError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
}
