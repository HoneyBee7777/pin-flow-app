'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from 'react'
import { useSearchParams } from 'next/navigation'
import SortableTh from '@/components/SortableTh'
import { HinweisBox } from '@/components/HinweisBox'
import { normalizeUrl } from '@/lib/normalize-url'
import {
  addZielUrl,
  deleteZielUrl,
  importZielUrls,
  updateZielUrl,
} from './actions'

export type Zielflaeche =
  | 'blog'
  | 'shop'
  | 'etsy'
  | 'affiliate'
  | 'landingpage'
  | 'newsletter'
  | 'buchung'

export type ContentOption = {
  id: string
  titel: string
}

export type BoardOption = {
  id: string
  name: string
}

export type ZielUrl = {
  id: string
  url: string
  titel: string
  zielflaeche: Zielflaeche | null
  notizen: string | null
  created_at: string
  contents: Array<{ id: string; titel: string }>
  boards: Array<{ id: string; name: string }>
  pinCount: number
}

type SortKey = 'url' | 'zielflaeche' | 'pins' | 'inhalte' | 'boards'

const ZIELFLAECHE_OPTIONS: Array<{ value: Zielflaeche; label: string }> = [
  { value: 'blog', label: 'Blog' },
  { value: 'shop', label: 'Shop auf eigener Website' },
  { value: 'etsy', label: 'Etsy-Shop' },
  { value: 'affiliate', label: 'Affiliate-Seite' },
  { value: 'landingpage', label: 'Landingpage' },
  { value: 'newsletter', label: 'Newsletter oder Lead-Magnet' },
  { value: 'buchung', label: 'Buchungs- oder Angebotsseite' },
]

const ZIELFLAECHE_LABEL: Record<Zielflaeche, string> = Object.fromEntries(
  ZIELFLAECHE_OPTIONS.map((o) => [o.value, o.label])
) as Record<Zielflaeche, string>

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
      <path
        fillRule="evenodd"
        d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export default function ZielUrlsClient({
  urls,
  availableContents,
  availableBoards,
}: {
  urls: ZielUrl[]
  availableContents: ContentOption[]
  availableBoards: BoardOption[]
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<ZielUrl | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [contentFilter, setContentFilter] = useState('')
  const [selectedContentIds, setSelectedContentIds] = useState<Set<string>>(
    new Set()
  )
  const [boardFilter, setBoardFilter] = useState('')
  const [selectedBoardIds, setSelectedBoardIds] = useState<Set<string>>(
    new Set()
  )
  const [isPending, startTransition] = useTransition()
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(
    null
  )
  // Deep-Link aus dem Strategie-Check: ?filter=ohne-zielflaeche zeigt direkt
  // nur Ziel-URLs ohne zugeordnetes Pin-Ziel.
  const searchParams = useSearchParams()
  const [nurOhneZiel, setNurOhneZiel] = useState(
    () => searchParams?.get('filter') === 'ohne-zielflaeche'
  )

  // Freitext-Suche mit Autocomplete (lokal adaptiert vom Pins-FilterKeyword).
  // Reiner Client-Filter — alle URLs sind ohnehin geladen.
  const [suchbegriff, setSuchbegriff] = useState('')
  const [suchOpen, setSuchOpen] = useState(false)
  const suchRef = useRef<HTMLDivElement>(null)

  // Kontrollierter URL-Eingabewert im Formular — Basis für die Duplikat-Warnung
  // (Live-Vergleich beim Tippen). Wird beim Öffnen/Schließen des Formulars
  // gesetzt; gespeichert wird weiterhin der rohe Wert (nur .trim) per FormData.
  const [urlInput, setUrlInput] = useState('')

  // Vorschlags-Dropdown schließen, wenn außerhalb geklickt wird.
  useEffect(() => {
    if (!suchOpen) return
    function onDocClick(e: MouseEvent) {
      if (suchRef.current && !suchRef.current.contains(e.target as Node)) {
        setSuchOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [suchOpen])

  const formOpen = showAddForm || editing !== null

  function toggleSort(key: SortKey) {
    setSort((cur) => {
      if (!cur || cur.key !== key) return { key, dir: 'asc' }
      if (cur.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  function dirOf(key: SortKey): 'asc' | 'desc' | null {
    return sort && sort.key === key ? sort.dir : null
  }

  const sortedUrls = useMemo(() => {
    if (!sort) return urls
    const dir = sort.dir === 'asc' ? 1 : -1
    const arr = [...urls]
    arr.sort((a, b) => {
      switch (sort.key) {
        case 'url':
          return a.url.localeCompare(b.url, 'de') * dir
        case 'zielflaeche': {
          const aN = a.zielflaeche ? ZIELFLAECHE_LABEL[a.zielflaeche] : ''
          const bN = b.zielflaeche ? ZIELFLAECHE_LABEL[b.zielflaeche] : ''
          if (aN === '' && bN !== '') return 1
          if (bN === '' && aN !== '') return -1
          return aN.localeCompare(bN, 'de') * dir
        }
        case 'pins':
          return (a.pinCount - b.pinCount) * dir
        case 'inhalte':
          return (a.contents.length - b.contents.length) * dir
        case 'boards':
          return (a.boards.length - b.boards.length) * dir
        default:
          return 0
      }
    })
    return arr
  }, [urls, sort])

  // Filterkette: Sortierung → „Nur ohne Pin-Ziel" → Freitext-Suche (url + titel).
  // Alle drei sind kombinierbar.
  const displayedUrls = useMemo(() => {
    const q = suchbegriff.trim().toLowerCase()
    let result = sortedUrls
    if (nurOhneZiel) result = result.filter((u) => !u.zielflaeche)
    if (q) {
      result = result.filter(
        (u) =>
          u.url.toLowerCase().includes(q) ||
          u.titel.toLowerCase().includes(q)
      )
    }
    return result
  }, [nurOhneZiel, sortedUrls, suchbegriff])
  const ohneZielCount = useMemo(
    () => urls.filter((u) => !u.zielflaeche).length,
    [urls]
  )

  // Duplikat-Warnung: gibt es eine BESTEHENDE Ziel-URL, deren normalisierte
  // Form der gerade eingegebenen entspricht (nur Schreibweise, siehe
  // normalizeUrl)? Beim Bearbeiten sich selbst per id ausnehmen. Nur Hinweis,
  // kein Blocker — der gespeicherte Wert bleibt unverändert.
  const aehnlicheUrl = useMemo(() => {
    const q = normalizeUrl(urlInput)
    if (!q) return null
    return (
      urls.find((u) => u.id !== editing?.id && normalizeUrl(u.url) === q) ??
      null
    )
  }, [urlInput, urls, editing])

  // Autocomplete-Vorschläge: leeres Feld → erste 8, sonst nach url/titel
  // gefiltert, max. 8 (wie das Pins-FilterKeyword-Vorbild).
  const suchVorschlaege = useMemo(() => {
    const q = suchbegriff.trim().toLowerCase()
    if (!q) return urls.slice(0, 8)
    return urls
      .filter(
        (u) =>
          u.url.toLowerCase().includes(q) ||
          u.titel.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [suchbegriff, urls])

  const filteredContents = useMemo(() => {
    const q = contentFilter.trim().toLowerCase()
    if (!q) return availableContents
    return availableContents.filter((c) =>
      c.titel.toLowerCase().includes(q)
    )
  }, [contentFilter, availableContents])

  const filteredBoards = useMemo(() => {
    const q = boardFilter.trim().toLowerCase()
    if (!q) return availableBoards
    return availableBoards.filter((b) => b.name.toLowerCase().includes(q))
  }, [boardFilter, availableBoards])

  function openAdd() {
    setEditing(null)
    setShowAddForm(true)
    setShowImport(false)
    setSelectedContentIds(new Set())
    setContentFilter('')
    setSelectedBoardIds(new Set())
    setBoardFilter('')
    setUrlInput('')
    setFormError(null)
  }

  function openEdit(u: ZielUrl) {
    setEditing(u)
    setShowAddForm(false)
    setShowImport(false)
    setSelectedContentIds(new Set(u.contents.map((c) => c.id)))
    setContentFilter('')
    setSelectedBoardIds(new Set(u.boards.map((b) => b.id)))
    setBoardFilter('')
    setUrlInput(u.url)
    setFormError(null)
  }

  function closeForm() {
    setShowAddForm(false)
    setEditing(null)
    setSelectedContentIds(new Set())
    setSelectedBoardIds(new Set())
    setUrlInput('')
    setFormError(null)
  }

  function toggleContent(id: string) {
    setSelectedContentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleBoard(id: string) {
    setSelectedBoardIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function onSubmitForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    const form = e.currentTarget
    const formData = new FormData(form)
    formData.delete('content_ids')
    selectedContentIds.forEach((id) => formData.append('content_ids', id))
    formData.delete('board_ids')
    selectedBoardIds.forEach((id) => formData.append('board_ids', id))
    const result = editing
      ? await (() => {
          formData.set('id', editing.id)
          return updateZielUrl(formData)
        })()
      : await addZielUrl(formData)
    if (result.error) {
      setFormError(result.error)
      return
    }
    form.reset()
    closeForm()
  }

  async function onImport(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setImportError(null)
    setImportMessage(null)
    const form = e.currentTarget
    const formData = new FormData(form)
    const result = await importZielUrls(formData)
    if (result.error) {
      setImportError(result.error)
      return
    }
    form.reset()
    setImportMessage(`${result.imported} URL(s) importiert.`)
    setShowImport(false)
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('id', id)
      await deleteZielUrl(formData)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => (showAddForm ? closeForm() : openAdd())}
          className="rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel"
        >
          {showAddForm ? 'Abbrechen' : 'URL hinzufügen'}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowImport((v) => !v)
            setShowAddForm(false)
            setEditing(null)
          }}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {showImport ? 'Abbrechen' : 'URLs importieren'}
        </button>
        {importMessage && !showImport && (
          <span className="self-center text-sm text-green-700">
            {importMessage}
          </span>
        )}
      </div>

      {formOpen && (
        <form
          key={editing?.id ?? 'new'}
          onSubmit={onSubmitForm}
          className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? 'Ziel-URL bearbeiten' : 'Neue Ziel-URL'}
          </h2>

          <div>
            <label
              htmlFor="url"
              className="block text-sm font-medium text-gray-700"
            >
              URL <span className="text-red-600">*</span>
            </label>
            <input
              id="url"
              name="url"
              type="text"
              inputMode="url"
              required
              placeholder="https://www.meinewebsite.de"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Bitte vollständige URL eingeben, z.B. https://www.meinewebsite.de
            </p>
            {aehnlicheUrl && (
              <div className="mt-2">
                <HinweisBox variant="warnung" tone="achtung" compact>
                  Es gibt bereits eine sehr ähnliche URL:{' '}
                  <span className="font-medium">{aehnlicheUrl.url}</span>. Bitte
                  prüfe, ob es dieselbe Seite ist. Speichern bleibt möglich.
                </HinweisBox>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="titel"
              className="block text-sm font-medium text-gray-700"
            >
              Titel <span className="text-red-600">*</span>
            </label>
            <input
              id="titel"
              name="titel"
              type="text"
              required
              placeholder="Landingpage, Angebotsseite, Blogthema"
              defaultValue={editing?.titel ?? ''}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label
              htmlFor="zielflaeche"
              className="block text-sm font-medium text-gray-700"
            >
              Pin-Ziel{!editing && <span className="text-red-600"> *</span>}
            </label>
            <select
              id="zielflaeche"
              name="zielflaeche"
              required={!editing}
              defaultValue={editing?.zielflaeche ?? ''}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="" disabled={!editing}>
                {editing ? 'Nicht zugeordnet' : 'Bitte wählen…'}
              </option>
              {ZIELFLAECHE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Wohin führt diese URL? Pin-Flow nutzt das später, um zu prüfen, ob
              deine Pins zu deiner Strategie-Verteilung passen.
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700">
                Content-Inhalte zuordnen
              </label>
              {availableContents.length > 0 && (
                <input
                  type="text"
                  value={contentFilter}
                  onChange={(e) => setContentFilter(e.target.value)}
                  placeholder="Filter…"
                  className="w-48 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              )}
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-gray-300 p-3">
              {availableContents.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Noch keine Content-Inhalte vorhanden — lege erst welche unter
                  „Content-Inhalte“ an.
                </p>
              ) : filteredContents.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Keine Treffer für „{contentFilter}“.
                </p>
              ) : (
                filteredContents.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedContentIds.has(c.id)}
                      onChange={() => toggleContent(c.id)}
                      className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="flex-1 text-gray-900">{c.titel}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700">
                Boards zuordnen
              </label>
              {availableBoards.length > 0 && (
                <input
                  type="text"
                  value={boardFilter}
                  onChange={(e) => setBoardFilter(e.target.value)}
                  placeholder="Filter…"
                  className="w-48 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              )}
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-gray-300 p-3">
              {availableBoards.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Noch keine Boards vorhanden — lege erst welche unter „Boards“
                  an.
                </p>
              ) : filteredBoards.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Keine Treffer für „{boardFilter}“.
                </p>
              ) : (
                filteredBoards.map((b) => (
                  <label
                    key={b.id}
                    className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBoardIds.has(b.id)}
                      onChange={() => toggleBoard(b.id)}
                      className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="flex-1 text-gray-900">{b.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="notizen"
              className="block text-sm font-medium text-gray-700"
            >
              Notizen
            </label>
            <textarea
              id="notizen"
              name="notizen"
              rows={3}
              defaultValue={editing?.notizen ?? ''}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {formError && <p className="text-sm text-red-700">{formError}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {showImport && (
        <form
          onSubmit={onImport}
          className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            URLs importieren
          </h2>
          <p className="text-sm text-gray-600">
            Pro Zeile eine URL — optional gefolgt von <code>|</code> und einem
            Titel. Ohne Titel wird die URL selbst als Titel verwendet.
            Duplikate und Leerzeilen werden ignoriert.
          </p>

          <div>
            <label
              htmlFor="text"
              className="block text-sm font-medium text-gray-700"
            >
              URLs <span className="text-red-600">*</span>
            </label>
            <textarea
              id="text"
              name="text"
              rows={10}
              required
              placeholder={
                'https://example.com/post-1\nhttps://example.com/post-2 | Mein Titel\nhttps://example.com/post-3'
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {importError && (
            <p className="text-sm text-red-700">{importError}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel"
            >
              Importieren
            </button>
            <button
              type="button"
              onClick={() => setShowImport(false)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {/* Freitext-Suche mit Autocomplete. Auswahl eines Vorschlags filtert
            die Tabelle auf diese URL (kein Sofort-Sprung ins Formular) — der
            vorhandene Bearbeiten-Knopf der Trefferzeile greift dann. */}
        <div ref={suchRef} className="relative">
          <input
            type="text"
            value={suchbegriff}
            onChange={(e) => {
              setSuchbegriff(e.target.value)
              setSuchOpen(true)
            }}
            onFocus={() => setSuchOpen(true)}
            placeholder="URL suchen …"
            className="w-64 rounded-md border border-gray-300 px-3 py-1.5 pr-8 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          {suchbegriff && (
            <button
              type="button"
              onClick={() => {
                setSuchbegriff('')
                setSuchOpen(false)
              }}
              aria-label="Suche zurücksetzen"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
          {suchOpen && suchVorschlaege.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-72 w-[28rem] max-w-[90vw] overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
              {suchVorschlaege.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      // mousedown statt click: feuert vor dem Blur des Inputs.
                      e.preventDefault()
                      setSuchbegriff(u.url)
                      setSuchOpen(false)
                    }}
                    className="block w-full px-3 py-1.5 text-left hover:bg-gray-50"
                  >
                    {u.titel ? (
                      // Mit Titel: Titel darf auf 2 Zeilen umbrechen, darunter
                      // die URL klein/grau (gekürzt).
                      <>
                        <span className="block line-clamp-2 text-sm text-gray-900">
                          {u.titel}
                        </span>
                        <span className="block truncate text-xs text-gray-500">
                          {u.url}
                        </span>
                      </>
                    ) : (
                      // Ohne Titel: nur die URL (nicht zweimal dasselbe).
                      <span className="block truncate text-sm text-gray-900">
                        {u.url}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-gray-700">
          <input
            type="checkbox"
            checked={nurOhneZiel}
            onChange={(e) => setNurOhneZiel(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          Nur ohne Pin-Ziel
          <span className="text-gray-400">({ohneZielCount})</span>
        </label>
        <span className="text-gray-500">
          {displayedUrls.length} von {urls.length} URLs
        </span>
      </div>

      <div className="max-h-[600px] overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Titel
              </th>
              <SortableTh
                dir={dirOf('url')}
                onClick={() => toggleSort('url')}
              >
                URL
              </SortableTh>
              <SortableTh
                dir={dirOf('zielflaeche')}
                onClick={() => toggleSort('zielflaeche')}
              >
                Pin-Ziel
              </SortableTh>
              <SortableTh
                dir={dirOf('pins')}
                onClick={() => toggleSort('pins')}
                align="right"
              >
                Pins
              </SortableTh>
              <SortableTh
                dir={dirOf('inhalte')}
                onClick={() => toggleSort('inhalte')}
              >
                Inhalte
              </SortableTh>
              <SortableTh
                dir={dirOf('boards')}
                onClick={() => toggleSort('boards')}
              >
                Boards
              </SortableTh>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Notizen
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Aktion
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayedUrls.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  {urls.length === 0
                    ? 'Noch keine URLs. Füge eine hinzu oder importiere mehrere.'
                    : 'Alle deine URLs haben ein Pin-Ziel. Schalte den Filter aus, um alle zu sehen.'}
                </td>
              </tr>
            ) : (
              displayedUrls.map((u) => (
                <tr key={u.id} className="align-top hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {u.titel}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-sm">
                    <a
                      href={u.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-link underline underline-offset-2"
                      title={u.url}
                    >
                      <span className="truncate">{u.url}</span>
                      <span aria-hidden className="shrink-0">
                        ↗
                      </span>
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {u.zielflaeche ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {ZIELFLAECHE_LABEL[u.zielflaeche]}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">
                        nicht zugeordnet
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-gray-900">
                    {u.pinCount}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {u.contents.length === 0 ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.contents.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                          >
                            {c.titel}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {u.boards.length === 0 ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.boards.map((b) => (
                          <span
                            key={b.id}
                            className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                          >
                            {b.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {u.notizen ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="text-gray-500 hover:text-gray-900"
                        aria-label="Bearbeiten"
                        title="Bearbeiten"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(u.id)}
                        disabled={isPending}
                        className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
