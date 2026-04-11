export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export const FULL_LIST_PAGE_SIZE = 500;

export const normalizePaginatedResponse = <T>(
  response: Partial<PaginatedResponse<T>> | null | undefined,
  defaults: Pick<PaginatedResponse<T>, 'page' | 'page_size'>,
): PaginatedResponse<T> => ({
  items: response?.items ?? [],
  total: response?.total ?? 0,
  page: response?.page ?? defaults.page,
  page_size: response?.page_size ?? defaults.page_size,
});
