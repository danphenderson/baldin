import { useTheme } from "../ThemeContext";

// ─────────────────────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────────────────────
function SecNum({ n, title }: { n: string; title: string }) {
  const { T } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${T.s1}` }}>
      <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 14, color: T.accent, minWidth: 28 }}>{n}</span>
      <h2 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 26, color: T.t0, margin: 0, letterSpacing: "-0.02em" }}>{title}</h2>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  const { T } = useTheme();
  return <p style={{ fontFamily: T.fontBody, fontSize: 14, color: T.t1, lineHeight: 1.75, margin: "0 0 14px" }}>{children}</p>;
}

function Bold({ children }: { children: React.ReactNode }) {
  const { T } = useTheme();
  return <strong style={{ fontWeight: 600, color: T.t0 }}>{children}</strong>;
}

function Term({ children }: { children: React.ReactNode }) {
  const { T } = useTheme();
  return <em style={{ fontStyle: "normal", fontFamily: T.fontMono, fontWeight: 600, color: T.accent }}>{children}</em>;
}

function Sep() {
  const { T } = useTheme();
  return <div style={{ height: 1, background: T.s0, margin: "52px 0" }} />;
}

function Rule({ items }: { items: React.ReactNode[] }) {
  const { T } = useTheme();
  return (
    <div style={{ background: T.accentDim, border: `1px solid ${T.aStroke}`, borderLeft: `2px solid ${T.accent}`, borderRadius: T.r2, padding: "14px 18px", marginBottom: 16 }}>
      <p style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.accent, margin: "0 0 10px" }}>Design rules</p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item, i) => (
          <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 4, height: 4, borderRadius: T.rFull, background: T.accent, marginTop: 8, flexShrink: 0 }} />
            <span style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, lineHeight: 1.65 }}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Proposal({ children }: { children: React.ReactNode }) {
  const { T } = useTheme();
  return (
    <div style={{ background: T.warnDim, border: `1px solid ${T.warning}44`, borderLeft: `2px solid ${T.warning}`, borderRadius: T.r2, padding: "12px 18px", marginBottom: 16 }}>
      <p style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.warning, margin: "0 0 6px" }}>Redesign proposal</p>
      <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, margin: 0, lineHeight: 1.65 }}>{children}</p>
    </div>
  );
}

function MiniRow({ status, color, dim }: { status: string; color: string; dim: string }) {
  const { T } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, height: 34, padding: "0 12px", background: dim, borderRadius: T.r1, marginBottom: 4 }}>
      <div style={{ width: 5, height: 5, borderRadius: T.rFull, background: color }} />
      <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 12, color }}>{status}</span>
      <span style={{ fontFamily: T.fontMono, fontSize: 12, color: T.t1, marginLeft: 8 }}>Staff Product Designer · Notion</span>
    </div>
  );
}

function InlineAlert({ tone, text }: { tone: "warning" | "error" | "info"; text: string }) {
  const { T } = useTheme();
  const colorMap: Record<string, string> = { warning: T.warning, error: T.error, info: T.info };
  const dimMap:   Record<string, string> = { warning: T.warnDim,  error: T.errDim,  info: T.infoDim };
  const color = colorMap[tone];
  const dim   = dimMap[tone];
  return (
    <div style={{ padding: "10px 14px", background: dim, border: `1px solid ${color}33`, borderLeft: `2px solid ${color}`, borderRadius: T.r2, display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <div style={{ width: 5, height: 5, borderRadius: T.rFull, background: color, flexShrink: 0 }} />
      <span style={{ fontFamily: T.fontMono, fontSize: 12.5, color: T.t1 }}>{text}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sections
// ─────────────────────────────────────────────────────────────────────────────
function S1() {
  return (
    <div>
      <SecNum n="01" title="Wayfinding" />
      <P>
        Every route in Baldin is accessible from the <Term>rail</Term> — the persistent left-side navigation surface.
        The rail groups routes into four clusters: <Bold>Dashboard</Bold>, <Bold>Job Search</Bold>,
        <Bold>Network</Bold>, and <Bold>Automation</Bold>, with a separate user rail for <Bold>Profile</Bold>,
        <Bold>Settings</Bold>, and <Bold>Aspirations</Bold>. The rail is always visible on desktop.
      </P>
      <P>
        Above the content area, the <Term>command bar</Term> carries three zones:
        a breadcrumb trail that reflects depth within the current route,
        a global search field (⌘K — not a table filter),
        and quick-access controls: notifications, primary action, and user account.
      </P>
      <P>
        Pages that manage collections of records carry an additional <Term>toolbar</Term> between the command bar and content.
        This toolbar owns filtering, sorting, view switching, and the primary create action for that route.
        Detail pages replace the toolbar with inline actions.
      </P>
      <Rule items={[
        <>The rail is always visible at ≥ 1024px. It collapses to 56px icon-only at tablet. It hides entirely below 768px.</>,
        <>The global search field (⌘K) is a command palette — it does not filter the current table.</>,
        <>The primary create action (+ Save lead, + Add Application, + New workspace doc) lives in the toolbar, not the command bar.</>,
        <>Only one primary action is permitted in the toolbar. Secondary actions use icon buttons.</>,
      ]} />
    </div>
  );
}

function S2() {
  const { T } = useTheme();
  return (
    <div>
      <SecNum n="02" title="Surface & Depth" />
      <P>
        OPERATOR uses a five-level depth model. Surfaces are defined by their border color and background,
        not by shadows. Only the top two levels — <Term>Float</Term> and <Term>Overlay</Term> — carry box-shadows,
        and both use <Term>backdrop-filter: blur()</Term> since <code style={{ fontFamily: T.fontMono, fontSize: 13, color: T.accent }}>opaqueWindows: false</code>.
        This makes the depth hierarchy explicit without decoration.
      </P>
      <P>
        Surface names communicate their role: <Bold>Void</Bold> is the viewport itself (never a component background).
        <Bold>Shell</Bold> wraps the product chrome — rail, command bar, toolbars. <Bold>Surface</Bold> is where
        content lives — cards, panels, table rows. <Bold>Float</Bold> layers above Surface for temporary elements.
        <Bold>Overlay</Bold> is reserved for dialogs.
      </P>
      <Rule items={[
        <>Never use shadows to create visual hierarchy at the Surface or Shell level. Use borders only.</>,
        <>Dialogs always sit on Overlay (#363636) with backdrop-filter: blur(24px) and a Signal-tinted top edge.</>,
        <>Popovers and dropdowns use Float (#2d2d2d) with backdrop-filter: blur(20px).</>,
        <>Background colors must come from the surface ramp. No ad-hoc neutral fills.</>,
      ]} />
    </div>
  );
}

function S3() {
  const { T } = useTheme();
  return (
    <div>
      <SecNum n="03" title="Collection Views" />
      <P>
        A <Term>collection view</Term> presents a set of records — leads, applications, message inbox conversations, workspace documents, workflows, or reusable agents.
        Every collection view opens with a <Term>summary band</Term>: a row of numeric status cells that gives
        the user the state of the collection before they read a single row.
      </P>
      <P>
        The data table follows the summary band and toolbar. Rows are 38–40px in dense mode (the default).
        Status is expressed as a 6px dot plus colored text — never as a filled chip with borders.
        On row hover, the background tints with the row's status tone. This tint is never static.
      </P>
      <div style={{ marginBottom: 16 }}>
        <MiniRow status="Applied"   color={T.success} dim={T.succDim} />
        <MiniRow status="Ranked"    color={T.info}    dim={T.infoDim} />
        <MiniRow status="Follow-Up" color={T.warning} dim={T.warnDim} />
      </div>
      <Rule items={[
        <>Collection views always lead with the summary band. The summary band always precedes the toolbar.</>,
        <>Status markers are dot + text only. No borders, no chip padding, no background at rest.</>,
        <>Row hover: status tone dim tint. This is the only moment status color bleeds into a surface.</>,
        <>Numbers in the summary band use JetBrains Mono. Labels use uppercase overline style.</>,
      ]} />
      <Proposal>
        A collapsible right panel for record preview (without leaving the collection) is under design exploration.
        Not approved for implementation.
      </Proposal>
    </div>
  );
}

function S4() {
  return (
    <div>
      <SecNum n="04" title="Entity Views" />
      <P>
        An <Term>entity view</Term> presents a single record in full: an application, a workspace document,
        or a profile-owned planning surface. The entity's name and status appear at the top of the main column as the primary heading — this is the
        largest type on the page and the only H1. A status marker sits inline with the name.
      </P>
      <P>
        The main column holds the primary content. Section headings divide it into named subsections
        (fit reasoning, outreach, timeline, document notes). A right sidebar — 280px — holds metadata, contact info,
        follow-up state, fit score, and stage history. Actions live in the main column footer, never in the sidebar.
      </P>
      <Rule items={[
        <>The entity name is the only H1. There is exactly one per page.</>,
        <>Sidebar width is fixed at 280px. It holds metadata. Actions belong in the main column.</>,
        <>Section headings are a visual divider + Subtitle-level type, left-aligned. No background.</>,
        <>Stage progression shows as a vertical checklist, not a horizontal stepper.</>,
      ]} />
    </div>
  );
}

function S5() {
  const { T } = useTheme();
  return (
    <div>
      <SecNum n="05" title="Typography in Context" />
      <P>
        Baldin uses three typography roles with a clear split of responsibilities.
        <Term>Space Grotesk</Term> carries page titles, section headings, dialog titles, and other
        structural text that establishes hierarchy and orientation.
        <Term>Source Sans 3</Term> carries body text, descriptions, profile narratives, notes, messaging threads,
        workspace summaries, and any surface where reading comfort matters more than data density.
        <Term>JetBrains Mono</Term> is reserved for the chrome the user scans: labels, data values, IDs,
        timestamps, metric numbers, and status text.
      </P>
      <P>
        <Bold>The key distinction is intent, not element type.</Bold> A profile summary or outreach draft is Source Sans 3 —
        it&apos;s text you read. A route title or section heading is Space Grotesk — it orients the user. Status text,
        metrics, breadcrumbs, and timestamps stay mono because they are scanned as state, not read as prose.
      </P>
      <P>
        The type scale runs from Display (52px, Space Grotesk 700) down to Overline (10px, uppercase, +0.1em).
        A <Bold>Display</Bold> role exists for hero moments — auth screens, empty-state headlines, onboarding — where
        the type carries brand impression rather than data. Display already uses the same Space Grotesk family as the heading
        role, but at a larger scale and with more visual presence.
      </P>
      <div style={{ background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r3, padding: "16px 20px", marginBottom: 16 }}>
        <p style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10.5, color: T.t2, textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 0 12px" }}>CURRENT FOCUS</p>
        <p style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 26, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.02em" }}>Staff Product Designer</p>
        <p style={{ fontFamily: T.fontBody, fontSize: 14, color: T.t1, margin: "0 0 4px" }}>Notion · saved from aspirations shortlist</p>
        <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, margin: "0 0 12px", lineHeight: 1.65 }}>
          Strong fit with the user's design-systems aspiration set. Resume variant already emphasizes systems work, and the next step is a follow-up note after portfolio review.
        </p>
        <div style={{ display: "flex", gap: 32 }}>
          <div>
            <p style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 26, color: T.accent, margin: 0 }}>92</p>
            <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: 0 }}>Fit score</p>
          </div>
          <div>
            <p style={{ fontFamily: T.fontMono, fontSize: 13, color: T.t1, margin: 0 }}>Apr 12, 2026</p>
            <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: 0 }}>Saved</p>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
              <div style={{ width: 5, height: 5, borderRadius: T.rFull, background: T.skill }} />
              <p style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 12, color: T.skill, margin: 0 }}>Design Systems</p>
            </div>
            <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: 0 }}>skill tag</p>
          </div>
        </div>
      </div>
      <Rule items={[
        <>Space Grotesk carries headings: route titles, section titles, dialog titles, and other structural orientation cues.</>,
        <>Source Sans 3 carries reading surfaces: descriptions, notes, profile narratives, workspace summaries, messaging, paragraph copy.</>,
        <>JetBrains Mono stays reserved for data chrome: labels, values, IDs, timestamps, scores, and navigation metadata.</>,
        <>The boundary is intent-based: if the user reads it as a sentence, use Source Sans 3. If they scan it as a state cue, use Mono.</>,
        <>The overline style is JetBrains Mono, uppercase, 10px, +0.1em — the only permitted field-label style.</>,
      ]} />
      <Proposal>
        If a future brand/display face replaces Space Grotesk, the handoff contract, route specimens, and library foundations should update together in the same slice.
      </Proposal>
    </div>
  );
}

function S6() {
  return (
    <div>
      <SecNum n="06" title="Status Language" />
      <P>
        Status in OPERATOR is a language, not a visual decoration. Six tones cover all product states.
        Each tone carries a consistent set of meaning: <Bold>Success</Bold> (positive, active, resolved),
        <Bold>Info</Bold> (in motion, pending action), <Bold>Warning</Bold> (stalled, needs attention),
        <Bold>Error</Bold> (failure, rejection, blocked), <Bold>Skill</Bold> (capability tags, AI-scored attributes),
        and <Bold>Neutral</Bold> (inactive, archived, unknown).
      </P>
      <P>
        The marker form is always a <Term>dot</Term> (6px, full-circle) followed by colored text.
        Status color never appears as a filled chip background at rest. It appears as a tint on hover,
        and as a tint tag only in summary and filter contexts. Skill is a first-class tone — purple —
        used exclusively for competency and capability labeling.
      </P>
      <InlineAlert tone="warning" text="3 applications have a follow-up due this week" />
      <InlineAlert tone="error"   text="Workspace comparison is blocked — resume variant missing" />
      <InlineAlert tone="info"    text="Coffee chat with Maya scheduled for Apr 20 at 14:00 PST" />
      <Rule items={[
        <>Every status label maps to exactly one tone. Two routes cannot show the same status in different tones.</>,
        <>Skill tone (purple) is reserved for competency and capability labeling only. Never reuse for status.</>,
        <>Persistent conditions (stale follow-up, blocked workspace steps) use a bordered left-accent alert, not a toast.</>,
        <>Transient acknowledgements (saved, confirmed) use a brief non-blocking notification that auto-dismisses.</>,
      ]} />
    </div>
  );
}

function S7() {
  return (
    <div>
      <SecNum n="07" title="Interaction Patterns" />
      <P>
        Mutations require intent. Three dialog forms handle different mutation types.
        A <Term>form sheet</Term> handles creation and edit. It shows immediately, saves with a labeled primary button.
        A <Term>confirm gate</Term> handles irreversible actions — archive, remove, delete.
        Its confirm button is error-tone colored and its label names both the action and the entity.
        An <Term>information overlay</Term> shows read-only context without mutation controls.
      </P>
      <P>
        Dialogs are not for navigating to record detail. Detail views are routes — never dialogs.
        The record detail screen is always a full route with its own URL.
      </P>
      <Rule items={[
        <>Dialogs are for mutations and confirmations only. Detail content lives at its own URL.</>,
        <>Confirm gate button label = verb + entity name. "Archive Resume v4", not "Confirm" or "OK".</>,
        <>Cancel is always left. Confirm is always right. Destructive confirm uses error tone (red) — never Signal.</>,
        <>Form sheets save to a loading state. The button spinner replaces the label during in-flight.</>,
      ]} />
    </div>
  );
}

function S8() {
  return (
    <div>
      <SecNum n="08" title="Motion & Feedback" />
      <P>
        Motion in OPERATOR is purposeful and brief. The maximum transition duration for UI chrome is 120ms.
        No element in the product bounces, springs, or eases in a way that draws attention to itself.
        The interface should feel instant — not sluggish, not playful.
      </P>
      <P>
        Data updates — table re-sorts, filter changes, status changes — are always instantaneous.
        Loading states use a left-to-right shimmer pattern (not a spinner) for skeleton rows.
        Transient confirmations appear at the bottom of the viewport and auto-dismiss after 3 seconds.
      </P>
      <Rule items={[
        <>120ms maximum for UI transitions. Data changes are instant — no animation.</>,
        <>No spring, bounce, or physics-based easing. Standard cubic ease everywhere.</>,
        <>Skeleton rows for loading (shimmer, not spinner). Full-page loader only on initial auth.</>,
        <>Toast auto-dismisses in 3s. Errors persist until dismissed manually.</>,
      ]} />
    </div>
  );
}

function S9() {
  return (
    <div>
      <SecNum n="09" title="Density & Rhythm" />
      <P>
        OPERATOR defaults to <Term>dense</Term> — the maximum information density that preserves legibility.
        Dense mode uses 38–40px row heights, 16px card padding, and tight vertical rhythm.
        This is the mode for all operational and collection views.
      </P>
      <P>
        <Bold>Comfortable</Bold> density — 48px rows, 24px padding — applies to entity detail views
        and settings pages where reading speed matters more than data volume.
        <Bold>Spacious</Bold> density — 64px rows, 32px+ padding — is used only on auth and marketing surfaces,
        where brand impression is primary.
      </P>
      <Rule items={[
        <>Default to Dense. Never default to Spacious inside the authenticated shell.</>,
        <>Density is set at the page level. Sections within a page do not mix density modes.</>,
        <>Auth and marketing are always Spacious — regardless of any preference.</>,
      ]} />
      <Proposal>
        User-configurable density preference (Dense / Comfortable toggle in account settings) is under design review.
        Until approved, density is defined per route in the design spec.
      </Proposal>
    </div>
  );
}

function S10() {
  const { T } = useTheme();
  return (
    <div>
      <SecNum n="10" title="Baldin Identity" />
      <P>
        OPERATOR is a design direction, not the product identity. Baldin is a <Bold>local-first job-search OS</Bold> today —
        a private career control plane for a single operator managing direction, ranking, applications, private messaging, and next actions across the search.
        The target direction is applicant-side labor market observability later, but the command-center metaphor must stay grounded
        in the shipped workspace, not in a public market surface or speculative shared-signal product.
      </P>
      <P>
        Three qualities differentiate Baldin from a generic command center:
      </P>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { glyph: "◉", title: "Self-directed control", body: "Every table row, detail view, and metric is organized around the user's private search loop: profile, aspirations, ranked leads, applications, outreach, documents, and opt-in network context. Baldin keeps the operator oriented without drowning them in platform chrome." },
          { glyph: "◈", title: "Visible leverage", body: "Fit signals, extracted job data, ranked opportunities, private network context, and direct messages can help the operator move faster. These cues should read as operational help with clear provenance, not as public observability, shared market truth, or mysterious magic." },
          { glyph: "◇", title: "Trustworthy momentum", body: "The product tracks what is moving, what is stale, and what is next. Personal activity, follow-up pressure, and confidence cues matter more than vanity metrics, decorative dashboards, or social-feed theater." },
        ].map(({ glyph, title, body }) => (
          <div key={title} style={{ padding: "16px", background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r3 }}>
            <span style={{ fontFamily: T.fontMono, fontWeight: 800, fontSize: 18, color: T.accent, display: "block", marginBottom: 6 }}>{glyph}</span>
            <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 12, color: T.t0, display: "block", marginBottom: 6, letterSpacing: "-0.01em" }}>{title}</span>
            <span style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t1, lineHeight: 1.6, display: "block" }}>{body}</span>
          </div>
        ))}
      </div>
      <Rule items={[
        <>The user's profile and aspirations are first-class surfaces. The product never frames them as just another record.</>,
        <>AI-assisted insights (fit score, extraction confidence, ranking) carry a subtle confidence indicator and provenance hint — not just a number.</>,
        <>Momentum cues (last touched, follow-up due, workspace readiness, workflow state, agent freshness) stay visible on collection rows, not hidden in detail.</>,
        <>Private messaging is the shipped human loop. The inbox and the active thread stay route-level surfaces, never a feed widget or ambient sidebar toy.</>,
        <>Opt-in network context and personal activity surfaces must read as private workflow, not a social feed or public listing-health board.</>,
        <>Forward-looking leverage hints use a proposal badge plus provenance or confidence note and an explicit privacy boundary.</>,
        <>Future observability concepts stay explicitly marked as proposals, previews, or confidence-scoped signals until they ship.</>,
        <>Any shared market truth remains secondary to private workflow and should never outrank concrete operator evidence.</>,
        <>The language is "profile," "aspirations," "leads," "applications," "workspace," and "follow-up" — not hiring-side jargon or generic "records."</>,
      ]} />
      <Proposal>
        Explore a dedicated treatment for confidence and signal quality — potentially a confidence band or provenance annotation style —
        so users can always tell the difference between saved data, extracted data, inferred fit, and any future shared signal.
      </Proposal>
    </div>
  );
}

function S11() {
  const { T } = useTheme();
  return (
    <div>
      <SecNum n="11" title="Human Surfaces" />
      <P>
        Not every surface in Baldin is an operations table. <Bold>Human surfaces</Bold> are the views where
        the user engages with narrative, personality, conversation, or documents — where scanning speed
        matters less than reading comfort and warmth.
      </P>

      <div style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.t2, margin: "0 0 10px" }}>Profile & aspirations</div>
      <P>
        The user's profile is the most important human surface. It combines structured data (skills, signals,
        discoverability settings) with narrative data (summary, aspirations, notes, outreach drafts). The structured
        data uses standard OPERATOR chrome. The narrative sections use Source Sans 3 at comfortable density with generous line
        height (1.75+). Profile photos, when present, use 48px rounded avatars. Discoverability settings should always read as opt-in and privacy-preserving.
      </P>

      <div style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.t2, margin: "0 0 10px" }}>Outreach & messaging</div>
      <P>
        Private messaging is the shipped human loop in Baldin. The inbox remains a collection route for triage, while the active thread is a dedicated conversational route. Thread bubbles use Source Sans 3 at 14px with 1.7 line height.
        The sender's messages are tinted with <Term>accentDim</Term>; received messages sit on <Term>raised</Term>.
        Timestamps are mono overline. Compose uses Source Sans 3 — the user is writing prose, not filling a form.
        Messaging should feel human and immediate, whether the user is following up with a connection, a trusted peer, or a company contact they chose to engage. It should never imply public reach, shared market truth, or automatic message rights.
      </P>

      <div style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.t2, margin: "0 0 10px" }}>Empty states</div>
      <P>
        An empty collection is not an error — it&apos;s an invitation. Empty states use comfortable density,
        a brief Source Sans 3 headline, a one-sentence explanation, and a single primary action. The illustration
        (if any) is a simple line-art icon — not a cartoon, not a stock photo. The tone is direct
        and helpful: "No leads yet. Save a role to start your queue."
      </P>

      <div style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.t2, margin: "0 0 10px" }}>Workspace documents</div>
      <P>
        Workspace views show file metadata in standard OPERATOR chrome, but previews (resume, cover letter, compare output, extracted job text)
        render in a neutral reading frame — Source Sans 3, comfortable density, minimal chrome. The reading surface should not compete with the content.
      </P>

      <div style={{ background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r3, padding: "20px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: T.rFull, background: T.accentDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 18, color: T.accent }}>JK</span>
          </div>
          <div>
            <p style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 18, color: T.t0, margin: "0 0 2px", letterSpacing: "-0.01em" }}>Jordan Kim</p>
            <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, margin: 0 }}>Product Designer · targeting systems and platform roles</p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 5, height: 5, borderRadius: T.rFull, background: T.success }} />
            <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 12, color: T.success }}>Ready</span>
          </div>
        </div>
        <p style={{ fontFamily: T.fontBody, fontSize: 14, color: T.t1, lineHeight: 1.75, margin: "0 0 12px" }}>
          Focused on design-systems and product-platform roles. Workspace artifacts already include two tailored resume variants,
          a cover letter draft, and a ranked shortlist of target companies. Messaging and follow-up should feel like a calm personal workspace, not a CRM.
        </p>
        <div style={{ display: "flex", gap: 6 }}>
          {["Design Systems", "Platform", "Writing", "Systems Thinking"].map(s => (
            <span key={s} style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.skill, background: T.skillDim, borderRadius: T.r1, padding: "3px 8px" }}>{s}</span>
          ))}
        </div>
      </div>

      <Rule items={[
        <>Profile and aspiration narrative sections always use Source Sans 3 at comfortable density.</>,
        <>Message threads use Source Sans 3. Compose inputs use Source Sans 3. Messaging should feel conversational, not transactional.</>,
        <>Empty states use comfortable density, a single headline, one explanatory sentence, and one action. No illustrations heavier than a line icon.</>,
        <>Workspace document previews render in a neutral reading frame. The system chrome must not compete with the content.</>,
        <>Profile avatars are 48px in entity views, 28px in table rows, 24px in compact contexts.</>,
      ]} />
    </div>
  );
}

function S12() {
  const { T } = useTheme();
  return (
    <div>
      <SecNum n="12" title="Exceptions & Anti-Patterns" />
      <P>
        Design rules are defaults, not dogma. This section documents the known exceptions to the rules
        in this guide, and the anti-patterns that have been considered and rejected.
      </P>

      <div style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.t2, margin: "0 0 10px" }}>Permitted exceptions</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {[
          { rule: "\"Every collection leads with a summary band\"", exception: "Messages and Workspace may omit the summary band when the collection is small (< 10 items) or when the primary interaction is search, not browse." },
          { rule: "\"Density is set at the page level\"", exception: "The Dashboard is a mixed-density page by design: metric cards use dense, the activity feed uses comfortable, and the momentum chart uses its own internal spacing." },
          { rule: "\"Detail views are routes, never dialogs\"", exception: "Quick-preview panels (if approved) would show a read-only record summary in a slide-over without a URL change. This is scoped preview, not full detail." },
          { rule: "\"No ad-hoc neutral fills\"", exception: "Skeleton loading states use a shimmer fill that is not in the surface ramp. This is a transient state, not a resting surface." },
          { rule: "\"One primary action per toolbar\"", exception: "Bulk-selection mode may promote a second action (e.g., \"Archive selected\") temporarily. It disappears when selection is cleared." },
        ].map(({ rule, exception }) => (
          <div key={rule} style={{ padding: "12px 16px", background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
            <p style={{ fontFamily: T.fontMono, fontSize: 12, color: T.accent, margin: "0 0 6px" }}>{rule}</p>
            <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, margin: 0, lineHeight: 1.6 }}>{exception}</p>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.t2, margin: "0 0 10px" }}>Rejected anti-patterns</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {[
          "Colored chip backgrounds at rest — tested, rejected. They compete with status dots and create visual noise at scale.",
          "Horizontal steppers for application progress — tested, rejected. Vertical checklists are more compact and scannable.",
          "Gradient fills on cards or surfaces — rejected outright. Gradients conflict with the flat depth model.",
          "Icon-only navigation without tooltips — rejected. Collapsed rail must show tooltips on hover.",
          "Auto-playing animations or micro-interactions on load — rejected. The interface is instant, not performative.",
          "Using accent blue for non-interactive decorative elements — rejected. Blue is earned; it always means interactive.",
        ].map((text, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 14px", background: T.errDim, borderRadius: T.r2 }}>
            <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 12, color: T.error, flexShrink: 0 }}>✕</span>
            <span style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, lineHeight: 1.6 }}>{text}</span>
          </div>
        ))}
      </div>

      <Rule items={[
        <>When you encounter an edge case not listed here, bias toward the rule. If the rule creates a real usability problem, document the exception here before breaking it.</>,
        <>Anti-patterns are permanently rejected unless this document explicitly revisits them. Do not re-propose.</>,
      ]} />
    </div>
  );
}

function S13() {
  const { T } = useTheme();
  return (
    <div>
      <SecNum n="13" title="Focus, Keyboard & Async" />
      <P>
        OPERATOR is keyboard-friendly by default. Every interactive element is reachable via Tab,
        and all primary actions have keyboard shortcuts. Focus management follows web-platform conventions
        with OPERATOR-specific visual treatment.
      </P>

      <div style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.t2, margin: "0 0 10px" }}>Focus rings</div>
      <P>
        Focus rings use <Term>aStroke</Term> (accent blue at 32% opacity) as a 2px outline with 2px offset.
        They are visible only on keyboard navigation (<code style={{ fontFamily: T.fontMono, fontSize: 12, color: T.accent }}>:focus-visible</code>),
        never on mouse click. Inside dialogs, focus is trapped — Tab cycles within the overlay until dismissed.
      </P>

      <div style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.t2, margin: "0 0 10px" }}>Hover & press</div>
      <P>
        Hover states use a single rule: <Bold>border-color shifts to aStroke</Bold> for bordered elements,
        <Bold>background tints to accentDim</Bold> for flat elements. Press (active) darkens the hover state
        by one surface step. These transitions are 100ms ease. No scale transforms, no shadows on hover.
      </P>

      <div style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.t2, margin: "0 0 10px" }}>Keyboard shortcuts</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
        {[
          ["⌘ K", "Command palette / global search"],
          ["⌘ N", "Create new (context-aware)"],
          ["Esc", "Close dialog / deselect / back"],
          ["↑ ↓", "Navigate table rows"],
          ["Enter", "Open selected row / confirm"],
          ["⌘ ⇧ D", "Toggle density (if enabled)"],
          ["Tab", "Move focus forward"],
          ["⇧ Tab", "Move focus backward"],
        ].map(([key, desc]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: T.raised, borderRadius: T.r2 }}>
            <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 11, color: T.accent, minWidth: 64, flexShrink: 0 }}>{key}</span>
            <span style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1 }}>{desc}</span>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.t2, margin: "0 0 10px" }}>Loading & async patterns</div>
      <P>
        <Bold>Skeleton loading</Bold> — collection views show shimmer rows (3–5 rows matching table structure)
        during initial fetch. The shimmer pulse is 1.5s ease-in-out. No spinners in the main content area.
      </P>
      <P>
        <Bold>Optimistic updates</Bold> — status changes, message sends, and form saves apply immediately in the UI.
        If the server rejects the mutation, the UI reverts and shows an error toast that persists until dismissed.
        The user should never see a spinner for actions that take &lt; 500ms.
      </P>
      <P>
        <Bold>Inline edit</Bold> — editable fields show a subtle underline on hover. Click to activate replaces
        the display value with an input. Enter commits, Esc reverts. The field border becomes aStroke during edit.
        No separate edit mode — fields are individually editable in place.
      </P>

      <Rule items={[
        <>Focus rings are :focus-visible only. Never show on mouse click.</>,
        <>Dialogs trap focus. Esc closes the topmost overlay.</>,
        <>Hover = border or tint shift. No shadows, no scale transforms.</>,
        <>Optimistic updates for all sub-500ms mutations. Revert on failure with persistent error toast.</>,
        <>Skeleton shimmer for initial loads. No spinners in main content. Spinners only in buttons during in-flight saves.</>,
        <>Every primary action has a keyboard shortcut. All shortcuts are discoverable via ⌘K palette.</>,
      ]} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main View
// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "s1", Comp: S1 }, { id: "s2", Comp: S2 }, { id: "s3", Comp: S3 },
  { id: "s4", Comp: S4 }, { id: "s5", Comp: S5 }, { id: "s6", Comp: S6 },
  { id: "s7", Comp: S7 }, { id: "s8", Comp: S8 }, { id: "s9", Comp: S9 },
  { id: "s10", Comp: S10 }, { id: "s11", Comp: S11 }, { id: "s12", Comp: S12 },
  { id: "s13", Comp: S13 },
];

const TOC_LABELS = [
  "Wayfinding", "Surface & Depth", "Collection Views", "Entity Views",
  "Typography in Context", "Status Language", "Interaction Patterns",
  "Motion & Feedback", "Density & Rhythm", "Baldin Identity",
  "Human Surfaces", "Exceptions & Anti-Patterns", "Focus, Keyboard & Async",
];

export function StyleGuideView() {
  const { T } = useTheme();
  return (
    <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
      {/* TOC */}
      <div style={{ flex: "0 0 160px", position: "sticky", top: 0 }}>
        <p style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: T.t2, margin: "0 0 10px" }}>Contents</p>
        {TOC_LABELS.map((label, i) => (
          <a key={label} href={`#sg-s${i + 1}`} style={{ display: "block", fontFamily: T.fontMono, fontSize: 12, color: T.t1, textDecoration: "none", padding: "4px 0" }}>
            <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, marginRight: 6 }}>{i + 1 < 10 ? `0${i + 1}` : i + 1}</span>
            {label}
          </a>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontFamily: T.fontMono, fontSize: 11, color: T.accent, margin: "0 0 6px", letterSpacing: "0.1em" }}>BALDIN · OPERATOR</p>
          <h1 style={{ fontFamily: T.fontHead, fontWeight: 800, fontSize: 40, color: T.t0, margin: "0 0 12px", letterSpacing: "-0.03em" }}>Style Guide</h1>
          <p style={{ fontFamily: T.fontBody, fontSize: 15, color: T.t1, maxWidth: 560, lineHeight: 1.7, margin: "0 0 20px" }}>
            How OPERATOR looks, behaves, and communicates. Written for designers.
            For engineering handoff, see the Appendix.
          </p>
          <div style={{ display: "flex", gap: 24, padding: "14px 18px", background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r3 }}>
            {[
              { label: "Direction",  value: "OPERATOR"             },
              { label: "Version",    value: "v2.1"                  },
              { label: "Date",       value: "April 2026"            },
              { label: "Status",     value: "Active · Figma-first"  },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.09em", color: T.t2, margin: "0 0 2px" }}>{label}</p>
                <p style={{ fontFamily: T.fontMono, fontSize: 13, color: T.t0, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sections */}
        {SECTIONS.map(({ id, Comp }, i) => (
          <div key={id} id={`sg-${id}`}>
            <Comp />
            {i < SECTIONS.length - 1 && <Sep />}
          </div>
        ))}
      </div>
    </div>
  );
}
