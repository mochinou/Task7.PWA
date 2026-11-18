import { AlertTriangle, CheckCircle2, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CacheStatusBar } from '../components/CacheStatusBar';
import {
  EmptyState,
  ErrorState,
  ProductsLoadingSkeleton,
} from '../components/FeedbackStates';
import { Pagination } from '../components/Pagination';
import { ProductCard } from '../components/ProductCard';
import { ProductFilters } from '../components/ProductFilters';
import { ProductFormModal } from '../components/ProductFormModal';
import { OfflineDataNotice } from '../components/PwaStatus';
import {
  useCreateProduct,
  useProductCategories,
  useProductsList,
} from '../hooks/useProducts';
import { useNetworkStatus, useOfflineRedirect } from '../hooks/usePwa';
import { productKeys } from '../services/queryKeys';

const ITEMS_PER_PAGE = 9;

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlQuery = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const sortValue = searchParams.get('sort') || '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [searchInput, setSearchInput] = useState(urlQuery);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [bannerMessage, setBannerMessage] = useState(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSearchChange = (nextValue) => {
    setSearchInput(nextValue);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextValue.trim()) {
            next.set('q', nextValue.trim());
          } else {
            next.delete('q');
          }
          next.set('page', '1');
          return next;
        },
        { replace: true }
      );
    }, 350);
  };

  const [sortBy = '', order = 'asc'] = sortValue ? sortValue.split(':') : ['', 'asc'];

  const queryParams = {
    page,
    limit: ITEMS_PER_PAGE,
    search: urlQuery,
    category,
    sortBy,
    order,
  };

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    dataUpdatedAt,
    refetch,
  } = useProductsList(queryParams);

  const { data: categories = [] } = useProductCategories();
  const createMutation = useCreateProduct();
  const { isOnline } = useNetworkStatus();

  // Offline + this catalog page was never loaded before -> show the /offline page.
  useOfflineRedirect({ isError, error, data });

  const updateParam = (key, value, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, String(value));
    } else {
      next.delete(key);
    }
    if (resetPage) {
      next.set('page', '1');
    }
    setSearchParams(next);
  };

  const handleResetFilters = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchInput('');
    setSearchParams({});
  };

  const handleCreateProduct = async (payload) => {
    const created = await createMutation.mutateAsync(payload);
    setIsCreateOpen(false);
    // Navigate to page 1 so the newly added item is immediately visible
    if (page !== 1) {
      updateParam('page', '1', false);
    }
    setBannerMessage(
      `Created "${created.title}" — product list cache invalidated and refetched!`
    );
    setTimeout(() => setBannerMessage(null), 5000);
  };

  const hasActiveFilters = Boolean(searchInput.trim() || category || sortValue);
  const products = data?.products || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Product Catalog</h1>
          <p className="page-subtitle">
            Search, filter by category, sort, paginate, and test live cache
            invalidation
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary page-header-action"
          onClick={() => {
            createMutation.reset();
            setIsCreateOpen(true);
          }}
          disabled={!isOnline}
          title={isOnline ? 'Create a new product' : 'Creating products requires a connection'}
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {bannerMessage && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>{bannerMessage}</span>
        </div>
      )}

      {data?.meta?.source === 'cache' && <OfflineDataNotice cachedAt={data.meta.cachedAt} />}

      {isError && data && (
        <div className="alert alert-info" role="status" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>Couldn&apos;t refresh the catalog — showing the last loaded results.</span>
        </div>
      )}

      <CacheStatusBar
        queryKey={productKeys.list(queryParams)}
        isFetching={isFetching}
        dataUpdatedAt={dataUpdatedAt}
        onRevalidate={() => refetch()}
        cacheMeta={data?.meta}
      />

      <ProductFilters
        searchInput={searchInput}
        onSearchChange={handleSearchChange}
        category={category}
        onCategoryChange={(val) => updateParam('category', val)}
        sortValue={sortValue}
        onSortChange={(val) => updateParam('sort', val)}
        categories={categories}
        hasActiveFilters={hasActiveFilters}
        onReset={handleResetFilters}
      />

      {!data && isLoading ? (
        <ProductsLoadingSkeleton count={ITEMS_PER_PAGE} />
      ) : !data && isError ? (
        <ErrorState
          title="Could not load products"
          message={error?.message}
          onRetry={() => refetch()}
        />
      ) : !data ? (
        <ProductsLoadingSkeleton count={ITEMS_PER_PAGE} />
      ) : products.length === 0 ? (
        <EmptyState onReset={hasActiveFilters ? handleResetFilters : undefined} />
      ) : (
        <>
          <div
            className="products-grid"
            style={{ opacity: isFetching ? 0.72 : 1, transition: 'opacity 0.15s' }}
          >
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            totalItems={data.total}
            limit={data.limit}
            onPageChange={(nextPage) => {
              updateParam('page', String(nextPage), false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      )}

      {isCreateOpen && (
        <ProductFormModal
          mode="create"
          categories={categories}
          isSubmitting={createMutation.isPending}
          submitError={createMutation.error?.message || null}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateProduct}
        />
      )}
    </div>
  );
}
