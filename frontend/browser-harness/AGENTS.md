# Frontend Browser Harness Agent Instructions

## Owner

- `baldin_design_lead` for capture; `baldin_frontend` for harness implementation bugs.

## Scope

- Applies to browser harness files outside `src`.

## Do

- Use `/browser-harness/admin-session.html?next=/admin/...` for privileged admin capture.
- Keep harness behavior local and deterministic.

## Do Not

- Do not use unsupported `webdev` Playwright MCP tools for Baldin capture.
- Do not make Figma Dev Mode a prerequisite.

## Validation

- Use harness inspection or capture checks when requested.
- Report browser, route, and auth setup assumptions.

## Handback Notes

- State whether work was inspection-only, harness-only, or Figma-facing.
