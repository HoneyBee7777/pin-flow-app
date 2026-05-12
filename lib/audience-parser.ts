// Parser für Pinterest „Audience Insights"-CSVs (V3.0).
//
// Format-Anatomie:
//
//   Audience View,Date,Aggregation,Audience Size
//   Your engaged audience,2026-05-09,Monthly,10000
//                            ← Leerzeile = Sektions-Trenner
//   Interests
//   Category,Bulk Sheet Category,Percent of audience,Affinity,Interest,Bulk Sheet Interests,Percent of audience,Affinity
//   Home Decor,…,0.925,1.335,Room Decor,…,0.919,1.285
//   …
//
//   Countries,Percent of audience
//   Deutschland,0.776
//   …
//
//   (analog: Metros, Gender, Devices, Ages)
//
// Der Parser ist tolerant gegenüber leeren Zeilen, fehlenden Sektionen
// und alternativen Header-Schreibweisen — Pinterest hat seine Exports
// in der Vergangenheit ändern können. Bei kritischen Sektionen
// (Audience-Header + Interests) wirft er; alle anderen Sektionen
// liefern leere Arrays, falls nicht im CSV.

import type {
  AudienceAgeBucket,
  AudienceBreakdown,
  AudienceInterest,
  AudienceSnapshotData,
  AudienceSubInterest,
  AudienceType,
} from './audience-types'

export type ParsedAudienceCsv = {
  audienceDate: string
  audienceType: AudienceType
  audienceSize: number
  data: AudienceSnapshotData
}

export class AudienceCsvError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AudienceCsvError'
  }
}

// CSV-Zeilen-Splitter: respektiert "quoted commas". Pinterest nutzt
// Anführungszeichen, wenn Interesse-Strings selbst Kommas enthalten
// (z. B. "Home Decor, Modern"). Reicht für Pinterest-Exports; nicht
// als RFC-4180-konform gedacht.
function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }
    current += ch
  }
  result.push(current)
  return result.map((c) => c.trim())
}

// Pinterest exportiert Prozentwerte als 0..1 (z. B. 0.925). Eingelesen
// als Number; null bei nicht-parsebaren Werten.
function parseNumber(v: string | undefined): number {
  if (v == null) return NaN
  const s = v.trim()
  if (!s) return NaN
  // Pinterest schreibt englisches Dezimaltrennzeichen (Punkt). Falls in
  // einem zukünftigen Export Komma auftaucht, fangen wir das defensiv ab.
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

// Zerlegt CSV-Text in Zeilen-Gruppen, getrennt durch Leerzeilen.
// Liefert für jede Gruppe das Array der nicht-leeren Zeilen.
function splitIntoSections(text: string): string[][] {
  const normalized = text.replace(/\r\n?/g, '\n')
  const groups: string[][] = []
  let current: string[] = []
  for (const raw of normalized.split('\n')) {
    const line = raw.trim()
    if (!line) {
      if (current.length > 0) {
        groups.push(current)
        current = []
      }
      continue
    }
    current.push(line)
  }
  if (current.length > 0) groups.push(current)
  return groups
}

// Erkennt Audience-Typ aus dem Header-Wert (Spalte 1 der ersten Datenzeile
// in Sektion 0). „Your engaged audience" → engaged; alle anderen Varianten
// (z. B. „Your total audience") → total. Default: engaged.
function detectAudienceType(headerValue: string): AudienceType {
  const lower = headerValue.toLowerCase()
  if (lower.includes('engaged')) return 'engaged'
  if (lower.includes('total')) return 'total'
  return 'engaged'
}

// Parsed die Audience-Header-Sektion. Erwartete Form:
//   Audience View,Date,Aggregation,Audience Size
//   Your engaged audience,2026-05-09,Monthly,10000
function parseHeaderSection(lines: string[]): {
  audienceDate: string
  audienceType: AudienceType
  audienceSize: number
} {
  if (lines.length < 2) {
    throw new AudienceCsvError(
      'Audience-Header-Sektion ist unvollständig — erwartet werden zwei Zeilen (Header + Daten).'
    )
  }
  const cells = splitCsvLine(lines[1])
  if (cells.length < 4) {
    throw new AudienceCsvError(
      'Audience-Header-Zeile hat zu wenige Spalten — erwartet werden View, Date, Aggregation, Audience Size.'
    )
  }
  const dateRaw = cells[1]
  const audienceSize = parseNumber(cells[3])
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    throw new AudienceCsvError(
      `Audience-Datum ist nicht im Format YYYY-MM-DD: „${dateRaw}".`
    )
  }
  if (!Number.isFinite(audienceSize) || audienceSize < 0) {
    throw new AudienceCsvError(
      `Audience-Größe ist keine gültige Zahl: „${cells[3]}".`
    )
  }
  return {
    audienceDate: dateRaw,
    audienceType: detectAudienceType(cells[0]),
    audienceSize: Math.round(audienceSize),
  }
}

// Interests ist die komplexeste Sektion: jede Daten-Zeile enthält parallel
// einen Top-Level-Kategorie-Eintrag (Spalten 1-4) und einen Sub-Interest-
// Eintrag (Spalten 5-8). Mehrere Zeilen mit der gleichen Kategorie liefern
// verschiedene Sub-Interests — wir gruppieren auf Kategorie-Name.
//
// Eine Kategorie ohne Sub-Interest-Zeile bekommt ein leeres subInterests-
// Array. Bei duplizierten (kategorie, sub-name)-Paaren gewinnt die zuerst
// gesehene Zeile — alle weiteren werden ignoriert (deterministisch, ohne
// Doppel-Auflistung).
function parseInterestsSection(
  lines: string[],
  dataStart: number
): AudienceInterest[] {
  if (lines.length <= dataStart) return []
  const dataLines = lines.slice(dataStart)
  const byCategory = new Map<string, AudienceInterest>()

  for (const line of dataLines) {
    const cells = splitCsvLine(line)
    if (cells.length < 4) continue
    const category = cells[0]
    if (!category) continue

    const catPercent = parseNumber(cells[2])
    const catAffinity = parseNumber(cells[3])

    if (!byCategory.has(category)) {
      byCategory.set(category, {
        category,
        percent: Number.isFinite(catPercent) ? catPercent : 0,
        affinity: Number.isFinite(catAffinity) ? catAffinity : 0,
        subInterests: [],
      })
    }

    // Sub-Interest in Spalten 4..7. Nicht alle Zeilen haben einen Sub-
    // Interest (manche Kategorien sind „leer" und besetzen nur Spalten 0-3).
    const subName = cells[4]
    if (subName && cells.length >= 8) {
      const subPercent = parseNumber(cells[6])
      const subAffinity = parseNumber(cells[7])
      const cat = byCategory.get(category)!
      const alreadyHasSub = cat.subInterests.some((s) => s.name === subName)
      if (!alreadyHasSub) {
        const sub: AudienceSubInterest = {
          name: subName,
          percent: Number.isFinite(subPercent) ? subPercent : 0,
          affinity: Number.isFinite(subAffinity) ? subAffinity : 0,
        }
        cat.subInterests.push(sub)
      }
    }
  }

  return Array.from(byCategory.values())
}

// Generischer Parser für Sektionen mit dem Schema:
//   <SektionsName>,Percent of audience
//   <Name>,<Anteil 0..1>
//
// Wird für Countries, Metros, Gender, Devices verwendet.
function parseBreakdownSection(
  lines: string[],
  dataStart: number
): AudienceBreakdown[] {
  if (lines.length <= dataStart) return []
  const result: AudienceBreakdown[] = []
  for (const line of lines.slice(dataStart)) {
    const cells = splitCsvLine(line)
    if (cells.length < 2) continue
    const name = cells[0]
    const percent = parseNumber(cells[1])
    if (!name || !Number.isFinite(percent)) continue
    result.push({ name, percent })
  }
  return result
}

// Ages-Sektion: gleiches Schema wie Breakdown, nur dass `name` semantisch
// ein Alters-Bereich („18-24") ist. Eigene Funktion für Lesbarkeit + Typ-Sicherheit.
function parseAgesSection(
  lines: string[],
  dataStart: number
): AudienceAgeBucket[] {
  if (lines.length <= dataStart) return []
  const result: AudienceAgeBucket[] = []
  for (const line of lines.slice(dataStart)) {
    const cells = splitCsvLine(line)
    if (cells.length < 2) continue
    const range = cells[0]
    const percent = parseNumber(cells[1])
    if (!range || !Number.isFinite(percent)) continue
    result.push({ range, percent })
  }
  return result
}

// Pinterest verwendet ZWEI verschiedene Sektions-Marker-Formate:
//
//   Format A (Interests):
//     "Interests"                            ← Marker steht alleine auf einer Zeile
//     "Category,…,Affinity,Interest,…"       ← Header-Zeile
//     "Home Decor,…"                         ← Daten ab Zeile 2
//
//   Format B (Countries, Metros, Gender, Devices, Ages):
//     "Countries,Percent of audience"        ← Marker + Header kombiniert
//     "Deutschland,0.776"                    ← Daten ab Zeile 1
//
// `classifySection` erkennt beide und liefert zusätzlich `dataStart` —
// den Index, ab dem die eigentlichen Daten beginnen.
type SectionName =
  | 'interests'
  | 'countries'
  | 'metros'
  | 'gender'
  | 'devices'
  | 'ages'

// Key = exakter Header-Wert aus der CSV (kleingeschrieben), Value = unsere
// interne Sektions-Bezeichnung.
// V3.0.3: Pinterest schreibt im aktuellen Engaged-Audience-Export „Device" und
// „Age" (Einzahl). Bei früheren / Total-Audience-Exporten gab es auch Mehrzahl —
// beide Varianten werden als Alias auf dieselbe interne Section gemappt, damit
// der Parser format-stabil bleibt.
const SECTION_MARKERS: Record<string, SectionName> = {
  interests: 'interests',
  countries: 'countries',
  metros: 'metros',
  gender: 'gender',
  device: 'devices',
  devices: 'devices',
  age: 'ages',
  ages: 'ages',
}

function classifySection(
  lines: string[]
): { kind: SectionName; dataStart: number } | null {
  const first = lines[0]?.trim()
  if (!first) return null

  // Format A — standalone marker („Interests").
  const standaloneKey = first.toLowerCase()
  const standalone = SECTION_MARKERS[standaloneKey]
  if (standalone) {
    return { kind: standalone, dataStart: 2 }
  }

  // Format B — kombinierter Marker („Countries,Percent of audience").
  const cells = splitCsvLine(first)
  if (cells.length >= 2) {
    const headKey = cells[0].toLowerCase()
    const combined = SECTION_MARKERS[headKey]
    if (combined) {
      return { kind: combined, dataStart: 1 }
    }
  }

  return null
}

// Hauptfunktion. Liefert strukturierte Daten oder wirft AudienceCsvError.
export function parseAudienceCsv(text: string): ParsedAudienceCsv {
  if (typeof text !== 'string' || !text.trim()) {
    throw new AudienceCsvError('CSV-Inhalt ist leer.')
  }

  const sections = splitIntoSections(text)
  if (sections.length === 0) {
    throw new AudienceCsvError('CSV enthält keine erkennbaren Sektionen.')
  }

  // Sektion 0 = Audience-Header (kein Sektions-Marker).
  const header = parseHeaderSection(sections[0])

  const data: AudienceSnapshotData = {
    interests: [],
    countries: [],
    metros: [],
    gender: [],
    devices: [],
    ages: [],
  }

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i]
    const classified = classifySection(section)
    if (!classified) continue
    const { kind, dataStart } = classified
    switch (kind) {
      case 'interests':
        data.interests = parseInterestsSection(section, dataStart)
        break
      case 'countries':
        data.countries = parseBreakdownSection(section, dataStart)
        break
      case 'metros':
        data.metros = parseBreakdownSection(section, dataStart)
        break
      case 'gender':
        data.gender = parseBreakdownSection(section, dataStart)
        break
      case 'devices':
        data.devices = parseBreakdownSection(section, dataStart)
        break
      case 'ages':
        data.ages = parseAgesSection(section, dataStart)
        break
    }
  }

  if (data.interests.length === 0) {
    throw new AudienceCsvError(
      'CSV enthält keine Interests-Sektion oder die Sektion ist leer. ' +
        'Stelle sicher, dass du den „Interagierende Zielgruppe"-Export verwendest.'
    )
  }

  return {
    audienceDate: header.audienceDate,
    audienceType: header.audienceType,
    audienceSize: header.audienceSize,
    data,
  }
}
