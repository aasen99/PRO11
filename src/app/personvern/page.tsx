'use client'

import React from 'react'
import { useLanguage } from '@/components/LanguageProvider'
import Header from '@/components/Header'

export default function PersonvernPage() {
  const { language } = useLanguage()
  const isEnglish = language === 'en'
  const t = (noText: string, enText: string) => (isEnglish ? enText : noText)

  return (
    <div className="min-h-screen">
      <Header backButton backHref="/" />

      <main className="container mx-auto px-4 py-12 flex flex-col items-center">
        <div className="pro11-card p-8 w-full max-w-4xl space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">{t('Personvernerklæring', 'Privacy Policy')}</h1>
            <p className="text-slate-300">
              {t(
                'Sist oppdatert: gjeldende versjon publiseres alltid på nettsiden.',
                'Last updated: the current version is always published on the website.'
              )}
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('1. Innledning', '1. Introduction')}</h2>
            <p className="text-slate-300">
              {t(
                'PRO11 er en uavhengig turneringsplattform for Pro Clubs i spillet EA SPORTS FC. Plattformen drives av E-spårt AS og er ikke tilknyttet, sponset av eller godkjent av Electronic Arts Inc.',
                'PRO11 is an independent tournament platform for Pro Clubs in EA SPORTS FC. The platform is operated by E-spårt AS and is not affiliated with, sponsored by, or approved by Electronic Arts Inc.'
              )}
            </p>
            <p className="text-slate-300">
              {t(
                'Denne personvernerklæringen forklarer hvilke personopplysninger vi behandler, hvorfor vi behandler dem og hvilke rettigheter du har.',
                'This privacy policy explains what personal data we process, why we process it, and your rights.'
              )}
            </p>
            <p className="text-slate-300">
              {t(
                'Behandlingen skjer i samsvar med personopplysningsloven og EUs personvernforordning (GDPR).',
                'Processing is carried out in accordance with the Personal Data Act and the EU General Data Protection Regulation (GDPR).'
              )}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('2. Behandlingsansvarlig', '2. Data Controller')}</h2>
            <div className="text-slate-300 space-y-1">
              <p>E-spårt AS</p>
              <p>Org.nr: 929611543</p>
              <p>{t('Kontakt: post@espaart.no', 'Contact: post@espaart.no')}</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">
              {t('3. Hvilke personopplysninger vi samler inn', '3. Personal data we collect')}
            </h2>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>
                <span className="font-semibold">
                  {t('Bruker- og laginformasjon:', 'User and team information:')}
                </span>{' '}
                {t(
                  'navn, e-postadresse, lagnavn og laginformasjon, rolle (lagleder / deltaker).',
                  'name, email address, team name and team information, role (captain / participant).'
                )}
              </li>
              <li>
                <span className="font-semibold">
                  {t('Turneringsdata:', 'Tournament data:')}
                </span>{' '}
                {t(
                  'påmeldinger, kampresultater, statistikk, prestasjoner og historikk.',
                  'registrations, match results, statistics, achievements, and history.'
                )}
              </li>
              <li>
                <span className="font-semibold">
                  {t('Betalingsinformasjon:', 'Payment information:')}
                </span>{' '}
                {t(
                  'betalingsstatus og transaksjonsreferanser. PRO11 lagrer ikke kortinformasjon. Betaling håndteres av tredjeparts betalingsleverandører.',
                  'payment status and transaction references. PRO11 does not store card details. Payments are handled by third-party payment providers.'
                )}
              </li>
              <li>
                <span className="font-semibold">
                  {t('Teknisk informasjon:', 'Technical information:')}
                </span>{' '}
                {t(
                  'IP-adresse, enhetstype og nettleser, bruk av nettsiden (for sikkerhet og drift).',
                  'IP address, device type and browser, use of the website (for security and operations).'
                )}
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('4. Formål med behandlingen', '4. Purpose of processing')}</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>{t('Administrere brukerkontoer', 'Manage user accounts')}</li>
              <li>{t('Gjennomføre Pro Clubs-turneringer', 'Run Pro Clubs tournaments')}</li>
              <li>{t('Registrere og bekrefte kampresultater', 'Record and confirm match results')}</li>
              <li>{t('Føre statistikk, rekorder og historikk', 'Maintain statistics, records, and history')}</li>
              <li>{t('Håndtere betaling og påmelding', 'Handle payments and registrations')}</li>
              <li>{t('Yte kundestøtte', 'Provide customer support')}</li>
              <li>{t('Sikre stabil og trygg drift av plattformen', 'Ensure stable and secure operation of the platform')}</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('5. Rettslig grunnlag', '5. Legal basis')}</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>{t('Avtale: for å levere turneringsdeltakelse', 'Contract: to provide tournament participation')}</li>
              <li>{t('Berettiget interesse: drift, sikkerhet og forbedring av tjenesten', 'Legitimate interest: operations, security, and service improvements')}</li>
              <li>{t('Rettslig forpliktelse: regnskaps- og bokføringskrav', 'Legal obligation: accounting and bookkeeping requirements')}</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('6. Deling av personopplysninger', '6. Sharing of personal data')}</h2>
            <p className="text-slate-300">{t('Opplysninger deles kun med:', 'Data is shared only with:')}</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>{t('Betalingsleverandører (f.eks. Vipps / Stripe)', 'Payment providers (e.g. Vipps / Stripe)')}</li>
              <li>{t('Tekniske leverandører (hosting, database, drift)', 'Technical providers (hosting, database, operations)')}</li>
            </ul>
            <p className="text-slate-300">
              {t(
                'Personopplysninger selges aldri videre og brukes ikke til tredjepartsmarkedsføring.',
                'Personal data is never sold and is not used for third-party marketing.'
              )}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('7. Lagringstid', '7. Retention period')}</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>{t('Så lenge brukerkontoen er aktiv', 'As long as the user account is active')}</li>
              <li>{t('Så lenge statistikk og historikk er relevant for turneringssystemet', 'As long as statistics and history are relevant to the tournament system')}</li>
              <li>{t('Betalingsinformasjon lagres i henhold til bokføringsloven (5 år)', 'Payment information is stored in accordance with bookkeeping law (5 years)')}</li>
            </ul>
            <p className="text-slate-300">{t('Brukerkonto kan slettes på forespørsel.', 'User accounts can be deleted upon request.')}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('8. Dine rettigheter', '8. Your rights')}</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>{t('Be om innsyn i egne opplysninger', 'Request access to your data')}</li>
              <li>{t('Få rettet eller slettet opplysninger', 'Have data corrected or deleted')}</li>
              <li>{t('Protestere mot behandling', 'Object to processing')}</li>
              <li>{t('Be om dataportabilitet', 'Request data portability')}</li>
              <li>{t('Trekke tilbake samtykke der dette er aktuelt', 'Withdraw consent where applicable')}</li>
            </ul>
            <p className="text-slate-300">{t('Klage kan rettes til Datatilsynet.', 'Complaints can be directed to the Data Protection Authority.')}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('9. Informasjonskapsler (cookies)', '9. Cookies')}</h2>
            <p className="text-slate-300">{t('PRO11 benytter informasjonskapsler for:', 'PRO11 uses cookies for:')}</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>{t('Nødvendig funksjonalitet', 'Essential functionality')}</li>
              <li>{t('Innlogging og sikkerhet', 'Login and security')}</li>
              <li>{t('Anonym besøksstatistikk', 'Anonymous visitor statistics')}</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('10. Endringer', '10. Changes')}</h2>
            <p className="text-slate-300">
              {t(
                'Personvernerklæringen kan oppdateres ved behov. Gjeldende versjon publiseres alltid på nettsiden.',
                'The privacy policy may be updated as needed. The current version is always published on the website.'
              )}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('11. Kontakt', '11. Contact')}</h2>
            <div className="text-slate-300 space-y-1">
              <p>E-spårt AS</p>
              <p>{t('Daglig leder: Benjamin André Aasen', 'Managing Director: Benjamin André Aasen')}</p>
              <p>📧 benjamin@espaart.no</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
