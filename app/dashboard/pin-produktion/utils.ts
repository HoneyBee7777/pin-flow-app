import { mergeSignalwoerter } from '@/lib/signalwoerter'

// ===== Enum-Werte =====
export const STATUS = ['entwurf', 'geplant', 'veroeffentlicht'] as const
export type Status = (typeof STATUS)[number]

export const STRATEGIE_TYPEN = [
  'blog_content',
  'affiliate',
  'produkt',
] as const
export type StrategieTyp = (typeof STRATEGIE_TYPEN)[number]

export const CONVERSION_ZIELE = ['traffic', 'lead', 'sales'] as const
export type ConversionZiel = (typeof CONVERSION_ZIELE)[number]

export const HOOK_ARTEN = [
  'problem',
  'ergebnis_transformation',
  'inspiration',
  'liste',
  'anleitung_how_to',
  'vergleich_entscheidung',
] as const
export type HookArt = (typeof HOOK_ARTEN)[number]

export const PIN_FORMATE = [
  'standard',
  'video',
  'idea',
  'collage',
  'shopping',
  'carousel',
] as const
export type PinFormat = (typeof PIN_FORMATE)[number]

export const KEYWORD_TYPEN = ['haupt', 'mid_tail', 'longtail'] as const
export type KeywordTyp = (typeof KEYWORD_TYPEN)[number]

// ===== Labels =====
export const STATUS_LABEL: Record<Status, string> = {
  entwurf: 'Entwurf',
  geplant: 'Geplant',
  veroeffentlicht: 'Veröffentlicht',
}

export const STATUS_BADGE: Record<Status, string> = {
  entwurf: 'bg-gray-100 text-gray-700',
  geplant: 'bg-blue-100 text-blue-700',
  veroeffentlicht: 'bg-green-100 text-green-700',
}

export const STRATEGIE_LABEL: Record<StrategieTyp, string> = {
  blog_content: 'Blog-Content',
  affiliate: 'Affiliate',
  produkt: 'Produkt',
}

export const STRATEGIE_BADGE: Record<StrategieTyp, string> = {
  blog_content: 'bg-blue-100 text-blue-700',
  affiliate: 'bg-amber-100 text-amber-800',
  produkt: 'bg-purple-100 text-purple-700',
}

export const CONVERSION_LABEL: Record<ConversionZiel, string> = {
  traffic: 'Traffic',
  lead: 'Lead',
  sales: 'Sales',
}

export const CONVERSION_BADGE: Record<ConversionZiel, string> = {
  traffic: 'bg-cyan-100 text-cyan-700',
  lead: 'bg-emerald-100 text-emerald-700',
  sales: 'bg-rose-100 text-rose-700',
}

export const HOOK_ART_LABEL: Record<HookArt, string> = {
  problem: 'Problem',
  ergebnis_transformation: 'Ergebnis-Transformation',
  inspiration: 'Inspiration',
  liste: 'Liste',
  anleitung_how_to: 'Anleitung / How-To',
  vergleich_entscheidung: 'Vergleich / Entscheidung',
}

export const PIN_FORMAT_LABEL: Record<PinFormat, string> = {
  standard: 'Standard',
  video: 'Video',
  idea: 'Idea',
  collage: 'Collage',
  shopping: 'Shopping',
  carousel: 'Carousel',
}

export const PIN_FORMAT_BADGE: Record<PinFormat, string> = {
  standard: 'bg-gray-100 text-gray-700',
  video: 'bg-pink-100 text-pink-700',
  idea: 'bg-violet-100 text-violet-700',
  collage: 'bg-emerald-100 text-emerald-700',
  shopping: 'bg-rose-100 text-rose-700',
  carousel: 'bg-amber-100 text-amber-800',
}

export const KEYWORD_TYP_LABEL: Record<KeywordTyp, string> = {
  haupt: 'Haupt',
  mid_tail: 'Mid-Tail',
  longtail: 'Longtail',
}

export const KEYWORD_TYP_EMOJI: Record<KeywordTyp, string> = {
  haupt: '🔴',
  mid_tail: '🟡',
  longtail: '🟢',
}

export const KEYWORD_TYP_BADGE: Record<KeywordTyp, string> = {
  haupt: 'bg-red-100 text-red-700',
  mid_tail: 'bg-yellow-100 text-yellow-800',
  longtail: 'bg-green-100 text-green-700',
}

// ===== Types =====
export type Pin = {
  id: string
  user_id: string
  content_id: string
  canva_vorlage_id: string | null
  ziel_url_id: string | null
  board_id: string | null
  saison_event_id: string | null
  titel: string | null
  hook: string | null
  beschreibung: string | null
  call_to_action: string | null
  strategie_typ: StrategieTyp | null
  conversion_ziel: ConversionZiel | null
  hook_art: HookArt | null
  pin_format: PinFormat | null
  status: Status
  geplante_veroeffentlichung: string | null
  impressionen: number
  klicks: number
  saves: number
  created_at: string
}

export type PinWithRelations = Pin & {
  content: { id: string; titel: string } | null
  vorlage: { id: string; name: string } | null
  url: { id: string; titel: string; url: string } | null
  board: { id: string; name: string } | null
  saison_event: { id: string; event_name: string } | null
  keywords: Array<{ id: string; keyword: string; typ: KeywordTyp }>
}

export type ContentOption = {
  id: string
  titel: string
  keywordIds: string[]
}

export type KeywordOption = {
  id: string
  keyword: string
  typ: KeywordTyp
}

export type BoardOption = {
  id: string
  name: string
}

export type ZielUrlOption = {
  id: string
  titel: string
  url: string
}

export type CanvaVorlageOption = {
  id: string
  name: string
}

export type SaisonEventOption = {
  id: string
  event_name: string
  event_datum: string | null
}

// ===== Prompt-Generator =====
export function buildPrompt(args: {
  board: string
  thema: string
  conversionZiel: string
  strategieTyp: string
  hookArt: string
  keywords: Array<{ keyword: string; typ: KeywordTyp }>
  customSignalwoerter?: string | null
}): string {
  const keywordsLine =
    args.keywords.length === 0
      ? '(keine ausgewählt)'
      : args.keywords
          .map((k) => `${KEYWORD_TYP_EMOJI[k.typ]} ${k.keyword}`)
          .join(', ')

  const signalwoerterLine = mergeSignalwoerter(
    args.customSignalwoerter ?? null
  ).join(', ')

  return `Du bist ein erfahrener Pinterest-SEO- und Content-Stratege.
=== KONTEXT ===
BOARD: ${args.board}
THEMA: ${args.thema}
ZIEL: ${args.conversionZiel}
CONTENT TYP: ${args.strategieTyp}
HOOK-ART: ${args.hookArt}
=== KEYWORDS ===
Legende: Roter Kreis = Haupt-Keyword (zwingend im Titel vorne), Gelber Kreis = Mid-Tail (in Titel und Beschreibung), Grüner Kreis = Longtail (als natürlicher Satz in Beschreibung)
Keywords: ${keywordsLine}
=== AUFGABE ===
Erstelle 2 eigenständige Pinterest-Pins. Jeder Pin muss eine eigene Suchintention bedienen, einen eigenen klaren Nutzen haben und sich deutlich vom anderen unterscheiden.
=== LIEFERE FÜR JEDEN PIN ===
1. PIN HOOK - Maximal 10 Wörter - Aufbau: Signalwort + Keyword + konkreter Nutzen
2. PIN TITEL - SEO-optimiert - Keywords möglichst weit vorne - Max. 100 Zeichen
3. PIN BESCHREIBUNG - 2-3 Sätze, max. 500 Zeichen - Keywords natürlich integriert
4. CALL TO ACTION - Passend zum Ziel: ${args.conversionZiel}
=== SIGNALWÖRTER POOL ===
${signalwoerterLine}
=== REGELN ===
- Tonalität: ruhig, hochwertig, sachlich - Kein Clickbait - Keine Emojis - Fokus auf Evergreen-Content
=== AUSGABEFORMAT ===
Tabellarisch: Hook | Titel | Beschreibung | Call-to-Action`
}

export function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

export function formatDateDe(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}
