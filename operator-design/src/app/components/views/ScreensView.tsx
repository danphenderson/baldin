import { useState } from "react";
import { useTheme } from "../ThemeContext";
import {
  DashboardScreen,
  type DashboardScreenMutationMode,
  type DashboardScreenState,
} from "../screens/DashboardScreen";
import {
  LeadsScreen,
  type LeadsScreenModalMode,
  type LeadsScreenState,
} from "../screens/LeadsScreen";
import {
  DetailScreen,
  type DetailScreenState,
} from "../screens/DetailScreen";
import {
  MessagesInboxScreen,
  type MessagesInboxScreenState,
} from "../screens/MessagesInboxScreen";
import {
  MessageThreadScreen,
  type MessageThreadScreenState,
} from "../screens/MessageThreadScreen";
import { AuthScreen } from "../screens/AuthScreen";
import { ProfileScreen, type ProfileScreenState } from "../screens/ProfileScreen";
import {
  AspirationRolesScreen,
  type AspirationRolesScreenState,
} from "../screens/AspirationRolesScreen";
import {
  AspirationCompaniesScreen,
  type AspirationCompaniesScreenState,
} from "../screens/AspirationCompaniesScreen";
import {
  ApplicationsQueueScreen,
  type ApplicationsQueueScreenState,
} from "../screens/ApplicationsQueueScreen";
import {
  ApplicationsBoardScreen,
  type ApplicationsBoardScreenState,
} from "../screens/ApplicationsBoardScreen";
import {
  WorkspaceListScreen,
  type WorkspaceListScreenState,
} from "../screens/WorkspaceListScreen";
import {
  WorkspaceDetailScreen,
  type WorkspaceDetailScreenState,
} from "../screens/WorkspaceDetailScreen";
import {
  WorkspaceEditorScreen,
  type WorkspaceEditorScreenState,
} from "../screens/WorkspaceEditorScreen";
import {
  WorkspaceCompareScreen,
  type WorkspaceCompareScreenState,
} from "../screens/WorkspaceCompareScreen";
import {
  WorkflowsScreen,
  type WorkflowsScreenMutationFocus,
  type WorkflowsScreenState,
} from "../screens/WorkflowsScreen";
import {
  ExtractorsScreen,
  type ExtractorsScreenState,
} from "../screens/ExtractorsScreen";
import {
  AgentsScreen,
  type AgentsScreenMutationMode,
  type AgentsScreenState,
} from "../screens/AgentsScreen";
import {
  AgentDetailScreen,
  type AgentDetailScreenState,
} from "../screens/AgentDetailScreen";
import {
  AgentChatScreen,
  type AgentChatScreenState,
} from "../screens/AgentChatScreen";
import { DiscoverScreen, type DiscoverScreenState } from "../screens/DiscoverScreen";
import {
  NetworkProfileScreen,
  type NetworkProfileScreenState,
} from "../screens/NetworkProfileScreen";
import {
  ConnectionsScreen,
  type ConnectionsScreenState,
} from "../screens/ConnectionsScreen";
import {
  DiscoverabilityScreen,
  type DiscoverabilityScreenState,
} from "../screens/DiscoverabilityScreen";
import {
  ObservabilityLayerCard,
  ScreenModeToggle,
  ScreenProposal,
  type ObservabilityLayerMode,
} from "../screens/flagship-primitives";

type ScreenId =
  | "profile"
  | "aspiration-roles"
  | "aspiration-companies"
  | "dashboard"
  | "leads"
  | "applications-queue"
  | "applications-board"
  | "detail"
  | "workspace-list"
  | "workspace-detail"
  | "workspace-editor"
  | "workspace-compare"
  | "workflows"
  | "extractors"
  | "agents"
  | "agent-detail"
  | "agent-chat"
  | "discover"
  | "network-profile"
  | "connections"
  | "messages-inbox"
  | "message-thread"
  | "discoverability"
  | "auth";

type ObservabilityScreenId = "dashboard" | "leads" | "detail" | "discoverability";

type ScreenStateMap = {
  profile: ProfileScreenState;
  "aspiration-roles": AspirationRolesScreenState;
  "aspiration-companies": AspirationCompaniesScreenState;
  dashboard: DashboardScreenState;
  leads: LeadsScreenState;
  "applications-queue": ApplicationsQueueScreenState;
  "applications-board": ApplicationsBoardScreenState;
  detail: DetailScreenState;
  "workspace-list": WorkspaceListScreenState;
  "workspace-detail": WorkspaceDetailScreenState;
  "workspace-editor": WorkspaceEditorScreenState;
  "workspace-compare": WorkspaceCompareScreenState;
  workflows: WorkflowsScreenState;
  extractors: ExtractorsScreenState;
  agents: AgentsScreenState;
  "agent-detail": AgentDetailScreenState;
  "agent-chat": AgentChatScreenState;
  discover: DiscoverScreenState;
  "network-profile": NetworkProfileScreenState;
  connections: ConnectionsScreenState;
  "messages-inbox": MessagesInboxScreenState;
  "message-thread": MessageThreadScreenState;
  discoverability: DiscoverabilityScreenState;
};

type StatefulScreenId = keyof ScreenStateMap;

type PageMeta = {
  route: string;
  type: string;
  density: string;
  mobileMode: string;
  mobileNote: string;
  note: string;
  observability?: {
    current: {
      title: string;
      body: string;
      contract: string;
      boundary: string;
    };
    proposal: {
      title: string;
      body: string;
      provenance: string;
      boundary: string;
      signalQuality: string;
      decay: string;
    };
  };
  proposal?: {
    title: string;
    body: string;
    provenance: string;
    boundary: string;
  };
  legacy?: {
    title: string;
    body: string;
  };
};

const STATEFUL_SCREENS: StatefulScreenId[] = [
  "profile",
  "aspiration-roles",
  "aspiration-companies",
  "dashboard",
  "leads",
  "applications-queue",
  "applications-board",
  "detail",
  "workspace-list",
  "workspace-detail",
  "workspace-editor",
  "workspace-compare",
  "workflows",
  "extractors",
  "agents",
  "agent-detail",
  "agent-chat",
  "discover",
  "network-profile",
  "connections",
  "messages-inbox",
  "message-thread",
  "discoverability",
];

const OBSERVABILITY_SCREENS: ObservabilityScreenId[] = [
  "dashboard",
  "leads",
  "detail",
  "discoverability",
];

const PAIRED_MOBILE_SCREENS = new Set<ScreenId>([
  "profile",
  "aspiration-roles",
  "aspiration-companies",
  "dashboard",
]);

const SCREENS: { id: ScreenId; label: string; sub: string }[] = [
  { id: "profile", label: "Profile", sub: "Identity hub · direction · profile edit" },
  { id: "aspiration-roles", label: "Role Aspirations", sub: "Direction · saved titles · review" },
  { id: "aspiration-companies", label: "Company Aspirations", sub: "Direction · targets · review" },
  { id: "dashboard", label: "Dashboard", sub: "Decision loop · momentum · triage" },
  { id: "leads", label: "Leads", sub: "Ranking · ranked collection · handoff" },
  { id: "applications-queue", label: "Applications Queue", sub: "Tracking · queue · filters" },
  { id: "applications-board", label: "Applications Board", sub: "Tracking · lanes · reminders" },
  { id: "detail", label: "Application Detail", sub: "Tracking · next step · artifacts" },
  { id: "discover", label: "Discover", sub: "Network trust · curated reachability" },
  { id: "network-profile", label: "Network Profile", sub: "Network trust · private connection gate" },
  { id: "connections", label: "Connections", sub: "Network trust · pending + accepted" },
  { id: "messages-inbox", label: "Messages Inbox", sub: "Human loop · private inbox triage" },
  { id: "message-thread", label: "Message Thread", sub: "Human loop · private conversation route" },
  { id: "discoverability", label: "Discoverability", sub: "Network trust · visibility control" },
  { id: "workspace-list", label: "Workspace List", sub: "Evidence · owned and shared docs" },
  { id: "workspace-detail", label: "Workspace Detail", sub: "Evidence · provenance and history" },
  { id: "workspace-editor", label: "Workspace Editor", sub: "Evidence · create and save versions" },
  { id: "workspace-compare", label: "Workspace Compare", sub: "Evidence · version diff and restore" },
  { id: "workflows", label: "Workflows", sub: "Automation · orchestration and runs" },
  { id: "extractors", label: "Extractors", sub: "Automation · extraction tooling" },
  { id: "agents", label: "Agents", sub: "Automation · reusable operators" },
  { id: "agent-detail", label: "Agent Detail", sub: "Automation · runs and chat sessions" },
  { id: "agent-chat", label: "Agent Chat", sub: "Automation · cited conversation" },
  { id: "auth", label: "Auth", sub: "Sign in · spacious · career control plane" },
];

const PAGE_META: Record<ScreenId, PageMeta> = {
  profile: {
    route: "/me",
    type: "Flagship identity hub",
    density: "Comfortable · guidance + profile editing",
    mobileMode: "Paired 390px mobile",
    mobileNote: "Flagship identity surfaces remain mobile-required in this bundle.",
    note: "State-complete profile coverage for populated, incomplete, and edit-profile mutation states.",
  },
  "aspiration-roles": {
    route: "/me/aspirations/roles",
    type: "Flagship direction collection",
    density: "Comfortable · cards + review panel",
    mobileMode: "Paired 390px mobile",
    mobileNote: "Direction stays legible on mobile before users enter ranking or tracking surfaces.",
    note: "Roles route covers populated, empty, no-signal, and suggestion-review states.",
  },
  "aspiration-companies": {
    route: "/me/aspirations/companies",
    type: "Flagship direction collection",
    density: "Comfortable · cards + review panel",
    mobileMode: "Paired 390px mobile",
    mobileNote: "Company targeting remains a first-class flagship surface on mobile.",
    note: "Companies route covers populated, empty, no-signal, and suggestion-review states.",
  },
  dashboard: {
    route: "/dashboard",
    type: "Decision-loop dashboard",
    density: "Comfortable · mixed blocks + action surfaces",
    mobileMode: "Paired 390px mobile",
    mobileNote: "Dashboard is the only Slice 3 decision surface that must ship with an explicit mobile companion.",
    note: "Populated momentum, no-leads empty, overdue warning, and mutation states stay grounded in shipped action, analytics, and activity behavior.",
    observability: {
      current: {
        title: "Private workflow stays primary",
        body: "The shipped dashboard summarizes direction, action pressure, ranked leads, and recent private activity before it says anything about a broader market read.",
        contract: "Current product keeps the operator anchored in concrete next steps, personal activity, and route-local evidence.",
        boundary: "No public counts, market-wide truth claims, or message access inferences.",
      },
      proposal: {
        title: "Observability stays proposal-labeled",
        body: "A guarded layer can surface coarse candidate-side conditions here, but only as confidence-scoped operator help secondary to the shipped decision loop.",
        provenance: "Derived from private route activity, saved relationship context, and current search direction.",
        boundary: "Private candidate workflow only. No public counts or market-wide observability claims.",
        signalQuality: "Corroborated",
        decay: "Aggressive decay",
      },
    },
  },
  leads: {
    route: "/leads",
    type: "Ranking collection",
    density: "Comfortable · cards + ranking toolbar",
    mobileMode: "Desktop primary",
    mobileNote: "This sweep keeps the registry desktop-primary even though the specimen component supports a mobile companion.",
    note: "Leads now center on extracted opportunities, ranking posture, and apply handoff instead of the old dense table.",
    observability: {
      current: {
        title: "Ranking stays grounded in private fit work",
        body: "The shipped leads route ranks opportunities, preserves notes, and supports apply handoff without pretending it knows a shared market truth.",
        contract: "Current product keeps extracted fit, private intro notes, and handoff readiness attached to the lead itself.",
        boundary: "One-to-one workflow context only. No public visibility bands, popularity reads, or message entitlement.",
      },
      proposal: {
        title: "Leverage hints stay confidence-scoped",
        body: "A future layer can add coarse readiness or response-climate cues, but they must remain proposal-badged and subordinate to private lead review.",
        provenance: "Private relationship notes, route-local activity, and candidate-owned evidence.",
        boundary: "No public market truth claims and no exact relationship scoring.",
        signalQuality: "Corroborated",
        decay: "Aggressive decay",
      },
    },
  },
  "applications-queue": {
    route: "/applications",
    type: "Application collection",
    density: "Comfortable · queue cards + filter chips",
    mobileMode: "Desktop primary",
    mobileNote: "Condensed mobile behavior is documented, but the specimen registry remains desktop-primary in this slice.",
    note: "Queue coverage includes populated, empty, filter-empty, and delete-confirm states.",
  },
  "applications-board": {
    route: "/applications/board",
    type: "Board collection",
    density: "Comfortable · lanes + reminders",
    mobileMode: "Desktop primary",
    mobileNote: "Board behavior is described for condensed screens without promoting a paired phone specimen in the registry.",
    note: "Board coverage spans populated lanes, empty board, overdue reminder warning, and deliberate move or reminder dialogs.",
  },
  detail: {
    route: "/applications/:applicationId",
    type: "Application entity view",
    density: "Comfortable · main column + action sidebar",
    mobileMode: "Desktop primary",
    mobileNote: "Detail condenses to a single-column reading flow in product, but the specimen registry stays desktop-primary here.",
    note: "Application detail covers next-step pressure, missing-artifact warnings, and action or delete dialogs.",
    observability: {
      current: {
        title: "Application detail remains an action surface",
        body: "The shipped detail route keeps next step, history, documents, and private follow-up together instead of promoting any shared-signal narrative.",
        contract: "Current product reads as private application management with explicit artifacts and human follow-through.",
        boundary: "No public market truth, no listing-health claims, and no inference that visibility guarantees response.",
      },
      proposal: {
        title: "Detail-level signals stay bounded",
        body: "A guarded layer could summarize coarse momentum or response conditions here, but only with confidence bands tied to inspectable private evidence.",
        provenance: "Application history, follow-up freshness, attached evidence, and private message activity.",
        boundary: "Proposal cues stay qualitative, privacy-bounded, and reversible when evidence weakens.",
        signalQuality: "Privacy-preserved local evidence",
        decay: "Aggressive decay",
      },
    },
  },
  "workspace-list": {
    route: "/workspace",
    type: "Workspace evidence collection",
    density: "Comfortable · cards + evidence controls",
    mobileMode: "Desktop primary",
    mobileNote: "Workspace evidence routes remain desktop-primary; condensed behavior is documented rather than paired in this slice.",
    note: "List coverage includes owned evidence, first-document empty, filtered shared quiet, and upload or delete mutation states.",
  },
  "workspace-detail": {
    route: "/workspace/:id",
    type: "Workspace evidence detail",
    density: "Comfortable · header + history + versions",
    mobileMode: "Desktop primary",
    mobileNote: "Detail stays desktop-primary because provenance, history, and actions need the wider reading frame.",
    note: "Detail coverage includes populated evidence, quiet no-history, warning, and share mutation states.",
  },
  "workspace-editor": {
    route: "/workspace/new · /workspace/:id/edit",
    type: "Workspace editor route",
    density: "Comfortable · editor + sticky sidebar/footer",
    mobileMode: "Desktop primary",
    mobileNote: "Editor behavior condenses in product, but the reference specimen remains desktop-primary for this slice.",
    note: "Editor coverage spans blank create, populated edit, warning, and inline agent-task mutation states.",
  },
  "workspace-compare": {
    route: "/workspace/:id/compare",
    type: "Workspace compare route",
    density: "Comfortable · version cards + diff paper",
    mobileMode: "Desktop primary",
    mobileNote: "Compare stays desktop-primary because version framing and diff inspection require wider space.",
    note: "Compare coverage spans populated diff, identical quiet state, warning, and restore mutation.",
  },
  workflows: {
    route: "/workflows",
    type: "Automation orchestration route",
    density: "Comfortable · metrics + cards + history",
    mobileMode: "Desktop primary",
    mobileNote: "Workflow orchestration remains desktop-primary in the specimen registry for this slice.",
    note: "Workflow coverage spans populated orchestration, zero-data empty, filtered or raw-service warning states, and deliberate trigger or edit mutations.",
  },
  extractors: {
    route: "/workflows/extractors",
    type: "Automation tooling route",
    density: "Comfortable · table + detail + result",
    mobileMode: "Desktop primary",
    mobileNote: "Extractor tooling keeps condensed behavior documented, but the specimen remains desktop-primary.",
    note: "Extractor coverage spans populated tooling, quiet grid-empty, warning, and run or create mutation states.",
  },
  agents: {
    route: "/automation/agents",
    type: "Automation collection route",
    density: "Comfortable · cards + execution cues",
    mobileMode: "Desktop primary",
    mobileNote: "Agent collection remains desktop-primary; the goal is to show execution posture, not a paired phone mock.",
    note: "Agents coverage spans populated cards, first-agent empty, search or load warning states, and create or toggle mutations.",
  },
  "agent-detail": {
    route: "/automation/agents/:agentId",
    type: "Automation detail route",
    density: "Comfortable · config + runs + chats",
    mobileMode: "Desktop primary",
    mobileNote: "Agent detail stays desktop-primary because configuration, run history, and chat sessions read best together.",
    note: "Agent detail coverage spans populated config, empty not-found or quiet sub-sections, warning, and create-chat mutation states.",
  },
  "agent-chat": {
    route: "/automation/agents/:agentId/chat/:sessionId",
    type: "Automation chat route",
    density: "Comfortable · thread + source controls",
    mobileMode: "Desktop primary",
    mobileNote: "Agent chat remains desktop-primary in this bundle so citations, warnings, and save-to-document controls stay legible.",
    note: "Chat coverage spans populated cited thread, empty ready state, archived read-only, and sending or save mutation states.",
  },
  discover: {
    route: "/network/discover",
    type: "Network-trust collection",
    density: "Comfortable · curated cards + trust callouts",
    mobileMode: "Desktop primary",
    mobileNote: "Desktop remains the primary specimen; condensed behavior is documented rather than paired.",
    note: "Discover covers populated, quiet superuser-only, filter-empty, and request-connection states.",
    proposal: {
      title: "Discovery stays deliberate",
      body: "This route can hint at network leverage only when the cue is explicitly proposal-labeled, confidence-scoped, and clearly separate from any public-market surface.",
      provenance: "Opt-in discoverability settings plus role-fit context.",
      boundary: "Visible on purpose, request-based, and private by default.",
    },
  },
  "network-profile": {
    route: "/network/discover/:userId",
    type: "Network-trust profile",
    density: "Comfortable · profile summary + message gate",
    mobileMode: "Desktop primary",
    mobileNote: "Condensed behavior is documented, but this slice keeps the canonical specimen on desktop.",
    note: "Profile states stay focused on connection request, connected message access, and locked inbox gates.",
    proposal: {
      title: "Message access is a trust boundary",
      body: "Forward-looking leverage cues can reference why someone surfaced, but they must never blur the difference between visibility, connection acceptance, and message access.",
      provenance: "Discoverability settings, current relationship state, and targeted role fit.",
      boundary: "Connection state first. Messaging is not a public right or a social-feed affordance.",
    },
  },
  connections: {
    route: "/network/connections",
    type: "Network-trust collection",
    density: "Comfortable · mixed pending + accepted cards",
    mobileMode: "Desktop primary",
    mobileNote: "Desktop remains the main specimen while condensed behavior stays documented-only in this sweep.",
    note: "Connections covers populated, empty, filter-empty, and private mutation states.",
  },
  discoverability: {
    route: "/settings/discoverability",
    type: "Visibility settings route",
    density: "Comfortable · settings card + inline feedback",
    mobileMode: "Desktop primary",
    mobileNote: "Visibility settings keep condensed behavior notes here instead of a paired mobile specimen.",
    note: "Discoverability covers visible, hidden, saving-toggle, and inline error states.",
    observability: {
      current: {
        title: "Visibility stays opt-in and private",
        body: "The shipped discoverability route is a trust control. It explains whether someone can be surfaced without turning that setting into a public observability layer.",
        contract: "Current product keeps discoverability, reachability, and messaging gates separate and explicit.",
        boundary: "Being visible never implies public access, direct-message rights, or shared market status.",
      },
      proposal: {
        title: "Shared-signal posture stays guarded",
        body: "A future layer can describe how visible the operator may be to others, but only as proposal-only guidance with confidence-scoped language and privacy bounds.",
        provenance: "Opt-in discoverability settings, trust posture, and route-local engagement quality.",
        boundary: "No public leaderboard, exact impression counts, or broad discover guarantees.",
        signalQuality: "Self-reported",
        decay: "Aggressive decay",
      },
    },
  },
  "messages-inbox": {
    route: "/network/messages",
    type: "Private messaging inbox",
    density: "Comfortable · inbox triage + state-complete list",
    mobileMode: "Desktop primary",
    mobileNote: "Private messaging is the shipped human loop, but operator-design keeps the route family desktop-primary while list triage and thread reading stay separated.",
    note: "Canonical coverage for `/network/messages` now lives in the dedicated inbox specimen with populated, no-conversations, search-empty, and new-conversation states.",
    legacy: {
      title: "Legacy combined specimen is retired from the registry",
      body: "The old single-frame `MessagesScreen` remains on disk only as historical reference. Route coverage now treats inbox and thread as first-class specimens.",
    },
  },
  "message-thread": {
    route: "/network/messages/:conversationId",
    type: "Private messaging thread",
    density: "Comfortable · inline thread + compose",
    mobileMode: "Desktop primary",
    mobileNote: "Thread reading and compose remain desktop-primary here because participant context, inline edits, and delete gates read best on the wider frame.",
    note: "Canonical coverage for `/network/messages/:conversationId` now lives in the dedicated thread specimen with populated, quiet empty, error, and mutation states.",
    legacy: {
      title: "Legacy combined specimen no longer defines the route",
      body: "The split message thread is now the contract surface. The previous combined frame should not be treated as canonical route behavior.",
    },
  },
  auth: {
    route: "/login",
    type: "Auth surface",
    density: "Spacious · hero + form",
    mobileMode: "Desktop primary",
    mobileNote: "Auth already supports display-heavy layout treatment and does not change in this sweep.",
    note: "Display typography may expand here without changing collection rules.",
  },
};

const STATE_OPTIONS: Record<StatefulScreenId, { id: string; label: string }[]> = {
  profile: [
    { id: "populated", label: "Populated" },
    { id: "warning", label: "Incomplete" },
    { id: "edit", label: "Edit Profile" },
  ],
  "aspiration-roles": [
    { id: "populated", label: "Populated" },
    { id: "empty", label: "Empty" },
    { id: "no_signal", label: "No Signal" },
    { id: "review", label: "Review" },
  ],
  "aspiration-companies": [
    { id: "populated", label: "Populated" },
    { id: "empty", label: "Empty" },
    { id: "no_signal", label: "No Signal" },
    { id: "review", label: "Review" },
  ],
  dashboard: [
    { id: "momentum", label: "Momentum" },
    { id: "no_leads", label: "No Leads" },
    { id: "overdue", label: "Overdue" },
    { id: "mutation", label: "Mutation" },
  ],
  leads: [
    { id: "ranked", label: "Ranked" },
    { id: "no_leads_imported", label: "No Leads" },
    { id: "filter_empty", label: "Filter Empty" },
    { id: "modal", label: "Modal" },
  ],
  "applications-queue": [
    { id: "populated", label: "Populated" },
    { id: "no_applications", label: "Empty" },
    { id: "filter_empty", label: "Filter Empty" },
    { id: "delete_confirm", label: "Delete Confirm" },
  ],
  "applications-board": [
    { id: "populated", label: "Populated" },
    { id: "empty_board", label: "Empty Board" },
    { id: "overdue_warning", label: "Overdue" },
    { id: "move_dialog", label: "Move Dialog" },
    { id: "reminder_dialog", label: "Reminder Dialog" },
  ],
  detail: [
    { id: "populated", label: "Populated" },
    { id: "overdue_warning", label: "Overdue" },
    { id: "missing_artifact_warning", label: "Missing Artifact" },
    { id: "create_action_item", label: "Create Action" },
    { id: "delete_confirm", label: "Delete Confirm" },
  ],
  "workspace-list": [
    { id: "populated_personal_collection", label: "Populated" },
    { id: "first_document_empty", label: "First Document" },
    { id: "shared_filter_quiet", label: "Shared Quiet" },
    { id: "upload_delete_mutation", label: "Mutation" },
  ],
  "workspace-detail": [
    { id: "populated", label: "Populated" },
    { id: "quiet", label: "Quiet" },
    { id: "warning", label: "Warning" },
    { id: "mutation", label: "Mutation" },
  ],
  "workspace-editor": [
    { id: "create", label: "Create" },
    { id: "edit", label: "Edit" },
    { id: "warning", label: "Warning" },
    { id: "mutation", label: "Mutation" },
  ],
  "workspace-compare": [
    { id: "populated", label: "Populated" },
    { id: "identical", label: "Identical" },
    { id: "warning", label: "Warning" },
    { id: "mutation", label: "Mutation" },
  ],
  workflows: [
    { id: "populated", label: "Populated" },
    { id: "no_workflows", label: "No Workflows" },
    { id: "filtered_run_quiet", label: "Filtered Quiet" },
    { id: "raw_service_warning", label: "Raw Warning" },
    { id: "mutation", label: "Mutation" },
  ],
  extractors: [
    { id: "populated", label: "Populated" },
    { id: "empty", label: "Empty" },
    { id: "warning", label: "Warning" },
    { id: "mutation", label: "Mutation" },
  ],
  agents: [
    { id: "populated", label: "Populated" },
    { id: "first_agent_empty", label: "First Agent" },
    { id: "search_empty", label: "Search Empty" },
    { id: "load_failure", label: "Load Failure" },
    { id: "mutation", label: "Mutation" },
  ],
  "agent-detail": [
    { id: "populated", label: "Populated" },
    { id: "empty", label: "Empty" },
    { id: "warning", label: "Warning" },
    { id: "mutation", label: "Mutation" },
  ],
  "agent-chat": [
    { id: "populated", label: "Populated" },
    { id: "empty", label: "Empty" },
    { id: "archived", label: "Archived" },
    { id: "mutation", label: "Mutation" },
  ],
  discover: [
    { id: "populated", label: "Populated" },
    { id: "superuser_empty", label: "Superuser Only" },
    { id: "filter_empty", label: "Filter Empty" },
    { id: "request_connection", label: "Request" },
  ],
  "network-profile": [
    { id: "connectable", label: "Connectable" },
    { id: "connected_message", label: "Connected Message" },
    { id: "locked_message_gate", label: "Message Gate" },
  ],
  connections: [
    { id: "populated", label: "Populated" },
    { id: "empty", label: "Empty" },
    { id: "filter_empty", label: "Filter Empty" },
    { id: "mutation", label: "Mutation" },
  ],
  "messages-inbox": [
    { id: "populated", label: "Populated" },
    { id: "no_conversations", label: "No Conversations" },
    { id: "search_empty", label: "Search Empty" },
    { id: "new_conversation", label: "New Conversation" },
  ],
  "message-thread": [
    { id: "populated", label: "Populated" },
    { id: "no_messages_yet", label: "No Messages Yet" },
    { id: "load_error", label: "Load Error" },
    { id: "mutation", label: "Mutation" },
  ],
  discoverability: [
    { id: "visible", label: "Visible" },
    { id: "hidden", label: "Hidden" },
    { id: "saving_toggle", label: "Saving" },
    { id: "error_feedback", label: "Inline Error" },
  ],
};

const ICONS: Record<string, string> = {
  Dashboard: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  Leads: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z",
  Applications: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6",
  Messages: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  Workflows: "M4 6h16M4 12h10M4 18h16",
  Workspace: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z",
  Agents: "M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 010 2h-1v1a2 2 0 01-2 2v1a1 1 0 01-2 0v-1H7v1a1 1 0 01-2 0v-1a2 2 0 01-2-2v-1H2a1 1 0 010-2h1a7 7 0 017-7h1V5.73A2 2 0 0110 4a2 2 0 012-2z",
  Profile: "M20 21a8 8 0 10-16 0M12 11a4 4 0 100-8 4 4 0 000 8z",
  Settings: "M12 8.5A3.5 3.5 0 1015.5 12 3.5 3.5 0 0012 8.5zm7 3.5l2 1-2 1-.5 1.7 1.4 1.7-1.4 1.4-1.7-1.4L14 19l-1 2-1-2-1.7-.5-1.7 1.4-1.4-1.4 1.4-1.7L5 14l-2-1 2-1 .5-1.7-1.4-1.7 1.4-1.4 1.7 1.4L10 5l1-2 1 2 1.7.5 1.7-1.4 1.4 1.4-1.4 1.7z",
  Aspirations: "M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.8 7.2 18l.9-5.4L4.2 8.7l5.4-.8z",
};

function isStatefulScreen(id: ScreenId): id is StatefulScreenId {
  return STATEFUL_SCREENS.includes(id as StatefulScreenId);
}

function isObservabilityScreen(id: ScreenId): id is ObservabilityScreenId {
  return OBSERVABILITY_SCREENS.includes(id as ObservabilityScreenId);
}

function AppChrome({ screen, children }: { screen: ScreenId; children: React.ReactNode }) {
  const { T } = useTheme();

  if (screen === "auth") {
    return <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>{children}</div>;
  }

  const activeTopRoute: Partial<Record<ScreenId, string>> = {
    dashboard: "Dashboard",
    leads: "Leads",
    "applications-queue": "Applications",
    "applications-board": "Applications",
    detail: "Applications",
    "workspace-list": "Workspace",
    "workspace-detail": "Workspace",
    "workspace-editor": "Workspace",
    "workspace-compare": "Workspace",
    workflows: "Workflows",
    extractors: "Workflows",
    agents: "Agents",
    "agent-detail": "Agents",
    "agent-chat": "Agents",
    discover: "Messages",
    "network-profile": "Messages",
    connections: "Messages",
    "messages-inbox": "Messages",
    "message-thread": "Messages",
  };

  const activeUserRoute: Partial<Record<ScreenId, string>> = {
    profile: "Profile",
    "aspiration-roles": "Aspirations",
    "aspiration-companies": "Aspirations",
    discoverability: "Settings",
  };

  const breadcrumb: Partial<Record<ScreenId, string[]>> = {
    dashboard: ["Dashboard"],
    profile: ["Profile & Aspirations"],
    "aspiration-roles": ["Profile & Aspirations", "Roles"],
    "aspiration-companies": ["Profile & Aspirations", "Companies"],
    leads: ["Job Search", "Leads"],
    "applications-queue": ["Applications", "Queue"],
    "applications-board": ["Applications", "Board"],
    detail: ["Applications", "Application"],
    "workspace-list": ["Workspace"],
    "workspace-detail": ["Workspace", "Document"],
    "workspace-editor": ["Workspace", "Editor"],
    "workspace-compare": ["Workspace", "Compare"],
    workflows: ["Automation", "Workflows"],
    extractors: ["Automation", "Extractors"],
    agents: ["Automation", "Agents"],
    "agent-detail": ["Automation", "Agent"],
    "agent-chat": ["Automation", "Chat"],
    discover: ["Network", "Discover"],
    "network-profile": ["Network", "Profile"],
    connections: ["Network", "Connections"],
    "messages-inbox": ["Network", "Messages"],
    "message-thread": ["Network", "Messages", "Conversation"],
    discoverability: ["Settings", "Discoverability"],
  };

  const navItems = ["Dashboard", "Leads", "Applications", "Messages", "Workflows", "Agents", "Workspace"] as const;
  const userItems = ["Profile", "Settings", "Aspirations"] as const;
  const crumbs = breadcrumb[screen] || [];

  return (
    <div style={{ display: "flex", height: "100%", background: T.bg }}>
      <div style={{ width: 56, background: T.base, borderRight: `1px solid ${T.s1}`, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 10, gap: 8, flexShrink: 0, paddingBottom: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: T.r2, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
          <span style={{ fontFamily: T.fontHead, fontWeight: 800, fontSize: 13, color: "#fff" }}>B</span>
        </div>
        {navItems.map((item) => {
          const isActive = activeTopRoute[screen] === item;
          return (
            <div
              key={item}
              title={item}
              style={{
                width: 34,
                height: 34,
                borderRadius: T.r2,
                background: isActive ? T.accentDim : "transparent",
                border: `1px solid ${isActive ? T.aStroke : "transparent"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "default",
              }}
            >
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke={isActive ? T.accent : T.t1} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: isActive ? 1 : 0.4 }}>
                <path d={ICONS[item]} />
              </svg>
            </div>
          );
        })}
        <div style={{ width: 20, height: 1, background: T.s1, margin: "2px 0 4px" }} />
        {userItems.map((item) => {
          const isActive = activeUserRoute[screen] === item;
          return (
            <div
              key={item}
              title={item}
              style={{
                width: 34,
                height: 34,
                borderRadius: T.r2,
                background: isActive ? T.accentDim : "transparent",
                border: `1px solid ${isActive ? T.aStroke : "transparent"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "default",
              }}
            >
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke={isActive ? T.accent : T.t1} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: isActive ? 1 : 0.4 }}>
                <path d={ICONS[item]} />
              </svg>
            </div>
          );
        })}
        <div style={{ marginTop: "auto", width: 26, height: 26, borderRadius: T.rFull, background: T.t2, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 9, color: T.bg }}>JK</span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ height: 48, background: T.base, borderBottom: `1px solid ${T.s1}`, display: "flex", alignItems: "center", padding: "0 20px", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {crumbs.map((seg, index) => (
              <span key={seg} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {index > 0 && <span style={{ color: T.t2, fontSize: 14 }}>/</span>}
                <span style={{ fontFamily: T.fontMono, fontSize: 12, color: index === crumbs.length - 1 ? T.t0 : T.t1, fontWeight: index === crumbs.length - 1 ? 600 : 400 }}>{seg}</span>
              </span>
            ))}
          </div>

          <div style={{ height: 28, width: 220, background: T.s0, border: `1px solid ${T.s1}`, borderRadius: T.r2, display: "flex", alignItems: "center", padding: "0 10px", gap: 6 }}>
            <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke={T.t2} strokeWidth={1.5} strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span style={{ fontFamily: T.fontMono, fontSize: 12, color: T.t2, flex: 1 }}>Search</span>
            <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, background: T.raised, borderRadius: T.r1, padding: "1px 5px" }}>⌘K</span>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: T.r2, background: T.s0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={T.t1} strokeWidth={1.5} strokeLinecap="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <div style={{ position: "absolute", top: 5, right: 5, width: 6, height: 6, borderRadius: T.rFull, background: T.error, border: `1px solid ${T.base}` }} />
            </div>
            <div style={{ width: 28, height: 28, borderRadius: T.r2, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 14, color: "#fff" }}>+</span>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: T.rFull, background: T.t2, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 9, color: T.bg }}>JK</span>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
      </div>
    </div>
  );
}

export function ScreensView() {
  const { T } = useTheme();
  const [active, setActive] = useState<ScreenId>("dashboard");
  const [screenStates, setScreenStates] = useState<ScreenStateMap>({
    profile: "populated",
    "aspiration-roles": "populated",
    "aspiration-companies": "populated",
    dashboard: "momentum",
    leads: "ranked",
    "applications-queue": "populated",
    "applications-board": "populated",
    detail: "populated",
    "workspace-list": "populated_personal_collection",
    "workspace-detail": "populated",
    "workspace-editor": "edit",
    "workspace-compare": "populated",
    workflows: "populated",
    extractors: "populated",
    agents: "populated",
    "agent-detail": "populated",
    "agent-chat": "populated",
    discover: "populated",
    "network-profile": "connectable",
    connections: "populated",
    "messages-inbox": "populated",
    "message-thread": "populated",
    discoverability: "hidden",
  });
  const [dashboardMutationMode, setDashboardMutationMode] = useState<DashboardScreenMutationMode>("action-triage");
  const [leadsModalMode, setLeadsModalMode] = useState<LeadsScreenModalMode>("lead-review");
  const [workflowsMutationFocus, setWorkflowsMutationFocus] = useState<WorkflowsScreenMutationFocus>("trigger");
  const [agentsMutationMode, setAgentsMutationMode] = useState<AgentsScreenMutationMode>("edit");
  const [observabilityModes, setObservabilityModes] = useState<Record<ObservabilityScreenId, ObservabilityLayerMode>>({
    dashboard: "current",
    leads: "current",
    detail: "current",
    discoverability: "current",
  });

  const meta = PAGE_META[active];
  const pairedMobile = PAIRED_MOBILE_SCREENS.has(active);
  const currentState = isStatefulScreen(active) ? screenStates[active] : null;
  const stateOptions = isStatefulScreen(active) ? STATE_OPTIONS[active] : [];
  const activeStateLabel = currentState === null ? null : stateOptions.find((option) => option.id === currentState)?.label ?? null;
  const activeObservabilityMode = isObservabilityScreen(active) ? observabilityModes[active] : null;

  const setActiveScreenState = (screen: StatefulScreenId, state: string) => {
    setScreenStates((prev) => ({ ...prev, [screen]: state } as ScreenStateMap));
  };

  const setObservabilityMode = (screen: ObservabilityScreenId, mode: ObservabilityLayerMode) => {
    setObservabilityModes((prev) => ({ ...prev, [screen]: mode }));
  };

  const renderScreen = (mobile = false) => {
    switch (active) {
      case "profile":
        return <ProfileScreen state={screenStates.profile} mobile={mobile} />;
      case "aspiration-roles":
        return <AspirationRolesScreen state={screenStates["aspiration-roles"]} mobile={mobile} />;
      case "aspiration-companies":
        return <AspirationCompaniesScreen state={screenStates["aspiration-companies"]} mobile={mobile} />;
      case "dashboard":
        return (
          <DashboardScreen
            state={screenStates.dashboard}
            mutationMode={dashboardMutationMode}
            mobile={mobile}
            observabilityMode={observabilityModes.dashboard}
          />
        );
      case "leads":
        return (
          <LeadsScreen
            state={screenStates.leads}
            modalMode={leadsModalMode}
            mobile={mobile}
            observabilityMode={observabilityModes.leads}
          />
        );
      case "applications-queue":
        return <ApplicationsQueueScreen state={screenStates["applications-queue"]} mobile={mobile} />;
      case "applications-board":
        return <ApplicationsBoardScreen state={screenStates["applications-board"]} mobile={mobile} />;
      case "detail":
        return (
          <DetailScreen
            state={screenStates.detail}
            mobile={mobile}
            observabilityMode={observabilityModes.detail}
          />
        );
      case "workspace-list":
        return <WorkspaceListScreen state={screenStates["workspace-list"]} mobile={mobile} />;
      case "workspace-detail":
        return <WorkspaceDetailScreen state={screenStates["workspace-detail"]} mobile={mobile} />;
      case "workspace-editor":
        return <WorkspaceEditorScreen state={screenStates["workspace-editor"]} mobile={mobile} />;
      case "workspace-compare":
        return <WorkspaceCompareScreen state={screenStates["workspace-compare"]} mobile={mobile} />;
      case "workflows":
        return <WorkflowsScreen state={screenStates.workflows} mutationFocus={workflowsMutationFocus} mobile={mobile} />;
      case "extractors":
        return <ExtractorsScreen state={screenStates.extractors} mobile={mobile} />;
      case "agents":
        return <AgentsScreen state={screenStates.agents} mutationMode={agentsMutationMode} mobile={mobile} />;
      case "agent-detail":
        return <AgentDetailScreen state={screenStates["agent-detail"]} mobile={mobile} />;
      case "agent-chat":
        return <AgentChatScreen state={screenStates["agent-chat"]} mobile={mobile} />;
      case "discover":
        return <DiscoverScreen state={screenStates.discover} mobile={mobile} />;
      case "network-profile":
        return <NetworkProfileScreen state={screenStates["network-profile"]} mobile={mobile} />;
      case "connections":
        return <ConnectionsScreen state={screenStates.connections} mobile={mobile} />;
      case "messages-inbox":
        return <MessagesInboxScreen state={screenStates["messages-inbox"]} />;
      case "message-thread":
        return <MessageThreadScreen state={screenStates["message-thread"]} />;
      case "discoverability":
        return (
          <DiscoverabilityScreen
            state={screenStates.discoverability}
            mobile={mobile}
            observabilityMode={observabilityModes.discoverability}
          />
        );
      case "auth":
        return <AuthScreen />;
      default:
        return null;
    }
  };

  const renderSecondaryToggle = () => {
    if (active === "dashboard" && screenStates.dashboard === "mutation") {
      const options: { id: DashboardScreenMutationMode; label: string }[] = [
        { id: "action-triage", label: "Action Triage" },
        { id: "create-action", label: "Create Action" },
      ];

      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.09em" }}>Mutation mode</span>
          {options.map((option) => {
            const isActive = option.id === dashboardMutationMode;
            return (
              <button
                key={option.id}
                onClick={() => setDashboardMutationMode(option.id)}
                style={{
                  height: 30,
                  padding: "0 12px",
                  borderRadius: T.rFull,
                  border: `1px solid ${isActive ? T.aStroke : T.s1}`,
                  background: isActive ? T.accentDim : T.base,
                  color: isActive ? T.accent : T.t1,
                  fontFamily: T.fontMono,
                  fontSize: 10.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      );
    }

    if (active === "leads" && screenStates.leads === "modal") {
      const options: { id: LeadsScreenModalMode; label: string }[] = [
        { id: "lead-review", label: "Lead Review" },
        { id: "apply-handoff", label: "Apply Handoff" },
      ];

      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.09em" }}>Modal mode</span>
          {options.map((option) => {
            const isActive = option.id === leadsModalMode;
            return (
              <button
                key={option.id}
                onClick={() => setLeadsModalMode(option.id)}
                style={{
                  height: 30,
                  padding: "0 12px",
                  borderRadius: T.rFull,
                  border: `1px solid ${isActive ? T.aStroke : T.s1}`,
                  background: isActive ? T.accentDim : T.base,
                  color: isActive ? T.accent : T.t1,
                  fontFamily: T.fontMono,
                  fontSize: 10.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      );
    }

    if (active === "workflows" && screenStates.workflows === "mutation") {
      const options: { id: WorkflowsScreenMutationFocus; label: string }[] = [
        { id: "trigger", label: "Trigger" },
        { id: "edit", label: "Edit" },
        { id: "delete", label: "Delete" },
      ];

      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.09em" }}>Mutation mode</span>
          {options.map((option) => {
            const isActive = option.id === workflowsMutationFocus;
            return (
              <button
                key={option.id}
                onClick={() => setWorkflowsMutationFocus(option.id)}
                style={{
                  height: 30,
                  padding: "0 12px",
                  borderRadius: T.rFull,
                  border: `1px solid ${isActive ? T.aStroke : T.s1}`,
                  background: isActive ? T.accentDim : T.base,
                  color: isActive ? T.accent : T.t1,
                  fontFamily: T.fontMono,
                  fontSize: 10.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      );
    }

    if (active === "agents" && screenStates.agents === "mutation") {
      const options: { id: AgentsScreenMutationMode; label: string }[] = [
        { id: "create", label: "Create" },
        { id: "edit", label: "Edit" },
        { id: "delete", label: "Delete" },
        { id: "toggle", label: "Toggle" },
      ];

      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.09em" }}>Mutation mode</span>
          {options.map((option) => {
            const isActive = option.id === agentsMutationMode;
            return (
              <button
                key={option.id}
                onClick={() => setAgentsMutationMode(option.id)}
                style={{
                  height: 30,
                  padding: "0 12px",
                  borderRadius: T.rFull,
                  border: `1px solid ${isActive ? T.aStroke : T.s1}`,
                  background: isActive ? T.accentDim : T.base,
                  color: isActive ? T.accent : T.t1,
                  fontFamily: T.fontMono,
                  fontSize: 10.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      );
    }

    return null;
  };

  const renderObservabilityToggle = () => {
    if (!isObservabilityScreen(active) || activeObservabilityMode === null) {
      return null;
    }

    return (
      <ScreenModeToggle
        label="Observability layer"
        value={activeObservabilityMode}
        onChange={(mode) => setObservabilityMode(active, mode)}
        options={[
          { id: "current", label: "Current Product" },
          { id: "proposal", label: "Observability Proposal" },
        ]}
      />
    );
  };

  const supportingPanel = meta.observability && activeObservabilityMode
    ? (
        <ObservabilityLayerCard
          mode={activeObservabilityMode}
          current={meta.observability.current}
          proposal={meta.observability.proposal}
        />
      )
    : meta.proposal
      ? (
          <ScreenProposal
            title={meta.proposal.title}
            body={meta.proposal.body}
            provenance={meta.proposal.provenance}
            boundary={meta.proposal.boundary}
          />
        )
      : null;

  const legacyPanel = meta.legacy
    ? (
        <div style={{ padding: "12px 14px", background: T.base, border: `1px solid ${T.s1}`, borderLeft: `2px solid ${T.t2}`, borderRadius: T.r2, display: "grid", gap: 6 }}>
          <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: 0, textTransform: "uppercase", letterSpacing: "0.09em" }}>Legacy specimen</p>
          <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: 0, letterSpacing: "-0.01em" }}>{meta.legacy.title}</p>
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{meta.legacy.body}</p>
        </div>
      )
    : null;
  const observabilityToggle = renderObservabilityToggle();

  const desktopFrame = (
    <div style={{ border: `1px solid ${T.s2}`, borderRadius: T.r3, overflow: "hidden", background: T.bg, minHeight: 720, height: active === "auth" ? 640 : 760 }}>
      <AppChrome screen={active}>{renderScreen(false)}</AppChrome>
    </div>
  );
  const hasSupportPanels = isStatefulScreen(active) || supportingPanel || legacyPanel;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: T.fontMono, fontSize: 11, color: T.accent, margin: "0 0 6px", letterSpacing: "0.1em" }}>ROUTE SPECIMENS · OPERATOR</p>
        <h1 style={{ fontFamily: T.fontHead, fontWeight: 800, fontSize: 36, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.03em" }}>Route Specimens</h1>
        <p style={{ fontFamily: T.fontBody, fontSize: 14, color: T.t1, maxWidth: 760, lineHeight: 1.65, margin: 0 }}>
          Reference-only compositions for Baldin&apos;s flagship route families. The bundle reads as direction before tracking, then deliberate network reachability and private messaging as the shipped human loop, then user-owned evidence and operator-commanded execution. Any observability layer stays guarded, confidence-scoped, and secondary to private workflow. Mobile pairing is required only where the flagship contract calls for it.
        </p>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {SCREENS.map((screen) => (
          <button
            key={screen.id}
            onClick={() => setActive(screen.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "8px 14px",
              borderRadius: T.r2,
              border: `1px solid ${active === screen.id ? T.aStroke : T.s1}`,
              background: active === screen.id ? T.accentDim : T.raised,
              cursor: "pointer",
              textAlign: "left",
              minWidth: 144,
            }}
          >
            <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 12, color: active === screen.id ? T.accent : T.t0 }}>{screen.label}</span>
            <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2 }}>{screen.sub}</span>
          </button>
        ))}
      </div>

      {isStatefulScreen(active) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.09em" }}>States</span>
          {stateOptions.map((option) => {
            const isActive = option.id === currentState;
            return (
              <button
                key={option.id}
                onClick={() => setActiveScreenState(active, option.id)}
                style={{
                  height: 30,
                  padding: "0 12px",
                  borderRadius: T.rFull,
                  border: `1px solid ${isActive ? T.aStroke : T.s1}`,
                  background: isActive ? T.accentDim : T.base,
                  color: isActive ? T.accent : T.t1,
                  fontFamily: T.fontMono,
                  fontSize: 10.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            );
          })}
          <span style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, marginLeft: 8 }}>
            {pairedMobile ? "Desktop and 390px mobile compositions stay synchronized for this flagship route." : "Desktop-primary routes keep condensed-behavior notes here without promoting a paired phone specimen."}
          </span>
        </div>
      )}

      {renderSecondaryToggle()}
      {observabilityToggle && <div style={{ marginBottom: 16 }}>{observabilityToggle}</div>}

      {pairedMobile ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 414px", gap: 14, alignItems: "start" }}>
          {desktopFrame}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ padding: "10px 12px", background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
              <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.accent, margin: "0 0 4px", letterSpacing: "0.09em" }}>390PX MOBILE PAIR</p>
              <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{meta.mobileNote}</p>
            </div>
            {supportingPanel}
            {legacyPanel}
            {renderScreen(true)}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {desktopFrame}
          {hasSupportPanels && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
              <div style={{ padding: "12px 14px", background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
                <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.accent, margin: "0 0 4px", letterSpacing: "0.09em" }}>DESKTOP-PRIMARY NOTE</p>
                <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{meta.mobileNote}</p>
              </div>
              {supportingPanel}
              {legacyPanel}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 12, padding: "10px 16px", background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r2, display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontFamily: T.fontBody, fontWeight: 600, fontSize: 10, letterSpacing: "0.09em", textTransform: "uppercase", color: T.t2, margin: "0 0 2px" }}>Route</p>
          <p style={{ fontFamily: T.fontMono, fontSize: 12, color: T.t0, margin: 0 }}>{meta.route}</p>
        </div>
        <div>
          <p style={{ fontFamily: T.fontBody, fontWeight: 600, fontSize: 10, letterSpacing: "0.09em", textTransform: "uppercase", color: T.t2, margin: "0 0 2px" }}>Page type</p>
          <p style={{ fontFamily: T.fontMono, fontSize: 12, color: T.t0, margin: 0 }}>{meta.type}</p>
        </div>
        <div>
          <p style={{ fontFamily: T.fontBody, fontWeight: 600, fontSize: 10, letterSpacing: "0.09em", textTransform: "uppercase", color: T.t2, margin: "0 0 2px" }}>Density</p>
          <p style={{ fontFamily: T.fontMono, fontSize: 12, color: T.t0, margin: 0 }}>{meta.density}</p>
        </div>
        <div>
          <p style={{ fontFamily: T.fontBody, fontWeight: 600, fontSize: 10, letterSpacing: "0.09em", textTransform: "uppercase", color: T.t2, margin: "0 0 2px" }}>Mobile</p>
          <p style={{ fontFamily: T.fontMono, fontSize: 12, color: T.t0, margin: 0 }}>{meta.mobileMode}</p>
        </div>
        {activeStateLabel && (
          <div>
            <p style={{ fontFamily: T.fontBody, fontWeight: 600, fontSize: 10, letterSpacing: "0.09em", textTransform: "uppercase", color: T.t2, margin: "0 0 2px" }}>State</p>
            <p style={{ fontFamily: T.fontMono, fontSize: 12, color: T.t0, margin: 0 }}>{activeStateLabel}</p>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 260 }}>
          <p style={{ fontFamily: T.fontBody, fontWeight: 600, fontSize: 10, letterSpacing: "0.09em", textTransform: "uppercase", color: T.t2, margin: "0 0 2px" }}>Annotation</p>
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, margin: 0, lineHeight: 1.55 }}>{meta.note}</p>
        </div>
      </div>
    </div>
  );
}
