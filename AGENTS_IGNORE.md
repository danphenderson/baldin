
Searched for applications feature and reviewed multiple files
Now I have a solid picture. Here's a grounded follow-up list organized by impact:

Application User Story — Follow-up Items

## Frontend Agent

High Priority (Core UX gaps)
1. "Add to Pipeline" action from the Registered intake row
The board shows registered apps above the board, but there's no one-click "Start tracking" button to move them to applied. A user landing on the board has no clear path to move a registered app into the active funnel without going to the detail page.


3. Registered creation path in the UI
Nothing in the current "Add Application" form explicitly sets stage=registered. A user creating an application from a lead card lands at whatever the schema default is. The Add Application dialog should offer an explicit "Register interest" vs "Apply now" intent selection so the default is deliberate.

7. next_step / next_step_due reminder surface
The overdue badge is computed in the hook and shown on cards. But there's no way to set a next step from the board card directly — users must navigate to the detail page. An inline "Set reminder" action on the card (popover date+text picker) would close this loop.

13. Duplicate-lead guard in the "Add Application" form
The backend already raises a 400 if a user applies to the same lead twice. The frontend should surface this proactively — checking applications.find(a => a.lead_id === selectedLeadId) before submit and showing a warning rather than letting the form hit the 400.

## Backend Agent

2. Dedicated getApplication() fetch on the detail page
The detail page still loads via getApplications() and filters client-side (per the repository memory). This makes the detail view brittle — stale list cache = stale detail. The backend already exposes GET /applications/{id}, and getApplication() exists in the service layer; the page just needs to call it.

4. Withdrawal reason field
"Withdrawn" is a terminal outcome with no context. A free-text outcome_reason field (DB + schema + UI) would make the closed-apps summary actually useful for retrospective review.

Medium Priority (Coverage gaps and correctness)
5. Backend unit tests for stage/outcome model validators
The Pydantic model_validator logic that back-fills stage/outcome from status has zero backend test coverage. A pytest module scoped to ApplicationCreate, ApplicationRead, and ApplicationUpdate round-trip (stage→status→stage) is the most useful missing coverage.

6. Stage transition guard on the PATCH /applications/{id} route
The update route currently accepts any status value — forward or backward, stage or outcome, any combination. A guard that rejected regressing a closed outcome back to an active stage (e.g. rejected → applied) without an explicit reopen intent would prevent stale UI state from corrupting history.

8. Document attachment count visible on board cards
appDocMeta is plumbed through the hook but the appDocMetaLoading = false stub means the map is always empty. Either populate it via GET /applications/{id}/documents per card (expensive) or add a document_count field to ApplicationRead via a subquery or join so the board card can show a badge without an extra round trip.

Lower Priority (Polish and retrospective analytics)
9. Stage velocity metric on the dashboard
The activity feed counts totals but not time-in-stage. Adding avg_days_per_stage to the activity feed or a small /applications/summary endpoint would let the dashboard show which stage is the bottleneck.

10. Offer conversion and funnel chart
The board has four active stage counts. A small Recharts funnel (registered → applied → screening → interview → offer, with closed dropout) would give the user a realistic sense of their pipeline yield — Recharts is already in the frontend dependency tree.

11. Status history timeline on the detail page
The status_history array is stored but only rendered as a flat list. A small vertical timeline component (MUI Timeline or a lightweight custom component) with durations between transitions would make the history scannable.

12. Keyboard / drag sorting on the board
The board columns are static. A drag-to-reorder between columns (using @dnd-kit/core, already a common Vite/MUI pairing) would let power users move multiple cards without clicking into each. This is a larger lift but high perceived UX value.
