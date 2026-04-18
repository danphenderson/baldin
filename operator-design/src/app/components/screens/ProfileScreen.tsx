import { useTheme } from "../ThemeContext";
import {
  PhoneFrame,
  ScreenBadge,
  ScreenButton,
  ScreenCallout,
  ScreenDialog,
  ScreenField,
  ScreenMetric,
  ScreenPanel,
  ScreenTag,
} from "./flagship-primitives";

export type ProfileScreenState = "populated" | "warning" | "edit";

function DirectionTheme({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const { T } = useTheme();
  return (
    <div style={{ background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2, padding: "12px 14px" }}>
      <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{title}</p>
      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{body}</p>
    </div>
  );
}

function StoryBlock({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const { T } = useTheme();
  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${T.s0}` }}>
      <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{title}</p>
      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 8px" }}>{body}</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <ScreenTag label="Reusable proof" tone="skill" />
        <ScreenTag label="Apply handoff" tone="accent" />
      </div>
    </div>
  );
}

function AspirationPreview({
  title,
  items,
  emptyTitle,
  emptyBody,
  buttonLabel,
}: {
  title: string;
  items: string[];
  emptyTitle: string;
  emptyBody: string;
  buttonLabel: string;
}) {
  const { T } = useTheme();
  const isEmpty = items.length === 0;
  return (
    <div style={{ background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2, padding: "12px 14px" }}>
      <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 10px" }}>{title}</p>
      {isEmpty ? (
        <>
          <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{emptyTitle}</p>
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 12px" }}>{emptyBody}</p>
          <ScreenButton label={buttonLabel} kind="secondary" />
        </>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {items.map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 5, height: 5, borderRadius: T.rFull, background: T.accent, flexShrink: 0 }} />
                <span style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t0 }}>{item}</span>
              </div>
            ))}
          </div>
          <ScreenButton label={buttonLabel} kind="secondary" />
        </>
      )}
    </div>
  );
}

function ProfileDesktopContent({ state }: { state: ProfileScreenState }) {
  const { T } = useTheme();
  const incomplete = state === "warning";

  return (
    <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
        <div>
          <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>FLAGSHIP · PROFILE & ASPIRATIONS</p>
          <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Profile & Aspirations</h1>
          <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, margin: 0, lineHeight: 1.65, maxWidth: 560 }}>
            {incomplete
              ? "Set the direction Baldin should optimize toward before ranking leads or drafting application handoff."
              : "Keep direction, proof points, and aspiration handoff aligned before you rank leads."}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <ScreenBadge label={incomplete ? "Build profile basics" : "Direction visible"} tone={incomplete ? "warning" : "accent"} />
          <div style={{ display: "flex", gap: 8 }}>
            <ScreenButton label={incomplete ? "Finish profile" : "Review role aspirations"} />
            <ScreenButton label={incomplete ? "Add first skill" : "Review company aspirations"} kind="secondary" />
          </div>
        </div>
      </div>

      <ScreenCallout
        title={incomplete ? "Complete your basic profile info" : "Direction stays visible on /me"}
        body={incomplete
          ? "Add your name, one skill, and one experience so aspiration suggestions and lead ranking have enough signal to work with."
          : "This hub keeps profile direction, aspiration previews, and reusable career proof points in one place before the rest of the flagship journey consumes them."}
        tone={incomplete ? "warning" : "info"}
        action={<ScreenButton label={incomplete ? "Edit profile" : "Open leads"} kind="secondary" compact />}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { label: "Role tracks", value: incomplete ? "0" : "3", tone: incomplete ? "warning" : "accent", note: incomplete ? "Add at least one target role" : "Systems, platform, staff IC" },
          { label: "Company targets", value: incomplete ? "0" : "5", tone: incomplete ? "warning" : "skill", note: incomplete ? "None pinned yet" : "Prioritized for ranking" },
          { label: "Direction themes", value: incomplete ? "1" : "4", tone: "info", note: incomplete ? "Only a headline is present" : "Reusable focus signals" },
          { label: "Story blocks", value: incomplete ? "0" : "3", tone: incomplete ? "neutral" : "success", note: incomplete ? "No reusable proof yet" : "Ready for applications" },
        ].map((item) => (
          <ScreenMetric key={item.label} {...item} />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.95fr", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ScreenPanel kicker="Direction themes" title={incomplete ? "Profile signal is still thin" : "Direction themes"}>
            {incomplete ? (
              <div style={{ display: "grid", gap: 10 }}>
                <DirectionTheme title="Complete profile basics" body="Add name, one skill, and one experience so Baldin can describe your direction with more confidence." />
                <DirectionTheme title="Start with one role aspiration" body="Pin a target title first. Company targets and story blocks become more useful once that direction is visible." />
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <DirectionTheme title="Product-platform systems" body="Position the profile around operating-system thinking, reusable design language, and product surfaces that scale cleanly." />
                <DirectionTheme title="Human-centered operations" body="Keep the candidate-as-person story legible while the rest of the workspace stays dense and operational." />
              </div>
            )}
          </ScreenPanel>

          <ScreenPanel kicker={incomplete ? "Completion checklist" : "Career story blocks"} title={incomplete ? "Build the upstream profile" : "Career story blocks"}>
            {incomplete ? (
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  "Complete your basic profile info",
                  "Add your first skill",
                  "Add one work experience",
                ].map((item, index) => (
                  <div key={item} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${T.s0}` }}>
                    <div style={{ width: 22, height: 22, borderRadius: T.rFull, background: T.warnDim, border: `1px solid ${T.warning}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.warning }}>{index + 1}</span>
                    </div>
                    <div>
                      <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{item}</p>
                      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>Each step increases the quality of saved aspirations, ranked leads, and application-ready story handoff.</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 0 }}>
                <StoryBlock title="Scaled a design-system migration" body="Turned a mixed MUI shell into a reusable pattern layer without losing feature ownership boundaries." />
                <StoryBlock title="Made operational UI feel human" body="Balanced dense control-surface chrome with readable profile and messaging surfaces that keep the candidate story intact." />
              </div>
            )}
          </ScreenPanel>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ScreenPanel
            kicker="Aspirations handoff"
            title="Role and company direction"
            aside={<ScreenBadge label={incomplete ? "Needs setup" : "Ready for ranking"} tone={incomplete ? "warning" : "success"} />}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <AspirationPreview
                title="Roles"
                items={incomplete ? [] : ["Staff Product Designer", "Design Systems Lead"]}
                emptyTitle="No role direction yet"
                emptyBody="Start with one or two titles that describe the move you want Baldin to optimize toward."
                buttonLabel={incomplete ? "Start role aspirations" : "Open role aspirations"}
              />
              <AspirationPreview
                title="Companies"
                items={incomplete ? [] : ["Notion", "Figma", "Stripe"]}
                emptyTitle="No company list yet"
                emptyBody="Add target employers so ranking and apply handoff stay grounded in the search you actually want."
                buttonLabel={incomplete ? "Start company aspirations" : "Open company aspirations"}
              />
            </div>
            <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
              Saved aspirations stay in their own routes, but this hub keeps the roles-and-companies handoff visible in the flagship direction-setting surface.
            </p>
          </ScreenPanel>

          <ScreenPanel kicker="What this drives next" title="Operational follow-on routes">
            <div style={{ display: "grid", gap: 10 }}>
              <DirectionTheme title="Leads ranking" body="Use saved aspirations to prioritize the most aligned roles and companies before you spend effort on detailed review." />
              <DirectionTheme title="Application handoff" body="Keep your story blocks and target list coherent so application starts inherit the same direction-setting context." />
            </div>
          </ScreenPanel>
        </div>
      </div>
    </div>
  );
}

function ProfileMobileContent({ state }: { state: ProfileScreenState }) {
  const { T } = useTheme();
  const incomplete = state === "warning";

  return (
    <PhoneFrame routeLabel="/me" title="Profile & Aspirations" activeLabel="Profile">
      <ScreenBadge label={incomplete ? "Build profile basics" : "Direction visible"} tone={incomplete ? "warning" : "accent"} />

      <ScreenCallout
        title={incomplete ? "Complete the basics first" : "This page sets direction"}
        body={incomplete
          ? "Add your name, one skill, and one experience so Baldin can generate better suggestions."
          : "Profile direction, aspiration previews, and reusable proof points stay visible here before the rest of the journey consumes them."}
        tone={incomplete ? "warning" : "info"}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <ScreenMetric label="Role tracks" value={incomplete ? "0" : "3"} tone={incomplete ? "warning" : "accent"} />
        <ScreenMetric label="Company targets" value={incomplete ? "0" : "5"} tone={incomplete ? "warning" : "skill"} />
      </div>

      <ScreenPanel kicker="Hero" title={incomplete ? "Set the direction Baldin should optimize toward" : "Jordan Kim"}>
        <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.65, margin: "0 0 10px" }}>
          {incomplete
            ? "The flagship hub stays useful on mobile, but direction-setting still depends on a complete basic profile."
            : "Targeting systems and platform roles with a strong preference for calm, human-centered operational surfaces."}
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(incomplete ? ["Needs profile", "No story blocks"] : ["Design Systems", "Platform", "Writing"]).map((tag) => (
            <ScreenTag key={tag} label={tag} tone={incomplete ? "warning" : "skill"} />
          ))}
        </div>
      </ScreenPanel>

      <ScreenPanel kicker="Aspirations handoff" title="Keep roles and companies connected">
        <div style={{ display: "grid", gap: 10 }}>
          <AspirationPreview
            title="Roles"
            items={incomplete ? [] : ["Staff Product Designer"]}
            emptyTitle="No role direction yet"
            emptyBody="Start with one title to make ranking and suggestion flows more specific."
            buttonLabel={incomplete ? "Start roles" : "Open roles"}
          />
          <AspirationPreview
            title="Companies"
            items={incomplete ? [] : ["Notion", "Figma"]}
            emptyTitle="No company list yet"
            emptyBody="Add a few employers so the rest of the flagship journey stays grounded."
            buttonLabel={incomplete ? "Start companies" : "Open companies"}
          />
        </div>
      </ScreenPanel>
    </PhoneFrame>
  );
}

export function ProfileScreen({
  state = "populated",
  mobile = false,
}: {
  state?: ProfileScreenState;
  mobile?: boolean;
}) {
  const { T } = useTheme();

  if (mobile) {
    return (
      <div style={{ position: "relative" }}>
        <ProfileMobileContent state={state} />
        {state === "edit" && (
          <div style={{ position: "absolute", inset: 0, borderRadius: 28, background: "rgba(5,10,18,0.52)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 14 }}>
            <ScreenDialog
              title="Edit profile"
              subtitle="Save the basics that shape aspirations, ranking, and application-ready story handoff."
              footer={(
                <>
                  <ScreenButton label="Cancel" kind="ghost" />
                  <ScreenButton label="Saving…" />
                </>
              )}
            >
              <div style={{ display: "grid", gap: 10 }}>
                <ScreenField label="Headline" value="Staff product designer focused on design systems, platform, and calm operator tooling." multiline />
                <ScreenField label="Location" value="San Francisco, CA · Hybrid" />
              </div>
            </ScreenDialog>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <ProfileDesktopContent state={state} />
      {state === "edit" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5,10,18,0.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <ScreenDialog
            title="Edit profile"
            subtitle="Save the basics that shape aspiration suggestions, ranking, and application-ready story handoff."
            footer={(
              <>
                <ScreenButton label="Cancel" kind="ghost" />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: T.rFull, background: T.accent }} />
                  <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2 }}>Mutation state</span>
                </div>
                <ScreenButton label="Saving profile…" />
              </>
            )}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <ScreenField label="First name" value="Jordan" />
                <ScreenField label="Last name" value="Kim" />
              </div>
              <ScreenField label="Headline" value="Staff product designer focused on design systems, platform, and calm operator tooling." multiline />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <ScreenField label="Location" value="San Francisco, CA · Hybrid" />
                <ScreenField label="Time zone" value="America/Los_Angeles" />
              </div>
            </div>
          </ScreenDialog>
        </div>
      )}
    </div>
  );
}
