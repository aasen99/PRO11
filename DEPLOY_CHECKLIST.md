# 🚀 PRO11 Deploy Checklist

## ✅ Endringer Gjort - Demo Data Fjernet

### 1. Admin Page
- ✅ Henter tournaments fra database via API
- ✅ Henter teams fra database via API (ikke localStorage)
- ✅ Fjernet hardkodet tournaments array

### 2. Captain Login
- ✅ Henter teams fra database
- ✅ Sjekker passord mot database
- ✅ Fjernet mock teams array

### 3. Tournaments
- ✅ Alle sider henter fra database
- ✅ Fjernet fallback tournaments
- ✅ Home page bruker fetchTournaments()
- ✅ Register page bruker fetchTournamentById()
- ✅ Tournament detail page henter fra API

### 4. Database
- ✅ All data lagres i Supabase
- ✅ Ingen localStorage for teams/tournaments
- ✅ API-endepunkter fungerer

## 📋 Pre-Deploy Checklist

### Miljøvariabler i Vercel
Legg til disse i Vercel dashboard under Settings > Environment Variables:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Din Supabase URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Din Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Din Supabase service role key
- [ ] `NEXT_PUBLIC_PAYPAL_CLIENT_ID` - Din Live PayPal Client ID
- [ ] `NEXT_PUBLIC_SITE_URL` - Din produksjons-URL (f.eks. https://pro11.no)

### Database
- [ ] Supabase schema er kjørt i produksjon
- [ ] [ ] Minst én turnering er opprettet i database
- [ ] RLS policies er aktive

### PayPal
- [ ] Live PayPal Client ID er satt i Vercel
- [ ] PayPal webhooks er konfigurert (hvis nødvendig)

## 🚀 Deploy til Vercel

### Steg 1: Push til GitHub
```bash
git add .
git commit -m "Remove demo data, use database only"
git push origin main
```

### Steg 2: Deploy på Vercel
1. Gå til [vercel.com](https://vercel.com)
2. Klikk "Add New Project"
3. Importer GitHub repository
4. Legg til alle miljøvariabler
5. Klikk "Deploy"

### Steg 3: Verifiser
- [ ] Forside laster
- [ ] Turneringer vises fra database
- [ ] Registrering fungerer
- [ ] Betaling fungerer
- [ ] Admin panel fungerer

## ⚠️ Viktig

- **Ikke commit `.env.local`** - den er allerede i `.gitignore`
- **Bruk Live PayPal Client ID** i produksjon
- **Test betalinger** med små beløp først
- **Backup database** regelmessig i Supabase

## 🔧 Hvis Noe Går Galt

1. Sjekk Vercel logs under "Deployments"
2. Sjekk Supabase logs under "Logs"
3. Verifiser at alle miljøvariabler er satt
4. Test API-endepunkter direkte: `https://din-side.vercel.app/api/tournaments`

