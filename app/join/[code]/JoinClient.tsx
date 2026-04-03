'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

type TripInfo = {
  id: string
  name: string
  date_from: string | null
  date_to: string | null
  invite_code: string
}

type OptionRow = {
  id: string
  title: string | null
  source_domain: string | null
  category: string
  price: string | null
  status: string
}

type PollRow = {
  id: string
  title: string
  status: string
  deadline: string | null
}

type PollOptionRow = {
  id: string
  poll_id: string
  option_id: string
}

type VoteValue = 'yes' | 'no' | 'maybe'

type OptionWithPoll = OptionRow & {
  poll?: PollRow
  pollOptionId?: string
  myVote?: VoteValue
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateRange(from: string | null, to: string | null): string {
  if (!from && !to) return ''
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  if (from && to) return `${fmt(from)} – ${fmt(to)}`
  if (from) return `ab ${fmt(from)}`
  return `bis ${fmt(to!)}`
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase()
}

const AVATAR_COLORS = [
  '#1A9E8F',
  '#E8734A',
  '#E8A94A',
  '#7B68EE',
  '#E85C4A',
]

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    accommodation: 'Unterkunft',
    activity: 'Aktivität',
    transport: 'Transport',
    food: 'Essen',
    other: 'Sonstiges',
  }
  return map[cat] ?? cat
}

function statusLabel(s: string): { label: string; color: string; bg: string } {
  switch (s) {
    case 'decided':
      return { label: 'Entschieden', color: '#1A9E8F', bg: 'rgba(26,158,143,0.12)' }
    case 'voting':
      return { label: 'Abstimmung', color: '#E8A94A', bg: 'rgba(232,169,74,0.12)' }
    default:
      return { label: 'Offen', color: '#9B9B9B', bg: 'rgba(155,155,155,0.12)' }
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

type Props = {
  trip: TripInfo
  memberNames: string[]
  memberCount: number
}

export default function JoinClient({ trip, memberNames, memberCount }: Props) {
  const [phase, setPhase] = useState<'join' | 'joining' | 'joined' | 'error'>('join')
  const [firstName, setFirstName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [options, setOptions] = useState<OptionWithPoll[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [votingId, setVotingId] = useState<string | null>(null) // pollOptionId being voted

  // Initialise a stable temp user ID per browser session
  useEffect(() => {
    const stored = sessionStorage.getItem('epano_uid')
    if (stored) {
      setUserId(stored)
    } else {
      const id = crypto.randomUUID()
      sessionStorage.setItem('epano_uid', id)
      setUserId(id)
    }
  }, [])

  const loadOptionsAndPolls = useCallback(
    async (uid: string) => {
      setLoadingOptions(true)
      try {
        const [{ data: opts }, { data: polls }] = await Promise.all([
          supabase
            .from('options')
            .select('id, title, source_domain, category, price, status')
            .eq('trip_id', trip.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('polls')
            .select('id, title, status, deadline')
            .eq('trip_id', trip.id)
            .eq('status', 'open'),
        ])

        const openPolls = polls ?? []
        const pollIds = openPolls.map((p) => p.id)

        let pollOptions: PollOptionRow[] = []
        let myVotes: { poll_id: string; poll_option_id: string; value: VoteValue }[] = []

        if (pollIds.length > 0) {
          const [{ data: po }, { data: mv }] = await Promise.all([
            supabase
              .from('poll_options')
              .select('id, poll_id, option_id')
              .in('poll_id', pollIds),
            supabase
              .from('votes')
              .select('poll_id, poll_option_id, value')
              .in('poll_id', pollIds)
              .eq('user_id', uid),
          ])
          pollOptions = (po ?? []) as PollOptionRow[]
          myVotes = (mv ?? []) as { poll_id: string; poll_option_id: string; value: VoteValue }[]
        }

        // Map option_id → poll + pollOptionId + myVote
        const optionPollMap = new Map<
          string,
          { poll: PollRow; pollOptionId: string; myVote?: VoteValue }
        >()
        for (const po of pollOptions) {
          const poll = openPolls.find((p) => p.id === po.poll_id)
          if (!poll) continue
          const vote = myVotes.find((v) => v.poll_id === po.poll_id)
          optionPollMap.set(po.option_id, {
            poll,
            pollOptionId: po.id,
            myVote: vote?.value,
          })
        }

        const enriched: OptionWithPoll[] = (opts ?? []).map((o) => ({
          ...o,
          ...optionPollMap.get(o.id),
        }))

        setOptions(enriched)
      } finally {
        setLoadingOptions(false)
      }
    },
    [trip.id]
  )

  async function handleJoin() {
    const trimmed = firstName.trim()
    if (!trimmed) {
      setErrorMsg('Bitte gib deinen Vornamen ein.')
      return
    }

    setPhase('joining')
    setErrorMsg('')

    const uid = userId ?? crypto.randomUUID()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)('join_trip_by_invite_code', {
      p_code: trip.invite_code,
      p_first_name: trimmed,
      p_user_id: uid,
    })

    if (error) {
      setPhase('join')
      setErrorMsg('Beitreten fehlgeschlagen. Bitte versuche es erneut.')
      return
    }

    // Fire analytics (non-blocking)
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'invite_accepted', trip_id: trip.id, distinct_id: uid }),
    }).catch(() => {})

    setPhase('joined')
    await loadOptionsAndPolls(uid)
  }

  async function handleVote(
    pollId: string,
    pollOptionId: string,
    value: VoteValue
  ) {
    if (!userId || votingId) return
    setVotingId(pollOptionId)

    const { error } = await supabase.from('votes').upsert(
      { poll_id: pollId, poll_option_id: pollOptionId, user_id: userId, value },
      { onConflict: 'poll_id,user_id' }
    )

    if (!error) {
      setOptions((prev) =>
        prev.map((o) =>
          o.pollOptionId === pollOptionId ? { ...o, myVote: value } : o
        )
      )
    }

    setVotingId(null)
  }

  const dateRange = formatDateRange(trip.date_from, trip.date_to)

  return (
    <div style={styles.page}>
      {/* ── Brand ── */}
      <div style={styles.brand}>ENAPO</div>

      {/* ── Trip header card ── */}
      <div style={styles.card}>
        <h1 style={styles.tripName}>{trip.name}</h1>
        {dateRange && (
          <p style={styles.dateRange}>📅 {dateRange}</p>
        )}

        {/* Member stack */}
        <div style={styles.membersRow}>
          <div style={styles.avatarStack}>
            {memberNames.slice(0, 5).map((name, i) => (
              <div
                key={i}
                style={{
                  ...styles.avatar,
                  background: getAvatarColor(i),
                  zIndex: 5 - i,
                  marginLeft: i === 0 ? 0 : -8,
                }}
                title={name}
              >
                {getInitial(name)}
              </div>
            ))}
            {memberCount > 5 && (
              <div
                style={{
                  ...styles.avatar,
                  background: '#C4C0BA',
                  zIndex: 0,
                  marginLeft: -8,
                  fontSize: 10,
                }}
              >
                +{memberCount - 5}
              </div>
            )}
          </div>
          <p style={styles.memberText}>
            <strong>{memberCount}</strong>{' '}
            {memberCount === 1 ? 'Person plant' : 'Personen planen'} bereits
          </p>
        </div>

        {memberNames.length > 0 && (
          <p style={styles.memberNames}>
            {memberNames.slice(0, 4).join(', ')}
            {memberNames.length > 4 ? ` und ${memberNames.length - 4} weitere` : ''}
          </p>
        )}
      </div>

      {/* ── Join form ── */}
      {(phase === 'join' || phase === 'joining') && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Dabei sein</h2>
          <p style={styles.subtitle}>Kein Account nötig – einfach Vorname eingeben und loslegen.</p>

          <input
            type="text"
            placeholder="Dein Vorname"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            disabled={phase === 'joining'}
            style={styles.input}
          />

          {errorMsg && <p style={styles.errorText}>{errorMsg}</p>}

          <button
            onClick={handleJoin}
            disabled={phase === 'joining'}
            style={{
              ...styles.ctaButton,
              opacity: phase === 'joining' ? 0.6 : 1,
            }}
          >
            {phase === 'joining' ? 'Einen Moment…' : 'Jetzt beitreten'}
          </button>
        </div>
      )}

      {/* ── Post-join: options list ── */}
      {phase === 'joined' && (
        <>
          <div style={{ ...styles.card, background: 'rgba(26,158,143,0.1)', borderColor: 'rgba(26,158,143,0.3)' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1A9E8F', margin: 0 }}>
              ✓ Du bist dabei!
            </p>
            <p style={{ fontSize: 13, color: '#6B6B6B', marginTop: 4, marginBottom: 0 }}>
              Willkommen bei {trip.name}.
            </p>
          </div>

          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionHeading}>Optionen</h2>
          </div>

          {loadingOptions && (
            <p style={styles.loadingText}>Lade Optionen…</p>
          )}

          {!loadingOptions && options.length === 0 && (
            <div style={styles.card}>
              <p style={{ fontSize: 14, color: '#9B9B9B', textAlign: 'center', margin: 0 }}>
                Noch keine Optionen vorhanden.
              </p>
            </div>
          )}

          {!loadingOptions &&
            options.map((opt) => (
              <OptionCard
                key={opt.id}
                option={opt}
                onVote={handleVote}
                voting={votingId === opt.pollOptionId}
              />
            ))}
        </>
      )}
    </div>
  )
}

// ─── Option Card ─────────────────────────────────────────────────────────────

type OptionCardProps = {
  option: OptionWithPoll
  onVote: (pollId: string, pollOptionId: string, value: VoteValue) => void
  voting: boolean
}

function OptionCard({ option, onVote, voting }: OptionCardProps) {
  const status = statusLabel(option.status)
  const hasOpenPoll = !!option.poll && !!option.pollOptionId

  return (
    <div style={styles.optionCard}>
      {/* Top row: category + status */}
      <div style={styles.optionMeta}>
        <span style={styles.categoryBadge}>{categoryLabel(option.category)}</span>
        <span style={{ ...styles.statusBadge, color: status.color, background: status.bg }}>
          {status.label}
        </span>
      </div>

      {/* Title */}
      <p style={styles.optionTitle}>{option.title ?? 'Ohne Titel'}</p>

      {/* Domain + Price */}
      <div style={styles.optionDetails}>
        {option.source_domain && (
          <span style={styles.optionDomain}>{option.source_domain}</span>
        )}
        {option.price && (
          <span style={styles.optionPrice}>💰 {option.price}</span>
        )}
      </div>

      {/* Vote buttons for open polls */}
      {hasOpenPoll && (
        <div style={styles.voteRow}>
          <p style={styles.pollTitle}>{option.poll!.title}</p>
          <div style={styles.voteBtns}>
            {(['yes', 'no', 'maybe'] as VoteValue[]).map((v) => {
              const active = option.myVote === v
              const emoji = v === 'yes' ? '👍' : v === 'no' ? '👎' : '🤷'
              return (
                <button
                  key={v}
                  onClick={() => onVote(option.poll!.id, option.pollOptionId!, v)}
                  disabled={voting}
                  style={{
                    ...styles.voteBtn,
                    background: active ? 'rgba(26,158,143,0.15)' : 'rgba(255,255,255,0.5)',
                    border: active
                      ? '1.5px solid rgba(26,158,143,0.5)'
                      : '1.5px solid rgba(255,255,255,0.7)',
                    opacity: voting ? 0.6 : 1,
                  }}
                >
                  {emoji}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: '100vh',
    background: '#F0EDE8',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '24px 16px 48px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    gap: 12,
  },
  brand: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.15em',
    color: '#1A9E8F',
    marginBottom: 4,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    background: 'rgba(255,255,255,0.55)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.7)',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  tripName: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1A1A1A',
    margin: 0,
    marginBottom: 6,
    lineHeight: 1.25,
  },
  dateRange: {
    fontSize: 14,
    color: '#6B6B6B',
    margin: 0,
    marginBottom: 16,
  },
  membersRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  avatarStack: {
    display: 'flex',
    flexDirection: 'row' as const,
    flexShrink: 0,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%' as const,
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #F0EDE8',
  },
  memberText: {
    fontSize: 13,
    color: '#6B6B6B',
    margin: 0,
  },
  memberNames: {
    fontSize: 12,
    color: '#9B9B9B',
    margin: 0,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1A1A1A',
    margin: 0,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B6B6B',
    margin: 0,
    marginBottom: 16,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: 15,
    border: '1.5px solid rgba(255,255,255,0.7)',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.6)',
    color: '#1A1A1A',
    outline: 'none',
    boxSizing: 'border-box' as const,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#E85C4A',
    margin: 0,
    marginBottom: 8,
  },
  ctaButton: {
    width: '100%',
    padding: '14px 20px',
    fontSize: 15,
    fontWeight: 700,
    color: '#fff',
    background: '#E8734A',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    marginTop: 4,
  },
  sectionHeader: {
    width: '100%',
    maxWidth: 440,
    paddingLeft: 4,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: 700,
    color: '#6B6B6B',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    margin: 0,
    marginTop: 8,
    marginBottom: 4,
  },
  loadingText: {
    fontSize: 13,
    color: '#9B9B9B',
    margin: 0,
  },
  optionCard: {
    width: '100%',
    maxWidth: 440,
    background: 'rgba(255,255,255,0.55)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.7)',
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  optionMeta: {
    display: 'flex',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap' as const,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: '#6B6B6B',
    background: 'rgba(0,0,0,0.06)',
    borderRadius: 20,
    padding: '3px 8px',
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 20,
    padding: '3px 8px',
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1A1A1A',
    margin: 0,
    marginBottom: 6,
    lineHeight: 1.3,
  },
  optionDetails: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap' as const,
  },
  optionDomain: {
    fontSize: 12,
    color: '#9B9B9B',
  },
  optionPrice: {
    fontSize: 12,
    color: '#6B6B6B',
    fontWeight: 600,
  },
  voteRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid rgba(0,0,0,0.06)',
  },
  pollTitle: {
    fontSize: 12,
    color: '#6B6B6B',
    margin: 0,
    marginBottom: 8,
  },
  voteBtns: {
    display: 'flex',
    gap: 8,
  },
  voteBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    fontSize: 20,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.1s',
  },
} as const
