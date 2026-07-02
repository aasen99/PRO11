import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  forbiddenResponse,
  isUnauthorized,
  requireCaptain
} from '@/lib/session'

const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4 MB (Vercel request limit ~4.5 MB)

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
}

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif'
}

function normalizeTeamName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
}

function resolveImageFile(file: File): { mime: string; ext: string } | null {
  const mime = file.type?.toLowerCase() || ''
  if (mime && MIME_TO_EXT[mime]) {
    return { mime, ext: MIME_TO_EXT[mime] }
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  const mimeFromExt = EXT_TO_MIME[extension]
  if (mimeFromExt) {
    return { mime: mimeFromExt, ext: extension === 'jpeg' ? 'jpg' : extension }
  }

  // Some mobile browsers send empty type for camera photos
  if (!mime || mime === 'application/octet-stream') {
    return { mime: 'image/jpeg', ext: 'jpg' }
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const captain = requireCaptain(request)
    if (isUnauthorized(captain)) return captain

    const formData = await request.formData()
    const matchId = String(formData.get('match_id') || '').trim()
    const teamName = normalizeTeamName(String(formData.get('team_name') || ''))
    const file = formData.get('proof')

    if (!matchId || !teamName) {
      return NextResponse.json({ error: 'match_id og team_name er påkrevd' }, { status: 400 })
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Bildebevis (bilde) er påkrevd' }, { status: 400 })
    }

    const resolved = resolveImageFile(file)
    if (!resolved) {
      return NextResponse.json({
        error: 'Ugyldig filtype. Bruk JPG, PNG, WEBP eller GIF.'
      }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Bildet er for stort (maks 4 MB)' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({
        error: 'Serveren mangler database-tilkobling (SUPABASE_SERVICE_ROLE_KEY).'
      }, { status: 500 })
    }

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, tournament_id, team1_name, team2_name')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Kamp ikke funnet' }, { status: 404 })
    }

    const team1 = normalizeTeamName(String(match.team1_name || ''))
    const team2 = normalizeTeamName(String(match.team2_name || ''))
    const isTeam1 = team1 === teamName
    const isTeam2 = team2 === teamName
    if (!isTeam1 && !isTeam2) {
      return NextResponse.json({ error: 'Lagnavnet matcher ikke denne kampen' }, { status: 400 })
    }

    if (normalizeTeamName(captain.teamName) !== teamName) {
      return forbiddenResponse()
    }

    const storagePath = `${match.tournament_id}/${matchId}/${sanitizeFileName(teamName)}_${Date.now()}.${resolved.ext}`
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('match-proofs')
      .upload(storagePath, fileBuffer, {
        contentType: resolved.mime,
        upsert: false
      })

    if (uploadError) {
      console.error('Proof upload error:', uploadError)
      const message = uploadError.message || 'Ukjent feil'
      const isBucketMissing = /bucket|not found|does not exist/i.test(message)
      return NextResponse.json({
        error: isBucketMissing
          ? 'Storage-bucket "match-proofs" finnes ikke i Supabase. Kjør SETUP_MATCH_PROOFS.sql i SQL Editor.'
          : `Kunne ikke laste opp bildebevis: ${message}`
      }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage
      .from('match-proofs')
      .getPublicUrl(storagePath)

    return NextResponse.json({ proof_url: publicUrlData.publicUrl })
  } catch (error: any) {
    console.error('POST /api/matches/proof error:', error)
    return NextResponse.json({
      error: 'Internal server error: ' + (error.message || 'Unknown error')
    }, { status: 500 })
  }
}
