import { useTheme } from "../ThemeContext";

// ─────────────────────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────────────────────
function H({ children }: { children: React.ReactNode }) {
  const { T } = useTheme();
  return <h2 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 20, color: T.t0, margin: "0 0 14px", letterSpacing: "-0.01em" }}>{children}</h2>;
}

function Note({ children }: { children: React.ReactNode }) {
  const { T } = useTheme();
  return <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, lineHeight: 1.65, margin: "0 0 16px" }}>{children}</p>;
}

function Code({ children }: { children: React.ReactNode }) {
  const { T } = useTheme();
  return <code style={{ fontFamily: T.fontMono, fontSize: 12.5, color: T.accent, background: T.accentDim, borderRadius: T.r1, padding: "1px 5px" }}>{children}</code>;
}

function Sep() {
  const { T } = useTheme();
  return <div style={{ height: 1, background: T.s0, margin: "40px 0" }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping table
// ─────────────────────────────────────────────────────────────────────────────
function MapTable({ rows }: { rows: [string, string, string][] }) {
  const { T } = useTheme();
  return (
    <div style={{ background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r3, overflow: "hidden", marginBottom: 20 }}>
      <div style={{ display: "flex", background: T.bg, borderBottom: `1px solid ${T.s1}` }}>
        {["Design term", "Engineering component / hook", "Notes"].map((h, i) => (
          <div key={h} style={{ flex: i === 2 ? 2 : 1, padding: "8px 14px" }}>
            <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>
          </div>
        ))}
      </div>
      {rows.map(([design, eng, note], i) => (
        <div key={i} style={{ display: "flex", borderBottom: i < rows.length - 1 ? `1px solid ${T.s0}` : "none" }}>
          <div style={{ flex: 1, padding: "10px 14px" }}>
            <span style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 13, color: T.t0 }}>{design}</span>
          </div>
          <div style={{ flex: 1, padding: "10px 14px" }}>
            <Code>{eng}</Code>
          </div>
          <div style={{ flex: 2, padding: "10px 14px" }}>
            <span style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1 }}>{note}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sections
// ─────────────────────────────────────────────────────────────────────────────
function DesignToCode() {
  const rows: [string, string, string][] = [
    ["Rail",               "RailNav / NavRail",                      "Left navigation surface. Collapsed: 56px. Expanded: 240px (proposal)."   ],
    ["Command bar",        "CommandBar",                             "Global chrome bar. 48px fixed. Never re-mounts between routes."           ],
    ["Page toolbar",       "PageToolbar",                            "Per-route bar. 40px. Filters, sort, view toggle, primary CTA."            ],
    ["Summary band",       "MetricStrip",                            "First element in any collection view. Shows 4–6 numeric status cells."    ],
    ["Entity header",      "<PageTitle>",                            "H1-level entity name + inline status marker on detail pages."             ],
    ["Section heading",    "<SectionHeader>",                        "H3-level divider for subsections inside a detail page main column."       ],
    ["Persistent alert",   "<InlineFeedback>",                       "Bordered left-accent alert that persists until condition resolves."       ],
    ["Transient notice",   "useNotification()",                      "Bottom-of-viewport toast. Auto-dismisses in 3s."                         ],
    ["Form sheet",         "<FormDialogShell>",                      "Dialog for create / edit mutations. Save + Cancel footer."               ],
    ["Confirm gate",       "<ConfirmDialog>",                        "Destructive action confirmation. Error-tone confirm button."              ],
    ["Information overlay","<SurfaceDialog>",                        "Read-only overlay. No mutation controls."                                 ],
    ["Collection heading", "usePageToolbarHeader({ title, count })", "Sets the bar title and record count for a collection route."             ],
  ];
  return (
    <div>
      <H>Design ↔ Engineering component map</H>
      <Note>Every design term used in the style guide, foundations, and component library maps to a specific engineering component or hook. The mapping is one-to-one.</Note>
      <MapTable rows={rows} />
    </div>
  );
}

function TokenMap() {
  const rows: [string, string, string][] = [
    ["Void",            "color.depth.0 / #181818",                    "Viewport background. Never a component bg."                ],
    ["Shell",           "color.depth.1 / #1e1e1e",                    "Rail, command bar, toolbars."                             ],
    ["Surface",         "color.depth.2 / #242424",                    "Cards, panels, table."                                    ],
    ["Float",           "color.depth.3 / #2d2d2d",                    "Popovers, dropdowns. backdrop-filter: blur(20px)."        ],
    ["Overlay",         "color.depth.4 / #363636",                    "Top-level dialogs. backdrop-filter: blur(24px)."          ],
    ["Signal",          "color.accent / #339cff",                     "Primary action color — Signal blue."                     ],
    ["Signal · Subtle", "color.accent.mid / rgba(51,156,255,0.16)",   "Active element fill."                                    ],
    ["Signal · Tint",   "color.accent.dim / rgba(51,156,255,0.09)",   "Hover tint, badge background."                           ],
    ["Success tone",    "color.success / dark:#40c977 · light:#00a240", "Ready, Applied, Complete, Connected."                  ],
    ["Error tone",      "color.error / dark:#fa423e · light:#ba2623", "Rejected, Blocked, Failed."                              ],
    ["Warning tone",    "color.warning / dark:#e8a020 · light:#c47700", "Pending, Stalled, Follow-Up, Needs Review."           ],
    ["Info tone",       "color.info / #339cff",                       "Ranked, In Progress, Scheduled, Tracking."              ],
    ["Skill tone",      "color.skill / dark:#ad7bf9 · light:#924ff7", "Skill badges, capability tags, AI scores."               ],
    ["Neutral tone",    "color.text.1",                               "Draft, Archived, Unknown."                               ],
    ["Text Primary",    "color.text.0 / dark:#ffffff · light:#1a1c1f", "Page titles, entity names, data values."               ],
    ["Text Secondary",  "color.text.1 / rgba(ink, 0.54/0.58)",        "Labels, captions, metadata."                            ],
    ["Text Muted",      "color.text.2 / rgba(ink, 0.30/0.36)",        "Disabled, placeholder, overline."                      ],
    ["Stroke Faint",    "color.stroke.0 / rgba(ink, 0.05)",           "Row dividers inside tables."                            ],
    ["Stroke Default",  "color.stroke.1 / rgba(ink, 0.09/0.10)",      "Card borders, input frames."                           ],
    ["Stroke Emphasis", "color.stroke.2 / rgba(ink, 0.15/0.17)",      "Active, focused elements."                             ],
  ];
  return (
    <div>
      <H>Color token map</H>
      <Note>Design terms map to these engineering token names. Reference tokens by name in code, never by raw hex value.</Note>
      <MapTable rows={rows} />
    </div>
  );
}

function TypeMap() {
  const rows: [string, string, string][] = [
    ["Display",    "type.display / Space Grotesk 700 / 44–52px", "Hero moments, auth, and specimen headlines."       ],
    ["Heading",    "type.h1 / Space Grotesk 700 / 30px",         "Collection headings and route titles."             ],
    ["Title",      "type.h2 / Space Grotesk 600 / 22px",         "Entity names and section-leading titles."          ],
    ["Subtitle",   "type.h3 / Space Grotesk 600 / 16px",         "Section headings inside cards and panels."         ],
    ["Body Large", "type.body.lg / Source Sans 3 400 / 15px",    "Prose paragraphs and long-form descriptions."      ],
    ["Body",       "type.body.md / Source Sans 3 400 / 13–14px", "Qualitative copy, notes, and helper text."         ],
    ["Caption",    "type.body.sm / Source Sans 3 400 / 12px",    "Dense metadata and supporting captions."           ],
    ["Overline",   "type.label / JetBrains Mono 700 / 10px",     "Uppercase field labels and section overlines."     ],
    ["Data Large", "type.data.lg / JetBrains Mono 600 / 22px",   "Metric-strip numeric values."                       ],
    ["Data",       "type.data.md / JetBrains Mono 500 / 13px",   "IDs, scores, timestamps, salary ranges."           ],
    ["Data Small", "type.data.sm / JetBrains Mono 400 / 11px",   "Token names, secondary data, code inline."         ],
  ];
  return (
    <div>
      <H>Typography token map</H>
      <Note>Type role names from the style guide map to these tokens. Use semantic role names in component code — never raw font-size values. Space Grotesk handles structural headings, Source Sans 3 handles reading surfaces, and JetBrains Mono stays reserved for data chrome.</Note>
      <MapTable rows={rows} />
    </div>
  );
}

function RouteMap() {
  const rows: [string, string, string][] = [
    ["Marketing",                "/",                                      "Home layout · public landing page"                         ],
    ["Dashboard",                "/dashboard",                             "Dashboard · momentum overview + personal activity"         ],
    ["Profile",                  "/me",                                    "Flagship hub · state-complete identity specimen"           ],
    ["Aspiration roles",         "/me/aspirations/roles",                  "Flagship collection · saved titles + suggestion review"    ],
    ["Aspiration companies",     "/me/aspirations/companies",              "Flagship collection · target employers + suggestion review"],
    ["Leads",                    "/leads",                                 "Job Search · ranked opportunities collection · state-complete specimen" ],
    ["Lead companies",           "/leads/companies",                       "Job Search · employer collection"                          ],
    ["Applications queue",       "/applications",                          "Job Search · application queue · state-complete specimen"  ],
    ["Applications board",       "/applications/board",                    "Job Search · board view by stage · state-complete specimen"],
    ["Application detail",       "/applications/:applicationId",           "Job Search · entity view for a single application · state-complete specimen"],
    ["Workspace list",           "/workspace",                             "Evidence · workspace documents and artifacts · state-complete specimen" ],
    ["Workspace new",            "/workspace/new",                         "Evidence · create workspace document · state-complete specimen" ],
    ["Workspace detail",         "/workspace/:id",                         "Evidence · workspace entity view · state-complete specimen" ],
    ["Workspace edit",           "/workspace/:id/edit",                    "Evidence · edit workspace artifact · state-complete specimen" ],
    ["Workspace compare",        "/workspace/:id/compare",                 "Evidence · compare workspace variants · state-complete specimen" ],
    ["Workflows",                "/workflows",                             "Automation · workflow orchestration and run review · state-complete specimen" ],
    ["Extractors",               "/workflows/extractors",                  "Automation · extraction tooling · state-complete specimen" ],
    ["Agents",                   "/automation/agents",                     "Automation · agent collection · state-complete specimen" ],
    ["Agent detail",             "/automation/agents/:agentId",            "Automation · single agent view · state-complete specimen" ],
    ["Agent chat",               "/automation/agents/:agentId/chat/:sessionId", "Automation · agent session thread · state-complete specimen" ],
    ["Network discover",         "/network/discover",                      "Network · opt-in people discovery · state-complete specimen" ],
    ["Network profile",          "/network/discover/:userId",              "Network · discoverable profile detail · state-complete specimen" ],
    ["Connections",              "/network/connections",                   "Network · pending and accepted connections · state-complete specimen" ],
    ["Messages inbox",           "/network/messages",                      "Network · shipped private messaging inbox · canonical route-family entry" ],
    ["Message thread",           "/network/messages/:conversationId",      "Network · shipped private one-to-one thread · canonical route-family entry" ],
    ["Settings",                 "/settings",                              "User rail · account settings"                              ],
    ["Subscription",             "/settings/subscription",                 "User rail · billing and plan state"                        ],
    ["Discoverability",          "/settings/discoverability",              "User rail · visibility controls · state-complete specimen" ],
    ["Graduation",               "/settings/graduation",                   "User rail · career transition settings"                    ],
    ["Login",                    "/login",                                 "Auth · sign in"                                            ],
    ["Register",                 "/register",                              "Auth · sign up"                                            ],
    ["Admin console",            "/admin/",                                "Admin · superuser browser route"                           ],
    ["Admin db management",      "/admin/db-management",                   "Admin · database management"                               ],
    ["Admin review",             "/admin/review",                          "Admin · review queue"                                      ],
    ["Admin crawlers",           "/admin/crawlers",                        "Admin · crawler operations"                                ],
  ];
  return (
    <div>
      <H>Route coverage</H>
      <Note>Routes sourced from <Code>frontend/src/route/app-routes.tsx</Code>. `operator-design` now carries state-complete coverage for identity, decision-loop, network-trust, private messaging as the shipped human loop, workspace-evidence, and automation families while keeping the rest of the route map reference-only. The legacy combined `MessagesScreen` is now a demoted fallback; the canonical contract is `/network/messages` plus `/network/messages/:conversationId`.</Note>
      <MapTable rows={rows} />
    </div>
  );
}

function InteractionMap() {
  const rows: [string, string, string][] = [
    ["Form sheet opens",       "FormDialogShell mounts",        "Triggered by toolbar + CTA or inline edit button"            ],
    ["Form sheet submits",     "PUT/POST + optimistic update",  "Save button enters loading state; success → toast"           ],
    ["Confirm gate opens",     "ConfirmDialog mounts",          "Any destructive action — archive, remove, delete"            ],
    ["Confirm gate confirms",  "DELETE/PATCH + refetch",        "Confirm button fires mutation; dialog closes on success"     ],
    ["Persistent alert",       "InlineFeedback renders",        "Shows when a condition is detected — cleared when resolved"  ],
    ["Transient notice",       "useNotification() call",        "Fires after successful mutation — auto-dismiss 3s"           ],
    ["Row click",              "router.navigate(entityUrl)",    "Navigates to entity detail route. Never opens a dialog."     ],
    ["Status changes instantly","No animation — data update",   "Filter/sort/status — content updates without transition"    ],
  ];
  return (
    <div>
      <H>Interaction → engineering mapping</H>
      <Note>Design interaction patterns from the style guide and their engineering counterparts.</Note>
      <MapTable rows={rows} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main View
// ─────────────────────────────────────────────────────────────────────────────
export function AppendixView() {
  const { T } = useTheme();
  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontFamily: T.fontMono, fontSize: 11, color: T.accent, margin: "0 0 6px", letterSpacing: "0.1em" }}>IMPLEMENTATION APPENDIX · HANDOFF ONLY</p>
        <h1 style={{ fontFamily: T.fontHead, fontWeight: 800, fontSize: 40, color: T.t0, margin: "0 0 12px", letterSpacing: "-0.03em" }}>Engineering Handoff</h1>
        <p style={{ fontFamily: T.fontBody, fontSize: 14, color: T.t1, maxWidth: 600, lineHeight: 1.7, margin: "0 0 16px" }}>
          This appendix maps design terminology from the style guide, foundations, and component library
          to their engineering counterparts. It is supplementary — the canonical design reference is the style guide.
          Do not use component or token names from this appendix in design documents.
        </p>
        <div style={{ padding: "12px 16px", background: T.warnDim, border: `1px solid ${T.warning}44`, borderLeft: `2px solid ${T.warning}`, borderRadius: T.r2 }}>
          <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, margin: 0 }}>
            <strong style={{ color: T.warning }}>Audience:</strong> Engineers implementing OPERATOR. If you are a designer, refer to the Style Guide instead. Component names like <Code>MetricStrip</Code>, <Code>FormDialogShell</Code>, and <Code>usePageToolbarHeader</Code> do not appear in the design documentation — they are engineering details only.
          </p>
        </div>
      </div>

      <DesignToCode />
      <Sep />
      <TokenMap />
      <Sep />
      <TypeMap />
      <Sep />
      <RouteMap />
      <Sep />
      <InteractionMap />
    </div>
  );
}
