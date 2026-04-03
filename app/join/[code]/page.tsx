import type { Metadata } from 'next'
import { supabase } from '../../lib/supabase'
import JoinClient from './JoinClient'

type Props = { params: Promise<{ code: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name')
    .eq('invite_code', code)
    .single()

  if (!trip) {
    return {
      title: 'Einladung – ENAPO',
      description: 'Diese Einladung ist nicht mehr gültig.',
    }
  }

  const { count } = await supabase
    .from('trip_members')
    .select('*', { count: 'exact', head: true })
    .eq('trip_id', trip.id)

  const memberCount = count ?? 0

  return {
    title: `${trip.name} – ENAPO`,
    description: `${memberCount} ${memberCount === 1 ? 'Person plant' : 'Personen planen'} bereits · Jetzt beitreten`,
    openGraph: {
      title: `${trip.name} – ENAPO`,
      description: `${memberCount} ${memberCount === 1 ? 'Person plant' : 'Personen planen'} bereits · Jetzt beitreten`,
      images: ['/og-preview.png'],
    },
  }
}

export default async function JoinPage({ params }: Props) {
  const { code } = await params

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, date_from, date_to, invite_code')
    .eq('invite_code', code)
    .single()

  if (!trip) {
    return <InvalidInvitePage />
  }

  // Load members
  const { data: memberRows } = await supabase
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', trip.id)

  const userIds = memberRows?.map((m) => m.user_id) ?? []

  let memberNames: string[] = []
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', userIds)

    memberNames = (profiles ?? [])
      .map((p) => p.name ?? '')
      .filter(Boolean)
  }

  return (
    <JoinClient
      trip={{
        id: trip.id,
        name: trip.name,
        date_from: trip.date_from ?? null,
        date_to: trip.date_to ?? null,
        invite_code: trip.invite_code,
      }}
      memberNames={memberNames}
      memberCount={userIds.length}
    />
  )
}

function InvalidInvitePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F0EDE8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: '100%',
          background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.7)',
          borderRadius: 16,
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>
          Einladung nicht gefunden
        </h1>
        <p style={{ fontSize: 14, color: '#6B6B6B', lineHeight: 1.5 }}>
          Dieser Einladungslink ist ungültig oder abgelaufen.
          Bitte frage nach einem neuen Link.
        </p>
      </div>
    </div>
  )
}
