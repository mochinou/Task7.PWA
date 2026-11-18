/**
 * Centralized hierarchical query key factory for TanStack Query.
 * Ensures predictable caching per filter/page combination and targeted invalidation.
 */
export const productKeys = {
  all: ['products'],
  lists: () => [...productKeys.all, 'list'],
  list: (params) => [
    ...productKeys.lists(),
    {
      page: Number(params?.page) || 1,
      limit: Number(params?.limit) || 9,
      search: String(params?.search || '').trim(),
      category: String(params?.category || '').trim(),
      sortBy: String(params?.sortBy || '').trim(),
      order: String(params?.order || 'asc').trim(),
    },
  ],
  details: () => [...productKeys.all, 'detail'],
  detail: (id) => [...productKeys.details(), String(id)],
  categories: () => [...productKeys.all, 'categories'],
};
