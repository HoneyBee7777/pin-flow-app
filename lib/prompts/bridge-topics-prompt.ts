// V3.1 — Template + Daten-Befüllung für den „Brücken-Themen-Ideen"-Prompt.
//
// Der Prompt wird mit den echten Account-Daten (Hauptnische, Top-3-
// Affinitäten, Demografie) gefüllt und vom Nutzer in ChatGPT/Claude
// eingefügt — keine API-Integration (keine laufenden Kosten, KI-Wahl
// bleibt beim Käufer). Reine String-Komposition, deterministisch.
//
// Architektur-Hinweis (V3.2+): weitere Prompts kommen als eigene
// Template-Funktionen in diesen Ordner; je eine Prompt-Karte pro Datei.

export type PromptAffinity = {
  nameDe: string
  nameEn: string
  affinityValue: number
}

export type PromptData = {
  mainNiche: string
  topAffinities: PromptAffinity[]
  demographics: {
    // `percent` ist bereits eine ganze Prozentzahl (z. B. 83), nicht 0..1.
    topGender: { name: string; percent: number }
    topAgeRange: { range: string; percent: number }
    topCountry: { name: string; percent: number }
  }
}

export function buildBridgeTopicsPrompt(data: PromptData): string {
  const affinityLines = data.topAffinities
    .map(
      (t) =>
        `- ${t.nameDe} (${t.nameEn}): ${t.affinityValue
          .toFixed(2)
          .replace('.', ',')}`
    )
    .join('\n')

  return `Du bist eine erfahrene Content Creator und Brücken-Themen-Spezialistin für Pinterest. Du hilfst mir dabei, Inhalte zu finden, die meine Pinterest-Nische strategisch mit den Interessen meiner Zielgruppe verbinden.

MEINE NISCHE:
${data.mainNiche}

TOP-3-INTERESSEN MEINER ZIELGRUPPE (mit Affinitäts-Index, > 1.5 = stark überdurchschnittlich):
${affinityLines}

DEMOGRAFIE MEINER ZIELGRUPPE:
- Geschlecht-Verteilung: ${data.demographics.topGender.percent} % ${data.demographics.topGender.name.toLowerCase()}
- Hauptaltersgruppe: ${data.demographics.topAgeRange.range} Jahre (${data.demographics.topAgeRange.percent} %)
- Hauptregion: ${data.demographics.topCountry.name} (${data.demographics.topCountry.percent} %)

DEINE AUFGABE:
Schlage mir 10 konkrete Brücken-Themen vor, die meine Nische mit den Top-Interessen meiner Zielgruppe verbinden. Jedes Brücken-Thema sollte:
1. Authentisch zu meiner Hauptnische passen
2. Mindestens eines der Top-3-Interessen meiner Zielgruppe berühren
3. Auf Pinterest als visuelles Thema funktionieren (Bilder, Inspiration)
4. Auf die Demografie meiner Zielgruppe abgestimmt sein

FORMAT:
Liste mit 10 Brücken-Themen, durchnummeriert. Pro Brücken-Thema:
- Titel des Themas
- Kurz-Begründung (1 Satz): Warum verbindet es meine Nische mit der Zielgruppe?
- Beispiel-Pin-Idee (1 Satz): Was könnte ein konkreter Pin dazu zeigen?

Bitte gib mir die 10 Ideen jetzt aus.`
}
