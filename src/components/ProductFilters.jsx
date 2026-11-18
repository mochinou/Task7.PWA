import { RotateCcw, Search } from 'lucide-react';

const SORT_OPTIONS = [
  { value: '', label: 'Default Relevance' },
  { value: 'price:asc', label: 'Price: Low to High' },
  { value: 'price:desc', label: 'Price: High to Low' },
  { value: 'rating:desc', label: 'Highest Rated' },
  { value: 'title:asc', label: 'Title: A to Z' },
];

export function ProductFilters({
  searchInput,
  onSearchChange,
  category,
  onCategoryChange,
  sortValue,
  onSortChange,
  categories = [],
  hasActiveFilters,
  onReset,
}) {
  return (
    <section className="filters-card" aria-label="Catalog filters">
      <div className="form-group">
        <label htmlFor="product-search" className="form-label">
          Search Products
        </label>
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            id="product-search"
            type="search"
            className="input"
            placeholder="Search by title, brand, or keyword..."
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="product-category" className="form-label">
          Category
        </label>
        <select
          id="product-category"
          className="select"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {String(cat).replace(/-/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="product-sort" className="form-label">
          Sort By
        </label>
        <select
          id="product-sort"
          className="select"
          value={sortValue}
          onChange={(e) => onSortChange(e.target.value)}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <button
          type="button"
          className="btn btn-secondary btn-full"
          onClick={onReset}
          disabled={!hasActiveFilters}
          title="Reset search, category, and sorting"
        >
          <RotateCcw size={15} />
          Reset
        </button>
      </div>
    </section>
  );
}
