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
}

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
  '/me': [
    { label: 'Profile', path: '/me' },
    { label: 'Documents', path: '/me/documents' },
  ],
  '/workflows': [
    { label: 'Pipelines', path: '/workflows' },
    { label: 'Extractors', path: '/workflows/extractors' },
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
  items: DrawerItem[];
}

export const drawerSections: DrawerSection[] = [
  {
    key: 'top',
    label: null,
    items: [
      { label: 'Dashboard', path: '/' },
    ],
  },
  {
    key: 'pursue',
    label: 'Pursue',
    items: [
      { label: 'Leads', path: '/leads' },
      { label: 'Applications', path: '/applications' },
    ],
  },
  {
    key: 'identity',
    label: 'Identity',
    items: [
      { label: 'Profile', path: '/me' },
    ],
  },
  {
    key: 'automate',
    label: 'Automate',
    items: [
      { label: 'Workflows', path: '/workflows' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Legacy redirects (consumed by app-routes.tsx)
// ---------------------------------------------------------------------------

export const legacyRedirects: Record<string, string> = {
  '/companies': '/leads/companies',
  '/documents': '/me/documents',
  '/profile': '/me',
  '/pipelines': '/workflows',
  '/data-orchestration': '/workflows',
  '/extractor': '/workflows/extractors',
};
