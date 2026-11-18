import { Loader2, X } from 'lucide-react';
import { useState } from 'react';

export function ProductFormModal({
  mode = 'create',
  initialValues = null,
  categories = [],
  isSubmitting = false,
  submitError = null,
  onClose,
  onSubmit,
}) {
  const [title, setTitle] = useState(initialValues?.title || '');
  const [price, setPrice] = useState(
    initialValues?.price !== undefined ? String(initialValues.price) : ''
  );
  const [category, setCategory] = useState(
    initialValues?.category || categories[0] || 'mobile-accessories'
  );
  const [brand, setBrand] = useState(initialValues?.brand || 'NovaStore');
  const [stock, setStock] = useState(
    initialValues?.stock !== undefined ? String(initialValues.stock) : '25'
  );
  const [thumbnail, setThumbnail] = useState(
    initialValues?.thumbnail && !initialValues.thumbnail.startsWith('data:')
      ? initialValues.thumbnail
      : ''
  );
  const [description, setDescription] = useState(
    initialValues?.description || ''
  );
  const [validationErrors, setValidationErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!title.trim() || title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters.';
    }
    const numericPrice = Number(price);
    if (!price || Number.isNaN(numericPrice) || numericPrice <= 0) {
      errors.price = 'Enter a valid price greater than 0.';
    }
    if (!description.trim() || description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters.';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      title: title.trim(),
      price: Number(price),
      category,
      brand: brand.trim() || 'NovaStore',
      stock: Math.max(0, Number(stock) || 0),
      thumbnail: thumbnail.trim(),
      description: description.trim(),
    });
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="modal-panel">
        <div className="modal-header">
          <h2 id="product-modal-title" style={{ margin: 0, fontSize: '1.25rem' }}>
            {mode === 'edit' ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <p
          style={{
            margin: '0 0 1.15rem',
            fontSize: '0.86rem',
            color: 'var(--text-secondary)',
          }}
        >
          Submitting this form sends a{' '}
          <code>{mode === 'edit' ? 'PUT' : 'POST'}</code> request and
          automatically invalidates the cached TanStack Query entries.
        </p>

        {submitError && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="prod-title" className="form-label">
              Product Title *
            </label>
            <input
              id="prod-title"
              type="text"
              className={`input ${validationErrors.title ? 'input-error' : ''}`}
              placeholder="e.g. Wireless Noise-Canceling Headphones"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {validationErrors.title && (
              <p className="field-error">{validationErrors.title}</p>
            )}
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="prod-price" className="form-label">
                Price (USD) *
              </label>
              <input
                id="prod-price"
                type="number"
                step="0.01"
                min="0.01"
                className={`input ${validationErrors.price ? 'input-error' : ''}`}
                placeholder="199.99"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              {validationErrors.price && (
                <p className="field-error">{validationErrors.price}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="prod-stock" className="form-label">
                Stock Quantity
              </label>
              <input
                id="prod-stock"
                type="number"
                min="0"
                className="input"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="prod-category" className="form-label">
                Category
              </label>
              <select
                id="prod-category"
                className="select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {(categories.length > 0
                  ? categories
                  : ['mobile-accessories', 'laptops', 'smartphones', 'groceries']
                ).map((cat) => (
                  <option key={cat} value={cat}>
                    {String(cat).replace(/-/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="prod-brand" className="form-label">
                Brand
              </label>
              <input
                id="prod-brand"
                type="text"
                className="input"
                placeholder="NovaStore"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="prod-thumb" className="form-label">
              Image URL (optional)
            </label>
            <input
              id="prod-thumb"
              type="url"
              className="input"
              placeholder="https://..."
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="prod-desc" className="form-label">
              Description *
            </label>
            <textarea
              id="prod-desc"
              rows={3}
              className={`textarea ${
                validationErrors.description ? 'input-error' : ''
              }`}
              placeholder="Describe key specifications and highlights..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {validationErrors.description && (
              <p className="field-error">{validationErrors.description}</p>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.65rem',
              marginTop: '0.5rem',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 size={15} className="spin" />}
              {mode === 'edit' ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
