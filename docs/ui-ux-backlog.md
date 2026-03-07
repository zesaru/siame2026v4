# UI/UX Execution Backlog

## P1 - In Progress

1. Edit Template Unification (`Edit + Preview`)
- Scope: `guias-valija`, `hojas-remision`, `oficios` edit flows.
- Done when: all document edits use a consistent two-column layout (preview + form).

2. Sticky Action Bar in Long Edit Screens
- Scope: primary edit pages and reusable forms.
- Done when: `Guardar` and `Cancelar` remain visible while scrolling.

3. Unified Loading / Error / Empty States
- Scope: list, detail and edit screens.
- Done when: all critical screens use shared state components and consistent copy.

4. Data Table Consistency Pack
- Scope: sorting headers, active filter chips, pagination behavior.
- Done when: all dashboard tables follow the same interaction model.

## P1 - Next

5. Upload PDF Pattern Standardization
- Scope: upload, replace, preview, and progress feedback.
- Done when: one reusable UX pattern is used across modules.

6. CRUD Action Consistency in Lists
- Scope: row actions (`Ver`, `Editar`, `Eliminar`, `Más`).
- Done when: action order and visuals are consistent in all tables.

## P2

7. Typography + Spacing Pass
- Scope: section headers, body text, card spacing.
- Done when: visual rhythm is consistent across dashboard modules.

8. Microcopy Pass (Task-oriented)
- Scope: form helpers, validation errors, toasts, confirmations.
- Done when: copy is clear, concise, and action-focused.

9. Review Step Before Save
- Scope: long forms (`guia`, `hoja`).
- Done when: users can review changed fields before final save.

## P3

10. Visual Regression in CI
- Scope: critical routes (`signin`, `edit guia`, `edit hoja`, `items`).
- Done when: screenshot diffs detect UI regressions automatically.

11. UX Metrics Instrumentation
- Scope: save retries, validation errors, task completion time.
- Done when: a dashboard reports key UX health signals.

12. UX Definition of Done
- Scope: PR workflow.
- Done when: every frontend PR includes UX checklist validation.

