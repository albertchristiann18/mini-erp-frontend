import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import boundaries from 'eslint-plugin-boundaries'

/**
 * Shared element definitions for the 3-tier architecture model (app → domain → shared).
 * Referenced by every boundary config block below.
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

/**
 * Settings every boundaries block needs, identical in all of them.
 *
 * `import/resolver` is required: eslint-import-resolver-node must know TS/TSX
 * extensions so that boundaries can resolve relative imports to their real file paths.
 */
const BOUNDARY_SETTINGS = {
  'boundaries/elements': BOUNDARY_ELEMENTS,
  'boundaries/ignore': ['**/__tests__/**'],
  'import/resolver': {
    node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
  },
}

// ── Named boundary policies ─────────────────────────────────────────────────
// Declared once so the same rule can't drift between the blocks that use it.

/** A domain may not import a sibling domain (cross-domain ban, page tier only). */
const NO_CROSS_DOMAIN = {
  from: { element: { type: 'domain' } },
  disallow: { to: { element: { type: 'domain' } } },
}

/** Same-domain imports are fine — the exception to NO_CROSS_DOMAIN. */
const SAME_DOMAIN_ALLOWED = {
  from: { element: { type: 'domain', capture: { domain: '{{domain}}' } } },
  allow: { to: { element: { type: 'domain', capture: { domain: '{{domain}}' } } } },
}

/** The shared tier may never reach up into a page. */
const SHARED_NOT_DOMAIN = {
  from: { element: { type: 'shared' } },
  disallow: { to: { element: { type: 'domain' } } },
}

/** A page may not import `api/` directly — data access goes through a hook. */
const DOMAIN_NOT_API = {
  from: { element: { type: 'domain' } },
  disallow: { to: { element: { type: 'api' } } },
}

/**
 * Per-domain seal registry — the single place that records *which files belong to a domain*.
 *
 * Under the type-first layout a domain is spread across six parents (`pages/`, `hooks/`,
 * `hooks/api/`, `api/`, `types/`, `lib/`), and the folder name only identifies the domain
 * under `pages/` — everywhere else it's encoded in the *filename*. So no glob can infer a
 * domain's file set; it has to be enumerated. This table is that enumeration, and it is the
 * only thing that differs between sealed domains — the policy itself lives once, in
 * `sealDomain()` below.
 *
 * The lists are irregular by history, not by oversight: each domain lists only what it
 * actually has. Adding a file here tightens that file to `pages↛api` error + `max-lines` 300.
 */
const SEALED_DOMAINS = [
  {
    // ticket #9 — the hub domain; the only one whose api hooks are split by resource
    domain: 'inventory',
    files: [
      'src/pages/inventory/**/*.{ts,tsx}',
      'src/hooks/inventory/**/*.{ts,tsx}',
      'src/hooks/api/inventory/**/*.{ts,tsx}',
      'src/api/inventory.ts',
      'src/types/inventory.ts',
    ],
  },
  {
    // ticket #10 — a leaf; no domain hooks and no query-key module of its own
    domain: 'auth',
    files: ['src/pages/auth/**/*.{ts,tsx}', 'src/api/auth.ts', 'src/types/auth.ts'],
  },
  {
    // ticket #10 — a leaf
    domain: 'finance',
    files: [
      'src/pages/finance/**/*.{ts,tsx}',
      'src/hooks/finance/**/*.{ts,tsx}',
      'src/api/finance.ts',
      'src/types/finance.ts',
      'src/lib/financeKeys.ts',
    ],
  },
  {
    // ticket #11 — pages only; its hook lives in shared hooks/api/useProfile.ts,
    // where the global rules apply instead
    domain: 'profile',
    files: ['src/pages/profile/**/*.{ts,tsx}'],
  },
  {
    // ticket #11 — pages only; data comes from shared hooks/api/useFinance + useInventory
    domain: 'dashboard',
    files: ['src/pages/dashboard/**/*.{ts,tsx}'],
  },
  {
    // ticket #15 — spans three channels (marketplace/shopee/tiktok);
    // hooks/api/useMarketplace.ts stays shared, so global rules apply to it
    domain: 'marketplace',
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
  },
  {
    // ticket #14
    domain: 'sales',
    files: [
      'src/pages/sales/**/*.{ts,tsx}',
      'src/hooks/sales/**/*.{ts,tsx}',
      'src/api/sales.ts',
      'src/types/sales.ts',
      'src/lib/salesKeys.ts',
    ],
  },
  {
    // ticket #20
    domain: 'purchasing',
    files: [
      'src/pages/purchasing/**/*.{ts,tsx}',
      'src/hooks/purchasing/**/*.{ts,tsx}',
      'src/api/purchasing.ts',
      'src/types/purchasing.ts',
      'src/lib/purchasingKeys.ts',
    ],
  },
]

/**
 * Build the sealed-domain config block for one entry of SEALED_DOMAINS.
 *
 * Sealing a domain means, for that domain's production files only:
 *   - `pages↛api` at **error** — the domain reaches `api/` through hooks, never directly
 *   - `max-lines` at **error 300** — tighter than the global warn-at-200
 *
 * `__tests__` are excluded via `ignores`: test files legitimately exceed 300 lines, and the
 * boundary rule already exempts them through `boundaries/ignore` in BOUNDARY_SETTINGS.
 *
 * Note on the file lists that include `hooks/<domain>/**`: those are in scope for
 * `max-lines` only. Hooks are shared-tier, so the `pages↛api` policy never fires for them
 * (its `from` selector requires `type: 'domain'`).
 *
 * ⚠️ Flat-config blocks sharing a rule name do NOT merge — a later matching block fully
 * replaces an earlier one for overlapping files. That is why each seal block restates
 * `boundaries/element-types` in full rather than relying on the global block above, and why
 * these blocks must stay last. (A duplicate block silently shadowed the global
 * `domain↛api` warn for several tickets before this was understood.)
 */
function sealDomain({ domain, files }) {
  return {
    name: `boundaries/sealed-${domain}`,
    files,
    ignores: ['**/__tests__/**'],
    plugins: { boundaries },
    settings: BOUNDARY_SETTINGS,
    rules: {
      'boundaries/element-types': ['error', { default: 'allow', policies: [DOMAIN_NOT_API] }],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  }
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    name: 'base',
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
  // Uses v7 object-based selectors; eslint-plugin-boundaries v7.
  {
    name: 'boundaries/cross-domain',
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: BOUNDARY_SETTINGS,
    rules: {
      'boundaries/dependencies': [
        'error',
        { default: 'allow', policies: [NO_CROSS_DOMAIN, SAME_DOMAIN_ALLOWED] },
      ],
    },
  },
  // Boundaries: 3-tier model — WARN-level baseline.
  // Uses boundaries/element-types (same engine as /dependencies, different rule name) so it
  // can coexist with the /dependencies block above at a different severity on the same files.
  //
  // ⚠️ The element-types rule here is superseded for all `src/**` files by the sealed block
  // that follows, and for each sealed domain's files by that domain's block — see the
  // flat-config note on sealDomain(). Its `max-lines: warn 200` is what still takes effect
  // codebase-wide, on any file no seal block claims (shared tier, tests, future domains).
  {
    name: 'boundaries/baseline-warn',
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: BOUNDARY_SETTINGS,
    rules: {
      'boundaries/element-types': [
        'warn',
        { default: 'allow', policies: [SHARED_NOT_DOMAIN, DOMAIN_NOT_API] },
      ],
      // max-lines: warn at 200 globally; sealed domains tighten to error at 300
      'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },
  // shared↛pages at error, codebase-wide (ticket #9) — 0 violations, safe to lock everywhere.
  {
    name: 'boundaries/shared-not-domain-sealed',
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: BOUNDARY_SETTINGS,
    rules: {
      'boundaries/element-types': ['error', { default: 'allow', policies: [SHARED_NOT_DOMAIN] }],
    },
  },
  // ── Sealed domains (#21 final lock: all 8 sealed; see SEALED_DOMAINS) ──────
  // Must stay last: each block replaces `boundaries/element-types` for its own files.
  ...SEALED_DOMAINS.map(sealDomain),
])
