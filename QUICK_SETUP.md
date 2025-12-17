# 🚀 Rask Supabase Oppsett - 5 Minutter

## Steg 1: Opprett Supabase Konto og Prosjekt

1. **Gå til:** https://supabase.com
2. **Klikk:** "Start your project" eller "Sign in"
3. **Logg inn** med GitHub, Google, eller e-post
4. **Klikk:** "New Project" (grønn knapp)
5. **Fyll ut:**
   - **Name:** `pro11` (eller hva du vil)
   - **Database Password:** Velg et sterkt passord (skriv det ned!)
   - **Region:** Velg "West Europe" (nærmest Norge)
6. **Klikk:** "Create new project"
7. **Vent:** 1-2 minutter mens prosjektet opprettes

## Steg 2: Kjør Database Schema

1. I Supabase dashboard, **klikk på "SQL Editor"** i venstre meny
2. **Klikk:** "New Query" (øverst til høyre)
3. **Åpne filen:** `supabase-schema.sql` i prosjektmappen
4. **Kopier ALT** innholdet (Ctrl+A, Ctrl+C)
5. **Lim inn** i SQL Editor (Ctrl+V)
6. **Klikk:** "Run" (eller trykk Ctrl+Enter)
7. Du skal se: ✅ "Success. No rows returned"

## Steg 3: Hent API-nøkler

1. I Supabase dashboard, **klikk på "Settings"** (tannhjul-ikonet nederst til venstre)
2. **Klikk:** "API" i menyen
3. Du skal se tre viktige verdier:

### Project URL
- Finnes under "Project URL"
- Ser ut som: `https://xxxxxxxxxxxxx.supabase.co`
- **Kopier denne**

### anon public key
- Finnes under "Project API keys" > "anon public"
- Starter med: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Kopier hele denne** (den er lang!)

### service_role key
- Finnes under "Project API keys" > "service_role"
- Starter med: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Kopier hele denne** (den er også lang!)
- ⚠️ **VIKTIG:** Hold denne hemmelig! Ikke del den med noen.

## Steg 4: Opprett .env.local fil

1. **Gå til prosjektmappen** i terminal/kommandolinje
2. **Kopier eksempelfilen:**
   ```bash
   # Windows (PowerShell):
   Copy-Item env.example .env.local
   
   # Mac/Linux:
   cp env.example .env.local
   ```

3. **Åpne `.env.local`** i en teksteditor (VS Code, Notepad++, etc.)

4. **Erstatt verdiene** med dine Supabase-verdier:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://din-prosjekt-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=din_anon_key_her
SUPABASE_SERVICE_ROLE_KEY=din_service_role_key_her

# PayPal Configuration (kan vente til senere)
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here

# Email Configuration (kan vente til senere)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=din_tilfeldige_secret_her

# Production URLs
NEXT_PUBLIC_SITE_URL=https://pro11.no
```

### Eksempel (med dummy-verdier):
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyLCJleHA6MTkzMTgxNTAyMn0.xyz789abc123def456ghi789jkl012mno345pqr678stu
```

**VIKTIG:**
- Ikke ha mellomrom rundt `=` tegnet
- Ikke ha anførselstegn rundt verdiene
- Kopier hele keys (de er veldig lange!)

## Steg 5: Test at det fungerer

1. **Start serveren:**
   ```bash
   npm run dev
   ```

2. **Åpne nettleseren:** http://localhost:3000

3. **Test API-endepunkt:**
   - Gå til: http://localhost:3000/api/tournaments
   - Du skal se JSON med turneringer (inkludert "PRO11 FC 26 Launch Cup")

4. **Test registrering:**
   - Gå til: http://localhost:3000/register
   - Fyll ut skjemaet og registrer et test-lag
   - Gå til Supabase dashboard > **Table Editor** > **teams**
   - Du skal se laget ditt i tabellen!

## ✅ Verifiser i Supabase Dashboard

1. **Table Editor:**
   - Gå til "Table Editor" i venstre meny
   - Du skal se 5 tabeller: `tournaments`, `teams`, `players`, `payments`, `admin_users`
   - Klikk på `tournaments` - du skal se en turnering

2. **Authentication > Policies:**
   - Gå til "Authentication" > "Policies"
   - Du skal se policies for alle tabeller

## 🎉 Klar!

Når alt fungerer, er databasen satt opp og PRO11 lagrer nå data i Supabase i stedet for localStorage!

## 🆘 Hjelp - Noe gikk galt?

### "Missing Supabase environment variables"
- Sjekk at `.env.local` filen eksisterer
- Sjekk at variablene har riktige navn (ingen mellomrom!)
- **Restart serveren** etter å ha lagt til variabler

### "Failed to fetch tournaments"
- Sjekk at du har kjørt `supabase-schema.sql` i SQL Editor
- Sjekk at det finnes en turnering i `tournaments`-tabellen

### "Failed to register team"
- Sjekk at RLS policies er opprettet (gå til Authentication > Policies)
- Sjekk Supabase logs: **Logs** > **Postgres Logs**

### Serveren starter ikke
- Sjekk at du er i riktig mappe: `PRO11-master`
- Kjør: `npm install` hvis du ikke har gjort det

