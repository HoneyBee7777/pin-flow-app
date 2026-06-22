// Vereinheitlicht eine URL NUR für Vergleiche (z. B. die Duplikat-Warnung auf
// der Ziel-URL-Seite) — NICHT zum Speichern. Der gespeicherte Wert bleibt immer
// so, wie er eingegeben wurde.
//
// Normalisiert wird bewusst nur die „Schreibweise derselben Seite":
//   - Protokoll (http:// bzw. https://) entfernen
//   - führendes „www." entfernen
//   - abschließende Slashes entfernen
//   - alles in Kleinbuchstaben
//
// Anker (#…) und Query (?…) bleiben ABSICHTLICH erhalten: zwei verschiedene
// Unterseiten (…/blog#teil-1 vs. …/blog#teil-2) sollen NICHT als gleich gelten.
export function normalizeUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
}
