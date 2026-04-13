import type { ReactNode } from 'react';
import {
  AddCommentOutlined as NewMessageIcon,
  AddTaskOutlined as NewLeadIcon,
  AutoAwesome as BrandIcon,
  Dashboard as DashboardIcon,
  Description as WorkspaceIcon,
  ForumOutlined as MessagesIcon,
  Hub as WorkflowsIcon,
  LightMode as LightModeIcon,
  Logout as LogoutIcon,
  NoteAddOutlined as NewDocumentIcon,
  PeopleAltOutlined as PeopleIcon,
  Person as ProfileIcon,
  PlaylistAddOutlined as NewWorkflowIcon,
  Search as DiscoverIcon,
  Settings as SettingsIcon,
  SmartToyOutlined as AgentsIcon,
  TravelExplore as ConnectionsIcon,
  WorkOutline as LeadsIcon,
  Assignment as ApplicationsIcon,
  Badge as RolesIcon,
  BusinessOutlined as CompaniesIcon,
  TrendingUp as AspirationsIcon,
  SchemaOutlined as ExtractorIcon,
  SmartToy as NewAgentIcon,
} from '@mui/icons-material';
import {
  drawerSections,
  secondaryNavByGroup,
  userRailItems,
  type NavIconKey,
  type NavigationItem,
  type NavigationLinkItem,
} from '../route/navigation';

export interface CommandPaletteVisibilityContext {
  isSuperuser: boolean;
}

export interface CommandPaletteItem {
  id: string;
  section: 'actions' | 'navigation';
  title: string;
  subtitle?: string;
  keywords: string[];
  icon: ReactNode;
  run: () => void | Promise<void>;
  visible?: (context: CommandPaletteVisibilityContext) => boolean;
}

export interface CommandPaletteActions {
  openNewMessage: () => void | Promise<void>;
  openNewAgent: () => void | Promise<void>;
  openNewLead: () => void | Promise<void>;
  openNewDocument: () => void | Promise<void>;
  openNewWorkflow: () => void | Promise<void>;
  openCreateExtractor: () => void | Promise<void>;
  toggleTheme: () => void | Promise<void>;
  signOut: () => void | Promise<void>;
}

export interface BuildCommandPaletteItemsOptions {
  navigate: (path: string) => void;
  actions: CommandPaletteActions;
}

const navIcons: Record<NavIconKey, ReactNode> = {
  dashboard: <DashboardIcon fontSize="small" />,
  leads: <LeadsIcon fontSize="small" />,
  applications: <ApplicationsIcon fontSize="small" />,
  messages: <MessagesIcon fontSize="small" />,
  people: <PeopleIcon fontSize="small" />,
  connections: <ConnectionsIcon fontSize="small" />,
  discover: <DiscoverIcon fontSize="small" />,
  agents: <AgentsIcon fontSize="small" />,
  workflows: <WorkflowsIcon fontSize="small" />,
  workspace: <WorkspaceIcon fontSize="small" />,
  profile: <ProfileIcon fontSize="small" />,
  settings: <SettingsIcon fontSize="small" />,
  aspirations: <AspirationsIcon fontSize="small" />,
  roles: <RolesIcon fontSize="small" />,
  companies: <CompaniesIcon fontSize="small" />,
};

const secondaryPathIcons: Record<string, ReactNode> = {
  '/leads/companies': <CompaniesIcon fontSize="small" />,
  '/applications/board': <ApplicationsIcon fontSize="small" />,
  '/workflows/extractors': <ExtractorIcon fontSize="small" />,
  '/workflows/db-management': <WorkflowsIcon fontSize="small" />,
  '/workflows/review': <WorkflowsIcon fontSize="small" />,
  '/workflows/crawlers': <WorkflowsIcon fontSize="small" />,
};

function flattenLinks(items: NavigationItem[]): NavigationLinkItem[] {
  return items.flatMap((item) => {
    if (item.kind === 'group') {
      return flattenLinks(item.children);
    }

    return [item];
  });
}

function tokenizePath(path: string): string[] {
  return path
    .split('/')
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean);
}

function createNavigationItem(
  title: string,
  path: string,
  icon: ReactNode,
  navigate: (path: string) => void,
  keywords: string[] = [],
  superuserOnly = false,
): CommandPaletteItem {
  return {
    id: `navigation:${path}`,
    section: 'navigation',
    title,
    subtitle: path,
    keywords: [...tokenizePath(path), ...keywords],
    icon,
    run: () => navigate(path),
    visible: superuserOnly ? (context) => context.isSuperuser : undefined,
  };
}

function buildNavigationItems(navigate: (path: string) => void): CommandPaletteItem[] {
  const itemsByPath = new Map<string, CommandPaletteItem>();

  for (const item of [...flattenLinks(drawerSections.flatMap((section) => section.items)), ...flattenLinks(userRailItems)]) {
    itemsByPath.set(
      item.path,
      createNavigationItem(
        item.label,
        item.path,
        navIcons[item.icon],
        navigate,
        item.paletteKeywords ?? [],
      ),
    );
  }

  for (const items of Object.values(secondaryNavByGroup)) {
    for (const item of items) {
      if (itemsByPath.has(item.path)) {
        continue;
      }

      itemsByPath.set(
        item.path,
        createNavigationItem(
          item.label,
          item.path,
          secondaryPathIcons[item.path] ?? <BrandIcon fontSize="small" />,
          navigate,
          item.paletteKeywords ?? [],
          item.superuserOnly ?? false,
        ),
      );
    }
  }

  return Array.from(itemsByPath.values());
}

function buildActionItems(actions: CommandPaletteActions): CommandPaletteItem[] {
  return [
    {
      id: 'action:new-message',
      section: 'actions',
      title: 'New Message',
      subtitle: 'Start a new direct or group conversation',
      keywords: ['message', 'chat', 'conversation', 'dm', 'inbox'],
      icon: <NewMessageIcon fontSize="small" />,
      run: actions.openNewMessage,
    },
    {
      id: 'action:new-agent',
      section: 'actions',
      title: 'New Agent',
      subtitle: 'Create a reusable AI workspace',
      keywords: ['agent', 'ai', 'assistant', 'automation'],
      icon: <NewAgentIcon fontSize="small" />,
      run: actions.openNewAgent,
    },
    {
      id: 'action:new-lead',
      section: 'actions',
      title: 'New Lead',
      subtitle: 'Add a job lead manually',
      keywords: ['lead', 'job', 'role', 'opportunity'],
      icon: <NewLeadIcon fontSize="small" />,
      run: actions.openNewLead,
    },
    {
      id: 'action:new-document',
      section: 'actions',
      title: 'New Document',
      subtitle: 'Create a new workspace document',
      keywords: ['document', 'resume', 'cover letter', 'docs', 'workspace'],
      icon: <NewDocumentIcon fontSize="small" />,
      run: actions.openNewDocument,
    },
    {
      id: 'action:new-workflow',
      section: 'actions',
      title: 'New Workflow',
      subtitle: 'Create an orchestration workflow',
      keywords: ['workflow', 'pipeline', 'automation'],
      icon: <NewWorkflowIcon fontSize="small" />,
      run: actions.openNewWorkflow,
    },
    {
      id: 'action:create-extractor',
      section: 'actions',
      title: 'Create Extractor',
      subtitle: 'Define a new extractor',
      keywords: ['extractor', 'schema', 'parser', 'workflow'],
      icon: <ExtractorIcon fontSize="small" />,
      run: actions.openCreateExtractor,
    },
    {
      id: 'action:toggle-theme',
      section: 'actions',
      title: 'Toggle Theme',
      subtitle: 'Switch between light and dark themes',
      keywords: ['theme', 'appearance', 'dark', 'light'],
      icon: <LightModeIcon fontSize="small" />,
      run: actions.toggleTheme,
    },
    {
      id: 'action:sign-out',
      section: 'actions',
      title: 'Sign Out',
      subtitle: 'End your current Baldin session',
      keywords: ['logout', 'log out', 'sign out', 'session'],
      icon: <LogoutIcon fontSize="small" />,
      run: actions.signOut,
    },
  ];
}

export function buildCommandPaletteItems(options: BuildCommandPaletteItemsOptions): CommandPaletteItem[] {
  return [
    ...buildActionItems(options.actions),
    ...buildNavigationItems(options.navigate),
  ];
}
