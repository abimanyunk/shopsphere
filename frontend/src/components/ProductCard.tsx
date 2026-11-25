import { Link } from 'react-router-dom';
import type { Product } from '../types';

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <Link
        className="product-image"
        to={`/products/${product.id}`}
        aria-label={`View ${product.name}`}
      >
        {product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" /> : <span>SS</span>}
      </Link>
      <div className="product-card-body">
        <p className="product-category">{product.category.name}</p>
        <h3>
          <Link to={`/products/${product.id}`}>{product.name}</Link>
        </h3>
        <div className="product-card-footer">
          <strong>₹{Number(product.price).toLocaleString('en-IN')}</strong>
          <span className={product.availability === 'IN_STOCK' ? 'stock-in' : 'stock-out'}>
            {product.availability === 'IN_STOCK' ? 'In stock' : 'Out of stock'}
          </span>
        </div>
      </div>
    </article>
  );
}
