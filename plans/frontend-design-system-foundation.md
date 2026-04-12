# Phase 1 Frontend Design System Foundation Handoff

## Foundation Contract
- Feature code should use `theme.palette.*` for standard MUI-facing roles: `primary`, `secondary`, `success`, `warning`, `error`, `info`, `background`, `text`, `divider`.
- Feature code should use `theme.baldin.*` for Baldin-specific foundation values that are not first-class MUI palette fields:
  - `theme.baldin.status` for application/workflow/crawler/priority/platform status maps
  - `theme.baldin.alpha` for named opacity tiers
  - `theme.baldin.radius` for shared radius values
  - `theme.baldin.elevation` for shared shadow/focus-ring helpers
  - `theme.baldin.motion` for shared timing/easing/stagger values
  - `theme.baldin.fontFamily` for sanctioned body/display/mono families
- Values that should stay internal to `frontend/src/design-system/theme/*` for now:
  - `createBaldinTheme(...)`
  - theme assembly details in `palette.ts`, `typography.ts`, `shape.ts`, `components.ts`
  - MUI augmentation plumbing in `mui-augmentations.d.ts`
  - third-party adapter shaping in `theme/adapters/json-tree.ts`

## Spacing Deviation
- Global MUI spacing was intentionally left unchanged in Phase 1 for compatibility. The app is not yet on a global 4px MUI spacing base.
- `spacingTokens` in `frontend/src/design-system/tokens/spacing.ts` are the forward-looking design-system contract for new shared foundation work.
- Going forward:
  - use `spacingTokens` and `toSpacingPx(...)` when introducing new design-system-level shared values
  - do not assume `theme.spacing(1) === 4px`
  - do not retrofit existing feature-page spacing unless that surface is being migrated in a later phase

## Enforcement
- Current `lint:theme` rules in [lint-theme.mjs](/Users/doe/Desktop/baldin/frontend/scripts/lint-theme.mjs):
  - `no-raw-hex`
  - `no-raw-gradient`
  - `no-raw-font-family`
  - `no-new-legacy-shared-ui`
- Current allowlisted exceptions:
  - raw hex: `src/design-system/tokens/**`, `src/design-system/theme/**`, `src/util/format.ts`, `src/component/use-collaborative-editor.ts`, tests
  - raw gradients: `src/design-system/tokens/effects.ts`, tests
  - raw `fontFamily`: `src/design-system/tokens/typography.ts`, `src/design-system/theme/typography.ts`, tests
- `no-new-legacy-shared-ui` behavior:
  - checks added files reported by `git status --porcelain` under `src/component/common/` and `src/component/auth/`
  - ignores test files
  - allows pure re-export shims only
  - a file is treated as a pure shim only when its meaningful lines are export-only statements such as `export * ...` or `export { ... } ...`

## Compatibility Coverage
- [theme-provider.tsx](/Users/doe/Desktop/baldin/frontend/src/theme/theme-provider.tsx) remains the active app entrypoint.
- `useThemeMode()` behavior is unchanged: same context shape, same `baldin_theme` localStorage key, same dark/light toggle semantics.
- [effects.ts](/Users/doe/Desktop/baldin/frontend/src/theme/effects.ts) remains a stable shim for existing imports and re-exports:
  - design-system effect helpers from `design-system/tokens/effects`
  - `jsonTreeTheme` from `design-system/theme/adapters/json-tree`
- [status-colors.ts](/Users/doe/Desktop/baldin/frontend/src/theme/status-colors.ts) remains a stable shim for existing imports and re-exports the new status token API, including the legacy `getStatusColors(theme)` facade.

## Changed Files Map
- New foundation files:
  - `frontend/src/design-system/tokens/*`
  - `frontend/src/design-system/theme/*`
  - `frontend/src/design-system/index.ts`
- Compatibility shims / entrypoint:
  - `frontend/src/theme/theme-provider.tsx`
  - `frontend/src/theme/effects.ts`
  - `frontend/src/theme/status-colors.ts`
- Repo-wide mechanical cleanup surfaces:
  - `frontend/src/layout/app-layout.tsx`
  - `frontend/src/page/login.tsx`
  - `frontend/src/page/register.tsx`
  - `frontend/src/page/companies.tsx`
  - `frontend/src/page/crawlers.tsx`
  - `frontend/src/page/dashboard.tsx`
  - `frontend/src/page/pipelines.tsx`
  - `frontend/src/page/documents/*`
  - `frontend/src/page/profile/components/*`
  - `frontend/src/page/applications/applications-board-page.tsx`
  - `frontend/src/component/lead-*`
  - `frontend/src/component/common/text.tsx`
  - `frontend/src/component/common/content-modal.tsx`
  - `frontend/src/component/common/error-boundary.tsx`
  - `frontend/src/component/rich-text-editor.tsx`
- Enforcement / validation support:
  - `frontend/scripts/lint-theme.mjs`
  - `frontend/src/design-system/theme/lint-theme.test.ts`

## Deferred To Phase 2+
- Broad primitive/pattern migration (`CollectionToolbar`, `CardShell`, `FormDialogShell`, shared section shells)
- Large-scale consumer normalization of spacing, radius, elevation, and motion values outside the foundation/theme layer
- Deletion of legacy `component/common/*` and `component/auth/*` rather than compatibility-only freezing
