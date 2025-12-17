# PRO11 Deployment Guide

## 🚀 Fra Demo til Produksjon

Denne guiden hjelper deg å få PRO11 fra demo-tilstand til fullt fungerende produksjonsside.

## 📋 Steg-for-steg oppsett

### 1. Miljøvariabler

Kopier `env.example` til `.env.local` og fyll ut:

```bash
cp env.example .env.local
```

Fyll ut følgende variabler i `.env.local`:

#### Supabase (Database)
- `NEXT_PUBLIC_SUPABASE_URL` - Din Supabase prosjekt URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Din Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Din Supabase service role key

#### PayPal (Betalingsløsning)
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID` - Din PayPal Client ID
- `PAYPAL_CLIENT_SECRET` - Din PayPal Client Secret

#### E-post (Gmail SMTP)
- `EMAIL_USER` - Din Gmail-adresse
- `EMAIL_PASS` - Din Gmail app password (ikke vanlig passord!)

### 2. Supabase Database

1. Gå til [supabase.com](https://supabase.com) og opprett et prosjekt
2. Gå til SQL Editor i Supabase dashboard
3. Kopier innholdet fra `supabase-schema.sql` og kjør det
4. Kopier URL og keys til `.env.local`

### 3. PayPal Betalinger

1. Gå til [developer.paypal.com](https://developer.paypal.com) og opprett konto
2. Opprett en ny app i PayPal Developer Dashboard
3. Velg "Sandbox" for testing eller "Live" for produksjon
4. Kopier Client ID og Client Secret til `.env.local`
5. For produksjon: Aktiver "Live" app og oppdater miljøvariabler

### 4. Gmail E-post

1. Aktiver 2-faktor autentisering på Gmail
2. Generer app password: Google Account > Security > App passwords
3. Bruk app password i `EMAIL_PASS`

### 5. Test lokalt

```bash
npm install
npm run dev
```

Gå til `http://localhost:3000` og test:
- [ ] Forside laster
- [ ] Påmelding fungerer
- [ ] Admin panel fungerer
- [ ] Betaling fungerer (test mode)

### 6. Deploy til Vercel

1. Push koden til GitHub
2. Gå til [vercel.com](https://vercel.com)
3. Importer GitHub repo
4. Legg til miljøvariabler i Vercel dashboard
5. Deploy!

### 7. Produksjons-oppsett

#### Supabase Produksjon
- Opprett produksjons-prosjekt i Supabase
- Oppdater miljøvariabler med produksjons-keys

#### PayPal Produksjon
- Bytt til live keys i PayPal Developer Dashboard
- Test betalinger i produksjons-miljø

#### Domenenavn
- Kjøp `pro11.no` domenenavn
- Sett opp DNS til Vercel
- Oppdater `NEXT_PUBLIC_SITE_URL` i miljøvariabler

## 🔧 Feilsøking

### Vanlige problemer:

1. **"Missing Supabase environment variables"**
   - Sjekk at `.env.local` eksisterer og har riktige verdier

2. **"Payment service unavailable"**
   - Sjekk PayPal Client ID i `.env.local`

3. **E-post sendes ikke**
   - Sjekk Gmail app password
   - Sjekk at 2FA er aktivert

4. **Database feil**
   - Sjekk at Supabase schema er kjørt
   - Sjekk RLS policies

## 📞 Support

Hvis du trenger hjelp:
- Discord: https://discord.gg/Es8UAkax8H
- E-post: kontakt@pro11.no

## ✅ Produksjons-checkliste

- [ ] Alle miljøvariabler satt
- [ ] Supabase database opprettet
- [ ] PayPal konto opprettet
- [ ] Gmail app password generert
- [ ] Testet lokalt
- [ ] Deployet til Vercel
- [ ] Domenenavn konfigurert
- [ ] Produksjons-keys oppdatert
- [ ] Webhooks konfigurert
- [ ] SSL-sertifikat aktivt

Når alt er sjekket av, er PRO11 klar for produksjon! 🎉
