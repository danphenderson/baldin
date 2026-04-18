import { useTheme } from "../ThemeContext";
import {
  PhoneFrame,
  RouteTabs,
  ScreenBadge,
  ScreenButton,
  ScreenCallout,
  ScreenMetric,
  ScreenPanel,
  ScreenSearch,
  ScreenTag,
} from "./flagship-primitives";

export type AspirationCompaniesScreenState = "populated" | "empty" | "no_signal" | "review";

function CompanyCard({
  title,
  reason,
  note,
  draft = false,
}: {
  title: string;
  reason: string;
  note: string;
  draft?: boolean;
}) {
  const { T } = useTheme();
  return (
    <div style={{ background: T.base, border: `1px solid ${draft ? T.aStroke : T.s1}`, borderRadius: T.r2, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <div>
          <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{title}</p>
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{reason}</p>
        </div>
        <ScreenBadge label={draft ? "Draft suggestion" : "Saved"} tone={draft ? "warning" : "success"} />
      </div>
      <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t1, lineHeight: 1.55, margin: "0 0 10px" }}>{note}</p>
      <div style={{ display: "flex", gap: 8 }}>
        <ScreenButton label={draft ? "Accept" : "Edit"} kind={draft ? "primary" : "secondary"} compact />
        <ScreenButton label={draft ? "Discard" : "Remove"} kind="ghost" compact />
      </div>
    </div>
  );
}

function CompaniesDesktopContent({ state }: { state: AspirationCompaniesScreenState }) {
  const { T } = useTheme();
  const isEmpty = state === "empty";
  const isNoSignal = state === "no_signal";
  const isReview = state === "review";

  return (
    <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
        <div>
          <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>FLAGSHIP · PROFILE & ASPIRATIONS</p>
          <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Aspirations</h1>
          <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, lineHeight: 1.65, margin: "0 0 12px" }}>
            Track the companies and employers you want Baldin to prioritize in your search.
          </p>
          <RouteTabs active="companies" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <ScreenBadge label={isReview ? "3 suggestion drafts" : "Company route"} tone={isReview ? "warning" : "accent"} />
          <div style={{ display: "flex", gap: 8 }}>
            <ScreenButton label="Add company" />
            <ScreenButton label="Suggest from profile" kind="secondary" />
          </div>
        </div>
      </div>

      {isNoSignal && (
        <ScreenCallout
          title="No strong company signals found"
          body="Add more detail to your resume, headline, or work history and try again. Suggestions stay private until you save them."
          tone="warning"
          action={<ScreenButton label="Edit profile" kind="secondary" compact />}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <ScreenSearch label="Search company aspirations" />
        <ScreenTag label="/me/aspirations/companies" tone="neutral" />
        <ScreenTag label="Private-by-default" tone="skill" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <ScreenMetric label="Saved companies" value={isEmpty || isNoSignal ? "0" : "5"} tone={isEmpty || isNoSignal ? "warning" : "accent"} />
        <ScreenMetric label="High-priority targets" value={isReview ? "0" : isEmpty || isNoSignal ? "0" : "3"} tone={isReview ? "warning" : "info"} />
        <ScreenMetric label="Suggestion drafts" value={isReview ? "3" : "0"} tone={isReview ? "warning" : "neutral"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 16, alignItems: "start" }}>
        <ScreenPanel kicker="Saved company direction" title={isReview ? "Suggestion review" : "Company aspirations"}>
          {isEmpty ? (
            <div style={{ padding: "26px 22px", background: T.base, border: `1px dashed ${T.s1}`, borderRadius: T.r2 }}>
              <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 18, color: T.t0, margin: "0 0 6px", letterSpacing: "-0.01em" }}>No company aspirations yet</p>
              <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, lineHeight: 1.65, margin: "0 0 14px" }}>
                Track the companies and employers you want Baldin to prioritize in your search.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <ScreenButton label="Suggest from profile" />
                <ScreenButton label="Add first company" kind="secondary" />
              </div>
            </div>
          ) : isNoSignal ? (
            <div style={{ padding: "20px 22px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
              <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 17, color: T.t0, margin: "0 0 6px", letterSpacing: "-0.01em" }}>Company suggestions need more signal</p>
              <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, lineHeight: 1.65, margin: 0 }}>
                Add more profile detail first, or save companies manually if you already know which employers should shape the search.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {(isReview
                ? [
                    {
                      title: "Notion",
                      reason: "Strong fit with your systems-thinking direction and writing-heavy product workflow surfaces.",
                      note: "Draft only. Accept to make this employer visible to ranking and apply handoff.",
                      draft: true,
                    },
                    {
                      title: "Figma",
                      reason: "Design-language and reusable component work appear repeatedly across your saved story blocks.",
                      note: "Useful when the target company set should emphasize library and systems craft.",
                      draft: true,
                    },
                    {
                      title: "Stripe",
                      reason: "Platform depth and operational polish align with the current flagship direction.",
                      note: "Draft suggestion grounded in calm control-surface and platform-oriented product work.",
                      draft: true,
                    },
                  ]
                : [
                    {
                      title: "Notion",
                      reason: "Primary target because product-platform craft and operator surfaces both fit the current story.",
                      note: "Pinned so leads and applications can stay grounded in a coherent company direction.",
                    },
                    {
                      title: "Figma",
                      reason: "Strong secondary target for design systems and library governance work.",
                      note: "Keeps the search anchored in reusable UI systems, design language, and shared component craft.",
                    },
                    {
                      title: "Stripe",
                      reason: "Platform-focused operating rhythm and precision fit the current direction.",
                      note: "Useful when the company set should include calm, high-signal product infrastructure environments.",
                    },
                    {
                      title: "Linear",
                      reason: "Operational clarity and dense product tooling make it a useful stretch target.",
                      note: "Adds an intentionally narrow company target that still aligns with the flagship narrative.",
                    },
                  ]).map((item) => (
                <CompanyCard key={item.title} {...item} />
              ))}
            </div>
          )}
        </ScreenPanel>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ScreenPanel
            kicker="Collection guidance"
            title={isReview ? "Suggestions stay private until saved" : "How this route shapes the search"}
            aside={isReview ? <ScreenButton label="Accept all" compact /> : undefined}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <ScreenCallout
                title={isReview ? "Review before promoting" : "Company direction is upstream"}
                body={isReview
                  ? "Draft suggestions do not affect ranking until you accept them. Keep only the employers you genuinely want Baldin to prioritize."
                  : "Saved companies help Baldin rank opportunities, shape how aspiration-fit copy reads, and keep apply handoff grounded in the search you actually want."}
                tone={isReview ? "warning" : "info"}
              />
              <div style={{ background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2, padding: "12px 14px" }}>
                <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Grounded rules</p>
                <div style={{ display: "grid", gap: 8 }}>
                  {[
                    "Keep the list employer-specific and candidate-side.",
                    "Use rationale to explain why the company belongs in the aspiration set.",
                    "Treat suggestions as optional drafts that need human review.",
                  ].map((item) => (
                    <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <div style={{ width: 5, height: 5, borderRadius: T.rFull, background: T.accent, marginTop: 6, flexShrink: 0 }} />
                      <span style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScreenPanel>
        </div>
      </div>
    </div>
  );
}

function CompaniesMobileContent({ state }: { state: AspirationCompaniesScreenState }) {
  const { T } = useTheme();
  const isEmpty = state === "empty";
  const isNoSignal = state === "no_signal";
  const isReview = state === "review";

  return (
    <PhoneFrame routeLabel="/me/aspirations/companies" title="Company Aspirations" activeLabel="Aspirations">
      <RouteTabs active="companies" />
      {isNoSignal && (
        <ScreenCallout
          title="No strong company signals found"
          body="Add more detail to your resume, headline, or work history and try again."
          tone="warning"
        />
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <ScreenMetric label="Saved companies" value={isEmpty || isNoSignal ? "0" : "5"} tone={isEmpty || isNoSignal ? "warning" : "accent"} />
        <ScreenMetric label="Drafts" value={isReview ? "3" : "0"} tone={isReview ? "warning" : "neutral"} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <ScreenButton label="Add company" />
        <ScreenButton label="Suggest" kind="secondary" />
      </div>
      <ScreenSearch label="Search companies" />
      <ScreenPanel kicker="State-complete mobile" title={isEmpty ? "No company aspirations yet" : isReview ? "Suggestion review" : "Saved company direction"}>
        {isEmpty ? (
          <>
            <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.65, margin: "0 0 12px" }}>
              Track the companies and employers you want Baldin to prioritize in your search.
            </p>
            <ScreenButton label="Suggest from profile" />
          </>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {(isReview
              ? [
                  {
                    title: "Notion",
                    reason: "Strong systems-thinking and operator-surface fit.",
                    note: "Draft only until you accept it.",
                    draft: true,
                  },
                  {
                    title: "Figma",
                    reason: "Library and design-language direction map cleanly here.",
                    note: "Keep only the employers you actually want Baldin to prioritize.",
                    draft: true,
                  },
                ]
              : [
                  {
                    title: "Notion",
                    reason: "Primary flagship target.",
                    note: "Keeps ranking and apply handoff grounded.",
                  },
                  {
                    title: "Stripe",
                    reason: "Platform-oriented stretch target.",
                    note: "Useful when the company set needs stronger operational depth.",
                  },
                ]).map((item) => (
              <CompanyCard key={item.title} {...item} />
            ))}
          </div>
        )}
      </ScreenPanel>
    </PhoneFrame>
  );
}

export function AspirationCompaniesScreen({
  state = "populated",
  mobile = false,
}: {
  state?: AspirationCompaniesScreenState;
  mobile?: boolean;
}) {
  return mobile ? <CompaniesMobileContent state={state} /> : <CompaniesDesktopContent state={state} />;
}
