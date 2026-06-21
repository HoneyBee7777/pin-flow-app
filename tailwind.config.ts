import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Marken-Tokens (Quelle: app/globals.css :root --marke-*)
        marke: {
          blaugrau: "var(--marke-blaugrau)",
          "blaugrau-mittel": "var(--marke-blaugrau-mittel)",
          "blaugrau-hell": "var(--marke-blaugrau-hell)",
          "blaugrau-xhell": "var(--marke-blaugrau-xhell)",
          "blaugrau-dunkel": "var(--marke-blaugrau-dunkel)",
          ocker: "var(--marke-ocker)",
          "ocker-dunkel": "var(--marke-ocker-dunkel)",
          tanne: "var(--marke-tanne)",
          graugruen: "var(--marke-graugruen)",
        },
        // Status-Tokens (nur für Status; je Punkt-/Text-/Flächen-Ton)
        status: {
          gut: "var(--status-gut)",
          "gut-text": "var(--status-gut-text)",
          "gut-flaeche": "var(--status-gut-flaeche)",
          achtung: "var(--status-achtung)",
          "achtung-text": "var(--status-achtung-text)",
          "achtung-flaeche": "var(--status-achtung-flaeche)",
          schlecht: "var(--status-schlecht)",
          "schlecht-text": "var(--status-schlecht-text)",
          "schlecht-flaeche": "var(--status-schlecht-flaeche)",
          neutral: "var(--status-neutral)",
          "neutral-text": "var(--status-neutral-text)",
          "neutral-flaeche": "var(--status-neutral-flaeche)",
        },
        // Semantische Rollen-Aliase (zeigen via CSS-Variable auf die Marke):
        // bg-seite, bg-karte, border-karte-rand, text-link, text-haupt,
        // text-sekundaer. button-primaer = bg-marke-blaugrau + text-white,
        // button-cta = bg-marke-ocker + text-marke-tanne (als Konvention).
        seite: "var(--rolle-bg-seite)",
        karte: "var(--rolle-bg-karte)",
        "karte-rand": "var(--rolle-karte-rand)",
        link: "var(--rolle-link)",
        haupt: "var(--rolle-text-haupt)",
        sekundaer: "var(--rolle-text-sekundaer)",
      },
    },
  },
  plugins: [],
};
export default config;
