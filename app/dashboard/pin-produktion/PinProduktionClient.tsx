'use client'

import {
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import {
  addPin,
  deletePin,
  importPins,
  updatePin,
  type ImportPinRow,
} from './actions'
import {
  buildPrompt,
  CONVERSION_BADGE,
  CONVERSION_LABEL,
  CONVERSION_ZIELE,
  countWords,
  formatDateDe,
  HOOK_ART_LABEL,
  HOOK_ARTEN,
  KEYWORD_TYP_BADGE,
  KEYWORD_TYP_EMOJI,
  KEYWORD_TYP_LABEL,
  KEYWORD_TYPEN,
  PIN_FORMAT_BADGE,
  PIN_FORMAT_LABEL,
  PIN_FORMATE,
  STATUS,
  STATUS_BADGE,
  STATUS_LABEL,
  STRATEGIE_BADGE,
  STRATEGIE_LABEL,
  STRATEGIE_TYPEN,
  type BoardOption,
  type CanvaVorlageOption,
  type ContentOption,
  type ConversionZiel,
  type HookArt,
  type KeywordOption,
  type PinFormat,
  type PinWithRelations,
  type SaisonEventOption,
  type Status,
  type StrategieTyp,
  type ZielUrlOption,
} from './utils'

type Props = {
  pins: PinWithRelations[]
  contents: ContentOption[]
  keywords: KeywordOption[]
  boards: BoardOption[]
  urls: ZielUrlOption[]
  vorlagen: CanvaVorlageOption[]
  saisonEvents: SaisonEventOption[]
  comboCount: Record<string, number>
  customSignalwoerter: string | null
}

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

export default function PinProduktionClient(props: Props) {
  const [editing, setEditing] = useState<PinWithRelations | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [isPending, startTransition] = useTransition()

  const formOpen = showAddForm || editing !== null

  function openAdd() {
    setEditing(null)
    setShowAddForm(true)
    setShowCsvImport(false)
  }

  function openEdit(pin: PinWithRelations) {
    setEditing(pin)
    setShowAddForm(false)
    setShowCsvImport(false)
  }

  function closeForm() {
    setShowAddForm(false)
    setEditing(null)
  }

  function toggleCsvImport() {
    setShowCsvImport((s) => !s)
    setShowAddForm(false)
    setEditing(null)
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      await deletePin(fd)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => (formOpen ? closeForm() : openAdd())}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          {formOpen ? 'Abbrechen' : 'Neuen Pin erstellen'}
        </button>
        <button
          type="button"
          onClick={toggleCsvImport}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {showCsvImport ? 'Import schließen' : '📥 Pins importieren'}
        </button>
      </div>

      {showCsvImport && (
        <CsvImport
          contents={props.contents}
          onClose={() => setShowCsvImport(false)}
        />
      )}

      {formOpen && (
        <PinForm
          key={editing?.id ?? 'new'}
          editing={editing}
          contents={props.contents}
          keywords={props.keywords}
          boards={props.boards}
          urls={props.urls}
          vorlagen={props.vorlagen}
          saisonEvents={props.saisonEvents}
          comboCount={props.comboCount}
          customSignalwoerter={props.customSignalwoerter}
          onClose={closeForm}
        />
      )}

      <PinTable
        pins={props.pins}
        onEdit={openEdit}
        onDelete={onDelete}
        deleteDisabled={isPending}
      />
    </div>
  )
}

// ===========================================================
// Tabelle
// ===========================================================
function PinTable({
  pins,
  onEdit,
  onDelete,
  deleteDisabled,
}: {
  pins: PinWithRelations[]
  onEdit: (pin: PinWithRelations) => void
  onDelete: (id: string) => void
  deleteDisabled: boolean
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <Th>Titel</Th>
            <Th>Hook</Th>
            <Th>Status</Th>
            <Th>Veröffentlichung</Th>
            <Th>Strategie</Th>
            <Th>Conversion</Th>
            <Th>Format</Th>
            <Th>Vorlage</Th>
            <Th>URL</Th>
            <Th align="right">Aktion</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {pins.length === 0 ? (
            <tr>
              <td
                colSpan={10}
                className="px-4 py-8 text-center text-sm text-gray-500"
              >
                Noch keine Pins. Lege einen über das Formular an.
              </td>
            </tr>
          ) : (
            pins.map((pin) => (
              <tr key={pin.id} className="align-top hover:bg-gray-50">
                <td className="max-w-xs px-4 py-3 text-sm font-medium text-gray-900">
                  {pin.titel ?? <span className="text-gray-400">—</span>}
                </td>
                <td className="max-w-xs px-4 py-3 text-sm text-gray-700">
                  {pin.hook ?? <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[pin.status]}`}
                  >
                    {STATUS_LABEL[pin.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {formatDateDe(pin.geplante_veroeffentlichung)}
                </td>
                <td className="px-4 py-3 text-sm">
                  {pin.strategie_typ ? (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STRATEGIE_BADGE[pin.strategie_typ]}`}
                    >
                      {STRATEGIE_LABEL[pin.strategie_typ]}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {pin.conversion_ziel ? (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CONVERSION_BADGE[pin.conversion_ziel]}`}
                    >
                      {CONVERSION_LABEL[pin.conversion_ziel]}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {pin.pin_format ? (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PIN_FORMAT_BADGE[pin.pin_format]}`}
                    >
                      {PIN_FORMAT_LABEL[pin.pin_format]}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {pin.vorlage?.name ?? <span className="text-gray-400">—</span>}
                </td>
                <td className="max-w-xs px-4 py-3 text-sm text-gray-700">
                  {pin.url ? (
                    <span className="truncate" title={pin.url.url}>
                      {pin.url.titel}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => onEdit(pin)}
                      className="text-gray-500 hover:text-gray-900"
                      aria-label="Bearbeiten"
                      title="Bearbeiten"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(pin.id)}
                      disabled={deleteDisabled}
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
  )
}

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <th
      className={`px-4 py-3 text-${align} text-xs font-semibold uppercase tracking-wide text-gray-500`}
    >
      {children}
    </th>
  )
}

// ===========================================================
// Formular (zwei-stufig)
// ===========================================================
function PinForm({
  editing,
  contents,
  keywords,
  boards,
  urls,
  vorlagen,
  saisonEvents,
  comboCount,
  customSignalwoerter,
  onClose,
}: {
  editing: PinWithRelations | null
  contents: ContentOption[]
  keywords: KeywordOption[]
  boards: BoardOption[]
  urls: ZielUrlOption[]
  vorlagen: CanvaVorlageOption[]
  saisonEvents: SaisonEventOption[]
  comboCount: Record<string, number>
  customSignalwoerter: string | null
  onClose: () => void
}) {
  const isEdit = editing !== null

  // Stage 1
  const [contentId, setContentId] = useState(editing?.content_id ?? '')
  const [themaKontext, setThemaKontext] = useState('')
  const [keywordIds, setKeywordIds] = useState<string[]>(
    editing?.keywords.map((k) => k.id) ?? []
  )
  const [boardId, setBoardId] = useState(editing?.board_id ?? '')
  const [strategieTyp, setStrategieTyp] = useState<StrategieTyp | ''>(
    editing?.strategie_typ ?? ''
  )
  const [conversionZiel, setConversionZiel] = useState<ConversionZiel | ''>(
    editing?.conversion_ziel ?? ''
  )
  const [hookArt, setHookArt] = useState<HookArt | ''>(
    editing?.hook_art ?? ''
  )

  // Prompt
  const [promptText, setPromptText] = useState('')
  const [copied, setCopied] = useState(false)
  const [showStage2, setShowStage2] = useState(isEdit)

  // Stage 2
  const [titel, setTitel] = useState(editing?.titel ?? '')
  const [hookField, setHookField] = useState(editing?.hook ?? '')
  const [beschreibung, setBeschreibung] = useState(editing?.beschreibung ?? '')
  const [callToAction, setCallToAction] = useState(
    editing?.call_to_action ?? ''
  )
  const [urlId, setUrlId] = useState(editing?.ziel_url_id ?? '')
  const [vorlageId, setVorlageId] = useState(editing?.canva_vorlage_id ?? '')
  const [saisonEventId, setSaisonEventId] = useState(
    editing?.saison_event_id ?? ''
  )
  const [pinFormat, setPinFormat] = useState<PinFormat | ''>(
    editing?.pin_format ?? ''
  )
  const [geplanteVeroeffentlichung, setGeplanteVeroeffentlichung] = useState(
    editing?.geplante_veroeffentlichung ?? ''
  )
  const [status, setStatus] = useState<Status>(editing?.status ?? 'entwurf')

  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Abgeleitete Werte
  const selectedContent = useMemo(
    () => contents.find((c) => c.id === contentId) ?? null,
    [contents, contentId]
  )

  const filteredKeywords = useMemo(() => {
    if (!selectedContent) return [] as KeywordOption[]
    const ids = new Set(selectedContent.keywordIds)
    return keywords.filter((k) => ids.has(k.id))
  }, [selectedContent, keywords])

  const groupedKeywords = useMemo(() => {
    const out: Record<KeywordOption['typ'], KeywordOption[]> = {
      haupt: [],
      mid_tail: [],
      longtail: [],
    }
    for (const kw of filteredKeywords) out[kw.typ].push(kw)
    return out
  }, [filteredKeywords])

  const dupCount =
    vorlageId && urlId
      ? (comboCount[`${vorlageId}|${urlId}`] ?? 0)
      : 0

  function toggleKeyword(id: string) {
    setKeywordIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function generatePrompt() {
    if (!contentId) {
      setFormError('Bitte zuerst einen Content-Inhalt wählen.')
      return
    }
    if (!themaKontext.trim()) {
      setFormError('Bitte das Feld „Thema & Kontext" ausfüllen.')
      return
    }
    setFormError(null)

    const board = boards.find((b) => b.id === boardId)
    const selectedKeywords = filteredKeywords
      .filter((k) => keywordIds.includes(k.id))
      .map((k) => ({ keyword: k.keyword, typ: k.typ }))

    const text = buildPrompt({
      board: board?.name ?? '(kein Board gewählt)',
      thema: themaKontext.trim(),
      conversionZiel: conversionZiel
        ? CONVERSION_LABEL[conversionZiel]
        : '(noch nicht gewählt)',
      strategieTyp: strategieTyp
        ? STRATEGIE_LABEL[strategieTyp]
        : '(noch nicht gewählt)',
      hookArt: hookArt ? HOOK_ART_LABEL[hookArt] : '(noch nicht gewählt)',
      keywords: selectedKeywords,
      customSignalwoerter,
    })

    setPromptText(text)
    setShowStage2(true)
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(promptText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setFormError('Kopieren fehlgeschlagen — bitte manuell markieren.')
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)

    const form = e.currentTarget
    const formData = new FormData(form)

    if (isEdit && editing) {
      formData.set('id', editing.id)
    }

    const result = isEdit ? await updatePin(formData) : await addPin(formData)
    setSubmitting(false)

    if (result.error) {
      setFormError(result.error)
      return
    }
    onClose()
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          {isEdit ? 'Pin bearbeiten' : 'Neuen Pin erstellen'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {isEdit
            ? 'Alle Felder sind vorausgefüllt. Du kannst beliebige Werte anpassen und neu speichern.'
            : 'Stufe 1 — wähle Inhalt, Keywords und Strategie. Dann „Prompt generieren" klicken.'}
        </p>
      </div>

      {/* ============= STUFE 1 ============= */}
      <fieldset className="space-y-4 rounded-md border border-gray-200 p-4">
        <legend className="px-2 text-sm font-semibold text-gray-700">
          Stufe 1 — Prompt-Vorbereitung
        </legend>

        <Field
          label="Content-Inhalt"
          htmlFor="content_id"
          required
        >
          <select
            id="content_id"
            name="content_id"
            required
            value={contentId}
            onChange={(e) => {
              setContentId(e.target.value)
              setKeywordIds([])
            }}
            className={inputCls}
          >
            <option value="" disabled>
              Bitte wählen…
            </option>
            {contents.map((c) => (
              <option key={c.id} value={c.id}>
                {c.titel}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Thema & Kontext"
          htmlFor="thema_kontext"
          required={!isEdit}
        >
          <textarea
            id="thema_kontext"
            name="thema_kontext"
            required={!isEdit}
            rows={4}
            value={themaKontext}
            onChange={(e) => setThemaKontext(e.target.value)}
            placeholder="Beschreibe das Thema dieses Pins, füge Stichpunkte ein oder kopiere einen Ausschnitt deines Blogbeitrags hier rein. Je mehr Kontext, desto besser wird die Pin-Beschreibung."
            className={inputCls}
          />
          <p className="mt-1 text-xs text-gray-500">
            Dieser Text fließt direkt in den KI-Prompt ein und sorgt dafür, dass
            Titel und Beschreibung zur Customer Journey passen.
          </p>
        </Field>

        {contentId && (
          <div>
            <p className="mb-2 block text-sm font-medium text-gray-700">
              Keywords (Mehrfachauswahl)
            </p>
            {filteredKeywords.length === 0 ? (
              <p className="text-sm text-gray-500">
                Für diesen Inhalt sind noch keine Keywords verknüpft.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {KEYWORD_TYPEN.map((typ) => (
                  <div
                    key={typ}
                    className="rounded-md border border-gray-200 p-3"
                  >
                    <p
                      className={`mb-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${KEYWORD_TYP_BADGE[typ]}`}
                    >
                      <span aria-hidden>{KEYWORD_TYP_EMOJI[typ]}</span>
                      {KEYWORD_TYP_LABEL[typ]}
                    </p>
                    {groupedKeywords[typ].length === 0 ? (
                      <p className="text-xs text-gray-400">—</p>
                    ) : (
                      <ul className="space-y-1">
                        {groupedKeywords[typ].map((kw) => (
                          <li key={kw.id}>
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                name="keyword_ids"
                                value={kw.id}
                                checked={keywordIds.includes(kw.id)}
                                onChange={() => toggleKeyword(kw.id)}
                                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                              />
                              {kw.keyword}
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Field label="Board" htmlFor="board_id">
          <select
            id="board_id"
            name="board_id"
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
            className={inputCls}
          >
            <option value="">— ohne Board —</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Strategie-Typ" htmlFor="strategie_typ">
            <select
              id="strategie_typ"
              name="strategie_typ"
              value={strategieTyp}
              onChange={(e) =>
                setStrategieTyp(e.target.value as StrategieTyp | '')
              }
              className={inputCls}
            >
              <option value="">— wählen —</option>
              {STRATEGIE_TYPEN.map((s) => (
                <option key={s} value={s}>
                  {STRATEGIE_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Conversion-Ziel" htmlFor="conversion_ziel">
            <select
              id="conversion_ziel"
              name="conversion_ziel"
              value={conversionZiel}
              onChange={(e) =>
                setConversionZiel(e.target.value as ConversionZiel | '')
              }
              className={inputCls}
            >
              <option value="">— wählen —</option>
              {CONVERSION_ZIELE.map((c) => (
                <option key={c} value={c}>
                  {CONVERSION_LABEL[c]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Hook-Art" htmlFor="hook_art">
            <select
              id="hook_art"
              name="hook_art"
              value={hookArt}
              onChange={(e) => setHookArt(e.target.value as HookArt | '')}
              className={inputCls}
            >
              <option value="">— wählen —</option>
              {HOOK_ARTEN.map((h) => (
                <option key={h} value={h}>
                  {HOOK_ART_LABEL[h]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={generatePrompt}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            🪄 Prompt generieren
          </button>
          {!isEdit && !showStage2 && (
            <span className="text-xs text-gray-500">
              Pflichtfelder für Stufe 2 erscheinen nach Generierung.
            </span>
          )}
        </div>

        {promptText && (
          <div className="space-y-2">
            <label
              htmlFor="prompt_output"
              className="block text-sm font-medium text-gray-700"
            >
              Generierter Prompt
            </label>
            <textarea
              id="prompt_output"
              readOnly
              value={promptText}
              rows={16}
              className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-800"
            />
            <button
              type="button"
              onClick={copyPrompt}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {copied ? '✓ Kopiert' : '📋 Kopieren'}
            </button>
          </div>
        )}
      </fieldset>

      {/* ============= STUFE 2 ============= */}
      {showStage2 && (
        <fieldset className="space-y-4 rounded-md border border-gray-200 p-4">
          <legend className="px-2 text-sm font-semibold text-gray-700">
            Stufe 2 — Pin speichern
          </legend>

          <Field label="Titel" htmlFor="titel">
            <input
              id="titel"
              name="titel"
              type="text"
              maxLength={100}
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              className={inputCls}
            />
            <Counter current={titel.length} max={100} unit="Zeichen" />
          </Field>

          <Field label="Hook" htmlFor="hook">
            <input
              id="hook"
              name="hook"
              type="text"
              value={hookField}
              onChange={(e) => setHookField(e.target.value)}
              className={inputCls}
            />
            <Counter
              current={countWords(hookField)}
              max={10}
              unit="Wörter"
            />
          </Field>

          <Field label="Beschreibung" htmlFor="beschreibung">
            <textarea
              id="beschreibung"
              name="beschreibung"
              rows={3}
              maxLength={500}
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              className={inputCls}
            />
            <Counter current={beschreibung.length} max={500} unit="Zeichen" />
          </Field>

          <Field label="Call-to-Action" htmlFor="call_to_action">
            <input
              id="call_to_action"
              name="call_to_action"
              type="text"
              value={callToAction}
              onChange={(e) => setCallToAction(e.target.value)}
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Ziel-URL" htmlFor="ziel_url_id">
              <select
                id="ziel_url_id"
                name="ziel_url_id"
                value={urlId}
                onChange={(e) => setUrlId(e.target.value)}
                className={inputCls}
              >
                <option value="">— keine URL —</option>
                {urls.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.titel}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Canva-Vorlage" htmlFor="canva_vorlage_id">
              <select
                id="canva_vorlage_id"
                name="canva_vorlage_id"
                value={vorlageId}
                onChange={(e) => setVorlageId(e.target.value)}
                className={inputCls}
              >
                <option value="">— keine Vorlage —</option>
                {vorlagen.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {dupCount > 3 && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
              ⚠️ Diese Kombination Vorlage + URL existiert bereits {dupCount}×
              — Pinterest wertet sehr ähnliche Pins als Spam. Erwäge eine
              andere Vorlage oder Ziel-URL.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Saison-Tag (optional)" htmlFor="saison_event_id">
              <select
                id="saison_event_id"
                name="saison_event_id"
                value={saisonEventId}
                onChange={(e) => setSaisonEventId(e.target.value)}
                className={inputCls}
              >
                <option value="">— keiner —</option>
                {saisonEvents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.event_name}
                    {s.event_datum ? ` (${formatDateDe(s.event_datum)})` : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Pin-Format" htmlFor="pin_format">
              <select
                id="pin_format"
                name="pin_format"
                value={pinFormat}
                onChange={(e) =>
                  setPinFormat(e.target.value as PinFormat | '')
                }
                className={inputCls}
              >
                <option value="">— wählen —</option>
                {PIN_FORMATE.map((p) => (
                  <option key={p} value={p}>
                    {PIN_FORMAT_LABEL[p]}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Veröffentlichungsdatum (optional)"
              htmlFor="geplante_veroeffentlichung"
            >
              <input
                id="geplante_veroeffentlichung"
                name="geplante_veroeffentlichung"
                type="date"
                value={geplanteVeroeffentlichung}
                onChange={(e) => setGeplanteVeroeffentlichung(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Status" htmlFor="status" required>
            <select
              id="status"
              name="status"
              required
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className={inputCls}
            >
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
        </fieldset>
      )}

      {formError && (
        <p className="text-sm text-red-700">{formError}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || (!isEdit && !showStage2)}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          title={
            !isEdit && !showStage2
              ? 'Erst Prompt generieren, um die Pin-Felder freizugeben'
              : ''
          }
        >
          {submitting ? 'Speichert…' : 'Speichern'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}

// ===========================================================
// Hilfs-Komponenten
// ===========================================================
const inputCls =
  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500'

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700"
      >
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
    </div>
  )
}

function Counter({
  current,
  max,
  unit,
}: {
  current: number
  max: number
  unit: string
}) {
  const over = current > max
  return (
    <p
      className={`mt-1 text-xs ${over ? 'font-medium text-red-600' : 'text-gray-500'}`}
    >
      {current}/{max} {unit}
    </p>
  )
}

// ===========================================================
// CSV-Import
// ===========================================================
const CSV_EXPECTED_COLUMNS = [
  'titel',
  'hook',
  'beschreibung',
  'call_to_action',
  'pin_format',
  'status',
  'geplante_veroeffentlichung',
] as const

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  function commitField() {
    row.push(field)
    field = ''
  }
  function commitRow() {
    commitField()
    if (row.some((s) => s.length > 0)) rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        field += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === ',') {
        commitField()
      } else if (c === '\n') {
        commitRow()
      } else if (c === '\r') {
        // Carriage return — ignore, '\n' commits row
      } else {
        field += c
      }
    }
  }
  if (field.length > 0 || row.length > 0) commitRow()
  return rows
}

function normalizeStatus(v: string): Status | null {
  const lower = v.trim().toLowerCase()
  if (lower === 'entwurf' || lower === 'draft') return 'entwurf'
  if (lower === 'geplant' || lower === 'scheduled') return 'geplant'
  if (
    lower === 'veröffentlicht' ||
    lower === 'veroeffentlicht' ||
    lower === 'published'
  )
    return 'veroeffentlicht'
  return null
}

function normalizePinFormat(v: string): PinFormat | null {
  const lower = v.trim().toLowerCase()
  const known: PinFormat[] = [
    'standard',
    'video',
    'idea',
    'collage',
    'shopping',
    'carousel',
  ]
  for (const k of known) if (lower === k) return k
  if (lower === 'karussell') return 'carousel'
  return null
}

function CsvImport({
  contents,
  onClose,
}: {
  contents: ContentOption[]
  onClose: () => void
}) {
  const [contentId, setContentId] = useState('')
  const [parsed, setParsed] = useState<ImportPinRow[] | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [skippedRows, setSkippedRows] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    error?: string
    imported?: number
  }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  function downloadTemplate() {
    const header = CSV_EXPECTED_COLUMNS.join(',') + '\n'
    const blob = new Blob([header], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pins-vorlage.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setParseError(null)
    setSkippedRows([])
    setParsed(null)
    setFeedback({})
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const lines = parseCsv(text)
      if (lines.length === 0) {
        setParseError('CSV ist leer.')
        return
      }
      const header = lines[0].map((s) => s.trim().toLowerCase())
      for (const col of CSV_EXPECTED_COLUMNS) {
        if (!header.includes(col)) {
          setParseError(`Spalte „${col}" fehlt im Header.`)
          return
        }
      }
      const idx: Record<string, number> = {}
      for (const col of CSV_EXPECTED_COLUMNS) idx[col] = header.indexOf(col)

      const rows: ImportPinRow[] = []
      const errors: string[] = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        const titel = (line[idx.titel] ?? '').trim()
        const hook = (line[idx.hook] ?? '').trim()
        const beschreibung = (line[idx.beschreibung] ?? '').trim()
        const cta = (line[idx.call_to_action] ?? '').trim()
        const formatRaw = (line[idx.pin_format] ?? '').trim()
        const statusRaw = (line[idx.status] ?? '').trim()
        const datumRaw = (line[idx.geplante_veroeffentlichung] ?? '').trim()
        const lineNo = i + 1

        const status = normalizeStatus(statusRaw)
        if (!status) {
          errors.push(
            `Zeile ${lineNo}: Status „${statusRaw}" ungültig (erwartet: Entwurf / Geplant / Veröffentlicht)`
          )
          continue
        }
        const pin_format = formatRaw ? normalizePinFormat(formatRaw) : null
        if (formatRaw && !pin_format) {
          errors.push(`Zeile ${lineNo}: Pin-Format „${formatRaw}" ungültig`)
          continue
        }
        let datum: string | null = null
        if (datumRaw) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(datumRaw)) {
            errors.push(
              `Zeile ${lineNo}: Datum „${datumRaw}" muss YYYY-MM-DD sein`
            )
            continue
          }
          datum = datumRaw
        }
        if (titel.length > 100) {
          errors.push(`Zeile ${lineNo}: Titel zu lang (max. 100 Zeichen)`)
          continue
        }
        if (beschreibung.length > 500) {
          errors.push(
            `Zeile ${lineNo}: Beschreibung zu lang (max. 500 Zeichen)`
          )
          continue
        }
        if (hook && hook.split(/\s+/).filter(Boolean).length > 10) {
          errors.push(`Zeile ${lineNo}: Hook zu lang (max. 10 Wörter)`)
          continue
        }
        rows.push({
          titel: titel || null,
          hook: hook || null,
          beschreibung: beschreibung || null,
          call_to_action: cta || null,
          pin_format,
          status,
          geplante_veroeffentlichung: datum,
        })
      }
      setSkippedRows(errors)
      setParsed(rows)
    }
    reader.readAsText(file, 'utf-8')
  }

  function doImport() {
    if (!contentId || !parsed || parsed.length === 0) return
    setFeedback({})
    startTransition(async () => {
      const result = await importPins({ contentId, rows: parsed })
      if (result.error) {
        setFeedback({ error: result.error })
      } else {
        setFeedback({ imported: result.imported })
        setParsed(null)
        setSkippedRows([])
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    })
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Pins importieren
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Lade eine CSV-Datei hoch, um mehrere Pins gleichzeitig anzulegen. Alle
          importierten Pins werden dem ausgewählten Content-Inhalt zugeordnet.
        </p>
      </div>

      <div>
        <label
          htmlFor="import_content_id"
          className="block text-sm font-medium text-gray-700"
        >
          Content-Inhalt für alle importierten Pins{' '}
          <span className="text-red-600">*</span>
        </label>
        <select
          id="import_content_id"
          value={contentId}
          onChange={(e) => setContentId(e.target.value)}
          className={inputCls}
        >
          <option value="" disabled>
            Bitte wählen…
          </option>
          {contents.map((c) => (
            <option key={c.id} value={c.id}>
              {c.titel}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
        <p className="font-medium">
          Erwartete Spalten (Reihenfolge egal, Header muss passen):
        </p>
        <p className="mt-1 break-all font-mono">
          {CSV_EXPECTED_COLUMNS.join(', ')}
        </p>
        <p className="mt-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="font-medium text-red-600 hover:underline"
          >
            📥 Leere CSV-Vorlage herunterladen
          </button>
        </p>
      </div>

      <div>
        <label
          htmlFor="csv_file"
          className="block text-sm font-medium text-gray-700"
        >
          CSV-Datei
        </label>
        <input
          id="csv_file"
          type="file"
          accept=".csv,text/csv"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
        />
      </div>

      {parseError && <p className="text-sm text-red-700">{parseError}</p>}

      {skippedRows.length > 0 && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
          <p className="font-medium">
            {skippedRows.length} Zeile(n) übersprungen:
          </p>
          <ul className="mt-1 list-disc pl-5">
            {skippedRows.slice(0, 5).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {skippedRows.length > 5 && (
              <li>… und {skippedRows.length - 5} weitere</li>
            )}
          </ul>
        </div>
      )}

      {parsed && parsed.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700">
            Vorschau: {parsed.length} Pin(s)
          </p>
          <div className="mt-2 overflow-x-auto rounded-md border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1.5 text-left">Titel</th>
                  <th className="px-2 py-1.5 text-left">Hook</th>
                  <th className="px-2 py-1.5 text-left">Status</th>
                  <th className="px-2 py-1.5 text-left">Format</th>
                  <th className="px-2 py-1.5 text-left">Datum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parsed.slice(0, 20).map((r, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1.5">{r.titel ?? '—'}</td>
                    <td className="px-2 py-1.5">{r.hook ?? '—'}</td>
                    <td className="px-2 py-1.5">{STATUS_LABEL[r.status]}</td>
                    <td className="px-2 py-1.5">
                      {r.pin_format ? PIN_FORMAT_LABEL[r.pin_format] : '—'}
                    </td>
                    <td className="px-2 py-1.5">
                      {r.geplante_veroeffentlichung ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsed.length > 20 && (
            <p className="mt-1 text-xs text-gray-500">
              … und {parsed.length - 20} weitere
            </p>
          )}
        </div>
      )}

      {feedback.error && (
        <p className="text-sm text-red-700">{feedback.error}</p>
      )}
      {feedback.imported !== undefined && !feedback.error && (
        <p className="text-sm text-green-700">
          ✓ {feedback.imported} Pin(s) erfolgreich importiert.
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={doImport}
          disabled={
            !contentId || !parsed || parsed.length === 0 || isPending
          }
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isPending
            ? 'Importiert…'
            : `Importieren${parsed && parsed.length > 0 ? ` (${parsed.length})` : ''}`}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Schließen
        </button>
      </div>
    </div>
  )
}
