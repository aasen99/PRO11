'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function KjopsvilkarPage() {
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
            <h1 className="text-3xl font-semibold tracking-tight">Kjøpsvilkår – PRO11</h1>
            <p className="text-slate-300">
              Ved påmelding bekrefter kjøper at vilkårene er lest og akseptert.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Generelt</h2>
            <p className="text-slate-300">
              Disse kjøpsvilkårene gjelder for påmelding og deltakelse i digitale Pro Clubs-turneringer arrangert via PRO11.
            </p>
            <p className="text-slate-300">
              PRO11 drives av E-spårt AS og er en uavhengig turneringsplattform. Plattformen er ikke tilknyttet, sponset av eller godkjent av Electronic Arts Inc.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. Partene</h2>
            <div className="text-slate-300 space-y-1">
              <p>Selger: E-spårt AS</p>
              <p>Org.nr: 929 611 543</p>
              <p>E-post: post@espaart.no</p>
            </div>
            <p className="text-slate-300">
              Kjøper: Den person eller det lag som gjennomfører påmelding til turneringen.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. Hva kjøpet gjelder</h2>
            <p className="text-slate-300">
              Kjøpet gjelder deltakelse i en digital turnering innen EA SPORTS FC Pro Clubs, slik den er beskrevet på turneringssiden.
            </p>
            <p className="text-slate-300">
              Påmeldingen gir rett til deltakelse i én spesifikk turnering.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Pris og betaling</h2>
            <p className="text-slate-300">
              Pris for deltakelse oppgis på turneringssiden før påmelding.
            </p>
            <p className="text-slate-300">
              Betaling gjennomføres via tilgjengelige betalingsløsninger på nettsiden. PRO11 lagrer ikke kortinformasjon.
            </p>
            <p className="text-slate-300">
              Påmelding regnes som bindende når betaling er gjennomført.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Angrerett og refusjon</h2>
            <p className="text-slate-300">
              Påmelding til turnering anses som kjøp av digital tjeneste levert på et bestemt tidspunkt.
            </p>
            <p className="text-slate-300">
              I henhold til angrerettloven §22 gjelder det derfor ingen angrerett.
            </p>
            <p className="text-slate-300">
              Påmeldingsavgift refunderes ikke. Unntak gjelder kun dersom turneringen avlyses av arrangør.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Avlysning og endringer</h2>
            <p className="text-slate-300">PRO11 forbeholder seg retten til å:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>Avlyse turneringen ved for få påmeldte lag</li>
              <li>Gjøre nødvendige justeringer i format og tidspunkt</li>
            </ul>
            <p className="text-slate-300">
              Ved avlysning refunderes påmeldingsavgiften i sin helhet.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Deltakeransvar</h2>
            <p className="text-slate-300">Lagleder er ansvarlig for at:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>Korrekt informasjon registreres</li>
              <li>Laget møter til kamp til avtalt tid</li>
              <li>Turneringsreglene følges</li>
            </ul>
            <p className="text-slate-300">
              Brudd på regler kan føre til tap av kamp eller diskvalifikasjon uten refusjon.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Tekniske forhold</h2>
            <p className="text-slate-300">PRO11 er ikke ansvarlig for forhold utenfor vår kontroll, herunder:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>Problemer med spillservere</li>
              <li>Nettverksfeil hos deltaker</li>
              <li>Tekniske feil hos tredjepartsleverandører</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">9. Statistikk og historikk</h2>
            <p className="text-slate-300">
              Resultater, statistikk og historikk fra turneringer lagres som en del av PRO11s turneringssystem.
            </p>
            <p className="text-slate-300">
              Disse dataene slettes ikke ved avsluttet turnering.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">10. Personopplysninger</h2>
            <p className="text-slate-300">
              Behandling av personopplysninger skjer i henhold til PRO11s personvernerklæring.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">11. Tvister</h2>
            <p className="text-slate-300">
              Eventuelle tvister skal søkes løst i minnelighet.
            </p>
            <p className="text-slate-300">
              Dersom dette ikke lykkes, kan saken bringes inn for Forbrukertilsynet eller behandles etter norsk rett med verneting i Norge.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
