'use server'

// Server-Loader für das Account-Nischen-Profil. Lädt Boards (mit Kategorie)
// und Pin-Anzahl pro Board, ruft die pure Aggregations-Logik in
// lib/account-niche-profile.ts auf.
//
// Wird von Einstellungen-Page und Analytics-Page parallel zu loadUserBenchmark
// gefetcht — beide Pages zeigen die Nischen-Einordnung auf Basis derselben
// Aggregation.

import { createClient } from '@/lib/supabase-server'
import {
  calculateAccountNicheProfile,
  type AccountNicheProfile,
} from '@/lib/account-niche-profile'

export async function loadAccountNicheProfile(
  userId: string
): Promise<AccountNicheProfile> {
  const supabase = createClient()

  // Boards mit Kategorie + Pin-Count über die zugehörigen pins-Zeilen.
  // Geheime Boards bleiben drin: sie zählen für das Themenprofil mit, weil
  // sie zeigen, wofür der User produziert.
  const [boardsRes, pinsRes] = await Promise.all([
    supabase
      .from('boards')
      .select('id, kategorie')
      .eq('user_id', userId),
    supabase
      .from('pins')
      .select('board_id')
      .eq('user_id', userId)
      .not('board_id', 'is', null),
  ])

  type BoardRow = { id: string; kategorie: string | null }
  type PinRow = { board_id: string | null }

  const boardRows = (boardsRes.data ?? []) as BoardRow[]
  const pinRows = (pinsRes.data ?? []) as PinRow[]

  // Pin-Anzahl pro Board zählen.
  const pinCountByBoardId = new Map<string, number>()
  for (const p of pinRows) {
    if (!p.board_id) continue
    pinCountByBoardId.set(
      p.board_id,
      (pinCountByBoardId.get(p.board_id) ?? 0) + 1
    )
  }

  const boardsWithCounts = boardRows.map((b) => ({
    kategorie: b.kategorie,
    pinCount: pinCountByBoardId.get(b.id) ?? 0,
  }))

  // totalPins inkl. Pins auf Boards ohne Kategorie / ohne bekannte Nische.
  // primaryShare wird so streng gegen den Gesamtbestand gemessen — Boards
  // ohne Kategorie senken den primaryShare bewusst.
  const totalPins = pinRows.length

  return calculateAccountNicheProfile(boardsWithCounts, totalPins)
}
