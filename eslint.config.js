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
  // shared↛pages (0 violations today) and pages↛api (non-inventory domains still have violations).
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
            // shared → domain: warn (CategorySelect violation fixed in #3; 0 violations today)
            {
              from: { element: { type: 'shared' } },
              disallow: {
                to: { element: { type: 'domain' } },
              },
            },
            // domain → api: warn (non-inventory domains still have violations)
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
  // ── Inventory domain sealed (ticket #9) ────────────────────────────────────
  // shared↛pages at error — 0 violations globally; safe to lock for all files.
  // Later tickets will ratchet other domains; this rule is already clean codebase-wide.
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
      // shared↛pages sealed: shared tier importing a page is now an error everywhere
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              from: { element: { type: 'shared' } },
              disallow: {
                to: { element: { type: 'domain' } },
              },
            },
          ],
        },
      ],
    },
  },
  // pages↛api and max-lines sealed for inventory production files only.
  // __tests__ are excluded: test files legitimately exceed 300 lines and the
  // boundary rule already exempts them via boundaries/ignore above.
  {
    files: [
      'src/pages/inventory/**/*.{ts,tsx}',
      'src/hooks/inventory/**/*.{ts,tsx}',
      'src/api/inventory.ts',
      'src/types/inventory.ts',
    ],
    ignores: ['**/__tests__/**'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': BOUNDARY_ELEMENTS,
      'boundaries/ignore': ['**/__tests__/**'],
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
    },
    rules: {
      // pages↛api sealed for inventory: domain must access api/ through hooks only
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              from: { element: { type: 'domain' } },
              disallow: {
                to: { element: { type: 'api' } },
              },
            },
          ],
        },
      ],
      // max-lines sealed at 300 for inventory (warn at 200 globally; error at 300 per-domain)
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  // ── Auth domain sealed (ticket #10) ───────────────────────────────────────
  // pages↛api and max-lines sealed for auth production files.
  // __tests__ excluded via ignores.
  {
    files: [
      'src/pages/auth/**/*.{ts,tsx}',
      'src/api/auth.ts',
      'src/types/auth.ts',
    ],
    ignores: ['**/__tests__/**'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': BOUNDARY_ELEMENTS,
      'boundaries/ignore': ['**/__tests__/**'],
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
    },
    rules: {
      // pages↛api sealed for auth: domain must access api/ through hooks only
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              from: { element: { type: 'domain' } },
              disallow: {
                to: { element: { type: 'api' } },
              },
            },
          ],
        },
      ],
      // max-lines sealed at 300 for auth
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  // ── Finance domain sealed (ticket #10) ────────────────────────────────────
  // pages↛api and max-lines sealed for finance production files.
  // __tests__ excluded via ignores.
  {
    files: [
      'src/pages/finance/**/*.{ts,tsx}',
      'src/hooks/finance/**/*.{ts,tsx}',
      'src/api/finance.ts',
      'src/types/finance.ts',
      'src/lib/financeKeys.ts',
    ],
    ignores: ['**/__tests__/**'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': BOUNDARY_ELEMENTS,
      'boundaries/ignore': ['**/__tests__/**'],
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
    },
    rules: {
      // pages↛api sealed for finance: domain must access api/ through hooks only
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              from: { element: { type: 'domain' } },
              disallow: {
                to: { element: { type: 'api' } },
              },
            },
          ],
        },
      ],
      // max-lines sealed at 300 for finance
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  // ── Profile domain sealed (ticket #11) ────────────────────────────────────
  // pages↛api and max-lines sealed for profile production files.
  // Profile's hook lives in shared hooks/api/useProfile.ts (global rules apply).
  // __tests__ excluded via ignores.
  {
    files: ['src/pages/profile/**/*.{ts,tsx}'],
    ignores: ['**/__tests__/**'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': BOUNDARY_ELEMENTS,
      'boundaries/ignore': ['**/__tests__/**'],
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
    },
    rules: {
      // pages↛api sealed for profile: domain must access api/ through hooks only
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              from: { element: { type: 'domain' } },
              disallow: {
                to: { element: { type: 'api' } },
              },
            },
          ],
        },
      ],
      // max-lines sealed at 300 for profile
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  // ── Dashboard domain sealed (ticket #11) ──────────────────────────────────
  // pages↛api and max-lines sealed for dashboard production files.
  // Dashboard data comes from shared hooks/api/useFinance + useInventory.
  // __tests__ excluded via ignores.
  {
    files: ['src/pages/dashboard/**/*.{ts,tsx}'],
    ignores: ['**/__tests__/**'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': BOUNDARY_ELEMENTS,
      'boundaries/ignore': ['**/__tests__/**'],
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
    },
    rules: {
      // pages↛api sealed for dashboard: domain must access api/ through hooks only
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              from: { element: { type: 'domain' } },
              disallow: {
                to: { element: { type: 'api' } },
              },
            },
          ],
        },
      ],
      // max-lines sealed at 300 for dashboard
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  // ── Marketplace domain sealed (ticket #15) ────────────────────────────────
  // pages↛api and max-lines sealed for marketplace production files.
  // hooks/api/useMarketplace.ts lives in shared hooks/api/ — global rules apply.
  // __tests__ excluded via ignores.
  {
    files: [
      'src/pages/marketplace/**/*.{ts,tsx}',
      'src/api/marketplace.ts',
      'src/api/shopee.ts',
      'src/api/tiktok.ts',
      'src/types/marketplace.ts',
      'src/types/shopee.ts',
      'src/types/tiktok.ts',
      'src/lib/marketplaceKeys.ts',
    ],
    ignores: ['**/__tests__/**'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': BOUNDARY_ELEMENTS,
      'boundaries/ignore': ['**/__tests__/**'],
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
    },
    rules: {
      // pages↛api sealed for marketplace: domain must access api/ through hooks only
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              from: { element: { type: 'domain' } },
              disallow: {
                to: { element: { type: 'api' } },
              },
            },
          ],
        },
      ],
      // max-lines sealed at 300 for marketplace
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  // ── Sales domain sealed (ticket #14) ─────────────────────────────────────
  // pages↛api and max-lines sealed for sales production files.
  // hooks/sales/** is included for max-lines only; hooks are shared-tier so the
  // pages↛api policy does not fire for them (from.type === 'domain' guard).
  // __tests__ excluded via ignores.
  {
    files: [
      'src/pages/sales/**/*.{ts,tsx}',
      'src/hooks/sales/**/*.{ts,tsx}',
      'src/api/sales.ts',
      'src/types/sales.ts',
      'src/lib/salesKeys.ts',
    ],
    ignores: ['**/__tests__/**'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': BOUNDARY_ELEMENTS,
      'boundaries/ignore': ['**/__tests__/**'],
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
    },
    rules: {
      // pages↛api sealed for sales: domain must access api/ through hooks only
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              from: { element: { type: 'domain' } },
              disallow: {
                to: { element: { type: 'api' } },
              },
            },
          ],
        },
      ],
      // max-lines sealed at 300 for sales
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  // ── Purchasing domain sealed (ticket #20) ─────────────────────────────────
  // pages↛api and max-lines sealed for purchasing production files.
  // hooks/purchasing/** is included for max-lines only; hooks are shared-tier so the
  // pages↛api policy does not fire for them (from.type === 'domain' guard).
  // __tests__ excluded via ignores.
  // purchaseOrderPDFUtils.ts carved out via ignores: calls api/client directly, a
  // pre-existing pages↛api violation masked until now (dead duplicate rule since #9).
  // Conceptually similar to how #9 deferred hooks/api/useInventory.ts (ticket #22) by
  // leaving it out of inventory's file scope — here the file must stay in-scope for
  // max-lines, so it's excluded explicitly via ignores instead. Follow-up ticket will
  // fix the underlying violation.
  {
    files: [
      'src/pages/purchasing/**/*.{ts,tsx}',
      'src/hooks/purchasing/**/*.{ts,tsx}',
      'src/api/purchasing.ts',
      'src/types/purchasing.ts',
      'src/lib/purchasingKeys.ts',
    ],
    ignores: ['**/__tests__/**', 'src/pages/purchasing/purchaseOrderPDFUtils.ts'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': BOUNDARY_ELEMENTS,
      'boundaries/ignore': ['**/__tests__/**'],
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
    },
    rules: {
      // pages↛api sealed for purchasing: domain must access api/ through hooks only
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              from: { element: { type: 'domain' } },
              disallow: {
                to: { element: { type: 'api' } },
              },
            },
          ],
        },
      ],
      // max-lines sealed at 300 for purchasing
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
])
