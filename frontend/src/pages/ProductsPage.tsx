import { useEffect, useState, type FormEvent } from 'react';
import { ProductCard } from '../components/ProductCard';
import { EmptyState, ErrorAlert, LoadingState, PageHeader, Pagination } from '../components/UI';
import { api, apiError } from '../services/api';
import type { Category, PaginationMeta, Product } from '../types';

const initialMeta: PaginationMeta = { page: 1, limit: 12, totalItems: 0, totalPages: 0 };

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [meta, setMeta] = useState(initialMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [inStock, setInStock] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  useEffect(() => {
    api.categories
      .list()
      .then(setCategories)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.products
      .list({
        page: meta.page,
        limit: 12,
        search: search || undefined,
        category: category || undefined,
        sort,
        inStock: inStock || undefined,
        minPrice: priceRange.min || undefined,
        maxPrice: priceRange.max || undefined,
      })
      .then((result) => {
        if (active) {
          setProducts(result.data.products);
          setMeta(result.meta);
        }
      })
      .catch((e) => active && setError(apiError(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [meta.page, search, category, sort, inStock, priceRange]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setMeta((value) => ({ ...value, page: 1 }));
    setSearch(query.trim());
    setPriceRange({ min: minPrice, max: maxPrice });
  };
  return (
    <main className="page-shell">
      <PageHeader eyebrow="The collection" title="Shop all products">
        <p>Useful, beautiful, and ready to make your day a little better.</p>
      </PageHeader>
      <form className="catalogue-toolbar" onSubmit={submit}>
        <label className="search-field">
          <span className="sr-only">Search products</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or description"
          />
          <button>Search</button>
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setMeta((m) => ({ ...m, page: 1 }));
            }}
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </label>
        <label>
          Min price
          <input
            inputMode="decimal"
            placeholder="₹0"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
          />
        </label>
        <label>
          Max price
          <input
            inputMode="decimal"
            placeholder="Any"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
          />
        </label>
        <label className="check-field">
          <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />{' '}
          In stock only
        </label>
      </form>
      <div className="results-line">
        <strong>{meta.totalItems} products</strong>
        {search ? (
          <button
            className="link-button"
            onClick={() => {
              setQuery('');
              setSearch('');
            }}
          >
            Clear search
          </button>
        ) : null}
      </div>
      {error ? (
        <ErrorAlert message={error} />
      ) : loading ? (
        <LoadingState label="Gathering the collection…" />
      ) : products.length ? (
        <>
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination meta={meta} onPage={(page) => setMeta((m) => ({ ...m, page }))} />
        </>
      ) : (
        <EmptyState title="No products found" message="Try changing your search or filters." />
      )}
    </main>
  );
}
