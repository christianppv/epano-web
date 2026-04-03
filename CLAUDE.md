# ENAPO-web — CLAUDE.md

## Was dieses Repo ist

Next.js-Web-App für ENAPO. Kein Feature-Parität mit der App.
Exakt zwei Zwecke:
1. `/join/[code]` — Invite-Landing-Page für Beta-Nutzer ohne App
2. `/` — Marketing-Placeholder (Coming Soon, wird später ausgebaut)

Repo: github.com/christianppv/ENAPO-web
App-Repo (React Native): github.com/christianppv/EPANO

---

## Tech Stack

- Next.js 14, App Router, TypeScript
- Supabase JS Client (@supabase/supabase-js)
- CSS Modules oder inline styles — kein Tailwind, kein UI-Framework
- Deployment: Vercel
- Domain: enapo.app

---

## Supabase

Gleiche Instanz wie die App.
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
POSTHOG_API_KEY=        ← server-side only, kein NEXT_PUBLIC_
```

RLS ist aktiv. Alle Queries laufen durch RLS-Policies.
Keine Migrations hier ausführen — DB-Schema liegt im EPANO-Repo.

Relevante Tabellen (read-only aus Web-Perspektive):
- `trips` — id, name, date_from, date_to, invite_code, created_by
- `trip_members` — trip_id, user_id, role, joined_at
- `options` — id, trip_id, url, title, image_url, price, category, status
- `polls` — id, trip_id, title, status, deadline
- `poll_options` — id, poll_id, option_id
- `votes` — id, poll_id, poll_option_id, user_id, value

Relevante RPC:
- `join_trip_by_invite_code(invite_code, first_name)` — gibt trip_id zurück

---

## Design System

Liquid Glass — konsistent mit der App.
Tokens in `src/constants/tokens.ts` (aus dem App-Repo kopiert).

Kernwerte:
- Background: #F0EDE8
- Primary Teal: #1A9E8F
- CTA Coral: #E8734A
- Glass Card: rgba(255,255,255,0.55), backdrop-filter blur(20px)
- Border: 1px solid rgba(255,255,255,0.7)
- Border-Radius: 16px (Karten), 20px (Pills)
- Text Primary: #1A1A1A, Secondary: #6B6B6B, Muted: #9B9B9B

---

## Route: /join/[code]

Das ist die einzige vollständige Route. Alles andere ist Placeholder.

### Was diese Seite tut

1. Trip-Daten laden via `invite_code` (SSR, generateMetadata für OG-Tags)
2. Anzeigen: Trip-Name, Zeitraum, Teilnehmer (Avatar-Stack + Namen)
3. Beitritt: Vorname eingeben → `join_trip_by_invite_code` RPC
4. Nach Beitritt: Optionsliste (read-only: Titel, Domain, Kategorie, Preis)
5. Voting: Vote-Buttons (👍 Ja / 👎 Nein / 🤷 Maybe) bei offenen Polls

### Was diese Seite NICHT tut

- Kein Login, kein Account-Zwang
- Kein Trip erstellen
- Kein Link-Parsing, keine neuen Optionen
- Kein Chat
- Keine Navigation zu anderen Screens

### OG-Tags (kritisch für WhatsApp-Preview)
```typescript
og:title     → "[Trip-Name] – ENAPO"
og:description → "[N] Personen planen bereits · Jetzt beitreten"
og:image     → /og-preview.png (statisch, liegt in /public)
```

### Graceful Degradation

- Ungültiger invite_code → freundliche Fehlerseite, kein 500
- Fehlende Optionsmetadaten → Karte trotzdem anzeigen (Domain + Titel reicht)
- Poll ohne Votes → Voting-Buttons trotzdem zeigen

---

## Analytics

Kein PostHog Browser-SDK. Kein `NEXT_PUBLIC_POSTHOG_KEY`.

Einziges Event das gefeuert wird: `invite_accepted`
Implementierung: `/api/analytics` Route (POST), ruft PostHog server-side auf.
```typescript
// Payload
{
  event: 'invite_accepted',
  properties: {
    trip_id: string,
    distinct_id: string  // temporäre ID, z.B. crypto.randomUUID()
  }
}
```

PostHog Project ID: 151841 (EU-Region, https://eu.posthog.com)

---

## Architektur-Entscheidungen

**Warum kein Auth-Zwang beim Beitreten:**
Invite-Akzeptanzrate ist eine Beta-Kernmetrik (Ziel >60%).
Jede zusätzliche Hürde senkt diese Rate messbar.
Vorname reicht für die Beta.

**Warum SSR für Trip-Daten:**
OG-Tags müssen beim ersten Request gesetzt sein —
WhatsApp/iMessage liest sie beim Teilen des Links.
Client-side Fetch wäre zu spät.

**Warum kein Monorepo mit dem App-Repo:**
Expo und Next.js haben inkompatible Build-Systeme.
Getrennte Repos, gleiche Supabase-Instanz.

---

## Was hier NICHT gebaut wird

Alles was nicht direkt zur Invite-Landing-Page oder zum
Marketing-Placeholder gehört, ist Out of Scope:

- Vollständige Web-App mit Auth
- Trip erstellen im Browser
- Dashboard oder Admin-Bereich
- Eigene Datenbank oder eigenes Backend

Scope-Fragen: Erst fragen, dann bauen.

---

## Deployment

Vercel, automatisch via GitHub Push auf `main`.
Preview-Deployments für jeden Branch aktiv.
Domain: enapo.app → Vercel-Projekt verbunden.

Umgebungsvariablen müssen in Vercel gesetzt sein —
nicht nur in `.env.local`.

---

## Bekannte offene Punkte

- [ ] App muss Invite-Links von `epano://join/[code]`
      auf `https://enapo.app/join/[code]` umstellen
      (Änderung liegt im EPANO-Repo, nicht hier)
- [ ] OG-Bild `/public/og-preview.png` muss erstellt werden
- [ ] Marketing-Seite `/` ist Placeholder, wird nach
      Beta-Persevere-Signal ausgebaut

---

## Commit-Konvention
```
feat: landing page zeigt optionsliste nach beitritt
fix: vote-button state nach upsert korrekt
chore: tokens.ts aktualisiert
```