# Project conventions

## Workflow

- Plan first, then execute: for any non-trivial task, outline the approach, the files to change, and the ordered steps before editing anything.
- For large, ambiguous, or risky changes, share the plan and wait for approval before implementation.
- Keep the plan current as work progresses, and call out any deviation from it in the final summary.

## Constants and static data

- Constants and static values belong in the `config/` folder of the consuming module.
- Values shared by several features, entities, or other layers belong in `src/shared/config`.
- Constants are named in camelCase.

## Types

- Exported type aliases and interfaces belong in the `types/` segment of the slice, for example `src/shared/ui/TreeTable/types/`.
- Local, non-exported types stay next to their implementation: component `Props`/`Emits` interfaces and internal helper types.
- A slice's public barrel re-exports only the types consumers actually need.
- The convention is enforced by the `app/types-in-types-segment` ESLint rule.

## Vue components

- Declare `Props` and `Emits` interfaces separately before `defineProps` and `defineEmits`.
- Use the declared interfaces explicitly: `defineProps<Props>()` and `defineEmits<Emits>()`.
- Do not inline prop or emit types inside the macros.

## Functions and methods

- Declare helper functions and component methods as const arrow functions: `const load = async (): Promise<void> => {}`.
- Use a regular function only when arrow syntax does not fit: generators, constructors, functions that rely on their own `this` or `arguments`, or code that needs hoisting. In that case disable the rule for the line with a comment explaining why.
- Class and object methods keep the method syntax; the rule covers named function declarations and function expressions.
- The convention is enforced by the `app/prefer-arrow-functions` ESLint rule.

## Tests

- Tests belong in a `__tests__/` subfolder inside the FSD segment they cover (`model`, `ui`, `api`, `config`, etc.).
- Name test files `<subject>.spec.ts`; do not place tests next to source files.
- Use Vitest. Run the suite with `npm test` and watch mode with `npm run test:watch`.
- Test public behavior and invariants rather than implementation details.
