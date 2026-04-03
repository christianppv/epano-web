import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { trip_id, distinct_id } = body as { trip_id?: string; distinct_id?: string }
  if (!trip_id || !distinct_id) {
    return NextResponse.json({ error: 'Missing trip_id or distinct_id' }, { status: 400 })
  }

  const posthogKey = process.env.POSTHOG_API_KEY
  if (posthogKey) {
    await fetch('https://eu.posthog.com/capture/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: posthogKey,
        event: 'invite_accepted',
        distinct_id,
        properties: { trip_id, distinct_id },
      }),
    }).catch(() => {
      // silent — analytics must never block the user flow
    })
  }

  return NextResponse.json({ ok: true })
}
