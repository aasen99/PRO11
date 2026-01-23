'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PersonvernPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <header className="mx-4 mt-4 h-24 bg-slate-950 border border-slate-900 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="w-24 h-full flex items-center justify-center hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="PRO11 Logo" className="w-full h-full object-contain" />
            </Link>
            <div className="ml-4">
              <p className="text-slate-400 text-sm">Pro Clubs Turneringer</p>
            </div>
          </div>
          <Link href="/" className="pro11-button-secondary flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Tilbake</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 flex flex-col items-center">
        <div className="pro11-card p-8 w-full max-w-4xl space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Personvernerklæring</h1>
            <p className="text-slate-300">
              Sist oppdatert: gjeldende versjon publiseres alltid på nettsiden.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Innledning</h2>
            <p className="text-slate-300">
              PRO11 er en uavhengig turneringsplattform for Pro Clubs i spillet EA SPORTS FC.
              Plattformen drives av E-spårt AS og er ikke tilknyttet, sponset av eller godkjent av Electronic Arts Inc.
            </p>
            <p className="text-slate-300">
              Denne personvernerklæringen forklarer hvilke personopplysninger vi behandler, hvorfor vi behandler dem og hvilke rettigheter du har.
            </p>
            <p className="text-slate-300">
              Behandlingen skjer i samsvar med personopplysningsloven og EUs personvernforordning (GDPR).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. Behandlingsansvarlig</h2>
            <div className="text-slate-300 space-y-1">
              <p>E-spårt AS</p>
              <p>Org.nr: 929611543</p>
              <p>Kontakt: post@espaart.no</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. Hvilke personopplysninger vi samler inn</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>
                <span className="font-semibold">Bruker- og laginformasjon:</span> navn, e-postadresse, lagnavn og laginformasjon, rolle (lagleder / deltaker).
              </li>
              <li>
                <span className="font-semibold">Turneringsdata:</span> påmeldinger, kampresultater, statistikk, prestasjoner og historikk.
              </li>
              <li>
                <span className="font-semibold">Betalingsinformasjon:</span> betalingsstatus og transaksjonsreferanser. PRO11 lagrer ikke kortinformasjon. Betaling håndteres av tredjeparts betalingsleverandører.
              </li>
              <li>
                <span className="font-semibold">Teknisk informasjon:</span> IP-adresse, enhetstype og nettleser, bruk av nettsiden (for sikkerhet og drift).
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Formål med behandlingen</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>Administrere brukerkontoer</li>
              <li>Gjennomføre Pro Clubs-turneringer</li>
              <li>Registrere og bekrefte kampresultater</li>
              <li>Føre statistikk, rekorder og historikk</li>
              <li>Håndtere betaling og påmelding</li>
              <li>Yte kundestøtte</li>
              <li>Sikre stabil og trygg drift av plattformen</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Rettslig grunnlag</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>Avtale: for å levere turneringsdeltakelse</li>
              <li>Berettiget interesse: drift, sikkerhet og forbedring av tjenesten</li>
              <li>Rettslig forpliktelse: regnskaps- og bokføringskrav</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Deling av personopplysninger</h2>
            <p className="text-slate-300">Opplysninger deles kun med:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>Betalingsleverandører (f.eks. Vipps / Stripe)</li>
              <li>Tekniske leverandører (hosting, database, drift)</li>
            </ul>
            <p className="text-slate-300">
              Personopplysninger selges aldri videre og brukes ikke til tredjepartsmarkedsføring.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Lagringstid</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>Så lenge brukerkontoen er aktiv</li>
              <li>Så lenge statistikk og historikk er relevant for turneringssystemet</li>
              <li>Betalingsinformasjon lagres i henhold til bokføringsloven (5 år)</li>
            </ul>
            <p className="text-slate-300">Brukerkonto kan slettes på forespørsel.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Dine rettigheter</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>Be om innsyn i egne opplysninger</li>
              <li>Få rettet eller slettet opplysninger</li>
              <li>Protestere mot behandling</li>
              <li>Be om dataportabilitet</li>
              <li>Trekke tilbake samtykke der dette er aktuelt</li>
            </ul>
            <p className="text-slate-300">Klage kan rettes til Datatilsynet.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">9. Informasjonskapsler (cookies)</h2>
            <p className="text-slate-300">PRO11 benytter informasjonskapsler for:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>Nødvendig funksjonalitet</li>
              <li>Innlogging og sikkerhet</li>
              <li>Anonym besøksstatistikk</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">10. Endringer</h2>
            <p className="text-slate-300">
              Personvernerklæringen kan oppdateres ved behov. Gjeldende versjon publiseres alltid på nettsiden.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">11. Kontakt</h2>
            <div className="text-slate-300 space-y-1">
              <p>E-spårt AS</p>
              <p>Daglig leder: Benjamin André Aasen</p>
              <p>📧 benjamin@espaart.no</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
