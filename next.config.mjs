/** @type {import('next').NextConfig} */
const nextConfig = {
  // Testphase-Deploy: vorbestehende ESLint-Fehler (react/no-unescaped-entities,
  // react/jsx-key, prefer-const) sollen den Production-Build nicht abbrechen.
  // Betrifft NUR ESLint im Build — TypeScript-Fehler brechen den Build weiterhin
  // ab (typescript.ignoreBuildErrors bewusst NICHT gesetzt).
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
