# Forbedringer og manglende funksjonalitet

## Kritisk - Må fikses før produksjon

1. **Database-oppdatering**
   - ✅ SQL-script opprettet (`ADD_MATCH_RESULT_FIELDS.sql`)
   - ⚠️ **MÅ KJØRES I SUPABASE** før systemet fungerer riktig

2. **rejectResult fungerer ikke i databasen**
   - Når et lag avviser resultat, oppdateres bare lokalt state
   - Må lagre til database via API

3. **Admin kan ikke se/løse konflikter**
   - Når resultater ikke matcher, må admin kunne:
     - Se begge lags innsendte resultater
     - Velge hvilket resultat som er riktig
     - Overstyre resultatet manuelt

4. **Validering av resultater**
   - Sjekke at resultater ikke er negative
   - Sjekke at lag faktisk er del av kampen
   - Sjekke at kampen ikke allerede er completed

## Viktig - Bør implementeres snart

5. **Bedre visning i admin-panel**
   - Vise begge lags innsendte resultater når de ikke matcher
   - Fargekode konflikter (rød for uoverensstemmende resultater)
   - Vise hvilket lag som har sendt inn hva

6. **Bedre feilmeldinger**
   - Mer informative meldinger når resultater ikke matcher
   - Forklare hva som skjer når admin må se på det

7. **Sikkerhet/autentisering**
   - Validere at lag faktisk er del av kampen før de kan sende inn resultat
   - Sjekke at lag ikke kan endre resultater etter de er completed

## Nice to have - Kan vente

8. **Notifikasjoner**
   - ✅ Varsle lag når motstander har sendt inn resultat
   - ✅ Varsle admin når resultater ikke matcher

9. **Tidsbegrensning**
   - Kunne sende inn resultater innen X timer etter kamp
   - Automatisk godkjenne hvis begge lag sender inn samme resultat

10. **Historikk**
    - Se tidligere resultater
    - Se når resultater ble sendt inn/bekreftet

11. **Bedre UI/UX**
    - Bedre visning av ventende resultater
    - Progress-indikator for turnering
    - Bedre mobilvisning

