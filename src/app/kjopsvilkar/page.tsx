'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'

export default function KjopsvilkarPage() {
  const { language } = useLanguage()
  const isEnglish = language === 'en'
  const t = (noText: string, enText: string) => (isEnglish ? enText : noText)

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="mx-4 mt-4 h-24 bg-slate-950 border border-slate-900 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="w-24 h-full flex items-center justify-center hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="PRO11 Logo" className="w-full h-full object-contain" />
            </Link>
            <div className="ml-4">
              <p className="text-slate-400 text-sm">
                {t('Pro Clubs Turneringer', 'Pro Clubs Tournaments')}
              </p>
            </div>
          </div>
          <Link href="/" className="pro11-button-secondary flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>{t('Tilbake', 'Back')}</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 flex flex-col items-center">
        <div className="pro11-card p-8 w-full max-w-4xl space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">{t('Kjøpsvilkår – PRO11', 'Terms of Purchase – PRO11')}</h1>
            <p className="text-slate-300">
              {t(
                'Ved påmelding bekrefter kjøper at vilkårene er lest og akseptert.',
                'By registering, the buyer confirms that the terms have been read and accepted.'
              )}
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('1. Generelt', '1. General')}</h2>
            <p className="text-slate-300">
              {t(
                'Disse kjøpsvilkårene gjelder for påmelding og deltakelse i digitale Pro Clubs-turneringer arrangert via PRO11.',
                'These terms apply to registration and participation in digital Pro Clubs tournaments arranged through PRO11.'
              )}
            </p>
            <p className="text-slate-300">
              {t(
                'PRO11 drives av E-spårt AS og er en uavhengig turneringsplattform. Plattformen er ikke tilknyttet, sponset av eller godkjent av Electronic Arts Inc.',
                'PRO11 is operated by E-spårt AS and is an independent tournament platform. The platform is not affiliated with, sponsored by, or approved by Electronic Arts Inc.'
              )}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('2. Partene', '2. The parties')}</h2>
            <div className="text-slate-300 space-y-1">
              <p>{t('Selger: E-spårt AS', 'Seller: E-spårt AS')}</p>
              <p>Org.nr: 929 611 543</p>
              <p>{t('E-post: post@espaart.no', 'Email: post@espaart.no')}</p>
            </div>
            <p className="text-slate-300">
              {t(
                'Kjøper: Den person eller det lag som gjennomfører påmelding til turneringen.',
                'Buyer: The person or team completing registration for the tournament.'
              )}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('3. Hva kjøpet gjelder', '3. What the purchase covers')}</h2>
            <p className="text-slate-300">
              {t(
                'Kjøpet gjelder deltakelse i en digital turnering innen EA SPORTS FC Pro Clubs, slik den er beskrevet på turneringssiden.',
                'The purchase covers participation in a digital EA SPORTS FC Pro Clubs tournament as described on the tournament page.'
              )}
            </p>
            <p className="text-slate-300">
              {t(
                'Påmeldingen gir rett til deltakelse i én spesifikk turnering.',
                'Registration grants participation in one specific tournament.'
              )}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('4. Pris og betaling', '4. Price and payment')}</h2>
            <p className="text-slate-300">
              {t(
                'Pris for deltakelse oppgis på turneringssiden før påmelding.',
                'The participation fee is shown on the tournament page before registration.'
              )}
            </p>
            <p className="text-slate-300">
              {t(
                'Betaling gjennomføres via tilgjengelige betalingsløsninger på nettsiden. PRO11 lagrer ikke kortinformasjon.',
                'Payment is completed through available payment solutions on the website. PRO11 does not store card information.'
              )}
            </p>
            <p className="text-slate-300">
              {t(
                'Påmelding regnes som bindende når betaling er gjennomført.',
                'Registration is binding once payment has been completed.'
              )}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('5. Angrerett og refusjon', '5. Right of withdrawal and refunds')}</h2>
            <p className="text-slate-300">
              {t(
                'Påmelding til turnering anses som kjøp av digital tjeneste levert på et bestemt tidspunkt.',
                'Tournament registration is considered the purchase of a digital service delivered at a specified time.'
              )}
            </p>
            <p className="text-slate-300">
              {t(
                'I henhold til angrerettloven §22 gjelder det derfor ingen angrerett.',
                'According to the right of withdrawal act §22, no right of withdrawal applies.'
              )}
            </p>
            <p className="text-slate-300">
              {t(
                'Påmeldingsavgift refunderes ikke. Unntak gjelder kun dersom turneringen avlyses av arrangør.',
                'The registration fee is non-refundable. Exceptions apply only if the organizer cancels the tournament.'
              )}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('6. Avlysning og endringer', '6. Cancellation and changes')}</h2>
            <p className="text-slate-300">{t('PRO11 forbeholder seg retten til å:', 'PRO11 reserves the right to:')}</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>{t('Avlyse turneringen ved for få påmeldte lag', 'Cancel the tournament due to insufficient registrations')}</li>
              <li>{t('Gjøre nødvendige justeringer i format og tidspunkt', 'Make necessary adjustments to format and schedule')}</li>
            </ul>
            <p className="text-slate-300">
              {t(
                'Ved avlysning refunderes påmeldingsavgiften i sin helhet.',
                'If canceled, the registration fee is refunded in full.'
              )}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('7. Deltakeransvar', '7. Participant responsibility')}</h2>
            <p className="text-slate-300">{t('Lagleder er ansvarlig for at:', 'The captain is responsible for ensuring that:')}</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>{t('Korrekt informasjon registreres', 'Correct information is registered')}</li>
              <li>{t('Laget møter til kamp til avtalt tid', 'The team shows up for matches at the agreed time')}</li>
              <li>{t('Turneringsreglene følges', 'Tournament rules are followed')}</li>
            </ul>
            <p className="text-slate-300">
              {t(
                'Brudd på regler kan føre til tap av kamp eller diskvalifikasjon uten refusjon.',
                'Violation of rules may result in match forfeits or disqualification without refund.'
              )}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('8. Tekniske forhold', '8. Technical issues')}</h2>
            <p className="text-slate-300">
              {t('PRO11 er ikke ansvarlig for forhold utenfor vår kontroll, herunder:', 'PRO11 is not responsible for circumstances beyond our control, including:')}
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>{t('Problemer med spillservere', 'Issues with game servers')}</li>
              <li>{t('Nettverksfeil hos deltaker', 'Participant network issues')}</li>
              <li>{t('Tekniske feil hos tredjepartsleverandører', 'Technical failures at third-party providers')}</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('9. Statistikk og historikk', '9. Statistics and history')}</h2>
            <p className="text-slate-300">
              {t(
                'Resultater, statistikk og historikk fra turneringer lagres som en del av PRO11s turneringssystem.',
                'Results, statistics, and tournament history are stored as part of the PRO11 tournament system.'
              )}
            </p>
            <p className="text-slate-300">
              {t(
                'Disse dataene slettes ikke ved avsluttet turnering.',
                'These data are not deleted after a tournament ends.'
              )}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('10. Personopplysninger', '10. Personal data')}</h2>
            <p className="text-slate-300">
              {t(
                'Behandling av personopplysninger skjer i henhold til PRO11s personvernerklæring.',
                'Processing of personal data is governed by PRO11’s privacy policy.'
              )}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('11. Tvister', '11. Disputes')}</h2>
            <p className="text-slate-300">
              {t(
                'Eventuelle tvister skal søkes løst i minnelighet.',
                'Any disputes should be resolved amicably.'
              )}
            </p>
            <p className="text-slate-300">
              {t(
                'Dersom dette ikke lykkes, kan saken bringes inn for Forbrukertilsynet eller behandles etter norsk rett med verneting i Norge.',
                'If this is not possible, the case can be brought to the Consumer Authority or handled under Norwegian law with venue in Norway.'
              )}
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
