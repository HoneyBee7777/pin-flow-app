'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import {
  ZIELFLAECHEN,
  ZIELFLAECHEN_SUMME,
  isBusinessModell,
  isHauptnische,
  isPinningFrequenz,
  leereZielflaechen,
  serializeBusinessModelle,
  serializeContentSaeulen,
  type BusinessModell,
  type PinningFrequenz,
} from './lib'

// =====================================================
// Phase B — Speicher-Aktionen für das neue 4-Bausteine-Setup.
// Schreibt in die einstellungen-Spalten: strategie_business_modell,
// strategie_hauptnische, ziel_soll_* (7 Zielflächen), strategie_content_saeulen,
// strategie_pinning_frequenz, strategie_onboarding_abgeschlossen,
// strategie_letzte_aenderung.
// =====================================================

function revalidateStrategiePaths() {
  revalidatePath('/dashboard/strategie')
  revalidatePath('/dashboard/einstellungen')
  revalidatePath('/dashboard')
}

// Geprüfte, schreibfertige Felder (ohne onboarding-Flag und Zeitstempel).
type StrategieFelder = {
  strategie_business_modell: string
  strategie_hauptnische: string
  ziel_soll_blog: number
  ziel_soll_shop: number
  ziel_soll_etsy: number
  ziel_soll_affiliate: number
  ziel_soll_landingpage: number
  ziel_soll_newsletter: number
  ziel_soll_buchung: number
  strategie_content_saeulen: string | null
  strategie_pinning_frequenz: PinningFrequenz
}

// Liest und validiert die vier Bausteine aus dem FormData.
//
// Erwartete Feld-Namen (für Teil 2 / die UI):
//   business_modell    mehrfach (Checkboxen), Werte aus BUSINESS_MODELL_OPTIONS
//   hauptnische        einfach, Benchmark-Nischen-Id oder 'sonstige'
//   ziel_soll_<flaeche> je Zielfläche eine ganze Zahl 0..100 (Summe 100)
//   content_saeule     mehrfach (bestätigte Säulen), Freitext
//   pinning_frequenz   einfach, 'einsteiger' | 'wachstum' | 'etabliert'
function parseStrategieForm(
  formData: FormData
): { felder: StrategieFelder } | { error: string } {
  // Baustein 1a: Business-Modell (Mehrfachauswahl)
  const modelle = Array.from(
    new Set(
      formData
        .getAll('business_modell')
        .map((v) => String(v).trim())
        .filter(Boolean)
    )
  )
  if (modelle.length === 0)
    return { error: 'Bitte mindestens ein Business-Modell wählen.' }
  for (const m of modelle) {
    if (!isBusinessModell(m))
      return { error: 'Bitte nur gültige Business-Modelle wählen.' }
  }

  // Baustein 1b: Hauptnische
  const hauptnische = String(formData.get('hauptnische') ?? '').trim()
  if (!hauptnische) return { error: 'Bitte deine Hauptnische wählen.' }
  if (!isHauptnische(hauptnische))
    return { error: 'Bitte eine gültige Hauptnische wählen.' }

  // Baustein 2: Zielflächen-Verteilung (Summe 100)
  const ziele = leereZielflaechen()
  let summe = 0
  for (const zf of ZIELFLAECHEN) {
    const raw = String(formData.get(`ziel_soll_${zf.value}`) ?? '0').trim()
    const n = Number(raw === '' ? '0' : raw)
    if (!Number.isInteger(n) || n < 0 || n > 100)
      return {
        error: `Der Wert für „${zf.label}" muss eine ganze Zahl zwischen 0 und 100 sein.`,
      }
    ziele[zf.value] = n
    summe += n
  }
  if (summe !== ZIELFLAECHEN_SUMME)
    return {
      error: `Die Pin-Ziel-Verteilung muss in Summe 100 Prozent ergeben (aktuell ${summe} Prozent).`,
    }

  // Baustein 3: Content-Säulen (bestätigte Schwerpunkte, optional)
  const saeulen = Array.from(
    new Set(
      formData
        .getAll('content_saeule')
        .map((v) => String(v).trim())
        .filter(Boolean)
    )
  )

  // Baustein 4: Pinning-Rhythmus
  const frequenz = String(formData.get('pinning_frequenz') ?? '').trim()
  if (!isPinningFrequenz(frequenz))
    return { error: 'Bitte einen Pinning-Rhythmus wählen.' }

  return {
    felder: {
      strategie_business_modell: serializeBusinessModelle(
        modelle as BusinessModell[]
      ),
      strategie_hauptnische: hauptnische,
      ziel_soll_blog: ziele.blog,
      ziel_soll_shop: ziele.shop,
      ziel_soll_etsy: ziele.etsy,
      ziel_soll_affiliate: ziele.affiliate,
      ziel_soll_landingpage: ziele.landingpage,
      ziel_soll_newsletter: ziele.newsletter,
      ziel_soll_buchung: ziele.buchung,
      strategie_content_saeulen: saeulen.length
        ? serializeContentSaeulen(saeulen)
        : null,
      strategie_pinning_frequenz: frequenz,
    },
  }
}

// Best-effort-Snapshot für die Historie. Die Spalten von strategie_snapshots
// sind im Repo nicht als Schema hinterlegt; gesichert vorhanden ist aus dem
// bisherigen Code business_modell. Ein Snapshot-Fehler darf das Speichern
// niemals blockieren — er wird nur protokolliert.
async function snapshotStrategie(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  grund: string,
  businessModell: string
): Promise<void> {
  const { error } = await supabase.from('strategie_snapshots').insert({
    user_id: userId,
    snapshot_grund: grund,
    business_modell: businessModell,
  })
  if (error) {
    console.warn(
      '[Strategie] Snapshot konnte nicht angelegt werden (Historie ist best effort):',
      error.message
    )
  }
}

// =====================================================
// 1) Onboarding abgeschlossen — vollständiges Speichern aus dem Wizard
// =====================================================
export async function saveStrategieOnboarding(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const parsed = parseStrategieForm(formData)
  if ('error' in parsed) return { error: parsed.error }

  const { error } = await supabase.from('einstellungen').upsert(
    {
      user_id: user.id,
      ...parsed.felder,
      strategie_onboarding_abgeschlossen: true,
      strategie_letzte_aenderung: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (error) return { error: error.message }

  await snapshotStrategie(
    supabase,
    user.id,
    'Onboarding abgeschlossen',
    parsed.felder.strategie_business_modell
  )

  revalidateStrategiePaths()
  return {}
}

// =====================================================
// 2) Onboarding wiederholen — Flag zurücksetzen, alten Stand archivieren
// =====================================================
export async function restartStrategieOnboarding(): Promise<{
  error?: string
}> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  // Aktuelles Business-Modell für die Historie sichern (best effort).
  const { data } = await supabase
    .from('einstellungen')
    .select('strategie_business_modell')
    .eq('user_id', user.id)
    .maybeSingle()
  if (data) {
    await snapshotStrategie(
      supabase,
      user.id,
      'Onboarding wiederholt',
      data.strategie_business_modell ?? ''
    )
  }

  const { error } = await supabase
    .from('einstellungen')
    .upsert(
      {
        user_id: user.id,
        strategie_onboarding_abgeschlossen: false,
      },
      { onConflict: 'user_id' }
    )
  if (error) return { error: error.message }

  revalidateStrategiePaths()
  return {}
}
