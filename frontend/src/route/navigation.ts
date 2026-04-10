/**
 * Single source of truth for shell navigation metadata.
 *
 * Drawer sections, secondary-nav items per route group, and legacy redirect
 * mappings are all derived from this module so the drawer, SecondaryNavBar,
 * and redirect routes cannot drift.
 *
 * IMPORTANT: Drawer items must use canonical paths only. If a path appears as
 * a key in `legacyRedirects`, it is a stale alias — not a valid drawer target.
 */

// ---------------------------------------------------------------------------
// Secondary-nav item shape
// ---------------------------------------------------------------------------

export interface SecondaryNavItem {
  label: string;
  path: string;
  /** When true the item is only visible to superusers. */
  superuserOnly?: boolean;
}

export type NavIconKey =
  | 'dashboard'
  | 'leads'
  | 'applications'
  | 'messages'
  | 'people'
  | 'connections'
  | 'discover'
  | 'agents'
  | 'workflows'
  | 'workspace'
  | 'profile'
  | 'settings'
  | 'aspirations'
  | 'roles'
  | 'companies';

interface BaseNavigationItem {
  id: string;
  label: string;
  icon: NavIconKey;
}

export interface NavigationLinkItem extends BaseNavigationItem {
  kind: 'link';
  path: string;
  badge?: 'unreadMessages';
}

export interface NavigationGroupItem extends BaseNavigationItem {
  kind: 'group';
  children: NavigationLinkItem[];
  defaultExpanded?: boolean;
}

export type NavigationItem = NavigationLinkItem | NavigationGroupItem;

// ---------------------------------------------------------------------------
// Route-group → secondary-nav mapping
// ---------------------------------------------------------------------------

export const secondaryNavByGroup: Record<string, SecondaryNavItem[]> = {
  '/leads': [
    { label: 'All Leads', path: '/leads' },
    { label: 'Companies', path: '/leads/companies' },
  ],
  '/applications': [
    { label: 'All Applications', path: '/applications' },
    { label: 'Board', path: '/applications/board' },
  ],
  '/workflows': [
    { label: 'Pipelines', path: '/workflows' },
    { label: 'Extractors', path: '/workflows/extractors' },
    { label: 'Review Queue', path: '/workflows/review', superuserOnly: true },
    { label: 'Crawlers', path: '/workflows/crawlers', superuserOnly: true },
  ],
};

// ---------------------------------------------------------------------------
// Resolve secondary-nav items for the current pathname
// ---------------------------------------------------------------------------

/**
 * Return the secondary-nav items that apply to `pathname`, or `null` when the
 * current route has no group-level navigation (e.g. Dashboard).
 */
export function getSecondaryNavItems(pathname: string): SecondaryNavItem[] | null {
  // Match the most-specific group first (longest prefix).
  const groupKey = Object.keys(secondaryNavByGroup)
    .filter((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    .sort((a, b) => b.length - a.length)[0];

  return groupKey ? secondaryNavByGroup[groupKey] : null;
}

// ---------------------------------------------------------------------------
// Drawer sections (consumed by AppLayout)
// ---------------------------------------------------------------------------

export interface DrawerItem {
  label: string;
  /** Canonical route path — must NOT appear in legacyRedirects keys. */
  path: string;
}

export interface DrawerSection {
  key: string;
  /** Visible section label when the drawer is expanded. `null` = unlabelled. */
  label: string | null;
  items: NavigationItem[];
}

export const drawerSections: DrawerSection[] = [
  {
    key: 'top',
    label: null,
    items: [
      { kind: 'link', id: 'dashboard', label: 'Dashboard', path: '/', icon: 'dashboard' },
    ],
  },
  {
    key: 'job-search',
    label: 'Job Search',
    items: [
      { kind: 'link', id: 'leads', label: 'Leads', path: '/leads', icon: 'leads' },
      { kind: 'link', id: 'applications', label: 'Applications', path: '/applications', icon: 'applications' },
    ],
  },
  {
    key: 'network',
    label: 'Network',
    items: [
      {
        kind: 'link',
        id: 'messages',
        label: 'Messages',
        path: '/network/messages',
        icon: 'messages',
        badge: 'unreadMessages',
      },
      {
        kind: 'group',
        id: 'people',
        label: 'People',
        icon: 'people',
        defaultExpanded: true,
        children: [
          {
            kind: 'link',
            id: 'connections',
            label: 'Connections',
            path: '/network/connections',
            icon: 'connections',
          },
          {
            kind: 'link',
            id: 'discover',
            label: 'Discover',
            path: '/network/discover',
            icon: 'discover',
          },
        ],
      },
      { kind: 'link', id: 'agents', label: 'Agents', path: '/network/agents', icon: 'agents' },
    ],
  },
  {
    key: 'automation',
    label: 'Automation',
    items: [
      { kind: 'link', id: 'workflows', label: 'Workflows', path: '/workflows', icon: 'workflows' },
      { kind: 'link', id: 'workspace', label: 'Workspace', path: '/workspace', icon: 'workspace' },
    ],
  },
];

export const userRailItems: NavigationItem[] = [
  { kind: 'link', id: 'profile', label: 'Profile', path: '/me', icon: 'profile' },
  { kind: 'link', id: 'settings', label: 'Settings', path: '/settings', icon: 'settings' },
  {
    kind: 'group',
    id: 'aspirations',
    label: 'Aspirations',
    icon: 'aspirations',
    children: [
      {
        kind: 'link',
        id: 'aspiration-roles',
        label: 'Roles',
        path: '/me/aspirations/roles',
        icon: 'roles',
      },
      {
        kind: 'link',
        id: 'aspiration-companies',
        label: 'Companies',
        path: '/me/aspirations/companies',
        icon: 'companies',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Legacy redirects (consumed by app-routes.tsx)
// ---------------------------------------------------------------------------

export const legacyRedirects: Record<string, string> = {
  '/documents': '/workspace',
  '/me/documents': '/workspace',
  '/network/directory': '/network/discover',
  '/companies': '/leads/companies',
  '/profile': '/me',
  '/pipelines': '/workflows',
  '/data-orchestration': '/workflows',
  '/extractor': '/workflows/extractors',
};

export interface LegacyPrefixRedirect {
  fromPrefix: string;
  toPrefix: string;
}

export const legacyPrefixRedirects: LegacyPrefixRedirect[] = [
  { fromPrefix: '/documents', toPrefix: '/workspace' },
  { fromPrefix: '/me/documents', toPrefix: '/workspace' },
  { fromPrefix: '/network/directory', toPrefix: '/network/discover' },
];
