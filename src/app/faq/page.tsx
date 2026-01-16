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
      question: 'Hva er denne plattformen?',
      answer: 'En enkel og profesjonell plattform for organisering av turneringer og lagpåmelding.',
      category: 'general'
    },
    {
      id: '2',
      question: 'Hvor finner jeg oppdateringer?',
      answer: 'Oppdateringer og nyheter publiseres i våre kanaler og på turneringssiden.',
      category: 'general'
    },
    {
      id: '3',
      question: 'Hva trenger jeg for å delta?',
      answer: 'Du trenger et lag og en lagkaptein som registrerer laget.',
      category: 'general'
    },

    // Account
    {
      id: '4',
      question: 'Hvordan oppretter vi lag?',
      answer: 'Lagkaptein registrerer laget med grunnleggende laginformasjon og kontaktdata.',
      category: 'account'
    },
    {
      id: '5',
      question: 'Kan vi endre lagdetaljer senere?',
      answer: 'Ja, endringer kan gjøres frem til turneringsfristen.',
      category: 'account'
    },

    // Tournaments
    {
      id: '6',
      question: 'Hvordan fungerer turneringsformatet?',
      answer: 'Formatet varierer, men følger normalt gruppespill etterfulgt av sluttspill.',
      category: 'tournaments'
    },
    {
      id: '7',
      question: 'Når spilles kampene?',
      answer: 'Kampene settes opp i tidsrommet som er oppgitt på turneringssiden.',
      category: 'tournaments'
    },

    // Payment
    {
      id: '8',
      question: 'Hva koster det å delta?',
      answer: 'Påmeldingsavgift oppgis i hver turnering og betales etter godkjenning.',
      category: 'payment'
    },
    {
      id: '9',
      question: 'Hvordan betaler vi?',
      answer: 'Betalingsmetode oppgis i turneringen og bekreftes ved betaling.',
      category: 'payment'
    },

    // Support
    {
      id: '10',
      question: 'Trenger du hjelp?',
      answer: 'Kontakt oss via Discord for raskest mulig svar.',
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
        <div className="max-w-3xl w-full">
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
          <div className="text-center mt-14 p-8 border border-slate-900 rounded-xl bg-slate-950">
            <h2 className="text-2xl font-semibold mb-3">Trenger du mer hjelp?</h2>
            <p className="text-slate-300 mb-6">
              Ta kontakt på Discord så hjelper vi deg videre.
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