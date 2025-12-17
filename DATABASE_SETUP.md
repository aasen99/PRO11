# PRO11 Database Setup Guide

Denne guiden hjelper deg med å sette opp Supabase-databasen for PRO11.

## 📋 Steg 1: Opprett Supabase Prosjekt

1. Gå til [supabase.com](https://supabase.com)
2. Logg inn eller opprett konto
3. Klikk "New Project"
4. Velg region nær Norge (f.eks. "West Europe")
5. Velg et passord for databasen (husk dette!)
6. Vent til prosjektet er opprettet (tar 1-2 minutter)

## 🔧 Steg 2: Sett opp Database Schema

1. I Supabase dashboard, gå til **SQL Editor** (i venstre meny)
2. Klikk **New Query**
3. Åpne filen `supabase-schema.sql` i prosjektet
4. Kopier **alt** innholdet fra filen
5. Lim inn i SQL Editor
6. Klikk **Run** (eller trykk Ctrl+Enter)
7. Du skal se "Success. No rows returned" eller lignende

## 🔐 Steg 3: Hent API-nøkler

1. I Supabase dashboard, gå til **Settings** > **API**
2. Du trenger:
   - **Project URL** (f.eks. `https://xxxxx.supabase.co`)
   - **anon public** key (starter med `eyJ...`)
   - **service_role** key (starter med `eyJ...`) - **Viktig: Hold denne hemmelig!**

## 📝 Steg 4: Konfigurer Miljøvariabler

1. I prosjektmappen, kopier `env.example` til `.env.local`:
   ```bash
   cp env.example .env.local
   ```

2. Åpne `.env.local` og fyll ut:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (anon public key)
   SUPABASE_SERVICE_ROLE_KEY=eyJ... (service_role key)
   ```

3. **Viktig:** `.env.local` er allerede i `.gitignore` og vil ikke bli committet til Git

## ✅ Steg 5: Test Database-tilkoblingen

1. Start utviklingsserveren:
   ```bash
   npm run dev
   ```

2. Gå til `http://localhost:3000`
3. Prøv å registrere et lag
4. Sjekk i Supabase dashboard under **Table Editor** > **teams** at laget ble lagret

## 🔍 Verifiser at Alt Fungerer

### Sjekk at tabeller er opprettet:
1. I Supabase dashboard, gå til **Table Editor**
2. Du skal se disse tabellene:
   - `tournaments`
   - `teams`
   - `players`
   - `payments`
   - `admin_users`

### Sjekk at RLS policies er aktive:
1. Gå til **Authentication** > **Policies**
2. Du skal se policies for alle tabeller

### Test API-endepunkter:
1. Gå til `http://localhost:3000/api/tournaments`
2. Du skal se JSON med turneringer fra databasen
3. Gå til `http://localhost:3000/api/teams`
4. Du skal se JSON med lag (tom array hvis ingen lag er registrert)

## 🚨 Feilsøking

### "Missing Supabase environment variables"
- Sjekk at `.env.local` eksisterer
- Sjekk at variablene har riktige navn (må starte med `NEXT_PUBLIC_` for client-side)
- Restart utviklingsserveren etter å ha lagt til variabler

### "Failed to register team"
- Sjekk at `supabase-schema.sql` er kjørt fullstendig
- Sjekk at det finnes minst én turnering i `tournaments`-tabellen
- Sjekk Supabase logs under **Logs** > **Postgres Logs**

### "RLS policy violation"
- Sjekk at RLS policies er opprettet i `supabase-schema.sql`
- Gå til **Authentication** > **Policies** og verifiser at policies eksisterer

### Database-tilkobling fungerer ikke
- Sjekk at Supabase-prosjektet er aktivt (ikke pauset)
- Sjekk at URL og keys er riktig kopiert (ingen mellomrom)
- Prøv å opprette en ny anon key i Supabase dashboard

## 📊 Database Struktur

### Tournaments
- Lagrer alle turneringer
- Eksempel-turnering er allerede lagt til i schema

### Teams
- Lagrer alle registrerte lag
- Automatisk koblet til turnering via `tournament_id`

### Players
- Lagrer spillere i hvert lag
- Kapteinen blir automatisk lagt til ved registrering

### Payments
- Lagrer alle betalinger
- Koblet til lag via `team_id`

## 🔄 Oppdatere Database Schema

Hvis du trenger å endre database-strukturen:

1. Gå til **SQL Editor** i Supabase
2. Skriv ALTER TABLE-statements
3. Test lokalt først
4. Dokumenter endringene

## 🎉 Neste Steg

Når databasen fungerer:

1. Sett opp PayPal/Stripe for betalinger
2. Sett opp e-post (Gmail SMTP)
3. Deploy til Vercel
4. Legg til miljøvariabler i Vercel dashboard

Se `DEPLOYMENT_GUIDE.md` for full produksjons-oppsett.

