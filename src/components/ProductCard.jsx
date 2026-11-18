import { ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { imageCorsProps } from '../utils/image';

export function ProductCard({ product }) {
  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-thumb-wrap">
        <span className="category-tag">
          {String(product.category || 'general').replace(/-/g, ' ')}
        </span>
        {product.isCustom && <span className="custom-tag">New</span>}
        <img
          src={product.thumbnail}
          alt={product.title}
          className="product-thumb"
          loading="lazy"
          {...imageCorsProps(product.thumbnail)}
        />
      </Link>

      <div className="product-body">
        <div className="product-meta-row">
          <span>{product.brand || 'NovaStore'}</span>
          <span className="rating-pill">
            <Star size={13} fill="#f59e0b" stroke="#f59e0b" />
            {Number(product.rating || 4.5).toFixed(1)}
          </span>
        </div>

        <h3 className="product-title">
          <Link to={`/products/${product.id}`}>{product.title}</Link>
        </h3>

        <p className="product-desc">{product.description}</p>

        <div className="product-footer">
          <span className="product-price">
            ${Number(product.price || 0).toFixed(2)}
          </span>
          <Link
            to={`/products/${product.id}`}
            className="btn btn-sm btn-secondary"
          >
            Details
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
