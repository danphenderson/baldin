# Baldin OPERATOR Guidelines

## Product language

- Baldin is a local-first job-search OS today and the user's career control plane.
- In flagship identity routes, keep the framing centered on direction before tracking.
- In route-family stories, keep the flow coherent: aspirations -> ranking -> applications -> deliberate network leverage -> workspace evidence -> automation.
- The target direction is applicant-side labor market observability, but `operator-design` should not present unshipped shared-signal or listing-health ideas as live product features.
- The operator is the job seeker, not a recruiter, hiring manager, or hiring team.
- Preferred product nouns: local-first workspace, career control plane, profile, aspirations, leads, applications, workspace, workflows, agents, follow-up, personal activity, network, messages, confidence.
- Network and discoverability language is private-by-default and opt-in. Activity is the user's workflow surface, not a public feed.
- Any forward-looking leverage hint must be proposal-labeled and include both a provenance or confidence note and an explicit privacy boundary.
- Avoid recruiter-side framing such as candidate pipeline, interviewer coordination, approval chain, hiring ops, or offer management.
- Avoid public-market framing such as social feed, public leaderboard, exact market counts, or listing-health telemetry as if it already ships today.

## Route language

- Use the current route inventory in `frontend/src/route/app-routes.tsx` as the canonical path source.
- Use the shipped shell groupings in `frontend/src/route/navigation.ts` when naming route families or rail groupings.
- Do not invent legacy paths like `/profile`, `/discover`, `/messages`, `/workspace/documents`, or `/workspace/agents`.

## Contract boundaries

- Preserve the OPERATOR v2.1 visual contract in `operator-design`.
- Keep this directory copy-first and specimen-first. Do not turn it into product code.
- When updating examples, rewrite language and sample data in place rather than changing layouts or component structure.
