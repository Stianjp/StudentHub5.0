# OSH StudentHub 5.0

Nettside og portaler for Oslo Student Hub. Samme Next.js-app betjener hovedsiden, student- og bedriftsportaler, arrangementer og administrasjon. Prosjektet deployes til Vercel fra GitHub. Se Vercel-prosjektets innstillinger for hvilken gren og hvilke domener som er knyttet til produksjon; dette er ikke definert i repoet.

## Teknologi og oppbygging

- Next.js 16 (App Router), React 19, TypeScript og Tailwind CSS 4. Globale stiler ligger i `app/globals.css`, som laster `tailwind.config.ts`.
- Supabase brukes til database, autentisering og lagring. Klienter og serverhjelpere ligger i `lib/supabase/`; SQL-endringer ligger i `supabase/migrations/`.
- Resend brukes til e-post. CRM kan lese og synkronisere data mot Google Sheets. Gemini brukes av `POST /api/ai/summary` når nøkkel er satt.
- Sider og API-endepunkter ligger i `app/`, gjenbrukbar logikk i `lib/`, komponenter i `components/` og statiske filer i `public/`.
- `apps/print-agent/` er en separat hjelpeapp med eget `package.json`.

`proxy.ts` ruter etter domenenavn: hoveddomenet og `www` til `/hovedside`, `bedrift` til `/company`, `student` til `/student`, `admin` til `/admin`, `connecthub`/`studentconnect`/`event` til `/event`, `eventregister` til `/event-register` og `feedback` til `/feedback`. Lokalt kan du teste for eksempel `http://localhost:3000/?host=bedrift`.

## Kom i gang lokalt

Bruk Node.js 22 (samme hovedversjon som GitHub Actions) og npm. Opprett `.env.local` i prosjektroten med minst:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Appen trenger et Supabase-prosjekt med relevante migrasjoner. `supabase/seed.sql` inneholder eksempeldata; det er ikke en erstatning for migrasjonene. Andre integrasjoner krever egne miljøvariabler etter behov, blant annet `SUPABASE_SERVICE_ROLE_KEY` for serveroperasjoner, `RESEND_API_KEY`, `GEMINI_API_KEY`, `CRM_GOOGLE_SHEET_ID`, servicekonto for Google Sheets, `CRM_SYNC_WEBHOOK_SECRET` og `CRON_SECRET`. Legg aldri hemmelige nøkler i `NEXT_PUBLIC_`-variabler.

```bash
npm ci
npm run dev
```

## Tester og GitHub Actions

`.github/workflows/ci.yml` kjører ved push til `main` og ved pull requests. Først bygger den appen og kjører enhetstester på Ubuntu. Deretter bygger den appen og kjører Playwright-tester i Chromium på macOS. Begge jobber krever `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY` som GitHub Variables eller Secrets. CI avbryter tidlig med en egen feilmelding hvis en av dem mangler.

```bash
npm run build          # samme byggesteg som CI
npm run test:unit      # Vitest, tests/unit/
npm run test:e2e       # Playwright, tests/e2e/
npm run lint           # ESLint; kjøres ikke i dagens CI
```

Før første lokale Playwright-kjøring: `npx playwright install chromium`. Standardoppsettet starter utviklingsserveren automatisk lokalt; CI starter den bygde appen. Testene i `student-portal.spec.ts` og `event-management.spec.ts` hoppes over i standardkjøringen. De har egne Playwright-oppsett med testservere: `tests/student.playwright.config.ts` og `tests/event.playwright.config.ts`. De er ikke egne steg i GitHub-workflowen.

Ved feil på GitHub: åpne **Actions → CI → den feilede kjøringen**. Se først om feilen ligger i **Build and unit tests** eller **Playwright E2E**, og les loggen fra det feilede steget. Playwright-jobben laster også opp `playwright-report` og `test-results` som artefakter. En grønn lokal test garanterer ikke grønn CI når miljøvariabler, operativsystem eller testdata er ulike.

## Viktige områder

- Hovedside og offentlige sider: `app/hovedside/`
- Studentportal: `app/student/`
- Bedriftsportal: `app/company/`
- Arrangement, registrering og innsjekk: `app/event/`, `app/event-register/`, `app/checkin/`
- Student Connect 2027-interesseliste: skjema på `/event-register` og `/partners`, adminliste og CSV på `/admin/student-connect-2027-interest`. Innsending krever `SUPABASE_SERVICE_ROLE_KEY` på serveren og migrasjonene for interessetabellen. Utsending skjer manuelt.
- Administrasjon og CRM: `app/admin/`, `lib/crm*.ts`
- API: `app/api/`
- Supabase-endringer: `supabase/migrations/`

Før utrulling: kontroller at nødvendige miljøvariabler også finnes i Vercel, og at databaseendringer er brukt på riktig Supabase-prosjekt. En Git-push alene kjører ikke SQL-migrasjonene i dette repoet.
