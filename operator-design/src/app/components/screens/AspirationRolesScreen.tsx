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

export type AspirationRolesScreenState = "populated" | "empty" | "no_signal" | "review";

function RoleCard({
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

function RolesDesktopContent({ state }: { state: AspirationRolesScreenState }) {
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
            Track the job titles and role profiles you want Baldin to optimize for.
          </p>
          <RouteTabs active="roles" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <ScreenBadge label={isReview ? "3 suggestion drafts" : "Role route"} tone={isReview ? "warning" : "accent"} />
          <div style={{ display: "flex", gap: 8 }}>
            <ScreenButton label="Add role" />
            <ScreenButton label="Suggest from profile" kind="secondary" />
          </div>
        </div>
      </div>

      {isNoSignal && (
        <ScreenCallout
          title="No strong role signals found"
          body="Add more detail to your resume, headline, or work history and try again. Suggestions stay private until you save them."
          tone="warning"
          action={<ScreenButton label="Edit profile" kind="secondary" compact />}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <ScreenSearch label="Search role aspirations" />
        <ScreenTag label="/me/aspirations/roles" tone="neutral" />
        <ScreenTag label="Private-by-default" tone="skill" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <ScreenMetric label="Saved roles" value={isEmpty || isNoSignal ? "0" : "3"} tone={isEmpty || isNoSignal ? "warning" : "accent"} />
        <ScreenMetric label="With rationale" value={isReview ? "0" : isEmpty || isNoSignal ? "0" : "2"} tone={isReview ? "warning" : "info"} />
        <ScreenMetric label="Suggestion drafts" value={isReview ? "3" : "0"} tone={isReview ? "warning" : "neutral"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 16, alignItems: "start" }}>
        <ScreenPanel kicker="Saved role direction" title={isReview ? "Suggestion review" : "Role aspirations"}>
          {isEmpty ? (
            <div style={{ padding: "26px 22px", background: T.base, border: `1px dashed ${T.s1}`, borderRadius: T.r2 }}>
              <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 18, color: T.t0, margin: "0 0 6px", letterSpacing: "-0.01em" }}>No role aspirations yet</p>
              <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, lineHeight: 1.65, margin: "0 0 14px" }}>
                Track the job titles and role profiles you want Baldin to optimize for.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <ScreenButton label="Suggest from profile" />
                <ScreenButton label="Add first role" kind="secondary" />
              </div>
            </div>
          ) : isNoSignal ? (
            <div style={{ padding: "20px 22px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
              <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 17, color: T.t0, margin: "0 0 6px", letterSpacing: "-0.01em" }}>Suggestions need more profile signal</p>
              <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, lineHeight: 1.65, margin: 0 }}>
                This route stays ready for manual role entry, but the suggestion flow depends on richer headline, resume, or work-history context.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {(isReview
                ? [
                    {
                      title: "Staff Product Designer",
                      reason: "Strong systems and product-platform signal across your saved profile direction.",
                      note: "Draft only. Accept to make this role visible to ranking and application handoff.",
                      draft: true,
                    },
                    {
                      title: "Design Systems Lead",
                      reason: "Reusable design-language work and governance language appear repeatedly in your profile story.",
                      note: "Useful when you want Baldin to prioritize cross-product systems scope.",
                      draft: true,
                    },
                    {
                      title: "Product Platform Designer",
                      reason: "Your current story blocks emphasize shared tooling and internal platform enablement.",
                      note: "Draft suggestion anchored in workflow, library, and operator-surface themes.",
                      draft: true,
                    },
                  ]
                : [
                    {
                      title: "Staff Product Designer",
                      reason: "Primary flagship direction for systems and product-platform work.",
                      note: "Used by ranking to keep the search focused on calm operator tooling and reusable UI systems.",
                    },
                    {
                      title: "Design Systems Lead",
                      reason: "Secondary track for library, governance, and design-language ownership.",
                      note: "Useful when a role leans more toward foundations and cross-product consistency than end-user feature execution.",
                    },
                    {
                      title: "Product Platform Designer",
                      reason: "Exploratory route for tooling that supports many internal teams at once.",
                      note: "Keeps the aspiration set broad enough to capture platform-facing openings without losing systems fit.",
                    },
                  ]).map((item) => (
                <RoleCard key={item.title} {...item} />
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
                title={isReview ? "Review before promoting" : "Role direction is upstream"}
                body={isReview
                  ? "Draft suggestions do not affect ranking until you accept them. Keep only the titles you want Baldin to optimize toward."
                  : "Saved roles define how Baldin ranks opportunities, frames application-ready story blocks, and explains why a lead is a strong fit."}
                tone={isReview ? "warning" : "info"}
              />
              <div style={{ background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2, padding: "12px 14px" }}>
                <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Grounded rules</p>
                <div style={{ display: "grid", gap: 8 }}>
                  {[
                    "Keep titles candidate-side and specific to the move you want.",
                    "Use rationale to explain why the role belongs in the aspiration set.",
                    "Treat suggestions as optional drafts, not truth from the system.",
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

function RolesMobileContent({ state }: { state: AspirationRolesScreenState }) {
  const { T } = useTheme();
  const isEmpty = state === "empty";
  const isNoSignal = state === "no_signal";
  const isReview = state === "review";

  return (
    <PhoneFrame routeLabel="/me/aspirations/roles" title="Role Aspirations" activeLabel="Aspirations">
      <RouteTabs active="roles" />
      {isNoSignal && (
        <ScreenCallout
          title="No strong role signals found"
          body="Add more detail to your resume, headline, or work history and try again."
          tone="warning"
        />
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <ScreenMetric label="Saved roles" value={isEmpty || isNoSignal ? "0" : "3"} tone={isEmpty || isNoSignal ? "warning" : "accent"} />
        <ScreenMetric label="Drafts" value={isReview ? "3" : "0"} tone={isReview ? "warning" : "neutral"} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <ScreenButton label="Add role" />
        <ScreenButton label="Suggest" kind="secondary" />
      </div>
      <ScreenSearch label="Search roles" />
      <ScreenPanel kicker="State-complete mobile" title={isEmpty ? "No role aspirations yet" : isReview ? "Suggestion review" : "Saved role direction"}>
        {isEmpty ? (
          <>
            <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.65, margin: "0 0 12px" }}>
              Track the job titles and role profiles you want Baldin to optimize for.
            </p>
            <ScreenButton label="Suggest from profile" />
          </>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {(isReview
              ? [
                  {
                    title: "Staff Product Designer",
                    reason: "Systems and platform signal appear repeatedly in the profile direction.",
                    note: "Draft only until you accept it.",
                    draft: true,
                  },
                  {
                    title: "Design Systems Lead",
                    reason: "Library and governance work read as a strong secondary path.",
                    note: "Keep only the titles you want ranking to consume.",
                    draft: true,
                  },
                ]
              : [
                  {
                    title: "Staff Product Designer",
                    reason: "Primary flagship direction.",
                    note: "Keeps ranking and application handoff aligned.",
                  },
                  {
                    title: "Product Platform Designer",
                    reason: "Exploratory platform-facing route.",
                    note: "Broadens the role set without losing systems fit.",
                  },
                ]).map((item) => (
              <RoleCard key={item.title} {...item} />
            ))}
          </div>
        )}
      </ScreenPanel>
    </PhoneFrame>
  );
}

export function AspirationRolesScreen({
  state = "populated",
  mobile = false,
}: {
  state?: AspirationRolesScreenState;
  mobile?: boolean;
}) {
  return mobile ? <RolesMobileContent state={state} /> : <RolesDesktopContent state={state} />;
}
