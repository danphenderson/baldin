# Docs Agent Instructions

## Owner

- `baldin_full_stack_architect` for engineering docs; `baldin_project_manager` for planning/process docs.

## Scope

- Applies to Docusaurus docs source and docs tooling.

## Do

- Edit docs source only: `docs/docs`, `docs/src`, `docs/static`, and `docs/i18n`.
- Keep agentic guidance aligned with repo operating model.

## Do Not

- Do not patch `docs/build` or `.docusaurus` generated output.
- Do not update published workflow docs without considering related prompt and instruction surfaces.

## Validation

- Run docs build when requested or when published docs/navigation changes warrant it.
- Do not commit generated docs output.

## Handback Notes

- Report published page impact and whether docs build was run or deferred.
