# CSI Starter App Template

This is a ready starter app that already consumes the shared theme framework:
- `packages/ui-theme`

## Use it
1. Copy `templates/csi-starter` as a new app folder.
2. Run:
   - `npm install`
   - `npm run dev`

## Theme source of truth
Do not change visual tokens inside this starter.
Change only:
- `packages/ui-theme/src/tokens.css`
- `packages/ui-theme/src/glass.css`
- `packages/ui-theme/src/theme-manager.ts`

All apps using this starter get the same theme behavior and appearance.
