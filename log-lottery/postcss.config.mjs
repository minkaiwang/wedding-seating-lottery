/**
 * Shadow the monorepo root `postcss.config.mjs` (Next.js + @tailwindcss/postcss).
 * Vite walks parent dirs for PostCSS config; the root file uses string plugin entries
 * that break log-lottery's pipeline. Tailwind here is handled by `@tailwindcss/vite`.
 */
export default {
  plugins: [],
};
