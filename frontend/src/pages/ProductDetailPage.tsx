import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ErrorAlert, LoadingState, SuccessAlert } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api, apiError } from '../services/api';
import type { Product } from '../types';

export function ProductDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { add } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  useEffect(() => {
    api.products
      .detail(id)
      .then(setProduct)
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }, [id]);
  const addItem = async () => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setBusy(true);
    setError('');
    try {
      await add(id, quantity);
      setSuccess('Added to your cart.');
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return (
      <main className="page-shell">
        <LoadingState label="Loading product…" />
      </main>
    );
  if (!product)
    return (
      <main className="page-shell">
        <ErrorAlert message={error || 'Product not found.'} />
        <Link to="/products">Back to products</Link>
      </main>
    );
  return (
    <main className="page-shell">
      <Link className="back-link" to="/products">
        ← Back to all products
      </Link>
      <section className="product-detail">
        <div className="detail-image">
          {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <span>SS</span>}
        </div>
        <div className="detail-copy">
          <p className="eyebrow">{product.category.name}</p>
          <h1>{product.name}</h1>
          <p className="detail-price">₹{Number(product.price).toLocaleString('en-IN')}</p>
          <p className="detail-description">{product.description}</p>
          <p className={product.availability === 'IN_STOCK' ? 'stock-in' : 'stock-out'}>
            {product.availability === 'IN_STOCK'
              ? `${product.stockQuantity} available`
              : 'Currently out of stock'}
          </p>
          {error ? <ErrorAlert message={error} /> : null}
          {success ? <SuccessAlert message={success} /> : null}
          <div className="purchase-row">
            <label>
              Quantity
              <input
                type="number"
                min="1"
                max={product.stockQuantity}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </label>
            <button
              className="button button-primary"
              disabled={busy || product.availability !== 'IN_STOCK'}
              onClick={() => void addItem()}
            >
              {busy ? 'Adding…' : 'Add to cart'}
            </button>
          </div>
          <dl className="product-facts">
            <div>
              <dt>SKU</dt>
              <dd>{product.sku}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>Free, simulated</dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
