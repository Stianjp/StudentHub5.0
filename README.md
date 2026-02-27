# OSH StudentHub 5.0 – MVP

Produksjonsklar MVP for screening, matching og eventverktøy for Oslo Student Hub (OSH).

Appen er bygget for karrieredager (QR/kiosk) og som en kontinuerlig plattform for rekruttering og employer branding.

## Stack

- Next.js 16 (App Router) + React + TypeScript
- Tailwind CSS (design tokens i `tailwind.config.ts`)
- Supabase (Postgres, Auth, RLS)
- Resend (transactional e-post)
- Google Gemini via server-side API route (`/api/ai/summary`)

## Roller og porter

- Bedrift: `/company`
- Student: `/student`
- Event / ConnectHub: `/event`
- Admin (OSH): `/admin`

Host-basert routing er implementert i `proxy.ts`:

- `bedrift.*` → `/company`
- `admin.*` → `/admin`
- `student.*` → `/student`
- `connecthub.*` → `/event`

I utvikling kan du teste host-routing med query param:

- `http://localhost:3000/?host=bedrift`
- `http://localhost:3000/?host=student`
- `http://localhost:3000/?host=admin`
- `http://localhost:3000/?host=connecthub`

## Miljøvariabler

Opprett `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Valgfri (men anbefalt i prod)
RESEND_API_KEY=...
GEMINI_API_KEY=...

# CRM (Google Sheets masterdata)
CRM_GOOGLE_SHEET_ID=... # Sheet ID eller full Google Sheet URL
CRM_GOOGLE_SHEET_RANGE=OSH CRM Leads!A1:ZZ
CRM_GOOGLE_SERVICE_ACCOUNT_EMAIL=...
CRM_GOOGLE_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n\"
CRM_DISCORD_GUILD_ID=... # valgfri, brukes for lenker til Discord-kanal/melding

# Fallback (kun hvis sheet er offentlig/publisert)
GOOGLE_SHEETS_API_KEY=...

# Hvis arket er offentlig delt, kan CRM lese via gviz uten nøkler.
# Da holder det med CRM_GOOGLE_SHEET_ID.
```

Viktig:

- Ikke hardkod Supabase URL eller nøkler.
- Service role key skal kun brukes server-side (ikke i denne MVP-en).

## Supabase-oppsett (må gjøres først)

Kjør SQL i Supabase SQL Editor:

1. Migrasjon: `supabase/migrations/0001_init.sql`
2. Seed: `supabase/seed.sql`

### Opprette admin-bruker (manuelt)

Admin opprettes ikke automatisk (med vilje).

Flyt:

1. Logg inn via `/auth/sign-in` med rollen `admin`.
2. Finn brukerens `id` i `auth.users`.
3. Sett admin-rolle manuelt:

```sql
insert into public.profiles (id, role)
values ('<AUTH_USER_ID>', 'admin')
on conflict (id) do update set role = 'admin';
```

## Kjør lokalt

```bash
npm install
npm run dev
```

Nyttige kommandoer:

```bash
npm run lint
npm run build
```

## Hva MVP-en dekker

### Bedrift

- Magic link login (Supabase Auth)
- Onboarding (firma-info, rekruttering, branding)
- Eventpåmelding
- Leads (kun samtykke)
- CSV-eksport: `/api/company/leads/export`
- ROI + AI-oppsummering (kun platinum + gyldig tilgang)

### Student

- Mobil-først profil
- Favoritt-bedrifter
- Samtykke oversikt

### Event / karrieredag

- Event landing: `/event`
- Event-side: `/event/{eventId}`
- Stand-QR: `/event/{eventId}/company/{companyId}`
- Kioskmodus: `/event/{eventId}/kiosk` (auto-reset etter 5 sek)

### Admin (OSH)

- Opprette/redigere events
- Invitere bedrifter (Resend + `email_logs`)
- Sette pakker per bedrift per event
- Totaloversikt
- CRM dashboard fra Google Sheet: `/admin/crm`
- CRM API (admin-beskyttet): `/api/admin/crm/leads`

## Matching (regelbasert)

Implementert i `lib/matching.ts` med vekting:

- Studieretning/interesser: 40 %
- Jobbtype: 20 %
- Verdier/kultur: 20 %
- Lokasjon/flytting: 10 %
- Student liker bedriften: 10 %

Resultater lagres i `match_scores` per event.

## AI-endpoint (Gemini – server-side)

- Endpoint: `POST /api/ai/summary`
- Input: `{ event_id, company_id }`
- Krever platinum + gyldig tilgangsperiode
- Fallback brukes hvis `GEMINI_API_KEY` mangler

## Personvern og sikkerhet (RLS)

RLS er aktivert for alle tabeller.

Viktig designvalg i MVP:

- Kontaktinfo ligger i `students` (strengt begrenset via RLS).
- Matching bruker `student_public_profiles` uten kontaktinfo.
- Kontaktinfo vises kun når consent=true.

Merk:

- Det finnes midlertidige “public read (MVP)” policies for `companies` og `event_companies` for å forenkle event-sider. Disse bør strammes inn før full produksjon.

## Filstruktur (hovedpunkter)

- Supabase SQL: `supabase/migrations/0001_init.sql`, `supabase/seed.sql`
- Proxy/host routing: `proxy.ts`
- Supabase klienter: `lib/supabase/*`
- Matching/ROI/CSV: `lib/matching.ts`, `lib/company.ts`, `lib/csv.ts`
- UI-komponenter: `components/ui/*`

## TODO etter MVP

- Stramme inn public read policies
- Flytte admin-operasjoner til service role / Edge Functions
- Legge til robust feilhåndtering per action
- Knytte seed-data til ekte brukere (`user_id`)
- Vercel subdomener + DNS
