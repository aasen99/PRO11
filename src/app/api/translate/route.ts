import { NextRequest, NextResponse } from 'next/server'

const LIBRE_URL = 'https://libretranslate.com/translate'

/** POST body: { text: string, source?: string, target?: string } -> { translated: string } */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const text = typeof body?.text === 'string' ? body.text.trim() : ''
    const source = (body?.source as string) || 'no'
    const target = (body?.target as string) || 'en'

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const res = await fetch(LIBRE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source, target })
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('LibreTranslate error:', res.status, err)
      return NextResponse.json(
        { error: 'Translation failed. Try again later.' },
        { status: 502 }
      )
    }

    const data = await res.json()
    const translated = typeof (data as any).translatedText === 'string' ? (data as any).translatedText : ''
    return NextResponse.json({ translated })
  } catch (e: any) {
    console.error('Translate API error:', e)
    return NextResponse.json(
      { error: 'Translation failed. Try again later.' },
      { status: 500 }
    )
  }
}
