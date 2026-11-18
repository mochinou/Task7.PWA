import { ApiError, apiRequest, apiRequestWithMeta } from './apiClient';

/**
 * DummyJSON simulates POST/PUT/DELETE responses without mutating its shared database.
 * Keeping a lightweight in-memory session overlay inside the API service ensures that
 * after TanStack Query invalidates and refetches server data, user mutations remain reflected.
 */
let nextCustomId = 1000;
const createdProducts = new Map();
const updatedProducts = new Map();
const deletedProductIds = new Set();

const FALLBACK_THUMBNAIL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
      <rect width="600" height="450" fill="#EEF2FF"/>
      <rect x="210" y="135" width="180" height="140" rx="20" fill="#C7D2FE"/>
      <circle cx="265" cy="185" r="18" fill="#4F46E5"/>
      <path d="M230 255l45-45 35 35 25-25 35 35H230z" fill="#4F46E5"/>
      <text x="300" y="325" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#4338CA">Custom Product</text>
    </svg>`
  );

function matchesFilters(product, search, category) {
  if (category && product.category !== category) {
    return false;
  }
  if (search) {
    const q = search.toLowerCase();
    const haystack = `${product.title || ''} ${product.description || ''} ${product.brand || ''} ${product.category || ''}`.toLowerCase();
    if (!haystack.includes(q)) {
      return false;
    }
  }
  return true;
}

function sortCollection(items, sortBy, order = 'asc') {
  if (!sortBy) return items;
  const factor = order === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const valA = a[sortBy];
    const valB = b[sortBy];
    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * factor;
    }
    return String(valA || '').localeCompare(String(valB || '')) * factor;
  });
}

function applySessionOverlayToProduct(product) {
  if (!product) return null;
  if (deletedProductIds.has(Number(product.id))) return null;
  const patch = updatedProducts.get(Number(product.id));
  return patch ? { ...product, ...patch } : product;
}

export const productService = {
  async getProducts({
    page = 1,
    limit = 9,
    search = '',
    category = '',
    sortBy = '',
    order = 'asc',
    signal,
  } = {}) {
    const cleanSearch = search.trim();
    const cleanCategory = category.trim();
    const skip = (page - 1) * limit;

    // Matching session-created products
    const matchingCreated = Array.from(createdProducts.values())
      .filter((item) => !deletedProductIds.has(Number(item.id)))
      .map((item) => applySessionOverlayToProduct(item))
      .filter((item) => item && matchesFilters(item, cleanSearch, cleanCategory));

    // Combined category + search: fetch category items and filter/paginate accurately
    if (cleanCategory && cleanSearch) {
      const { data, meta } = await apiRequestWithMeta(
        `/products/category/${encodeURIComponent(cleanCategory)}?limit=100`,
        { signal }
      );

      const serverItems = (data.products || [])
        .map(applySessionOverlayToProduct)
        .filter((item) => item && matchesFilters(item, cleanSearch, cleanCategory));

      const merged = sortCollection(
        [...matchingCreated, ...serverItems],
        sortBy,
        order
      );

      return {
        products: merged.slice(skip, skip + limit),
        total: merged.length,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(merged.length / limit)),
        meta,
      };
    }

    const params = new URLSearchParams({
      limit: String(limit),
      skip: String(skip),
    });

    if (sortBy) {
      params.set('sortBy', sortBy);
      params.set('order', order || 'asc');
    }

    let endpoint = `/products?${params.toString()}`;
    if (cleanSearch) {
      params.set('q', cleanSearch);
      endpoint = `/products/search?${params.toString()}`;
    } else if (cleanCategory) {
      endpoint = `/products/category/${encodeURIComponent(cleanCategory)}?${params.toString()}`;
    }

    const { data, meta } = await apiRequestWithMeta(endpoint, { signal });

    let items = (data.products || [])
      .map(applySessionOverlayToProduct)
      .filter(Boolean);

    if (page === 1 && matchingCreated.length > 0) {
      items = [...matchingCreated, ...items].slice(0, limit);
    }

    if (sortBy && matchingCreated.length > 0 && page === 1) {
      items = sortCollection(items, sortBy, order);
    }

    const deletedCountEstimate = Array.from(deletedProductIds).filter((id) => id < 1000).length;
    const adjustedTotal = Math.max(
      items.length,
      (data.total || 0) + matchingCreated.length - (cleanSearch || cleanCategory ? 0 : deletedCountEstimate)
    );

    return {
      products: items,
      total: adjustedTotal,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(adjustedTotal / limit)),
      meta,
    };
  },

  async getProductById(id, { signal } = {}) {
    const numericId = Number(id);
    if (deletedProductIds.has(numericId)) {
      throw new ApiError('This product was deleted.', 404);
    }

    if (createdProducts.has(numericId)) {
      return applySessionOverlayToProduct(createdProducts.get(numericId));
    }

    const { data: product, meta } = await apiRequestWithMeta(
      `/products/${encodeURIComponent(id)}`,
      { signal }
    );
    const overlaid = applySessionOverlayToProduct(product);
    // `_meta` tells the UI whether this came live from the network or from the SW cache.
    return overlaid ? { ...overlaid, _meta: meta } : overlaid;
  },

  async getCategories({ signal } = {}) {
    const categories = await apiRequest('/products/category-list', { signal });
    return Array.isArray(categories) ? categories : [];
  },

  async createProduct(payload) {
    const sanitized = {
      title: String(payload.title || '').trim(),
      description: String(payload.description || '').trim(),
      price: Number(payload.price) || 0,
      category: String(payload.category || 'mobile-accessories').trim(),
      brand: String(payload.brand || 'NovaStore').trim(),
      stock: Number(payload.stock ?? 25),
      rating: Number(payload.rating ?? 4.8),
      thumbnail: payload.thumbnail?.trim() || FALLBACK_THUMBNAIL,
    };

    const serverResponse = await apiRequest('/products/add', {
      method: 'POST',
      body: sanitized,
    });

    const customId = ++nextCustomId;
    const createdItem = {
      ...serverResponse,
      ...sanitized,
      id: customId,
      images: [sanitized.thumbnail],
      discountPercentage: 0,
      reviews: [],
      isCustom: true,
    };

    createdProducts.set(customId, createdItem);
    return createdItem;
  },

  async updateProduct(id, payload) {
    const numericId = Number(id);
    const sanitizedPatch = {
      ...(payload.title !== undefined ? { title: String(payload.title).trim() } : {}),
      ...(payload.description !== undefined
        ? { description: String(payload.description).trim() }
        : {}),
      ...(payload.price !== undefined ? { price: Number(payload.price) } : {}),
      ...(payload.category !== undefined ? { category: String(payload.category).trim() } : {}),
      ...(payload.brand !== undefined ? { brand: String(payload.brand).trim() } : {}),
      ...(payload.stock !== undefined ? { stock: Number(payload.stock) } : {}),
      ...(payload.thumbnail !== undefined && payload.thumbnail.trim()
        ? {
            thumbnail: payload.thumbnail.trim(),
            images: [payload.thumbnail.trim()],
          }
        : {}),
    };

    if (createdProducts.has(numericId)) {
      const existing = createdProducts.get(numericId);
      const merged = { ...existing, ...sanitizedPatch };
      createdProducts.set(numericId, merged);
      return merged;
    }

    const serverResponse = await apiRequest(`/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: sanitizedPatch,
    });

    const previousPatch = updatedProducts.get(numericId) || {};
    const nextPatch = { ...previousPatch, ...sanitizedPatch };
    updatedProducts.set(numericId, nextPatch);

    return {
      ...serverResponse,
      ...nextPatch,
      id: numericId,
    };
  },

  async deleteProduct(id) {
    const numericId = Number(id);

    if (createdProducts.has(numericId)) {
      createdProducts.delete(numericId);
      deletedProductIds.add(numericId);
      return { id: numericId, isDeleted: true };
    }

    const response = await apiRequest(`/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    deletedProductIds.add(numericId);
    updatedProducts.delete(numericId);
    return response;
  },
};
