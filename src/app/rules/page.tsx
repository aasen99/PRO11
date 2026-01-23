export default function RulesPage() {
  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="pro11-card p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Regler</h1>
            <p className="text-slate-300">
              Her finner du gjeldende regler for turneringen.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Gruppespill</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-3">
              <li>Det laget som er oppsatt som hjemmelag skal invitere til kamp.</li>
              <li>Begge lag skal registrere resultatet.</li>
              <li>Det gis 3 poeng for seier, 1 poeng for uavgjort og 0 poeng for tap.</li>
              <li>
                Resultatet i gruppene rangeres på i denne rekkefølgen:
                <ol className="list-decimal list-inside mt-2 space-y-1 text-slate-300">
                  <li>Poeng</li>
                  <li>Målforskjell</li>
                  <li>Antall scorede mål</li>
                  <li>Innbyrdes</li>
                  <li>Kan ikke lagene skilles med kriteriene over, må ny kamp startes. Første mål gjelder. Husk bildebevis.</li>
                </ol>
              </li>
              <li>Hvis kampen ikke har startet 10 min etter oppsatt tid, kan det kreves WO.</li>
              <li>WO (walkover) gir tap 3-0.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Sluttspill</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-3">
              <li>Lagene spiller kun én kamp mot hverandre. Hjemmelag inviterer.</li>
              <li>Kampene kan ikke ende uavgjort og må spilles videre til vi har en vinner.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Fairplay</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-3">
              <li>Hvis dere har like drakter eller opplever forbindelsesproblemer, må kampen stoppes og startes på nytt.</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}

