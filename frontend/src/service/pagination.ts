export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export const FULL_LIST_PAGE_SIZE = 100;

export const normalizePaginatedResponse = <T>(
  response: Partial<PaginatedResponse<T>> | null | undefined,
  defaults: Pick<PaginatedResponse<T>, 'page' | 'page_size'>,
): PaginatedResponse<T> => ({
  items: response?.items ?? [],
  total: response?.total ?? 0,
  page: response?.page ?? defaults.page,
  page_size: response?.page_size ?? defaults.page_size,
});

export const fetchAllPages = async <T>(
  fetchPage: (
    page: number,
    pageSize: number,
  ) => Promise<Partial<PaginatedResponse<T>> | null | undefined>,
  pageSize = FULL_LIST_PAGE_SIZE,
): Promise<T[]> => {
  const items: T[] = [];
  let page = 1;

  while (true) {
    const nextPage = normalizePaginatedResponse(
      await fetchPage(page, pageSize),
      { page, page_size: pageSize },
    );
    items.push(...nextPage.items);

    if (nextPage.items.length === 0) {
      break;
    }

    const hasMore =
      nextPage.total > 0
        ? items.length < nextPage.total
        : nextPage.items.length === pageSize;
    if (!hasMore) {
      break;
    }

    page += 1;
  }

  return items;
};
