import type { ReactNode } from "react";
import { useTheme } from "../ThemeContext";
import {
  ScreenBadge,
  ScreenButton,
  ScreenCallout,
  ScreenDialog,
  ScreenField,
  ScreenMetric,
  ScreenPanel,
  ScreenSearch,
  ScreenTag,
} from "./flagship-primitives";

export type MessagesInboxScreenState =
  | "populated"
  | "no_conversations"
  | "empty"
  | "search_empty"
  | "new_conversation";

type Tone = "accent" | "success" | "warning" | "info" | "skill" | "neutral";
type ConversationType = "direct" | "group";
type EntryPoint = "discover" | "profile";

type ParticipantRecord = {
  userId: string;
  displayName: string;
  headline: string;
  company: string;
  tone: Tone;
};

type MessageRecord = {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  sentAt: string;
};

type ConversationRecord = {
  id: string;
  type: ConversationType;
  title: string | null;
  participants: ParticipantRecord[];
  unreadCount: number;
  lastMessage: MessageRecord | null;
  entryPoint: EntryPoint;
  contextNote: string;
};

const CURRENT_USER_ID = "jordan-kim";

const SELF: ParticipantRecord = {
  userId: CURRENT_USER_ID,
  displayName: "Jordan Kim",
  headline: "Candidate operator",
  company: "Baldin",
  tone: "accent",
};

const ANIKA: ParticipantRecord = {
  userId: "anika-chen",
  displayName: "Anika Chen",
  headline: "Frontend Platform",
  company: "Stripe",
  tone: "info",
};

const MAYA: ParticipantRecord = {
  userId: "maya-patel",
  displayName: "Maya Patel",
  headline: "Platform Design Lead",
  company: "Linear",
  tone: "accent",
};

const LEO: ParticipantRecord = {
  userId: "leo-hernandez",
  displayName: "Leo Hernandez",
  headline: "Design Systems Staff IC",
  company: "Figma",
  tone: "skill",
};

const PRIYA: ParticipantRecord = {
  userId: "priya-shah",
  displayName: "Priya Shah",
  headline: "Trust Platform PM",
  company: "Plaid",
  tone: "warning",
};

const CAMERON: ParticipantRecord = {
  userId: "cameron-li",
  displayName: "Cameron Li",
  headline: "Design Systems Manager",
  company: "Figma",
  tone: "skill",
};

const MARISOL: ParticipantRecord = {
  userId: "marisol-vega",
  displayName: "Marisol Vega",
  headline: "Operations Product Lead",
  company: "Notion",
  tone: "success",
};

const LUCA: ParticipantRecord = {
  userId: "luca-romano",
  displayName: "Luca Romano",
  headline: "Backend Platform",
  company: "Linear",
  tone: "info",
};

const ACCEPTED_CONNECTIONS: ParticipantRecord[] = [
  ANIKA,
  MAYA,
  LEO,
  PRIYA,
  CAMERON,
  MARISOL,
  LUCA,
];

const DIALOG_CONNECTIONS: Array<{
  person: ParticipantRecord;
  selected?: boolean;
  preselected?: boolean;
}> = [
  { person: ACCEPTED_CONNECTIONS[1], selected: true, preselected: true },
  { person: ACCEPTED_CONNECTIONS[2], selected: true },
  { person: ACCEPTED_CONNECTIONS[3], selected: true },
  { person: ACCEPTED_CONNECTIONS[0] },
  { person: ACCEPTED_CONNECTIONS[4] },
];

const CONVERSATIONS: ConversationRecord[] = [
  {
    id: "anika-direct",
    type: "direct",
    title: null,
    participants: [SELF, ANIKA],
    unreadCount: 2,
    lastMessage: {
      id: "anika-last",
      authorId: ANIKA.userId,
      authorName: ANIKA.displayName,
      content: "Tighten the first paragraph and I can share context on the team.",
      sentAt: "09:41",
    },
    entryPoint: "profile",
    contextNote: "Started from Anika's connection profile after the connection was accepted.",
  },
  {
    id: "platform-roundtable",
    type: "group",
    title: "Platform Roundtable",
    participants: [SELF, MAYA, LEO, PRIYA],
    unreadCount: 0,
    lastMessage: {
      id: "platform-last",
      authorId: CURRENT_USER_ID,
      authorName: SELF.displayName,
      content: "I added the operator-flow notes here before Friday.",
      sentAt: "09:12",
    },
    entryPoint: "discover",
    contextNote: "Opened from Discover after Maya surfaced as visible on purpose.",
  },
  {
    id: "fallback-group",
    type: "group",
    title: null,
    participants: [SELF, CAMERON, MARISOL],
    unreadCount: 1,
    lastMessage: {
      id: "fallback-last",
      authorId: CAMERON.userId,
      authorName: CAMERON.displayName,
      content: "Let us keep the naming sweep tight so the shared thread stays useful.",
      sentAt: "Yesterday",
    },
    entryPoint: "discover",
    contextNote: "Untitled groups fall back to joined participant names instead of a placeholder title.",
  },
  {
    id: "hiring-sync",
    type: "direct",
    title: "Hiring sync",
    participants: [SELF, LUCA],
    unreadCount: 0,
    lastMessage: {
      id: "luca-last",
      authorId: CURRENT_USER_ID,
      authorName: SELF.displayName,
      content: "You: I can send the backend migration notes before our chat.",
      sentAt: "Apr 16",
    },
    entryPoint: "profile",
    contextNote: "A direct conversation title overrides the participant-name fallback.",
  },
];

const THREAD_MESSAGES: Record<string, MessageRecord[]> = {
  "anika-direct": [
    {
      id: "anika-1",
      authorId: CURRENT_USER_ID,
      authorName: SELF.displayName,
      content: "Hi Anika. Baldin matched the Staff Frontend Platform role and I would value your read before I send a cold note.",
      sentAt: "09:20",
    },
    {
      id: "anika-2",
      authorId: ANIKA.userId,
      authorName: ANIKA.displayName,
      content: "Happy to help. The team is leaning hard into internal tooling and platform reliability.",
      sentAt: "09:31",
    },
    {
      id: "anika-3",
      authorId: CURRENT_USER_ID,
      authorName: SELF.displayName,
      content: "Perfect. I can tighten the opening and keep the design-systems context concise.",
      sentAt: "09:35",
    },
    {
      id: "anika-4",
      authorId: ANIKA.userId,
      authorName: ANIKA.displayName,
      content: "Tighten the first paragraph and I can share context on the team.",
      sentAt: "09:41",
    },
  ],
  "platform-roundtable": [
    {
      id: "platform-1",
      authorId: MAYA.userId,
      authorName: MAYA.displayName,
      content: "Opening this group from Discover so we can keep the operator-flow review in one place.",
      sentAt: "08:40",
    },
    {
      id: "platform-2",
      authorId: CURRENT_USER_ID,
      authorName: SELF.displayName,
      content: "Great. I added the operator-flow notes here before Friday.",
      sentAt: "09:12",
    },
  ],
};

function getOtherParticipants(conversation: ConversationRecord) {
  return conversation.participants.filter((participant) => participant.userId !== CURRENT_USER_ID);
}

function getConversationDisplayName(conversation: ConversationRecord) {
  if (conversation.title) {
    return conversation.title;
  }

  const others = getOtherParticipants(conversation);
  if (others.length === 0) {
    return "Conversation";
  }

  return others.map((participant) => participant.displayName).join(", ");
}

function getConversationPreview(conversation: ConversationRecord) {
  if (!conversation.lastMessage) {
    return "No messages yet";
  }

  const prefix = conversation.lastMessage.authorId === CURRENT_USER_ID
    ? "You: "
    : `${conversation.lastMessage.authorName}: `;

  return `${prefix}${conversation.lastMessage.content.replace(/^You:\s*/, "")}`;
}

function getConversationSubline(conversation: ConversationRecord) {
  const others = getOtherParticipants(conversation);

  if (conversation.type === "direct") {
    const other = others[0];
    if (!other) {
      return "Direct conversation";
    }

    return `${other.headline} · ${other.company}`;
  }

  return `${others.length} participants`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

function stateMeta(state: MessagesInboxScreenState): { label: string; tone: Tone } {
  switch (state) {
    case "no_conversations":
    case "empty":
      return { label: "No conversations yet", tone: "warning" };
    case "search_empty":
      return { label: "Search empty", tone: "warning" };
    case "new_conversation":
      return { label: "New conversation", tone: "info" };
    default:
      return { label: "Inbox populated", tone: "accent" };
  }
}

function MobileFrame({
  routeLabel,
  title,
  activeTab,
  children,
}: {
  routeLabel: string;
  title: string;
  activeTab: string;
  children: ReactNode;
}) {
  const { T } = useTheme();
  const tabs = ["Dashboard", "Network", "Messages", "Settings"] as const;

  return (
    <div style={{ width: 390, background: T.bg, border: `1px solid ${T.s2}`, borderRadius: 28, overflow: "hidden", boxShadow: T.shadow3 }}>
      <div style={{ padding: "10px 18px 12px", background: T.base, borderBottom: `1px solid ${T.s1}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10.5, color: T.t0 }}>09:41</span>
          <div style={{ width: 88, height: 6, borderRadius: T.rFull, background: T.s1 }} />
          <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2 }}>LTE</span>
        </div>
        <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.accent, letterSpacing: "0.08em", margin: "0 0 4px" }}>{routeLabel}</p>
        <p style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 22, color: T.t0, margin: 0, letterSpacing: "-0.02em" }}>{title}</p>
      </div>
      <div style={{ padding: "14px 16px 18px", minHeight: 680, display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, padding: "10px 14px 16px", background: T.base, borderTop: `1px solid ${T.s1}` }}>
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <div key={tab} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: isActive ? T.accentDim : "transparent", border: `1px solid ${isActive ? T.aStroke : "transparent"}` }} />
              <span style={{ fontFamily: T.fontMono, fontSize: 9.5, color: isActive ? T.accent : T.t2 }}>{tab}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AvatarChip({
  name,
  tone,
  size = 38,
}: {
  name: string;
  tone: Tone;
  size?: number;
}) {
  const { T } = useTheme();

  const palette = {
    accent: { color: T.accent, dim: T.accentDim, border: T.aStroke },
    success: { color: T.success, dim: T.succDim, border: `${T.success}44` },
    warning: { color: T.warning, dim: T.warnDim, border: `${T.warning}44` },
    info: { color: T.info, dim: T.infoDim, border: `${T.info}44` },
    skill: { color: T.skill, dim: T.skillDim, border: `${T.skill}44` },
    neutral: { color: T.t1, dim: T.s0, border: T.s1 },
  }[tone];

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: T.rFull,
        background: palette.dim,
        border: `1px solid ${palette.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: size > 32 ? 11 : 10, color: palette.color }}>
        {getInitials(name)}
      </span>
    </div>
  );
}

function ConversationAvatar({
  conversation,
}: {
  conversation: ConversationRecord;
}) {
  const others = getOtherParticipants(conversation);

  if (conversation.type === "direct") {
    const other = others[0];
    return (
      <AvatarChip
        name={other?.displayName || "Conversation"}
        tone={other?.tone || "neutral"}
      />
    );
  }

  return (
    <div style={{ position: "relative", width: 50, height: 38, flexShrink: 0 }}>
      {others.slice(0, 2).map((participant, index) => (
        <div key={participant.userId} style={{ position: "absolute", left: index * 16, top: 0 }}>
          <AvatarChip name={participant.displayName} tone={participant.tone} size={34} />
        </div>
      ))}
      {others.length > 2 && (
        <div style={{ position: "absolute", left: 32, top: 16 }}>
          <AvatarChip name={`${others.length}`} tone="neutral" size={24} />
        </div>
      )}
    </div>
  );
}

function UnreadPill({ count }: { count: number }) {
  const { T } = useTheme();

  return (
    <div
      style={{
        minWidth: 18,
        height: 18,
        padding: "0 6px",
        borderRadius: T.rFull,
        background: T.accent,
        color: T.bg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: T.fontMono,
        fontSize: 10,
        fontWeight: 700,
      }}
    >
      {count}
    </div>
  );
}

function ConversationCard({
  conversation,
  active = false,
}: {
  conversation: ConversationRecord;
  active?: boolean;
}) {
  const { T } = useTheme();
  const typeTone = conversation.type === "group" ? "skill" : "info";

  return (
    <div
      style={{
        background: active ? T.base : T.raised,
        border: `1px solid ${active ? T.aStroke : T.s1}`,
        borderRadius: T.r3,
        boxShadow: active ? T.shadowAccent : "none",
        padding: "14px 15px",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <ConversationAvatar conversation={conversation} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 5 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 3px", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {getConversationDisplayName(conversation)}
              </p>
              <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {getConversationSubline(conversation)}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
              <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2 }}>{conversation.lastMessage?.sentAt || "Quiet"}</span>
              {conversation.unreadCount > 0 && <UnreadPill count={conversation.unreadCount} />}
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            <ScreenTag label={conversation.type === "group" ? "Group" : "Direct"} tone={typeTone} />
            <ScreenTag label={conversation.entryPoint === "discover" ? "Started from Discover" : "Started from profile"} tone="neutral" />
          </div>

          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: conversation.unreadCount > 0 ? T.t0 : T.t1, margin: 0, lineHeight: 1.55, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {getConversationPreview(conversation)}
          </p>
        </div>
      </div>
    </div>
  );
}

function QuietState({
  title,
  body,
  primaryAction,
  secondaryAction,
  footnote,
}: {
  title: string;
  body: string;
  primaryAction: string;
  secondaryAction?: string;
  footnote?: string;
}) {
  const { T } = useTheme();

  return (
    <div style={{ padding: "28px 24px", background: T.base, border: `1px dashed ${T.s1}`, borderRadius: T.r2 }}>
      <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 18, color: T.t0, margin: "0 0 6px", letterSpacing: "-0.01em" }}>{title}</p>
      <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, lineHeight: 1.65, margin: "0 0 14px" }}>{body}</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <ScreenButton label={primaryAction} />
        {secondaryAction && <ScreenButton label={secondaryAction} kind="secondary" />}
      </div>

      {footnote && (
        <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t2, lineHeight: 1.6, margin: "12px 0 0" }}>
          {footnote}
        </p>
      )}
    </div>
  );
}

function MessageBubble({
  message,
}: {
  message: MessageRecord;
}) {
  const { T } = useTheme();
  const mine = message.authorId === CURRENT_USER_ID;

  return (
    <div style={{ display: "flex", flexDirection: mine ? "row-reverse" : "row", gap: 10 }}>
      {!mine && <AvatarChip name={message.authorName} tone="info" size={28} />}

      <div style={{ maxWidth: "84%", display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", gap: 4 }}>
        <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2 }}>
          {message.authorName} · {message.sentAt}
        </span>
        <div
          style={{
            background: mine ? T.accentDim : T.base,
            border: `1px solid ${mine ? T.aStroke : T.s1}`,
            borderRadius: mine ? `${T.r3}px ${T.r1}px ${T.r3}px ${T.r3}px` : `${T.r1}px ${T.r3}px ${T.r3}px ${T.r3}px`,
            padding: "10px 12px",
          }}
        >
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t0, lineHeight: 1.6, margin: 0 }}>{message.content}</p>
        </div>
      </div>
    </div>
  );
}

function ComposerPreview({
  displayName,
}: {
  displayName: string;
}) {
  const { T } = useTheme();

  return (
    <div style={{ border: `1px solid ${T.s1}`, borderRadius: T.r3, overflow: "hidden" }}>
      <div style={{ minHeight: 72, padding: "12px 14px", background: T.base, borderBottom: `1px solid ${T.s0}` }}>
        <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t2, margin: 0 }}>Type a message…</p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 12px", background: T.raised }}>
        <span style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t2 }}>Reply to {displayName}</span>
        <ScreenButton label="Send" compact />
      </div>
    </div>
  );
}

function ThreadPreview({
  conversation,
}: {
  conversation: ConversationRecord;
}) {
  const { T } = useTheme();
  const others = getOtherParticipants(conversation);
  const primaryPerson = others[0];
  const threadMessages = THREAD_MESSAGES[conversation.id] || [];

  return (
    <ScreenPanel
      kicker="Selected thread"
      title={getConversationDisplayName(conversation)}
      aside={(
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <ScreenTag label={conversation.type === "group" ? "Group" : "Direct"} tone={conversation.type === "group" ? "skill" : "info"} />
          {conversation.unreadCount > 0 && <ScreenBadge label={`${conversation.unreadCount} unread`} tone="accent" />}
        </div>
      )}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <ConversationAvatar conversation={conversation} />
          <div>
            <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, margin: "0 0 4px" }}>
              {conversation.type === "group"
                ? `${others.length} participants · ${conversation.entryPoint === "discover" ? "Started from Discover" : "Started from profile"}`
                : `${primaryPerson?.headline || "Connection"} · ${primaryPerson?.company || "Profile"}`}
            </p>
            <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
              {conversation.contextNote}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <ScreenButton label={conversation.entryPoint === "discover" ? "Open Discover" : "Open connection profile"} kind="secondary" compact />
          <ScreenButton label="New Message" compact />
        </div>
      </div>

      <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        {threadMessages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      <ComposerPreview displayName={getConversationDisplayName(conversation)} />
    </ScreenPanel>
  );
}

function ContractRow({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const { T } = useTheme();

  return (
    <div style={{ padding: "10px 0", borderBottom: `1px solid ${T.s0}` }}>
      <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{title}</p>
      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{body}</p>
    </div>
  );
}

function RouteContractPanel() {
  return (
    <ScreenPanel kicker="Shipped contract" title="What the route needs to preserve">
      <div style={{ display: "grid", gap: 0 }}>
        <ContractRow title="Display name fallback" body={"Use the title first. Otherwise join the non-self participant names. If nobody else remains, fall back to \"Conversation\"."} />
        <ContractRow title="Preview line" body={"Show the latest message preview with \"You:\" for current-user messages and the author display name for everyone else."} />
        <ContractRow title="Entry points" body={"Empty inbox guidance stays \"Start a conversation from a connection's profile or Discover.\" Opening the dialog from a profile can preselect one recipient."} />
        <ContractRow title="New Conversation dialog" body="Search accepted connections only. Group conversation adds an optional title and requires 2+ participants." />
      </div>
    </ScreenPanel>
  );
}

function EntryPointPanel() {
  const { T } = useTheme();

  return (
    <ScreenPanel kicker="First conversation" title="How a new thread starts">
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ padding: "12px 14px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
          <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Discover path</p>
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
            Start from Discover when someone is visible on purpose. From there, their profile becomes the deliberate path into connection or messaging.
          </p>
        </div>
        <div style={{ padding: "12px 14px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
          <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Connection profile path</p>
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
            A connection profile can open New Conversation with one recipient already selected, matching the shipped `initialRecipientId` behavior.
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <ScreenTag label="Accepted connections only" tone="success" />
          <ScreenTag label="Direct + group" tone="info" />
          <ScreenTag label="Profile preselect" tone="accent" />
        </div>
      </div>
    </ScreenPanel>
  );
}

function SearchScopePanel() {
  return (
    <ScreenPanel kicker="Quiet state" title="Search stays local to the inbox contract">
      <div style={{ display: "grid", gap: 0 }}>
        <ContractRow title="Matching rules" body="Search checks the conversation title first, then the non-self participant display names. It does not search message bodies." />
        <ContractRow title="Quiet behavior" body={"When the search returns nothing, keep the empty state calm and keep \"New Message\" available instead of forcing a dead end."} />
        <ContractRow title="Why the placeholder stays" body={"The search field continues to read \"Search conversations…\" even when the current query hides every thread."} />
      </div>
    </ScreenPanel>
  );
}

function DialogModeChip({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  const { T } = useTheme();

  return (
    <div
      style={{
        padding: "5px 10px",
        borderRadius: T.rFull,
        background: active ? T.accentDim : T.base,
        border: `1px solid ${active ? T.aStroke : T.s1}`,
      }}
    >
      <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: active ? T.accent : T.t1 }}>{label}</span>
    </div>
  );
}

function ConnectionRow({
  person,
  selected = false,
  preselected = false,
}: {
  person: ParticipantRecord;
  selected?: boolean;
  preselected?: boolean;
}) {
  const { T } = useTheme();

  return (
    <div
      style={{
        background: selected ? T.accentDim : T.raised,
        border: `1px solid ${selected ? T.aStroke : T.s1}`,
        borderRadius: T.r2,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          background: selected ? T.accent : "transparent",
          border: `1px solid ${selected ? T.accent : T.s2}`,
          flexShrink: 0,
        }}
      />
      <AvatarChip name={person.displayName} tone={person.tone} size={30} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 14, color: T.t0, margin: "0 0 2px", letterSpacing: "-0.01em" }}>{person.displayName}</p>
        <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t1, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {person.headline} · {person.company}
        </p>
      </div>
      {preselected ? (
        <ScreenTag label="Preselected" tone="info" />
      ) : selected ? (
        <ScreenTag label="Selected" tone="accent" />
      ) : (
        <ScreenTag label="Accepted" tone="success" />
      )}
    </div>
  );
}

function NewConversationDialogSpecimen({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { T } = useTheme();

  return (
    <ScreenDialog
      title="New Conversation"
      subtitle="Start a conversation from a connection's profile or Discover."
      footer={(
        <>
          <ScreenButton label="Cancel" kind="ghost" />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <ScreenBadge label="Creating…" tone="warning" />
            <ScreenButton label="Start Conversation" />
          </div>
        </>
      )}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <DialogModeChip label="Direct conversation" />
          <DialogModeChip label="Group conversation" active />
          <ScreenTag label="Opened from Maya Patel's profile" tone="info" />
        </div>

        <ScreenField label="Group title (optional)" value="Platform hiring loop" />

        <div style={{ display: "grid", gap: 8 }}>
          <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
            Select participants (2+)
          </p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <ScreenSearch label="Search connections…" />
            <ScreenBadge label="Accepted connections only" tone="success" />
          </div>

          <div style={{ display: "grid", gap: 8, maxHeight: compact ? "none" : 240, overflowY: compact ? "visible" : "auto" }}>
            {DIALOG_CONNECTIONS.map((connection) => (
              <ConnectionRow
                key={connection.person.userId}
                person={connection.person}
                selected={connection.selected}
                preselected={connection.preselected}
              />
            ))}
          </div>
        </div>

        <div style={{ padding: "12px 14px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
            Opening from a connection profile can preselect one recipient. Switching to Group conversation keeps that recipient selected and lets you add more accepted connections.
          </p>
        </div>
      </div>
    </ScreenDialog>
  );
}

function MessagesInboxDesktopContent({
  state,
}: {
  state: MessagesInboxScreenState;
}) {
  const { T } = useTheme();
  const normalizedState = state === "empty" ? "no_conversations" : state;
  const meta = stateMeta(normalizedState);
  const activeConversation = CONVERSATIONS[0];
  const totalUnread = CONVERSATIONS.reduce((sum, conversation) => sum + conversation.unreadCount, 0);
  const directCount = CONVERSATIONS.filter((conversation) => conversation.type === "direct").length;
  const groupCount = CONVERSATIONS.filter((conversation) => conversation.type === "group").length;

  return (
    <div style={{ position: "relative", flex: 1, padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
        <div>
          <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>FLAGSHIP · NETWORK TRUST</p>
          <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Messages</h1>
          <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, lineHeight: 1.65, margin: 0, maxWidth: 700 }}>
            Private direct and group conversations for accepted connections. Empty, filtered, and new-thread states stay explicit so the route feels deliberate instead of social-feed generic.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <ScreenBadge label={meta.label} tone={meta.tone} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <ScreenButton label="Open Discover" kind="secondary" />
            <ScreenButton label="Open connection profile" kind="ghost" />
            <ScreenButton label="New Message" />
          </div>
        </div>
      </div>

      <ScreenCallout
        title={
          normalizedState === "no_conversations"
            ? "No conversations yet"
            : normalizedState === "search_empty"
              ? "The inbox is quiet because the current search hides every thread"
              : normalizedState === "new_conversation"
                ? "New Conversation is open with accepted connections only"
                : "Direct and group threads live in one private inbox"
        }
        body={
          normalizedState === "no_conversations"
            ? "Start a conversation from a connection's profile or Discover."
            : normalizedState === "search_empty"
              ? "Try adjusting your search or clearing filters."
              : normalizedState === "new_conversation"
                ? "The dialog can start from Discover or a connection profile and keeps one profile recipient preselected when provided."
                : "Unread counts, title fallbacks, and preview lines should read the same way they do in the shipped messaging page."
        }
        tone={normalizedState === "populated" ? "info" : meta.tone}
        action={<ScreenButton label={normalizedState === "search_empty" ? "New Message" : "Review contract"} kind="secondary" compact />}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        <ScreenMetric label="Unread" value={normalizedState === "no_conversations" ? "0" : String(totalUnread)} tone={normalizedState === "no_conversations" ? "neutral" : "accent"} note="Surface counts on cards, not in a global activity feed." />
        <ScreenMetric label="Direct threads" value={normalizedState === "no_conversations" ? "0" : String(directCount)} tone="info" note="Display names default to the other participant when no title exists." />
        <ScreenMetric label="Group threads" value={normalizedState === "no_conversations" ? "0" : String(groupCount)} tone="skill" note="Titles stay optional; untitled groups fall back to participant names." />
        <ScreenMetric label="Thread starts" value="Profiles + Discover" tone="warning" note="The route still guides creation through deliberate network entry points." />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 0.94fr) minmax(360px, 1.06fr)", gap: 16, alignItems: "start" }}>
        <ScreenPanel
          kicker="Inbox"
          title="Conversations"
          aside={(
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <ScreenSearch label="Search conversations…" />
              {state === "search_empty" && <ScreenTag label={'Query · "design systems"'} tone="warning" />}
            </div>
          )}
        >
          {normalizedState === "no_conversations" ? (
            <QuietState
              title="No conversations yet"
              body="Start a conversation from a connection's profile or Discover."
              primaryAction="New Message"
              secondaryAction="Open Discover"
              footnote="Accepted connections appear in the picker once the relationship is confirmed."
            />
          ) : normalizedState === "search_empty" ? (
            <QuietState
              title="No results match your filters"
              body="Try adjusting your search or clearing filters."
              primaryAction="New Message"
              secondaryAction="Clear search"
              footnote="Search matches conversation titles and participant display names, then falls quiet without hiding the compose path."
            />
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {CONVERSATIONS.map((conversation, index) => (
                <ConversationCard key={conversation.id} conversation={conversation} active={index === 0} />
              ))}
            </div>
          )}
        </ScreenPanel>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {normalizedState === "no_conversations" ? (
            <EntryPointPanel />
          ) : normalizedState === "search_empty" ? (
            <SearchScopePanel />
          ) : (
            <ThreadPreview conversation={activeConversation} />
          )}
          <RouteContractPanel />
        </div>
      </div>

      {normalizedState === "new_conversation" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.56)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <NewConversationDialogSpecimen />
        </div>
      )}
    </div>
  );
}

function MessagesInboxMobileContent({
  state,
}: {
  state: MessagesInboxScreenState;
}) {
  const normalizedState = state === "empty" ? "no_conversations" : state;
  const meta = stateMeta(normalizedState);

  return (
    <MobileFrame routeLabel="/network/messages" title="Messages" activeTab="Messages">
      <ScreenBadge label={meta.label} tone={meta.tone} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <ScreenSearch label="Search conversations…" />
        {normalizedState === "search_empty" && <ScreenTag label={'Query · "design systems"'} tone="warning" />}
      </div>

      {normalizedState === "no_conversations" ? (
        <QuietState
          title="No conversations yet"
          body="Start a conversation from a connection's profile or Discover."
          primaryAction="New Message"
          secondaryAction="Open Discover"
        />
      ) : normalizedState === "search_empty" ? (
        <QuietState
          title="No results match your filters"
          body="Try adjusting your search or clearing filters."
          primaryAction="New Message"
          secondaryAction="Clear search"
        />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {CONVERSATIONS.slice(0, 3).map((conversation, index) => (
            <ConversationCard key={conversation.id} conversation={conversation} active={index === 0} />
          ))}
        </div>
      )}

      <ScreenPanel kicker="Route rules" title="What stays true on mobile">
        <div style={{ display: "grid", gap: 0 }}>
          <ContractRow title="Header and search" body={"Keep the top-level header at \"Messages\" and the placeholder at \"Search conversations…\"."} />
          <ContractRow title="Fallbacks" body={"Titles win. Otherwise use the non-self participant names. If there is nobody else, fall back to \"Conversation\"."} />
          <ContractRow title="Creation path" body="The picker starts from Discover or a connection profile and only shows accepted connections." />
        </div>
      </ScreenPanel>

      {normalizedState === "new_conversation" && <NewConversationDialogSpecimen compact />}
    </MobileFrame>
  );
}

export function MessagesInboxScreen({
  state = "populated",
  mobile = false,
}: {
  state?: MessagesInboxScreenState;
  mobile?: boolean;
}) {
  if (mobile) {
    return <MessagesInboxMobileContent state={state} />;
  }

  return <MessagesInboxDesktopContent state={state} />;
}

export const MessagesScreen = MessagesInboxScreen;
