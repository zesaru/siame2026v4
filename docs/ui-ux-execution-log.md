# UI/UX Execution Log

## Sprint 1 (Done)

- [x] `Edit + Preview` layout for `guias-valija/edit`
- [x] `Edit + Preview` layout for `hojas-remision/edit`
- [x] `Edit + Preview` layout for `hojas-remision/new`
- [x] Sticky action bar in long edit forms (`GuiaValijaEditableForm`, `HojaRemisionForm`)
- [x] Sticky header in edit pages (hojas remision / oficios)
- [x] Item edit flow for `guias-valija-items` (route + API + form)
- [x] Table consistency improvements in `oficios` (actions + empty state)
- [x] Table consistency improvements in `hojas-remision` (actions + empty state)
- [x] Sticky edit shell in `guias-valija-items/[id]/edit`
- [x] Standardized loading state in `oficios/view` and `guias-valija-items/[id]/edit`
- [x] Standardized suspense loading state for PDF viewer in `hojas-remision/new` and `edit`

## Sprint 2 (In Progress)

### Track A - Table Consistency
- [ ] Normalize action order across all dashboard tables: `Ver`, `Editar`, `Eliminar`
- [ ] Normalize empty state copy and CTA strategy in all list pages
- [ ] Normalize pagination labels and item ranges
- [x] Normalize action order and iconography in `guias-valija` list (`Ver` → `Editar` → `Archivo` → `Eliminar`)

### Track B - Form UX
- [ ] Sticky top action shell in all edit pages
- [ ] Unified save feedback (`Guardando...`, success, error)
- [ ] Add lightweight summary header (entity metadata) in all edits

### Track C - States
- [ ] Replace plain loading texts with standard `LoadingSpinner` wrappers
- [ ] Ensure errors use one visual pattern (`ErrorState` or alert card)
- [ ] Ensure no raw HTML appears in detail views
- [x] Standardized loading wrappers in `hojas-remision` (`view`, `edit`, `new` confirmation fallback)
- [x] Standardized loading wrappers in `usuarios` and key `audit-logs` sections

## Sprint 3 (Next)

- [ ] Create reusable `DocumentPreviewPanel` component
- [ ] Create reusable `FileInfoBar` component
- [ ] Add visual regression checks for critical edit/list routes
- [ ] Add UI PR checklist to repository process

## Notes

- Keep commits small and scoped by module.
- Avoid mixing infrastructure/security changes with UI commits.
- Validate each changed screen with lint and manual responsive check.
