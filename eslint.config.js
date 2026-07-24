import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import boundaries from 'eslint-plugin-boundaries'

/**
 * Shared element definitions for the 3-tier architecture model (app → domain → shared).
 * Referenced by both the error-level and warn-level boundary config blocks.
 *
 * Tiers:
 *   app    — entry points (App*, main*)
 *   domain — one element per domain folder under pages/ (captured as {{domain}})
 *   api    — direct API modules in src/api/ (must be accessed only via hooks)
 *   shared — components, hooks, types, lib, constants, contexts, test
 */
const BOUNDARY_ELEMENTS = [
  // app tier: entry points
  { type: 'app', pattern: 'src/App*' },
  { type: 'app', pattern: 'src/main*' },
  // domain tier: one element per domain folder under pages/
  {
    type: 'domain',
    pattern: 'src/pages/(*)',
    capture: ['domain'],
  },
  // api tier: direct API-calling modules (must be accessed via hooks, not pages directly)
  {
    type: 'api',
    pattern: 'src/api/**',
  },
  // shared tier: everything else (components, hooks, types, lib, etc.)
  {
    type: 'shared',
    pattern: [
      'src/components/**',
      'src/hooks/**',
      'src/types/**',
      'src/lib/**',
      'src/constants/**',
      'src/contexts/**',
      'src/test/**',
    ],
  },
]

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  // Boundaries: 3-tier model — ERROR-level rule
  // Cross-domain page rule → error immediately (0 violations today).
  // A domain may not import another domain (cross-domain ban, page-tier only).
  // Uses v7 object-based selectors; eslint-plugin-boundaries v7.
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': BOUNDARY_ELEMENTS,
      'boundaries/ignore': ['**/__tests__/**'],
      // eslint-import-resolver-node must know TS/TSX extensions so that
      // boundaries can resolve relative imports to their real file paths.
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          policies: [
            // Disallow domain → other domain imports (error: 0 violations today)
            {
              from: { element: { type: 'domain' } },
              disallow: {
                to: { element: { type: 'domain' } },
              },
            },
            // Allow same-domain imports (exception to the cross-domain ban above)
            {
              from: { element: { type: 'domain', capture: { domain: '{{domain}}' } } },
              allow: {
                to: { element: { type: 'domain', capture: { domain: '{{domain}}' } } },
              },
            },
          ],
        },
      ],
    },
  },
  // Boundaries: 3-tier model — WARN-level rules
  // shared↛pages (~1 violation today) and pages↛api (~11 violations today).
  // Land at warn now; flip to error per-domain as Tracks 1/3 clean each domain.
  // Uses boundaries/element-types (same engine as /dependencies, different rule name)
  // so both blocks can coexist at different severities on the same file pattern.
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': BOUNDARY_ELEMENTS,
      'boundaries/ignore': ['**/__tests__/**'],
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
    },
    rules: {
      // shared↛pages: shared tier may not import from domain/pages tier
      // pages↛api: a page (domain) may not import api/ directly (use a hook)
      'boundaries/element-types': [
        'warn',
        {
          default: 'allow',
          policies: [
            // shared → domain: warn (~1 violation: components/ui/CategorySelect imports pages/)
            {
              from: { element: { type: 'shared' } },
              disallow: {
                to: { element: { type: 'domain' } },
              },
            },
            // domain → api: warn (~11 violations: pages importing api/ directly)
            {
              from: { element: { type: 'domain' } },
              disallow: {
                to: { element: { type: 'api' } },
              },
            },
          ],
        },
      ],
      // max-lines: warn at 200 lines (will be tightened per-domain in later tickets)
      'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },
])
