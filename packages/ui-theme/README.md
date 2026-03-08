# @csi/ui-theme

Shared CSI glass-theme framework for all portal apps.

## Single Source Of Truth
- Edit theme styles only in:
  - `packages/ui-theme/src/tokens.css`
  - `packages/ui-theme/src/glass.css`

All apps that import this package get the updates.

## Use in this repo
- CSS import:
  - `src/styles/index.css` imports `../../packages/ui-theme/src/index.css`
- Theme logic import:
  - `packages/ui-theme/src/theme-manager.ts`

## Use in other repos
1. Add this package as a git submodule or shared workspace package.
2. Import `@csi/ui-theme/styles.css`.
3. Use `initTheme`, `toggleThemeMode`, `onThemeChange` from `@csi/ui-theme/theme-manager`.
