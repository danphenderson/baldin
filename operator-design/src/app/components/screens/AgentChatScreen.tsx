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

export type AgentChatScreenState = "populated" | "empty" | "archived" | "mutation";

function MessageBubble({
  role,
  body,
  sources,
  warning,
}: {
  role: "user" | "assistant";
  body: string;
  sources?: string[];
  warning?: string;
}) {
  const { T } = useTheme();
  const assistant = role === "assistant";
  return (
    <div style={{ display: "grid", gap: 10, justifyItems: assistant ? "stretch" : "end" }}>
      <div
        style={{
          maxWidth: assistant ? "100%" : "82%",
          padding: "14px 16px",
          background: assistant ? T.base : T.accentDim,
          border: `1px solid ${assistant ? T.s1 : T.aStroke}`,
          borderRadius: T.r3,
        }}
      >
        <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, lineHeight: 1.7, margin: 0 }}>{body}</p>
      </div>
      {assistant && sources && (
        <div style={{ padding: "11px 12px", background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
          <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>Sources</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: warning ? 8 : 0 }}>
            {sources.map((source) => (
              <ScreenTag key={source} label={source} tone="skill" />
            ))}
          </div>
          {warning && <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.warning, lineHeight: 1.6, margin: 0 }}>{warning}</p>}
        </div>
      )}
    </div>
  );
}

export function AgentChatScreen({
  state = "populated",
}: {
  state?: AgentChatScreenState;
  mobile?: boolean;
}) {
  const { T } = useTheme();
  const empty = state === "empty";
  const archived = state === "archived";
  const mutation = state === "mutation";

  return (
    <div style={{ position: "relative", height: "100%", background: T.bg }}>
      <div style={{ height: "100%", overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
          <div>
            <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>AUTOMATION / AGENT CHAT</p>
            <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Stripe follow-up notes</h1>
            <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, lineHeight: 1.65, margin: 0, maxWidth: 760 }}>
              The chat route is the clearest shipped provenance surface in automation. Context, citations, warnings, and save-to-document stay visible instead of dissolving into a generic chat shell.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <ScreenBadge label={empty ? "Empty thread" : archived ? "Archived state" : mutation ? "Sending / saving" : "Cited thread"} tone={archived || mutation ? "warning" : "accent"} />
            <div style={{ display: "flex", gap: 8 }}>
              <ScreenButton label="Save as Document" kind="secondary" />
              <ScreenButton label="Edit title" kind="ghost" />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ScreenTag label="Active" tone={archived ? "neutral" : "success"} />
          <ScreenTag label="Model: GPT-5.4 Nano" tone="info" />
          <ScreenTag label="Application 412" tone="skill" />
          <ScreenTag label="/automation/agents/:agentId/chat/:sessionId" tone="neutral" />
        </div>

        {archived ? (
          <ScreenCallout
            title="This chat session is archived. Restore it from the agent detail page to continue."
            body="Archived sessions become read-only, but context, citations, and prior messages stay visible."
            tone="warning"
          />
        ) : empty ? (
          <ScreenCallout
            title="The chat is ready. Send the first message to start the conversation."
            body="The empty thread should still show model, application, source controls, and context framing."
            tone="info"
          />
        ) : mutation ? (
          <ScreenCallout
            title="Thinking... and save-document states stay in-route"
            body="Sending, cancelling, and Chat saved as a document should all feel like mutations on this same cited thread."
            tone="warning"
          />
        ) : (
          <ScreenCallout
            title="Sources and warnings belong with the answer"
            body="Citations, retrieval warnings, and the collapsible system context make this route feel grounded rather than theatrical."
            tone="info"
          />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.06fr) minmax(320px, 0.94fr)", gap: 16, alignItems: "start" }}>
          <ScreenPanel kicker="Thread" title={empty ? "No messages yet" : "Conversation"}>
            {empty ? (
              <div style={{ padding: "28px", background: T.base, border: `1px dashed ${T.s1}`, borderRadius: T.r3 }}>
                <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 18, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.01em" }}>The chat is ready.</p>
                <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
                  Send the first message to start the conversation.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <MessageBubble role="user" body="Draft a concise follow-up that mentions the systems migration story and one concrete proof point." />
                <MessageBubble
                  role="assistant"
                  body="Here is a tight follow-up draft. It mentions the systems migration, keeps the tone specific, and points back to the strongest portfolio evidence instead of repeating the entire resume."
                  sources={["workspace://documents/platform-resume-v8", "url://figma.com/company"]}
                  warning={mutation ? "Loading more chat history..." : "via workspace search and url fetch"}
                />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <ScreenTag label="Latest" tone="info" />
                  {mutation && <ScreenTag label="Thinking..." tone="warning" />}
                  {mutation && <ScreenTag label="Stopped" tone="neutral" />}
                </div>
              </div>
            )}
          </ScreenPanel>

          <div style={{ display: "grid", gap: 16 }}>
            <ScreenPanel kicker="Context" title="System context and source controls">
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ padding: "11px 12px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
                  <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Context</p>
                  <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
                    Load earlier messages and keep the pinned system context collapsible so the operator can inspect what the agent is working from.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <ScreenTag label="Use documents" tone="info" />
                  <ScreenTag label="Selected documents" tone="skill" />
                  <ScreenTag label="URL source" tone="accent" />
                </div>
                <ScreenButton label="Load earlier messages" kind="secondary" compact />
              </div>
            </ScreenPanel>

            <ScreenPanel kicker="Composer" title="Sources for the next reply">
              <div style={{ display: "grid", gap: 10 }}>
                <ScreenField label="Selected documents" value={empty ? "No documents available" : "Platform Resume / Systems v8"} />
                <ScreenField label="URL source" value="https://www.figma.com/about/" />
                <ScreenField
                  label="Message"
                  value={archived ? "Archived sessions are read-only." : "Add selected documents or one URL for this reply."}
                  multiline
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <ScreenButton label={archived ? "Read only" : mutation ? "Sending..." : "Send"} compact />
                  <ScreenButton label={mutation ? "Saving..." : "Save as Document"} kind="secondary" compact />
                  {mutation && <ScreenTag label="Chat saved as a document." tone="success" />}
                </div>
              </div>
            </ScreenPanel>
          </div>
        </div>
      </div>

      {mutation && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5,10,18,0.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <ScreenDialog
            title="Save chat as document"
            subtitle="Saving a chat session should preserve citations, warnings, and the selected source set when it becomes a workspace document."
            footer={(
              <>
                <ScreenButton label="Cancel" kind="ghost" />
                <ScreenButton label="Saving..." tone="warning" />
              </>
            )}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <ScreenField label="Document title" value="Stripe follow-up draft" />
              <ScreenCallout
                title="Saved output becomes workspace evidence"
                body="The success cue should be Chat saved as a document. with a follow-on Open document action."
                tone="success"
              />
            </div>
          </ScreenDialog>
        </div>
      )}
    </div>
  );
}
