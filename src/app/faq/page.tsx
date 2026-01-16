'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface FAQItem {
  id: string
  question: string
  answer: string
  category: 'general' | 'registration' | 'tournaments' | 'rules' | 'payment'
}

export default function FAQPage() {
  const faqItems: FAQItem[] = [
    // General
    {
      id: '1',
      question: 'Hva er PRO11?',
      answer: 'PRO11 er Norges ledende plattform for Pro Clubs-turneringer i FC 26. Vi arrangerer eksklusive konkurranser for de beste lagene i landet med store premier og profesjonell organisering.',
      category: 'general'
    },
    {
      id: '2',
      question: 'Når lanseres PRO11?',
      answer: 'PRO11 lanseres i september 2025 sammen med FC 26. Vår første turnering, FC 26 Launch Cup, starter 15. september 2025.',
      category: 'general'
    },
    {
      id: '3',
      question: 'Hvordan kan jeg holde meg oppdatert?',
      answer: 'Følg oss på Discord for å få alle oppdateringer først! Vi poster regelmessig om nye turneringer, endringer i regler og andre viktige nyheter.',
      category: 'general'
    },

    // Registration
    {
      id: '4',
      question: 'Hvor mange spillere må vi være på laget?',
      answer: 'Du må ha minimum 5 spillere og maksimum 11 spillere på laget. Alle spillere må ha gyldig PSN/EA ID.',
      category: 'registration'
    },
    {
      id: '5',
      question: 'Kan jeg melde på laget mitt selv?',
      answer: 'Ja, du kan melde på laget ditt som kaptein. Du trenger navn, e-post og PSN/EA ID for alle spillere på laget.',
      category: 'registration'
    },
    {
      id: '6',
      question: 'Hva skjer etter påmelding?',
      answer: 'Etter påmelding får du bekreftelse på e-post. Vi vurderer deretter laget ditt og godkjenner det hvis alt er i orden. Du får deretter informasjon om betaling.',
      category: 'registration'
    },
    {
      id: '7',
      question: 'Kan jeg endre laget mitt etter påmelding?',
      answer: 'Du kan endre laget ditt opp til 48 timer før turneringen starter. Kontakt oss på Discord for endringer.',
      category: 'registration'
    },

    // Tournaments
    {
      id: '8',
      question: 'Hvor ofte arrangeres turneringer?',
      answer: 'Vi arrangerer turneringer månedlig, med større turneringer hver 3. måned. Alle turneringer annonseres minst 2 uker før påmeldingen åpner.',
      category: 'tournaments'
    },
    {
      id: '9',
      question: 'Hva er turneringsformatet?',
      answer: 'De fleste turneringer starter med gruppespill hvor alle lag møter hverandre. Topp lagene går videre til sluttspill med kvartfinaler, semifinaler og finale.',
      category: 'tournaments'
    },
    {
      id: '10',
      question: 'Hvor lenge varer en turnering?',
      answer: 'En typisk turnering varer 1-2 uker med kamper spilt på kvelder og helger. Sluttspillkamper spilles som best-of-3.',
      category: 'tournaments'
    },

    // Rules
    {
      id: '11',
      question: 'Hvilke regler gjelder i turneringene?',
      answer: 'Vi følger standard Pro Clubs-regler med noen tilpasninger for konkurranse. Alle regler finnes i vårt regelverk som kan lastes ned fra nettsiden.',
      category: 'rules'
    },
    {
      id: '12',
      question: 'Hva skjer ved uavgjort?',
      answer: 'Ved uavgjort i sluttspill spilles ekstra omganger. Hvis det fortsatt er uavgjort, avgjøres kampen på straffespark.',
      category: 'rules'
    },
    {
      id: '13',
      question: 'Kan vi bruke custom tactics?',
      answer: 'Ja, du kan bruke custom tactics, men alle formations og instruksjoner må være innenfor regelverket. Uvanlige formations kan kreve godkjenning.',
      category: 'rules'
    },

    // Payment
    {
      id: '14',
      question: 'Hvor mye koster det å delta?',
      answer: 'Påmeldingsgebyr varierer fra 200-500 NOK per lag avhengig av turnering og premier. Dette betales etter godkjenning av laget.',
      category: 'payment'
    },
    {
      id: '15',
      question: 'Hvordan betaler vi?',
      answer: 'Vi aksepterer betaling via Vipps, bankoverføring eller kort. Betalingsinformasjon sendes etter godkjenning av laget.',
      category: 'payment'
    },
    {
      id: '16',
      question: 'Får vi pengene tilbake hvis vi ikke kan delta?',
      answer: 'Refusjon gis hvis du melder avbud minst 72 timer før turneringen starter. Senere avbud gir ikke refusjon.',
      category: 'payment'
    }
  ]

  const categoryOrder: FAQItem['category'][] = ['general', 'registration', 'tournaments', 'rules', 'payment']
  const categoryLabels: Record<FAQItem['category'], string> = {
    general: 'Generelt',
    registration: 'Påmelding',
    tournaments: 'Turneringer',
    rules: 'Regler',
    payment: 'Betaling'
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="mx-4 mt-4 h-24 bg-slate-900/70 border border-slate-800/80 rounded-xl">
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

      <main className="container mx-auto px-4 py-10 flex flex-col items-center">
        <div className="max-w-3xl w-full">
          {/* Page Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold mb-3">FAQ</h1>
            <p className="text-slate-300 text-lg">
              Ofte stilte spørsmål om PRO11
            </p>
          </div>

          {/* FAQ Items */}
          <div className="space-y-12">
            {categoryOrder.map(category => {
              const items = faqItems.filter(item => item.category === category)
              if (items.length === 0) return null

              return (
                <section key={category} className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-800/80" />
                    <h2 className="text-lg font-semibold tracking-wide text-slate-200 uppercase">
                      {categoryLabels[category]}
                    </h2>
                    <div className="h-px flex-1 bg-slate-800/80" />
                  </div>
                  <div className="space-y-8">
                    {items.map((item, index) => (
                      <div key={item.id} className="grid md:grid-cols-[32px_1fr] gap-4">
                        <div className="text-slate-500 text-sm font-semibold pt-1">
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        <div>
                          <h3 className="text-base md:text-lg font-semibold text-slate-100 mb-2">
                            {item.question}
                          </h3>
                          <p className="text-slate-300 leading-relaxed text-sm md:text-base">
                            {item.answer}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>

          {/* Contact Section */}
          <div className="text-left mt-12 p-8 border border-slate-800/80 rounded-xl bg-slate-900/60">
            <h2 className="text-2xl font-bold mb-4">Ikke funnet svaret du leter etter?</h2>
            <p className="text-slate-300 mb-6">
              Kontakt oss på Discord eller send oss en melding
            </p>
            <a 
              href="https://discord.gg/Es8UAkax8H" 
              target="_blank" 
              rel="noopener noreferrer"
              className="pro11-button inline-flex items-center space-x-2"
            >
              <span>Bli med på Discord</span>
            </a>
          </div>
        </div>
      </main>
    </div>
  )
} 