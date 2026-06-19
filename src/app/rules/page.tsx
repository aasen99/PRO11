'use client'

import { useLanguage } from '@/components/LanguageProvider'
import Header from '@/components/Header'

export default function RulesPage() {
  const { language } = useLanguage()
  const isEnglish = language === 'en'

  return (
    <div className="min-h-screen">
      <Header backButton backHref="/" title={isEnglish ? 'Tournament Rules' : 'Turneringsregler'} />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="pro11-card p-6 space-y-8">
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
                  ? 'The team listed as the home team shall invite to the match.'
                  : 'Laget som står oppført som hjemmelag, skal invitere til kamp.'}
              </li>
              <li>
                {isEnglish
                  ? 'Both teams shall register the result after the match ends.'
                  : 'Begge lag skal registrere resultatet etter kampslutt.'}
              </li>
              <li>
                {isEnglish
                  ? '3 points are awarded for a win, 1 point for a draw, and 0 points for a loss.'
                  : 'Det gis 3 poeng for seier, 1 poeng for uavgjort og 0 poeng for tap.'}
              </li>
              <li>
                {isEnglish
                  ? 'The table is ranked according to the following criteria:'
                  : 'Tabellen rangeres etter følgende kriterier:'}
                <ol className="list-decimal list-inside mt-2 space-y-1 text-slate-300">
                  <li>{isEnglish ? 'Points' : 'Poeng'}</li>
                  <li>{isEnglish ? 'Goal difference' : 'Målforskjell'}</li>
                  <li>{isEnglish ? 'Goals scored' : 'Antall scorede mål'}</li>
                  <li>{isEnglish ? 'Head-to-head' : 'Innbyrdes oppgjør'}</li>
                </ol>
              </li>
              <li>
                {isEnglish
                  ? 'If teams still cannot be separated, a new match shall be played where the first goal wins. Remember photo or video evidence.'
                  : 'Hvis lagene fortsatt ikke kan skilles, skal det spilles en ny kamp hvor første mål vinner. Husk bilde- eller videobevis.'}
              </li>
              <li>
                {isEnglish
                  ? 'If the match has not started within 10 minutes of the scheduled time, a walkover may be claimed.'
                  : 'Hvis kampen ikke har startet innen 10 minutter etter oppsatt tid, kan det kreves WO.'}
              </li>
              <li>
                {isEnglish
                  ? 'All teams must check in no later than 10 minutes before tournament start.'
                  : 'Alle lag må sjekke inn senest 10 minutter før turneringsstart.'}
              </li>
              <li>
                {isEnglish ? 'Walkover results in a 3–0 loss.' : 'WO gir tap 3–0.'}
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{isEnglish ? 'Knockout' : 'Sluttspill'}</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-3">
              <li>
                {isEnglish
                  ? 'Teams play one match against each other.'
                  : 'Lagene spiller én kamp mot hverandre.'}
              </li>
              <li>
                {isEnglish
                  ? 'The home team invites to the match.'
                  : 'Hjemmelag inviterer til kamp.'}
              </li>
              <li>
                {isEnglish
                  ? 'Matches cannot end in a draw. If the match is drawn, it must be played until a winner is decided.'
                  : 'Kampene kan ikke ende uavgjort. Ved uavgjort må kampen spilles videre til det er kåret en vinner.'}
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{isEnglish ? 'Recording and evidence' : 'Opptak og bevis'}</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-3">
              <li>
                {isEnglish
                  ? 'All teams must be able to provide video evidence of the final result when required.'
                  : 'Alle lag skal kunne fremlegge videobevis av sluttresultatet ved behov.'}
              </li>
              <li>
                {isEnglish
                  ? 'Teams are responsible for documenting the final result, team names, and any disputes. This can be done using the console\'s built-in recording function, for example by saving the last few minutes after the match ends.'
                  : 'Lagene må selv sørge for å kunne dokumentere sluttresultat, lagnavn og eventuell uenighet. Dette kan gjøres med konsollens innebygde opptaksfunksjon, for eksempel ved å lagre de siste minuttene etter kampslutt.'}
              </li>
              <li>
                {isEnglish
                  ? 'In case of disputes about the result, walkover, rule violations, or other incidents, the organizer may require video evidence from one or both teams.'
                  : 'Ved uenighet om resultat, WO, regelbrudd eller andre hendelser kan arrangør kreve videobevis fra ett eller begge lag.'}
              </li>
              <li>
                {isEnglish
                  ? 'If a team cannot provide documentation, the organizer may decide the matter based on available information.'
                  : 'Dersom et lag ikke kan fremlegge dokumentasjon, kan arrangør avgjøre saken basert på tilgjengelig informasjon.'}
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{isEnglish ? 'Goalkeeper' : 'Keeper'}</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-3">
              <li>
                {isEnglish
                  ? 'It is not permitted to use a dedicated player to control the goalkeeper throughout the match.'
                  : 'Det er ikke tillatt å stille med en egen spiller som fast styrer keeper gjennom kampen.'}
              </li>
              <li>
                {isEnglish
                  ? 'The goalkeeper position shall be controlled by the game\'s AI.'
                  : 'Keeperplassen skal styres av spillets AI.'}
              </li>
              <li>
                {isEnglish
                  ? 'Normal manual goalkeeper movement in certain situations, such as set pieces, crosses, or shots, is permitted.'
                  : 'Vanlig manuell flytting av keeper i enkelte spillsituasjoner, for eksempel ved dødballer, innlegg eller avslutninger, er tillatt.'}
              </li>
              <li>
                {isEnglish
                  ? 'If a violation is suspected, the organizer may require video evidence and assess the case.'
                  : 'Ved mistanke om brudd kan arrangør kreve videobevis og vurdere saken.'}
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">
              {isEnglish ? 'Disconnect and interrupted match' : 'Disconnect og avbrutt kamp'}
            </h2>
            <ul className="list-disc list-inside text-slate-300 space-y-3">
              <li>
                {isEnglish
                  ? 'If the match is interrupted due to a disconnect, both teams shall document the score and match time if possible.'
                  : 'Hvis kampen avbrytes på grunn av disconnect, skal begge lag dokumentere stilling og kamptidspunkt dersom mulig.'}
              </li>
              <li>
                {isEnglish
                  ? 'The organizer assesses whether the match shall continue, be restarted, or be ruled as a walkover.'
                  : 'Arrangør vurderer om kampen skal spilles videre, startes på nytt eller dømmes som WO.'}
              </li>
              <li>
                {isEnglish
                  ? 'On the first disconnect from a team, the match shall as a general rule continue from the same score and approximately the same match time.'
                  : 'Ved første disconnect fra et lag spilles kampen som hovedregel videre fra samme stilling og cirka samme kamptidspunkt.'}
              </li>
              <li>
                {isEnglish
                  ? 'After repeated disconnects from the same team, the organizer may rule the match as a walkover loss.'
                  : 'Ved gjentatte disconnects fra samme lag kan arrangør dømme kampen som WO-tap.'}
              </li>
              <li>
                {isEnglish
                  ? 'If a team leaves the match without notifying the opponent or organizer, the match may be ruled as a walkover loss.'
                  : 'Dersom et lag forlater kampen uten å varsle motstander eller arrangør, kan kampen dømmes som WO-tap.'}
              </li>
              <li>
                {isEnglish
                  ? 'The organizer\'s decision is final.'
                  : 'Arrangørens avgjørelse er endelig.'}
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{isEnglish ? 'Fair play' : 'Fair play'}</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-3">
              <li>
                {isEnglish
                  ? 'If teams have the same kits, or connection problems occur early in the match, the match shall be stopped and restarted.'
                  : 'Hvis lagene har like drakter, eller det oppstår forbindelsesproblemer tidlig i kampen, skal kampen stoppes og startes på nytt.'}
              </li>
              <li>
                {isEnglish
                  ? 'All teams are expected to conduct themselves properly towards opponents and the organizer.'
                  : 'Alle lag forventes å opptre ryddig overfor motstander og arrangør.'}
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
