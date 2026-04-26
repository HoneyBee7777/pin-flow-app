export const VORLAGEN_TYPEN = [
  'text_fokussiert',
  'bild_fokussiert',
  'split_layout',
  'video',
  'collage',
] as const

export type VorlagenTyp = (typeof VORLAGEN_TYPEN)[number]

export type CanvaVorlage = {
  id: string
  user_id: string
  name: string
  canva_link: string | null
  vorlagen_typ: VorlagenTyp
  farbschema: string | null
  notizen: string | null
  created_at: string
}

export type VorlageWithStats = CanvaVorlage & {
  pinCount: number
  hasDuplicate: boolean
}

export const VORLAGEN_TYP_LABEL: Record<VorlagenTyp, string> = {
  text_fokussiert: 'Text-fokussiert',
  bild_fokussiert: 'Bild-fokussiert',
  split_layout: 'Split-Layout',
  video: 'Video',
  collage: 'Collage',
}

export const VORLAGEN_TYP_BADGE: Record<VorlagenTyp, string> = {
  text_fokussiert: 'bg-blue-100 text-blue-700',
  bild_fokussiert: 'bg-purple-100 text-purple-700',
  split_layout: 'bg-amber-100 text-amber-800',
  video: 'bg-pink-100 text-pink-700',
  collage: 'bg-emerald-100 text-emerald-700',
}
