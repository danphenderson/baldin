import { useTheme } from "../ThemeContext";
import {
  ScreenBadge,
  ScreenButton,
  ScreenCallout,
  ScreenDialog,
  ScreenMetric,
  ScreenPanel,
  ScreenTag,
} from "./flagship-primitives";

export type MessageThreadScreenState =
  | "populated"
  | "no_messages_yet"
  | "load_error"
  | "mutation";

type Tone = "accent" | "success" | "warning" | "info" | "neutral" | "skill";

type Participant = {
  name: string;
  role: string;
  headline: string;
  initials: string;
  tone?: Tone;
  roleInConversation?: string;
};

type MessageSpec = {
  id: string;
  author: string;
  mine?: boolean;
  content: string;
  timestamp: string;
  edited?: boolean;
};

type ConversationSpec = {
  title?: string | null;
  type: "direct" | "group";
  participants: Participant[];
  messages: MessageSpec[];
};

const DIRECT_CONVERSATION: ConversationSpec = {
  type: "direct",
  participants: [
    {
      name: "Anika Chen",
      role: "Staff Frontend Platform",
      headline: "Stripe · internal tooling",
      initials: "AC",
      tone: "warning",
    },
  ],
  messages: [
    {
      id: "m-1",
      author: "You",
      mine: true,
      timestamp: "9:20 AM",
      content: "Hi Anika. I’m exploring the Staff Frontend Platform role and would value your read on how the team is evolving before I send a cold note.",
    },
    {
      id: "m-2",
      author: "Anika Chen",
      timestamp: "9:31 AM",
      content: "Happy to help. The internal-tooling angle is real, but the first message should stay crisp enough that the intro does not do all the work.",
    },
    {
      id: "m-3",
      author: "You",
      mine: true,
      timestamp: "9:35 AM",
      content: "That makes sense. I’ll trim the opening and keep the ask focused on the platform problem instead of trying to force a warm intro too early.",
      edited: true,
    },
    {
      id: "m-4",
      author: "Anika Chen",
      timestamp: "9:41 AM",
      content: "Good framing. Send it once it feels tight and I can tell you whether it is strong enough to forward.",
    },
  ],
};

const GROUP_CONVERSATION: ConversationSpec = {
  title: null,
  type: "group",
  participants: [
    {
      name: "Priya Shah",
      role: "Trust Platform PM",
      headline: "Plaid · private trust systems",
      initials: "PS",
      tone: "warning",
      roleInConversation: "admin",
    },
    {
      name: "Marisol Vega",
      role: "Operations Product Lead",
      headline: "Notion · operator-facing workflows",
      initials: "MV",
      tone: "info",
    },
    {
      name: "Cameron Li",
      role: "Design Systems Manager",
      headline: "Figma · library governance",
      initials: "CL",
      tone: "skill",
    },
  ],
  messages: [],
};

function resolveTone(tone: Tone, T: ReturnType<typeof useTheme>["T"]) {
  switch (tone) {
    case "accent":
      return { color: T.accent, dim: T.accentDim, border: T.aStroke };
    case "success":
      return { color: T.success, dim: T.succDim, border: `${T.success}44` };
    case "warning":
      return { color: T.warning, dim: T.warnDim, border: `${T.warning}44` };
    case "info":
      return { color: T.info, dim: T.infoDim, border: `${T.info}44` };
    case "skill":
      return { color: T.skill, dim: T.skillDim, border: `${T.skill}44` };
    default:
      return { color: T.t1, dim: T.s0, border: T.s1 };
  }
}

function getConversationTitle(conversation: ConversationSpec) {
  if (conversation.title?.trim()) {
    return conversation.title;
  }

  if (conversation.participants.length === 0) {
    return "Conversation";
  }

  return conversation.participants.map((participant) => participant.name).join(", ");
}

function AvatarChip({
  participant,
}: {
  participant: Participant;
}) {
  const { T } = useTheme();
  const palette = resolveTone(participant.tone ?? "accent", T);

  return (
    <div style={{ width: 34, height: 34, borderRadius: T.rFull, background: palette.dim, border: `1px solid ${palette.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10.5, color: palette.color }}>{participant.initials}</span>
    </div>
  );
}

function MessageBubble({
  message,
  editing = false,
}: {
  message: MessageSpec;
  editing?: boolean;
}) {
  const { T } = useTheme();

  return (
    <div style={{ display: "flex", justifyContent: message.mine ? "flex-end" : "flex-start" }}>
      <div style={{ maxWidth: "76%", display: "flex", flexDirection: "column", gap: 4, alignItems: message.mine ? "flex-end" : "flex-start" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2 }}>{message.author}</span>
          <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2 }}>{message.timestamp}</span>
          {message.edited && <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2 }}>(edited)</span>}
        </div>
        <div style={{ padding: "12px 14px", borderRadius: message.mine ? `${T.r3}px ${T.r1}px ${T.r3}px ${T.r3}px` : `${T.r1}px ${T.r3}px ${T.r3}px ${T.r3}px`, background: message.mine ? T.accentDim : T.base, border: `1px solid ${message.mine ? T.aStroke : T.s1}` }}>
          {editing ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ minHeight: 78, padding: "10px 12px", background: message.mine ? T.bg : T.raised, border: `1px solid ${message.mine ? T.aStroke : T.s1}`, borderRadius: T.r2 }}>
                <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t0, lineHeight: 1.65, margin: 0 }}>
                  That makes sense. I&apos;ll trim the opening and keep the ask focused on the platform problem instead of trying to force a warm intro too early.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: message.mine ? "flex-end" : "flex-start" }}>
                <ScreenButton label="Save" compact />
                <ScreenButton label="Cancel" kind="secondary" compact />
              </div>
            </div>
          ) : (
            <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t0, lineHeight: 1.65, margin: 0 }}>{message.content}</p>
          )}
        </div>
        {message.mine && !editing && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ScreenButton label="Edit" kind="ghost" compact />
            <ScreenButton label="Delete" kind="ghost" tone="warning" compact />
          </div>
        )}
      </div>
    </div>
  );
}

function Composer({
  mode = "idle",
}: {
  mode?: "idle" | "draft";
}) {
  const { T } = useTheme();
  const hasDraft = mode === "draft";

  return (
    <ScreenPanel
      kicker="Compose"
      title="Type a message…"
      aside={<ScreenTag label={hasDraft ? "Draft active" : "Ready"} tone={hasDraft ? "warning" : "info"} />}
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ minHeight: 92, padding: "12px 14px", background: T.base, border: `1px solid ${hasDraft ? T.aStroke : T.s1}`, borderRadius: T.r2 }}>
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: hasDraft ? T.t0 : T.t2, lineHeight: 1.65, margin: 0 }}>
            {hasDraft
              ? "Thanks. I’m tightening the first note now and will send it once the internal-tooling angle reads clearly."
              : "Type a message…"}
          </p>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2 }}>Enter sends. Shift+Enter keeps the message multiline.</span>
          <ScreenButton label={hasDraft ? "Sending…" : "Send"} compact />
        </div>
      </div>
    </ScreenPanel>
  );
}

function DeleteDialog() {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <ScreenDialog
        title="Delete Message"
        subtitle="Are you sure you want to delete this message? This cannot be undone."
        footer={(
          <>
            <ScreenButton label="Cancel" kind="ghost" compact />
            <ScreenButton label="Delete" kind="secondary" tone="error" compact />
          </>
        )}
      >
        <ScreenCallout
          title="Own-message delete only"
          body="Delete applies only to your message bubble, and the confirm copy stays scoped to private human messaging rather than generic agent history."
          tone="error"
        />
      </ScreenDialog>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <ScreenBadge label="Message deleted" tone="success" />
      </div>
    </div>
  );
}

function ParticipantSummary({
  conversation,
}: {
  conversation: ConversationSpec;
}) {
  const { T } = useTheme();
  const isGroup = conversation.type === "group";

  return (
    <ScreenPanel
      kicker={isGroup ? "Group handling" : "Participant summary"}
      title={isGroup ? `Participants (${conversation.participants.length})` : "Participant summary"}
      aside={<ScreenTag label={isGroup ? "Hide participants" : "Direct"} tone={isGroup ? "skill" : "info"} />}
    >
      <div style={{ display: "grid", gap: 10 }}>
        {conversation.participants.map((participant) => (
          <div
            key={participant.name}
            style={{
              padding: "12px 14px",
              background: T.base,
              border: `1px solid ${resolveTone(participant.tone ?? "accent", T).border}`,
              borderRadius: T.r2,
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <AvatarChip participant={participant} />
            <div>
              <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>
                {participant.name}
                {participant.roleInConversation ? ` (${participant.roleInConversation})` : ""}
              </p>
              <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, margin: "0 0 4px" }}>{participant.role}</p>
              <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t2, margin: 0 }}>{participant.headline}</p>
            </div>
          </div>
        ))}
      </div>
    </ScreenPanel>
  );
}

export function MessageThreadScreen({
  state = "populated",
}: {
  state?: MessageThreadScreenState;
}) {
  const { T } = useTheme();
  const conversation = state === "no_messages_yet" ? GROUP_CONVERSATION : DIRECT_CONVERSATION;
  const isGroup = conversation.type === "group";
  const title = getConversationTitle(conversation);

  if (state === "load_error") {
    return (
      <div style={{ display: "flex", height: "100%", flexDirection: "column", background: T.bg, padding: "24px 28px", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ScreenButton label="Back to Messages" kind="secondary" compact />
          <ScreenBadge label="Load error" tone="warning" />
        </div>
        <ScreenCallout
          title="Conversation not found."
          body="The route should recover with a back path to the inbox and keep the failure specific to this conversation instead of implying a broader network outage."
          tone="error"
          action={<ScreenButton label="Back to Messages" kind="secondary" compact />}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", flexDirection: "column", background: T.bg, position: "relative" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <ScreenButton label="Back" kind="secondary" compact />
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: 0, letterSpacing: "0.08em" }}>FLAGSHIP · PRIVATE MESSAGING</p>
                {isGroup && <ScreenTag label="Group" tone="skill" />}
              </div>
              <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>{title}</h1>
              <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, lineHeight: 1.65, margin: 0, maxWidth: 720 }}>
                {isGroup
                  ? "Group conversations keep participant context visible, but the thread still reads inline and private rather than like a public community surface."
                  : "Direct threads stay grounded in accepted relationships. The title falls back to the other participant name when no explicit title exists."}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <ScreenBadge label={state === "no_messages_yet" ? "No messages yet" : state === "mutation" ? "Compose / edit / delete" : "Thread populated"} tone={state === "no_messages_yet" ? "warning" : state === "mutation" ? "accent" : "accent"} />
            <div style={{ display: "flex", gap: 8 }}>
              <ScreenButton label={isGroup ? "Hide participants" : "View profile"} kind="secondary" />
              <ScreenButton label="Open inbox" />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
          <ScreenMetric label="Thread type" value={isGroup ? "Group" : "Direct"} tone={isGroup ? "skill" : "info"} note={isGroup ? "Explicit participant set" : "Accepted relationship only"} />
          <ScreenMetric label="Participants" value={String(conversation.participants.length)} tone="accent" note={isGroup ? "Names stay private to the thread" : "One person besides you"} />
          <ScreenMetric label="Unread" value={state === "no_messages_yet" ? "0" : "2"} tone={state === "no_messages_yet" ? "neutral" : "warning"} note="Unread counts stay on the inbox and thread header only" />
          <ScreenMetric label="Access" value="Private" tone="skill" note="No agent-chat provenance patterns" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)", gap: 16, alignItems: "start" }}>
          <ScreenPanel
            kicker="Thread"
            title={state === "no_messages_yet" ? "No messages yet" : "Conversation history"}
            aside={isGroup ? <ScreenTag label="Show participants / Hide participants" tone="skill" /> : <ScreenTag label="Direct" tone="info" />}
          >
            {state === "no_messages_yet" ? (
              <div style={{ padding: "24px 20px", background: T.base, border: `1px dashed ${T.s1}`, borderRadius: T.r2, display: "grid", gap: 10 }}>
                <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 18, color: T.t0, margin: 0, letterSpacing: "-0.01em" }}>No messages yet</p>
                <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.65, margin: 0 }}>
                  Send the first one to start the conversation. Empty threads stay quiet instead of borrowing any agent-run or citation treatment.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {conversation.messages.map((message) => (
                  <MessageBubble key={message.id} message={message} editing={state === "mutation" && message.id === "m-3"} />
                ))}
              </div>
            )}
          </ScreenPanel>

          <div style={{ display: "grid", gap: 16 }}>
            <ParticipantSummary conversation={conversation} />
            <Composer mode={state === "mutation" ? "draft" : "idle"} />
            {state === "mutation" && (
              <ScreenPanel kicker="Mutation flows" title="Own-message edit and delete">
                <div style={{ display: "grid", gap: 12 }}>
                  <ScreenCallout
                    title="Edit and delete stay private"
                    body="Only your own messages expose Edit and Delete actions, and the compose box remains an inline thread affordance rather than a separate agent-style history."
                    tone="info"
                  />
                  <DeleteDialog />
                </div>
              </ScreenPanel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
