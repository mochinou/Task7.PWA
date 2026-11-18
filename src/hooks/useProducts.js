import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { productKeys } from '../services/queryKeys';

/**
 * Fetches paginated & filtered products with automatic caching and AbortSignal cancellation.
 */
export function useProductsList(params) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: ({ signal }) => productService.getProducts({ ...params, signal }),
  });
}

/**
 * Fetches a single product by ID with caching and AbortSignal support.
 */
export function useProductDetail(id) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: ({ signal }) => productService.getProductById(id, { signal }),
    enabled: Boolean(id),
  });
}

/**
 * Fetches and caches product categories for 10 minutes.
 */
export function useProductCategories() {
  return useQuery({
    queryKey: productKeys.categories(),
    queryFn: ({ signal }) => productService.getCategories({ signal }),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Creates a new product and invalidates all cached product list queries.
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => productService.createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

/**
 * Updates an existing product and invalidates both its detail cache and list caches.
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => productService.updateProduct(id, data),
    onSuccess: (_updatedProduct, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

/**
 * Deletes a product, removes its detail entry from cache, and invalidates list caches.
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => productService.deleteProduct(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: productKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}
