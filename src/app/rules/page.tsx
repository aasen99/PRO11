'use client'

import { useLanguage } from '@/components/LanguageProvider'

export default function RulesPage() {
  const { language } = useLanguage()
  const isEnglish = language === 'en'

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="pro11-card p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">{isEnglish ? 'Rules' : 'Regler'}</h1>
            <p className="text-slate-300">
              {isEnglish
                ? 'Here you can find the current tournament rules.'
                : 'Her finner du gjeldende regler for turneringen.'}
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{isEnglish ? 'Group stage' : 'Gruppespill'}</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-3">
              <li>
                {isEnglish
                  ? 'The team listed as the home team should invite to the match.'
                  : 'Det laget som er oppsatt som hjemmelag skal invitere til kamp.'}
              </li>
              <li>{isEnglish ? 'Both teams must register the result.' : 'Begge lag skal registrere resultatet.'}</li>
              <li>
                {isEnglish
                  ? '3 points are awarded for a win, 1 point for a draw, and 0 points for a loss.'
                  : 'Det gis 3 poeng for seier, 1 poeng for uavgjort og 0 poeng for tap.'}
              </li>
              <li>
                {isEnglish
                  ? 'Group standings are ranked in the following order:'
                  : 'Resultatet i gruppene rangeres på i denne rekkefølgen:'}
                <ol className="list-decimal list-inside mt-2 space-y-1 text-slate-300">
                  <li>{isEnglish ? 'Points' : 'Poeng'}</li>
                  <li>{isEnglish ? 'Goal difference' : 'Målforskjell'}</li>
                  <li>{isEnglish ? 'Goals scored' : 'Antall scorede mål'}</li>
                  <li>{isEnglish ? 'Head-to-head' : 'Innbyrdes'}</li>
                  <li>
                    {isEnglish
                      ? 'If teams are still tied after the criteria above, a new match must be played. First goal wins. Remember photo evidence.'
                      : 'Kan ikke lagene skilles med kriteriene over, må ny kamp startes. Første mål gjelder. Husk bildebevis.'}
                  </li>
                </ol>
              </li>
              <li>
                {isEnglish
                  ? 'If the match has not started 10 minutes after the scheduled time, a walkover can be claimed.'
                  : 'Hvis kampen ikke har startet 10 min etter oppsatt tid, kan det kreves WO.'}
              </li>
              <li>{isEnglish ? 'WO (walkover) results in a 3-0 loss.' : 'WO (walkover) gir tap 3-0.'}</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{isEnglish ? 'Knockout' : 'Sluttspill'}</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-3">
              <li>
                {isEnglish
                  ? 'Teams play one match against each other. The home team invites.'
                  : 'Lagene spiller kun én kamp mot hverandre. Hjemmelag inviterer.'}
              </li>
              <li>
                {isEnglish
                  ? 'Matches cannot end in a draw and must be played until there is a winner.'
                  : 'Kampene kan ikke ende uavgjort og må spilles videre til vi har en vinner.'}
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{isEnglish ? 'Fair play' : 'Fairplay'}</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-3">
              <li>
                {isEnglish
                  ? 'If you have the same kits or experience connection issues, the match must be stopped and restarted.'
                  : 'Hvis dere har like drakter eller opplever forbindelsesproblemer, må kampen stoppes og startes på nytt.'}
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}

