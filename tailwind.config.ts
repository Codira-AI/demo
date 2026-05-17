import type { Config } from 'tailwindcss';

/**
 * Tailwind setup. Theme is intentionally restrained — most of the
 * UI uses standard Tailwind defaults. Custom tokens live in
 * `globals.css` as CSS variables (light/dark via `prefers-color-scheme`).
 *
 * Color palette uses CSS-variable indirection so a future light-mode
 * toggle can flip the values without touching every utility class.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          0: 'rgb(var(--bg-0) / <alpha-value>)',
          1: 'rgb(var(--bg-1) / <alpha-value>)',
          2: 'rgb(var(--bg-2) / <alpha-value>)',
        },
        ink: {
          0: 'rgb(var(--ink-0) / <alpha-value>)',
          1: 'rgb(var(--ink-1) / <alpha-value>)',
          2: 'rgb(var(--ink-2) / <alpha-value>)',
        },
        edge: 'rgb(var(--edge) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};

export default config;
