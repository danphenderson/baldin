/**
 * Single source of truth for shell navigation metadata.
 *
 * Drawer groups, secondary-nav items per route group, and legacy redirect
 * mappings are all derived from this module so the drawer, SecondaryNavBar,
 * and future redirect routes cannot drift.
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
    { label: 'Pipeline', path: '/applications' },
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
// Legacy redirects (consumed by app-routes.tsx in a later phase)
// ---------------------------------------------------------------------------

export const legacyRedirects: Record<string, string> = {
  '/companies': '/leads/companies',
  '/documents': '/me/documents',
  '/profile': '/me',
  '/pipelines': '/workflows',
  '/data-orchestration': '/workflows',
  '/extractor': '/workflows/extractors',
};
