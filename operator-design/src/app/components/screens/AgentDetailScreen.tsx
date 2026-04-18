import { useTheme } from "../ThemeContext";
import {
  ScreenBadge,
  ScreenButton,
  ScreenCallout,
  ScreenDialog,
  ScreenField,
  ScreenPanel,
  ScreenTag,
} from "./flagship-primitives";

export type AgentDetailScreenState = "populated" | "empty" | "warning" | "mutation";

const RUNS = [
  { id: "r1", when: "28m ago", status: "Completed", session: "run-113", version: "v4", note: "Workspace draft saved to /workspace/cover-letter-42" },
  { id: "r2", when: "Yesterday", status: "Failed", session: "run-109", version: "v4", note: "error_summary visible on hover in product" },
];

const CHATS = [
  { id: "c1", title: "Stripe follow-up notes", state: "Active", count: "12 messages", note: "Last active 2h ago", app: "Application 412" },
  { id: "c2", title: "Warm intro rehearsal", state: "Archived", count: "4 messages", note: "Last active Apr 15", app: "" },
];

export function AgentDetailScreen({
  state = "populated",
}: {
  state?: AgentDetailScreenState;
  mobile?: boolean;
}) {
  const { T } = useTheme();
  const empty = state === "empty";
  const warning = state === "warning";
  const mutation = state === "mutation";

  return (
    <div style={{ position: "relative", height: "100%", background: T.bg }}>
      <div style={{ height: "100%", overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
          <div>
            <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>AUTOMATION / AGENT DETAIL</p>
            <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
              {empty ? "Agent not found" : "Interview Follow-Up"}
            </h1>
            <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, lineHeight: 1.65, margin: 0, maxWidth: 760 }}>
              {empty
                ? "The empty state can mean the definition no longer exists. Keep the failure direct instead of replacing it with a generic agent landing page."
                : "Agent detail keeps configuration, run history, and chat sessions together so the operator can inspect how a reusable definition behaves before opening a live conversation."}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <ScreenBadge label={empty ? "Agent empty" : warning ? "Warning state" : mutation ? "Mutation state" : "Populated detail"} tone={warning || mutation ? "warning" : "accent"} />
            {!empty && (
              <div style={{ display: "flex", gap: 8 }}>
                <ScreenButton label="New chat" />
                <ScreenButton label="Edit agent" kind="secondary" />
              </div>
            )}
          </div>
        </div>

        {empty ? (
          <ScreenCallout
            title="This agent may have been deleted."
            body="The route should not pretend the agent still exists. Keep the missing-definition state plain and direct."
            tone="error"
          />
        ) : warning ? (
          <ScreenCallout
            title="Unable to load chat sessions"
            body="Run history and configuration can still be visible while chat sessions fail independently. Failed runs remain a cue, not a takeover."
            tone="warning"
          />
        ) : mutation ? (
          <ScreenCallout
            title="Create chat, archive, and rerun stay explicit"
            body="Mutations should preserve model, instructions, and prior run evidence in the background."
            tone="warning"
          />
        ) : (
          <ScreenCallout
            title="Default uses GPT-5.4 Nano (Fast)."
            body="Configuration helper copy belongs directly on the detail route so model choice stays legible before a run or chat starts."
            tone="info"
          />
        )}

        {!empty && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ScreenTag label="Follow-Up Planner" tone="info" />
            <ScreenTag label="Enabled" tone="success" />
            <ScreenTag label="/automation/agents/:agentId" tone="neutral" />
          </div>
        )}

        {!empty && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)", gap: 16, alignItems: "start" }}>
            <div style={{ display: "grid", gap: 16 }}>
              <ScreenPanel kicker="Configuration" title="Agent summary">
                <div style={{ display: "grid", gap: 10 }}>
                  <ScreenField label="Description" value="Prepares concise follow-up plans after calls and onsites while keeping send-ready copy separate from supporting evidence." multiline />
                  <ScreenField label="Instructions" value="Work from the current application, attached workspace evidence, and the operator's explicit follow-up goal." multiline />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <ScreenField label="Model" value="Default uses GPT-5.4 Nano (Fast)." />
                    <ScreenField label="Updated" value="Today · 2h ago" />
                  </div>
                </div>
              </ScreenPanel>

              <ScreenPanel kicker="Run history" title={warning ? "Run history with failed-run cue" : "Recent runs"}>
                {RUNS.map((run) => (
                  <div key={run.id} style={{ padding: "12px 0", borderBottom: `1px solid ${T.s0}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: 0, letterSpacing: "-0.01em" }}>{run.when}</p>
                        <ScreenTag label={run.status} tone={run.status === "Failed" ? "warning" : "success"} />
                        <ScreenTag label={run.session} tone="neutral" />
                        <ScreenTag label={run.version} tone="skill" />
                      </div>
                      <ScreenButton label={run.status === "Completed" ? "Rerun" : "Inspect"} kind="secondary" compact />
                    </div>
                    <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{run.note}</p>
                  </div>
                ))}
              </ScreenPanel>
            </div>

            <ScreenPanel kicker="Chat sessions" title={warning ? "Sessions failed independently" : empty ? "No chat sessions" : "Active and archived chats"}>
              {warning ? (
                <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
                  Unable to load chat sessions should not hide configuration or run history.
                </p>
              ) : (
                <div style={{ display: "grid" }}>
                  {CHATS.map((chat) => (
                    <div key={chat.id} style={{ padding: "12px 0", borderBottom: `1px solid ${T.s0}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                        <div>
                          <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{chat.title}</p>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <ScreenTag label={chat.state} tone={chat.state === "Archived" ? "neutral" : "success"} />
                            <ScreenTag label={chat.count} tone="info" />
                            {chat.app && <ScreenTag label={chat.app} tone="skill" />}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <ScreenButton label={chat.state === "Archived" ? "Restore" : "Archive"} kind="secondary" compact />
                          <ScreenButton label="Delete" kind="ghost" compact tone="error" />
                        </div>
                      </div>
                      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{chat.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScreenPanel>
          </div>
        )}

        {empty && (
          <ScreenPanel kicker="Quiet follow-on state" title="No runs yet / Start a conversation with this agent">
            <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 12px" }}>
              The detail route also owns quiet sections for `No runs yet` and `Start a conversation with this agent`. They should read as straightforward next steps, not as missing product capability.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <ScreenButton label="Back to agents" kind="secondary" compact />
              <ScreenButton label="Create chat session" compact />
            </div>
          </ScreenPanel>
        )}
      </div>

      {mutation && !empty && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5,10,18,0.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <ScreenDialog
            title="Create chat session"
            subtitle="Session creation should keep the agent identity, configuration, and prior run context visible."
            footer={(
              <>
                <ScreenButton label="Cancel" kind="ghost" />
                <ScreenButton label="Creating..." />
              </>
            )}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <ScreenField label="Title" value="Stripe follow-up notes" />
              <ScreenField label="Application" value="Application 412" />
              <ScreenCallout
                title="Archive, restore, delete, and rerun are sibling mutations"
                body="All of them stay scoped to the current agent detail surface."
                tone="info"
              />
            </div>
          </ScreenDialog>
        </div>
      )}
    </div>
  );
}
