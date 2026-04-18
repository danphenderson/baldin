function Component1GlobalNavigation() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start overflow-clip relative shrink-0 w-full" data-name="1 · Global Navigation">
      <p className="font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[40px] relative shrink-0 text-[#e7eef8] text-[32px] w-full">1 · Global Navigation</p>
      <div className="font-['Source_Sans_3:Regular',sans-serif] font-normal leading-[0] relative shrink-0 text-[15px] text-[rgba(147,165,189,0.7)] w-full whitespace-pre-wrap">
        <p className="leading-[22px] mb-0">The LeftNav is the primary navigation surface. It spans the viewport height, expands from 64px (collapsed) to 240px (expanded), and groups routes into: Dashboard, Job Search (Leads, Applications), Network (Messages, Connections, Discover), and Automation (Workflows, Agents, Workspace), with Profile, Settings, and Aspirations in the user rail.</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px] mb-0">Rules:</p>
        <p className="leading-[22px] mb-0">• Always visible on desktop. Collapses to icon-only at ≤ 1024px.</p>
        <p className="leading-[22px] mb-0">• Active route receives primary-tone highlight; parent group auto-expands.</p>
        <p className="leading-[22px] mb-0">• User avatar and logout live at the bottom.</p>
        <p className="leading-[22px]">• The nav does not carry route-specific controls; those belong to CommandBar or PageToolbar.</p>
      </div>
    </div>
  );
}

function Component2AppShellCommandBar() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start overflow-clip relative shrink-0 w-full" data-name="2 · App Shell & Command Bar">
      <p className="font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[40px] relative shrink-0 text-[#e7eef8] text-[32px] w-full">{`2 · App Shell & Command Bar`}</p>
      <div className="font-['Source_Sans_3:Regular',sans-serif] font-normal leading-[0] relative shrink-0 text-[15px] text-[rgba(147,165,189,0.7)] w-full whitespace-pre-wrap">
        <p className="leading-[22px] mb-0">AppShell = LeftNav + Content Area. The content area fills remaining viewport width.</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px] mb-0">CommandBar sits at the top of the content area. Fixed height 48px. Contains:</p>
        <p className="leading-[22px] mb-0">• Left: breadcrumb trail reflecting current route hierarchy.</p>
        <p className="leading-[22px] mb-0">• Center: global search field (⌘K trigger, 360px max-width).</p>
        <p className="leading-[22px] mb-0">• Right: notifications bell, quick-add (+) button, user context.</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px] mb-0">PageToolbar sits below CommandBar when a page needs filters, view toggles, or bulk actions.</p>
        <p className="leading-[22px] mb-0">• Collection pages: filter chips, sort dropdown, view toggle (list/card/board), + Add button.</p>
        <p className="leading-[22px] mb-0">• Detail pages: back link, edit/delete actions, status change dropdown.</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px] mb-0">Rules:</p>
        <p className="leading-[22px] mb-0">• CommandBar is global. PageToolbar is page-owned.</p>
        <p className="leading-[22px]">• Neither surface carries page content — they frame actions only.</p>
      </div>
    </div>
  );
}

function Component3CollectionVsDetailLayout() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start overflow-clip relative shrink-0 w-full" data-name="3 · Collection vs Detail Layout">
      <p className="font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[40px] relative shrink-0 text-[#e7eef8] text-[32px] w-full">3 · Collection vs Detail Layout</p>
      <div className="font-['Source_Sans_3:Regular',sans-serif] font-normal leading-[0] relative shrink-0 text-[15px] text-[rgba(147,165,189,0.7)] w-full whitespace-pre-wrap">
        <p className="leading-[22px] mb-0">Collection pages:</p>
        <p className="leading-[22px] mb-0">• SituationHeader (Collection variant): page title, count, subtitle.</p>
        <p className="leading-[22px] mb-0">• MetricDeck: 4–6 stat cells showing volume + distribution.</p>
        <p className="leading-[22px] mb-0">• CollectionFrame: table header + scrollable row list.</p>
        <p className="leading-[22px] mb-0">• Optional InspectorSplit: selection preview in right 380px panel.</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px] mb-0">Detail pages:</p>
        <p className="leading-[22px] mb-0">• SituationHeader (Detail variant): status chip, metadata, entity title.</p>
        <p className="leading-[22px] mb-0">• Two-column layout: Left (main content, sections) | Right (sidebar, quick info).</p>
        <p className="leading-[22px] mb-0">• SectionFrame containers for grouped content.</p>
        <p className="leading-[22px] mb-0">• DenseDetailBlock for key-value metadata.</p>
        <p className="leading-[22px] mb-0">• ThreadShell for activity / timeline.</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px]">Drill pattern: Collection row click → Detail page (or InspectorSplit → Detail). Never open detail in a dialog.</p>
      </div>
    </div>
  );
}

function Component4HeadingHierarchy() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start overflow-clip relative shrink-0 w-full" data-name="4 · Heading Hierarchy">
      <p className="font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[40px] relative shrink-0 text-[#e7eef8] text-[32px] w-full">4 · Heading Hierarchy</p>
      <div className="font-['Source_Sans_3:Regular',sans-serif] font-normal leading-[0] relative shrink-0 text-[15px] text-[rgba(147,165,189,0.7)] w-full whitespace-pre-wrap">
        <p className="leading-[22px] mb-0">Collection page title: Space Grotesk Bold 32px (#e7eef8).</p>
        <p className="leading-[22px] mb-0">Detail entity title: Space Grotesk Medium 24px (#e7eef8).</p>
        <p className="leading-[22px] mb-0">Section title (inside SectionFrame): Source Sans 3 SemiBold 15px (#e7eef8).</p>
        <p className="leading-[22px] mb-0">Dense label: Source Sans 3 SemiBold 13px (#93a5bd at 70%).</p>
        <p className="leading-[22px] mb-0">Body primary: Source Sans 3 Regular 16px (#e7eef8).</p>
        <p className="leading-[22px] mb-0">Body secondary: Source Sans 3 Regular 14px (#93a5bd).</p>
        <p className="leading-[22px] mb-0">Label compact: Source Sans 3 SemiBold 12px (#93a5bd at 70%).</p>
        <p className="leading-[22px] mb-0">Mono/code: JetBrains Mono Regular 13px.</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px] mb-0">Rules:</p>
        <p className="leading-[22px] mb-0">• Collection pages have exactly one H1 (page title). Detail pages have exactly one H1 (entity name).</p>
        <p className="leading-[22px] mb-0">• Section titles inside cards are H2 level.</p>
        <p className="leading-[22px]">• No route may invent heading sizes outside this scale.</p>
      </div>
    </div>
  );
}

function Component5MetricFraming() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start overflow-clip relative shrink-0 w-full" data-name="5 · Metric Framing">
      <p className="font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[40px] relative shrink-0 text-[#e7eef8] text-[32px] w-full">5 · Metric Framing</p>
      <div className="font-['Source_Sans_3:Regular',sans-serif] font-normal leading-[0] relative shrink-0 text-[15px] text-[rgba(147,165,189,0.7)] w-full whitespace-pre-wrap">
        <p className="leading-[22px] mb-0">MetricDeck: horizontal row of 4–6 raised cells. Each cell shows a numeric value (Space Grotesk Bold 22px, status-colored) and a label (SemiBold 12px muted).</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px] mb-0">Cell color mapping:</p>
        <p className="leading-[22px] mb-0">• Total / neutral: #e7eef8 (textPrimary)</p>
        <p className="leading-[22px] mb-0">• Active / positive: #10b981 (success)</p>
        <p className="leading-[22px] mb-0">• Ranked / in progress: #06b6d4 (primary)</p>
        <p className="leading-[22px] mb-0">• Pending / caution: #f59e0b (warning)</p>
        <p className="leading-[22px] mb-0">• Rejected / negative: #f43f5e (error)</p>
        <p className="leading-[22px] mb-0">• Info / contextual: #38bdf8 (info)</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px] mb-0">Rules:</p>
        <p className="leading-[22px] mb-0">• Every collection page must lead with a MetricDeck.</p>
        <p className="leading-[22px] mb-0">• Metric order: Total first, then by urgency descending.</p>
        <p className="leading-[22px]">• Detail pages use inline metadata, not MetricDeck.</p>
      </div>
    </div>
  );
}

function Component6StatusToneMapping() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start overflow-clip relative shrink-0 w-full" data-name="6 · Status Tone Mapping">
      <p className="font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[40px] relative shrink-0 text-[#e7eef8] text-[32px] w-full">6 · Status Tone Mapping</p>
      <div className="font-['Source_Sans_3:Regular',sans-serif] font-normal leading-[0] relative shrink-0 text-[15px] text-[rgba(147,165,189,0.7)] w-full whitespace-pre-wrap">
        <p className="leading-[22px] mb-0">StatusChip uses semantic color with 12% background opacity:</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px] mb-0">• success (#10b981): Ready, Applied, Connected, Sent, Completed</p>
        <p className="leading-[22px] mb-0">• primary (#06b6d4): Ranked, In Progress, Scheduled, Tracking</p>
        <p className="leading-[22px] mb-0">• warning (#f59e0b): Pending, Review, Follow-Up, Stale</p>
        <p className="leading-[22px] mb-0">• error (#f43f5e): Rejected, Failed, Error, Blocked, Expired</p>
        <p className="leading-[22px] mb-0">• info (#38bdf8): New, Draft, Queued, Scheduled</p>
        <p className="leading-[22px] mb-0">• neutral (#93a5bd at 60%): Archived, Unknown, Paused</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px] mb-0">Rules:</p>
        <p className="leading-[22px] mb-0">• Same entity status must use the same tone on every screen where it appears.</p>
        <p className="leading-[22px] mb-0">• Chip shape: 4px radius, 6–8px horizontal padding, SemiBold 11–12px.</p>
        <p className="leading-[22px]">• No route may define local status colors that contradict this table.</p>
      </div>
    </div>
  );
}

function Component7DialogDestructiveConventions() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start overflow-clip relative shrink-0 w-full" data-name="7 · Dialog & Destructive Conventions">
      <p className="font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[40px] relative shrink-0 text-[#e7eef8] text-[32px] w-full">{`7 · Dialog & Destructive Conventions`}</p>
      <div className="font-['Source_Sans_3:Regular',sans-serif] font-normal leading-[0] relative shrink-0 text-[15px] text-[rgba(147,165,189,0.7)] w-full whitespace-pre-wrap">
        <p className="leading-[22px] mb-0">SurfaceDialog:</p>
        <p className="leading-[22px] mb-0">• Centered overlay, max-width 600px, padding 24px, radius 16px.</p>
        <p className="leading-[22px] mb-0">• Surface: base background. Overlay: rgba(0,0,0,0.5) backdrop.</p>
        <p className="leading-[22px] mb-0">• Header: title + optional subtitle + close X.</p>
        <p className="leading-[22px] mb-0">• Footer: secondary/cancel left, primary/confirm right.</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px] mb-0">ConfirmDialog (destructive):</p>
        <p className="leading-[22px] mb-0">• Same shell as SurfaceDialog.</p>
        <p className="leading-[22px] mb-0">• Body must name the entity being affected.</p>
        <p className="leading-[22px] mb-0">• Confirm button uses error tone (#f43f5e).</p>
        <p className="leading-[22px] mb-0">{`• Require explicit action label — 'Delete Application' not 'OK'.`}</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px] mb-0">FormDialogShell:</p>
        <p className="leading-[22px] mb-0">• Used for quick-add and edit forms.</p>
        <p className="leading-[22px] mb-0">• Footer: Cancel + Save, with loading state on save.</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px] mb-0">Rules:</p>
        <p className="leading-[22px] mb-0">• Dialogs are for mutations. Never open a detail view in a dialog.</p>
        <p className="leading-[22px] mb-0">• Every destructive action must use ConfirmDialog.</p>
        <p className="leading-[22px]">• Transient feedback (save, delete success) uses InlineFeedback, not a dialog.</p>
      </div>
    </div>
  );
}

function Component8ResponsiveRules() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start overflow-clip relative shrink-0 w-full" data-name="8 · Responsive Rules">
      <p className="font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[40px] relative shrink-0 text-[#e7eef8] text-[32px] w-full">8 · Responsive Rules</p>
      <div className="font-['Source_Sans_3:Regular',sans-serif] font-normal leading-[0] relative shrink-0 text-[15px] text-[rgba(147,165,189,0.7)] w-full whitespace-pre-wrap">
        <p className="leading-[22px] mb-0">Breakpoints:</p>
        <p className="leading-[22px] mb-0">• Desktop: ≥ 1280px — full shell, expanded LeftNav, all columns.</p>
        <p className="leading-[22px] mb-0">• Tablet: 768–1279px — collapsed LeftNav (64px icon-only), single column detail.</p>
        <p className="leading-[22px] mb-0">{`• Mobile: < 768px — bottom tab bar replaces LeftNav, stacked layout, no InspectorSplit.`}</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px] mb-0">Required mobile compositions (390px):</p>
        <p className="leading-[22px] mb-0">• Dashboard, Auth, Marketing, and flagship journey pages.</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px] mb-0">Required tablet behavior notes:</p>
        <p className="leading-[22px] mb-0">• Network routes (Discover, Connections, Messages) need condensed layout annotations.</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px] mb-0">Desktop-primary only:</p>
        <p className="leading-[22px] mb-0">• Workflows, Admin, Workspace, and Automation Agents.</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px] mb-0">Rules:</p>
        <p className="leading-[22px] mb-0">• MetricDeck wraps to 2-column grid on tablet, horizontal scroll on mobile.</p>
        <p className="leading-[22px] mb-0">• InspectorSplit becomes a bottom sheet or separate page on mobile.</p>
        <p className="leading-[22px]">• Collection table shrinks to 2-column minimum (primary + status).</p>
      </div>
    </div>
  );
}

function Component9DensityRules() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start overflow-clip relative shrink-0 w-full" data-name="9 · Density Rules">
      <p className="font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[40px] relative shrink-0 text-[#e7eef8] text-[32px] w-full">9 · Density Rules</p>
      <div className="font-['Source_Sans_3:Regular',sans-serif] font-normal leading-[0] relative shrink-0 text-[15px] text-[rgba(147,165,189,0.7)] w-full whitespace-pre-wrap">
        <p className="leading-[22px] mb-0">Comfortable (default):</p>
        <p className="leading-[22px] mb-0">• Card padding: 24px. Section spacing: 24px. Row height: 52px.</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px] mb-0">Compact:</p>
        <p className="leading-[22px] mb-0">• Card padding: 16px. Section spacing: 16px. Row height: 40px.</p>
        <p className="leading-[22px] mb-0">• Used for: admin tables, dense workflow lists, document metadata.</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px] mb-0">Spacious:</p>
        <p className="leading-[22px] mb-0">• Card padding: 32px. Section spacing: 32px.</p>
        <p className="leading-[22px] mb-0">• Used for: marketing, landing page, onboarding.</p>
        <p className="leading-[22px] mb-0">​</p>
        <p className="leading-[22px] mb-0">Rules:</p>
        <p className="leading-[22px] mb-0">{`• Default to comfortable unless the page's information density demands compact.`}</p>
        <p className="leading-[22px] mb-0">• Marketing and auth pages use spacious density.</p>
        <p className="leading-[22px]">• Density is a page-level decision, not a per-section toggle.</p>
      </div>
    </div>
  );
}

export default function CommandCenterSystem() {
  return (
    <div className="bg-[#050a12] content-stretch flex flex-col gap-[64px] items-start p-[80px] relative size-full" data-name="Command Center System">
      <Component1GlobalNavigation />
      <Component2AppShellCommandBar />
      <Component3CollectionVsDetailLayout />
      <Component4HeadingHierarchy />
      <Component5MetricFraming />
      <Component6StatusToneMapping />
      <Component7DialogDestructiveConventions />
      <Component8ResponsiveRules />
      <Component9DensityRules />
    </div>
  );
}
