import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Loader2,
  Package,
  Star,
  Tag,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CacheStatusBar } from '../components/CacheStatusBar';
import { DetailLoadingSkeleton, ErrorState } from '../components/FeedbackStates';
import { ProductFormModal } from '../components/ProductFormModal';
import { OfflineDataNotice } from '../components/PwaStatus';
import {
  useDeleteProduct,
  useProductCategories,
  useProductDetail,
  useUpdateProduct,
} from '../hooks/useProducts';
import { useNetworkStatus, useOfflineRedirect } from '../hooks/usePwa';
import { productKeys } from '../services/queryKeys';
import { imageCorsProps } from '../utils/image';

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: product,
    isLoading,
    isFetching,
    isError,
    error,
    dataUpdatedAt,
    refetch,
  } = useProductDetail(id);

  const { data: categories = [] } = useProductCategories();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const { isOnline } = useNetworkStatus();

  // Offline and this product was never opened before -> /offline page.
  useOfflineRedirect({ isError, error, data: product });

  const [selectedImage, setSelectedImage] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const handleUpdate = async (formData) => {
    await updateMutation.mutateAsync({ id, data: formData });
    setIsEditOpen(false);
    setSelectedImage(null);
    setFeedbackMsg(
      'Product updated — both detail and catalog list caches were invalidated!'
    );
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    navigate('/products', { replace: true });
  };

  if (!product && isLoading) {
    return (
      <div>
        <div style={{ marginBottom: '1.25rem' }}>
          <Link to="/products" className="btn btn-sm btn-secondary">
            <ArrowLeft size={15} />
            Back to Catalog
          </Link>
        </div>
        <DetailLoadingSkeleton />
      </div>
    );
  }

  if (!product) {
    return (
      <div>
        <div style={{ marginBottom: '1.25rem' }}>
          <Link to="/products" className="btn btn-sm btn-secondary">
            <ArrowLeft size={15} />
            Back to Catalog
          </Link>
        </div>
        <ErrorState
          title="Product not found"
          message={error?.message || 'Unable to fetch details for this product.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const gallery =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [product.thumbnail];
  const mainImg = selectedImage || gallery[0] || product.thumbnail;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <Link to="/products" className="btn btn-sm btn-secondary">
          <ArrowLeft size={15} />
          Back to Catalog
        </Link>

        <div className="detail-actions">
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => {
              updateMutation.reset();
              setIsEditOpen(true);
            }}
            disabled={!isOnline}
            title={isOnline ? 'Edit product' : 'Editing requires a connection'}
          >
            <Edit3 size={14} />
            Edit Product
          </button>

          {!confirmDelete ? (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => setConfirmDelete(true)}
              disabled={!isOnline}
              title={isOnline ? 'Delete product' : 'Deleting requires a connection'}
            >
              <Trash2 size={14} />
              Delete
            </button>
          ) : (
            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={handleDelete}
                disabled={deleteMutation.isPending || !isOnline}
              >
                {deleteMutation.isPending && (
                  <Loader2 size={13} className="spin" />
                )}
                Confirm Delete
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setConfirmDelete(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {feedbackMsg && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {deleteMutation.isError && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {deleteMutation.error?.message || 'Failed to delete product.'}
        </div>
      )}

      {product._meta?.source === 'cache' && (
        <OfflineDataNotice cachedAt={product._meta.cachedAt} />
      )}

      <CacheStatusBar
        queryKey={productKeys.detail(id)}
        isFetching={isFetching}
        dataUpdatedAt={dataUpdatedAt}
        onRevalidate={() => refetch()}
        cacheMeta={product._meta}
      />

      <div className="detail-card">
        <div className="detail-gallery">
          <div className="detail-main-image">
            <img src={mainImg} alt={product.title} {...imageCorsProps(mainImg)} />
          </div>

          {gallery.length > 1 && (
            <div className="detail-thumbs">
              {gallery.map((imgUrl, index) => (
                <button
                  key={`${imgUrl}-${index}`}
                  type="button"
                  className={`detail-thumb-btn ${
                    mainImg === imgUrl ? 'active' : ''
                  }`}
                  onClick={() => setSelectedImage(imgUrl)}
                >
                  <img
                    src={imgUrl}
                    alt={`${product.title} view ${index + 1}`}
                    loading="lazy"
                    {...imageCorsProps(imgUrl)}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.6rem',
              marginBottom: '0.65rem',
            }}
          >
            <Link
              to={`/products?category=${encodeURIComponent(product.category)}`}
              className="eyebrow"
              style={{ marginBottom: 0 }}
            >
              <Tag size={12} />
              {String(product.category || 'general').replace(/-/g, ' ')}
            </Link>
            <span className="rating-pill" style={{ fontSize: '0.88rem' }}>
              <Star size={15} fill="#f59e0b" stroke="#f59e0b" />
              {Number(product.rating || 4.5).toFixed(2)} rating
            </span>
          </div>

          <h1 className="detail-title">
            {product.title}
          </h1>

          <div className="detail-price">
            ${Number(product.price || 0).toFixed(2)}
          </div>

          <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.25rem' }}>
            {product.description}
          </p>

          <div className="detail-specs">
            <div className="spec-item">
              <div className="spec-label">Brand</div>
              <div className="spec-value">{product.brand || 'NovaStore'}</div>
            </div>
            <div className="spec-item">
              <div className="spec-label">Availability</div>
              <div className="spec-value" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Package size={15} style={{ color: 'var(--success)' }} />
                {Number(product.stock ?? 0) > 0
                  ? `${product.stock} in stock`
                  : 'Out of stock'}
              </div>
            </div>
            <div className="spec-item">
              <div className="spec-label">Product ID</div>
              <div className="spec-value mono">#{product.id}</div>
            </div>
            <div className="spec-item">
              <div className="spec-label">Warranty</div>
              <div className="spec-value">
                {product.warrantyInformation || '1 Year Standard Warranty'}
              </div>
            </div>
          </div>

          {Array.isArray(product.reviews) && product.reviews.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>
                Customer Reviews ({product.reviews.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {product.reviews.slice(0, 3).map((rev, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.75rem 0.9rem',
                      borderRadius: '8px',
                      background: 'var(--bg-subtle)',
                      fontSize: '0.86rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '0.2rem',
                        fontWeight: 600,
                      }}
                    >
                      <span>{rev.reviewerName || 'Verified Buyer'}</span>
                      <span className="rating-pill">★ {rev.rating}/5</span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                      {rev.comment}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isEditOpen && (
        <ProductFormModal
          mode="edit"
          initialValues={product}
          categories={categories}
          isSubmitting={updateMutation.isPending}
          submitError={updateMutation.error?.message || null}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleUpdate}
        />
      )}
    </div>
  );
}
