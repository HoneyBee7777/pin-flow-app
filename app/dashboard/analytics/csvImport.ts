// Pure parsing helpers for the Pinterest Analytics CSV import.
// No Supabase / no React — server actions and form helpers compose these.

export type Period = { von: string; bis: string }

export type PinMetric = 'klicks' | 'impressionen' | 'saves'

export type PinsCsvParseResult =
  | { error: string }
  | {
      metric: PinMetric
      rows: Array<{ pinterestPinId: string; value: number }>
    }

export type BoardsCsvParseResult =
  | { error: string }
  | {
      rows: Array<{
        boardSlug: string
        boardUrl: string
        impressionen: number
        engagement: number
        klicks_auf_pins: number
        ausgehende_klicks: number
        saves: number
      }>
    }

// Pinterest-Standard-Dateinamen: "Pinterest Analytics overview YYYYMMDD-YYYYMMDD.csv"
// (Leerzeichen, nicht Unterstriche). Browser hängen bei wiederholtem Download
// automatisch " (2)", " (3)" usw. vor der Endung an — das wird mit erkannt,
// sodass alle drei CSVs für denselben Zeitraum denselben Period zurückgeben.
export function parseFilenamePeriod(filename: string): Period | null {
  const m = filename.match(
    /Pinterest Analytics overview (\d{8})-(\d{8})(\s*\(\d+\))?\.csv$/i
  )
  if (!m) return null
  const ymd = (s: string) =>
    `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  const von = ymd(m[1])
  const bis = ymd(m[2])
  // Sanity-check: ergibt das ein valides Datum?
  if (Number.isNaN(Date.parse(von)) || Number.isNaN(Date.parse(bis))) return null
  return { von, bis }
}

// RFC-4180-konformer Single-Line-CSV-Parser. Multiline-Felder werden hier
// nicht unterstützt — Pinterest-Exports halten Werte in einer Zeile.
function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        cur += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function splitLines(text: string): string[] {
  // BOM + Windows/Mac/Unix-Line-Endings normalisieren.
  return text
    .replace(/^﻿/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
}

function parseInteger(raw: string): number {
  // Pinterest exportiert Integer ohne Tausender-Separator. Defensiv: Kommas
  // und Leerzeichen entfernen, falls eine zukünftige Version sie einführt.
  const cleaned = raw.replace(/[, ]/g, '').trim()
  if (!cleaned) return 0
  const n = Number(cleaned)
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0
}

// Sucht den ersten Header nach dem Sektions-Titel (case-insensitiv,
// Whitespace-tolerant). Gibt den Header-Index zurück oder -1.
function findSectionHeaderIndex(lines: string[], sectionTitle: string): number {
  const target = sectionTitle.toLowerCase()
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim().toLowerCase()
    if (l.startsWith(target)) {
      let j = i + 1
      while (j < lines.length && !lines[j].trim()) j++
      return j < lines.length ? j : -1
    }
  }
  return -1
}

// Light-Validierung: erkennt nur die Metrik aus dem Top-Pins-Header,
// ohne die Pin-Datenzeilen zu parsen. Wird im EingabeTab pro Upload-Slot
// aufgerufen, um die hochgeladene CSV gegen den erwarteten Slot
// abzugleichen. Gibt `null` zurück, wenn kein „Top Pins"-Block gefunden
// wurde oder der Header nicht zu einer der drei bekannten Metriken passt.
export function detectPinsCsvMetric(text: string): PinMetric | null {
  const lines = splitLines(text)
  const headerIdx = findSectionHeaderIndex(lines, 'top pins')
  if (headerIdx === -1) return null
  const header = parseCsvLine(lines[headerIdx])
  if (header.length < 5) return null
  const col = header[4].toLowerCase()
  if (col.includes('outbound')) return 'klicks'
  if (col.includes('impression')) return 'impressionen'
  if (col.includes('save')) return 'saves'
  return null
}

export function parsePinsCsv(text: string): PinsCsvParseResult {
  const lines = splitLines(text)
  const headerIdx = findSectionHeaderIndex(lines, 'top pins')
  if (headerIdx === -1)
    return { error: 'Sektion „Top Pins" in CSV nicht gefunden.' }

  const header = parseCsvLine(lines[headerIdx])
  // Erwartetes Layout: Pinterest Link, Content Type, Source, Canonical, [Metrik]
  if (header.length < 5)
    return { error: '„Top Pins"-Header hat weniger als 5 Spalten.' }

  const metricCol = header[4].toLowerCase()
  let metric: PinMetric
  if (metricCol.includes('outbound')) metric = 'klicks'
  else if (metricCol.includes('impression')) metric = 'impressionen'
  else if (metricCol.includes('save')) metric = 'saves'
  else
    return {
      error: `Unbekannte Metrik in Spalte 5: „${header[4]}". Erwartet: Outbound clicks, Impressions oder Saves.`,
    }

  const rows: Array<{ pinterestPinId: string; value: number }> = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) break // Leerzeile beendet die Sektion
    const cols = parseCsvLine(line)
    if (cols.length < 5) continue
    const url = cols[0]
    const m = url.match(/\/pin\/(\d+)/)
    if (!m) continue
    const pinterestPinId = m[1]
    const value = parseInteger(cols[4])
    rows.push({ pinterestPinId, value })
  }

  return { metric, rows }
}

export function parseBoardsCsv(text: string): BoardsCsvParseResult {
  const lines = splitLines(text)
  const headerIdx = findSectionHeaderIndex(lines, 'top boards')
  if (headerIdx === -1)
    return { error: 'Sektion „Top Boards" in CSV nicht gefunden.' }

  const header = parseCsvLine(lines[headerIdx])
  // Erwartet: Pinterest Link, Impressions, Engagement, Pin clicks, Outbound clicks, Saves
  if (header.length < 6)
    return { error: '„Top Boards"-Header hat weniger als 6 Spalten.' }

  const rows: Array<{
    boardSlug: string
    boardUrl: string
    impressionen: number
    engagement: number
    klicks_auf_pins: number
    ausgehende_klicks: number
    saves: number
  }> = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) break
    const cols = parseCsvLine(line)
    if (cols.length < 6) continue
    const url = cols[0]
    const slug = extractPinterestBoardSlug(url)
    if (!slug) continue
    rows.push({
      boardSlug: slug,
      boardUrl: url,
      impressionen: parseInteger(cols[1]),
      engagement: parseInteger(cols[2]),
      klicks_auf_pins: parseInteger(cols[3]),
      ausgehende_klicks: parseInteger(cols[4]),
      saves: parseInteger(cols[5]),
    })
  }
  return { rows }
}

// Pin-URL → numerische Pin-ID. Akzeptiert pinterest.com, pinterest.de, etc.
// Beispiel: https://www.pinterest.com/pin/1091700765947216952/  → "1091700765947216952"
export function extractPinterestPinId(url: string): string | null {
  if (!url) return null
  const m = url.match(/\/pin\/(\d+)/)
  return m ? m[1] : null
}

// Board-URL → Slug-Segment hinter dem Username.
// Beispiel: https://www.pinterest.com/yogaflow-studio/yoga-zuhause-yogaraum/
//          → "yoga-zuhause-yogaraum"
// Pin-URLs (mit /pin/ als zweitem Segment) werden bewusst NICHT als Boards
// erkannt.
export function extractPinterestBoardSlug(url: string): string | null {
  if (!url) return null
  const m = url.match(/pinterest\.[a-z.]+\/([^/?#]+)\/([^/?#]+)/i)
  if (!m) return null
  if (m[1].toLowerCase() === 'pin') return null
  return m[2]
}
