'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface FAQItem {
  id: string
  question: string
  answer: string
  category: 'general' | 'account' | 'tournaments' | 'payment' | 'support'
}

export default function FAQPage() {
  const faqItems: FAQItem[] = [
    // General
    {
      id: '1',
      question: 'Hva er PRO11?',
      answer: 'PRO11 er en turneringsplattform for EA SPORTS FC Pro Clubs.',
      category: 'general'
    },
    {
      id: '2',
      question: 'Hvem kan delta?',
      answer: 'Alle Pro Clubs-lag kan delta så lenge laget følger kravene i turneringen.',
      category: 'general'
    },
    {
      id: '3',
      question: 'Hvor får vi oppdateringer?',
      answer: 'All informasjon publiseres på turneringssiden og i PRO11-Discorden.',
      category: 'general'
    },

    // Account
    {
      id: '4',
      question: 'Hvordan melder vi oss på?',
      answer: 'Lagleder registrerer laget og fullfører påmeldingen på turneringssiden.',
      category: 'account'
    },

    // Tournaments
    {
      id: '5',
      question: 'Hvordan fungerer turneringene?',
      answer: 'Turneringene spilles normalt med gruppespill etterfulgt av sluttspill. Endelig format vises alltid på turneringssiden.',
      category: 'tournaments'
    },
    {
      id: '6',
      question: 'Hvordan settes sluttspillet opp?',
      answer: 'Lag seedes basert på plassering i gruppespillet. Sluttspillet spilles som cup.',
      category: 'tournaments'
    },
    {
      id: '7',
      question: 'Når spilles kampene?',
      answer: 'Kampene spilles innenfor tidsrommet som er oppgitt på turneringssiden.',
      category: 'tournaments'
    },
    {
      id: '8',
      question: 'Hvordan registreres resultater?',
      answer: 'Begge lag registrerer kampresultatet. Når begge bekrefter samme resultat, registreres kampen automatisk. Ved uenighet varsles admin.',
      category: 'tournaments'
    },
    {
      id: '9',
      question: 'Hva skjer ved uenighet eller feil?',
      answer: 'Dersom lagene ikke er enige, varsles admin som avgjør saken.',
      category: 'tournaments'
    },
    {
      id: '10',
      question: 'Føres det statistikk?',
      answer: 'Ja. PRO11 bygger statistikk, rekorder og historikk på tvers av turneringer. Historikken starter fra første offisielle turnering.',
      category: 'tournaments'
    },

    // Payment
    {
      id: '11',
      question: 'Hva koster det å delta?',
      answer: 'Påmeldingsavgift vises på turneringssiden før påmelding.',
      category: 'payment'
    },
    {
      id: '12',
      question: 'Hvordan betaler vi?',
      answer: 'Betaling skjer via nettsiden. Tilgjengelige betalingsmetoder vises ved betaling.',
      category: 'payment'
    },

    // Support
    {
      id: '13',
      question: 'Hvor finner vi reglene?',
      answer: 'Reglene for hver turnering finner du på turneringssiden.',
      category: 'support'
    },
    {
      id: '14',
      question: 'Hvordan kan vi kontakte dere?',
      answer: 'Bli med i Discord-serveren -discordserveren-',
      category: 'support'
    }
  ]

  const categoryOrder: FAQItem['category'][] = ['general', 'account', 'tournaments', 'payment', 'support']
  const categoryLabels: Record<FAQItem['category'], string> = {
    general: 'Generelt',
    account: 'Lag og konto',
    tournaments: 'Turneringer',
    payment: 'Betaling',
    support: 'Support'
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
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
        <div className="pro11-card p-8 w-full max-w-4xl">
          <div className="max-w-3xl w-full mx-auto">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-semibold tracking-tight mb-3">Spørsmål og svar</h1>
            <p className="text-slate-300 text-lg">
              Klart og kort – alt du trenger å vite.
            </p>
          </div>

          {/* FAQ Items */}
          <div className="space-y-14">
            {categoryOrder.map(category => {
              const items = faqItems.filter(item => item.category === category)
              if (items.length === 0) return null

              return (
                <section key={category} className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-800/80" />
                    <h2 className="text-base md:text-lg font-semibold tracking-[0.18em] text-slate-300 uppercase">
                      {categoryLabels[category]}
                    </h2>
                    <div className="h-px flex-1 bg-slate-800/80" />
                  </div>
                  <div className="space-y-3">
                    {items.map(item => (
                      <details
                        key={item.id}
                        className="group border border-slate-900 bg-slate-950 rounded-lg"
                      >
                        <summary className="cursor-pointer list-none px-5 py-4 text-slate-100 font-medium">
                          <div className="flex items-center justify-between">
                            <span className="text-base md:text-lg">{item.question}</span>
                            <span className="text-slate-500">⌄</span>
                          </div>
                        </summary>
                        <div className="px-5 pb-5 text-slate-300 text-sm md:text-base leading-relaxed">
                          {item.answer}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>

          {/* Contact Section */}
          
          </div>
        </div>
      </main>
    </div>
  )
} 