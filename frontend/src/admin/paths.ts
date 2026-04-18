export const ADMIN_APP_ROOT_PATH = '/admin/';
export const ADMIN_LOGIN_PATH = '/admin/login';
export const ADMIN_DB_MANAGEMENT_PATH = '/admin/db-management';
export const ADMIN_REVIEW_PATH = '/admin/review';
export const ADMIN_CRAWLERS_PATH = '/admin/crawlers';
export const ADMIN_HOME_ROUTE = '/';
export const ADMIN_LOGIN_ROUTE = '/login';
export const ADMIN_DB_MANAGEMENT_ROUTE = '/db-management';
export const ADMIN_REVIEW_ROUTE = '/review';
export const ADMIN_CRAWLERS_ROUTE = '/crawlers';

export interface AdminNavItem {
  label: string;
  path: string;
  description: string;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    label: 'DB Management',
    path: ADMIN_DB_MANAGEMENT_ROUTE,
    description: 'Superuser database inspection and destructive cleanup previews.',
  },
  {
    label: 'Review Queue',
    path: ADMIN_REVIEW_ROUTE,
    description: 'Pending operational review items that require a superuser decision.',
  },
  {
    label: 'Crawlers',
    path: ADMIN_CRAWLERS_ROUTE,
    description: 'Crawler pipelines, recent runs, and manual execution controls.',
  },
];
