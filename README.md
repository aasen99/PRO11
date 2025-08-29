# PRO11 - Pro Clubs Turneringer

MVP-nettside for Pro Clubs-turneringer med lansering i september 2025.

## 🎯 Mål

Bygge en enkel og stilren nettside for PRO11.no som håndterer påmelding og gir info rundt kommende og aktive Pro Clubs-turneringer. Fokus på brukervennlighet, eksklusivitet og moderne esport-stil.

## ✨ Funksjoner

### Forside
- Viser neste turnering (tittel, dato, premieinfo)
- Call-to-action-knapp: "Meld på lag"
- Kort tekst om hva PRO11 er
- Lenker til Discord og reglene

### Påmeldingsskjema
- Felter for lagnavn, kaptein (navn og e-post), og medspillere (PSN/EA ID)
- Mulighet for 5–11 spillere
- Innsending = lag registrert i databasen
- Betaling kan være manuelt i første omgang (Vipps eller bank)

### Turneringsoversikt
- Liste over aktive og kommende turneringer
- Viser navn, dato, status (åpen/pågår/lukket/fullført)
- Antall påmeldte lag
- Lenke til turneringsdetaljer

### Admin-backend
- Se påmeldte lag per turnering
- Mulighet for å markere lag som "Godkjent" eller "Avvist"
- Legge til nye turneringer
- Eksportere deltakerliste (CSV)

## 🎨 Design

- **Mørk stil**: Bakgrunnsfarge: nattblå, kort/bokser: skyggegrå, tekst: hvit/grå, aksentfarge: signalblå
- PRO11-logo i skjoldform brukes sentralt
- Tydelige, store knapper
- Enkle visuelle skiller mellom seksjoner (cards eller bakgrunnsblokker)
- Fokus på esport- og konkurransefølelse

## 🛠️ Teknisk Stack

- **Frontend**: Next.js 15 med TypeScript
- **Styling**: Tailwind CSS
- **Ikoner**: Lucide React
- **Database**: (Planlagt: Supabase)
- **Hosting**: (Planlagt: Vercel)

## 🚀 Kom i gang

### Forutsetninger
- Node.js 18+ 
- npm eller yarn

### Installasjon

1. Klone prosjektet:
```bash
git clone [repository-url]
cd PRO11
```

2. Installer avhengigheter:
```bash
npm install
```

3. Start utviklingsserver:
```bash
npm run dev
```

4. Åpne [http://localhost:3000](http://localhost:3000) i nettleseren

### Bygg for produksjon

```bash
npm run build
npm start
```

## 📁 Prosjektstruktur

```
src/
├── app/
│   ├── admin/          # Admin-dashboard
│   ├── register/       # Påmeldingsskjema
│   ├── tournaments/    # Turneringsoversikt
│   ├── globals.css     # Global styling
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Forside
├── components/         # Gjenbrukbare komponenter
└── lib/               # Utility-funksjoner
```

## 🔧 Utvikling

### Scripts
- `npm run dev` - Start utviklingsserver
- `npm run build` - Bygg for produksjon
- `npm run start` - Start produksjonsserver
- `npm run lint` - Kjør ESLint

### Styling
Prosjektet bruker Tailwind CSS med custom PRO11-designsystem:
- `.pro11-card` - Standard kort-styling
- `.pro11-button` - Primær knapp
- `.pro11-button-secondary` - Sekundær knapp
- `.pro11-input` - Input-felt styling

## 📋 TODO

- [ ] Integrere Supabase for database
- [ ] Implementere betalingsløsning (Stripe/Vipps)
- [ ] Legge til autentisering for admin
- [ ] Implementere e-postvarsling
- [ ] Legge til turneringsdetaljer-sider
- [ ] Implementere live resultater
- [ ] Legge til Discord-integrasjon
- [ ] Implementere push-varsler

## 📞 Kontakt

- Discord: [https://discord.gg/Es8UAkax8H](https://discord.gg/Es8UAkax8H)
- E-post: [kontakt@pro11.no](mailto:kontakt@pro11.no)

## 📄 Lisens

© 2025 PRO11. Alle rettigheter forbeholdt. 