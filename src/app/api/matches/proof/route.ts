import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const matchId = String(formData.get('match_id') || '').trim()
    const teamName = String(formData.get('team_name') || '').trim()
    const file = formData.get('proof')

    if (!matchId || !teamName) {
      return NextResponse.json({ error: 'match_id og team_name er påkrevd' }, { status: 400 })
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Bildebevis (bilde) er påkrevd' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({
        error: 'Ugyldig filtype. Bruk JPG, PNG, WEBP eller GIF.'
      }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Bildet er for stort (maks 5 MB)' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, tournament_id, team1_name, team2_name')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Kamp ikke funnet' }, { status: 404 })
    }

    const isTeam1 = match.team1_name === teamName
    const isTeam2 = match.team2_name === teamName
    if (!isTeam1 && !isTeam2) {
      return NextResponse.json({ error: 'Lagnavnet matcher ikke denne kampen' }, { status: 400 })
    }

    const extension = file.type === 'image/png'
      ? 'png'
      : file.type === 'image/webp'
        ? 'webp'
        : file.type === 'image/gif'
          ? 'gif'
          : 'jpg'

    const storagePath = `${match.tournament_id}/${matchId}/${sanitizeFileName(teamName)}_${Date.now()}.${extension}`
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('match-proofs')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Proof upload error:', uploadError)
      return NextResponse.json({
        error: 'Kunne ikke laste opp bildebevis. Sjekk at storage-bucket "match-proofs" finnes i Supabase.'
      }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage
      .from('match-proofs')
      .getPublicUrl(storagePath)

    const proofUrl = publicUrlData.publicUrl

    return NextResponse.json({ proof_url: proofUrl })
  } catch (error: any) {
    console.error('POST /api/matches/proof error:', error)
    return NextResponse.json({
      error: 'Internal server error: ' + (error.message || 'Unknown error')
    }, { status: 500 })
  }
}
