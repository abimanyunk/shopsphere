import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorAlert, LoadingState } from '../components/UI';
import { useCart } from '../context/CartContext';
import { apiError } from '../services/api';

export function CartPage() {
  const { cart, loading, update, remove } = useCart();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const run = async (id: string, task: () => Promise<void>) => {
    setBusy(id);
    setError('');
    try {
      await task();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy('');
    }
  };
  if (loading)
    return (
      <main className="page-shell">
        <LoadingState label="Loading your cart…" />
      </main>
    );
  if (!cart.items.length)
    return (
      <main className="page-shell">
        <EmptyState
          title="Your cart is waiting"
          message="Add something you love and it will appear here."
          action={{ label: 'Explore products', to: '/products' }}
        />
      </main>
    );
  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Your selection</p>
        <h1>Shopping cart</h1>
      </header>
      {error ? <ErrorAlert message={error} /> : null}
      <div className="cart-layout">
        <section className="cart-list">
          {cart.items.map((item) => (
            <article className="cart-item" key={item.id}>
              <div className="cart-thumb">
                {item.product.imageUrl ? <img src={item.product.imageUrl} alt="" /> : 'SS'}
              </div>
              <div>
                <h2>
                  <Link to={`/products/${item.product.id}`}>{item.product.name}</Link>
                </h2>
                <p>SKU {item.product.sku}</p>
                <button
                  className="link-button danger"
                  disabled={busy === item.id}
                  onClick={() => void run(item.id, () => remove(item.id))}
                >
                  Remove
                </button>
              </div>
              <label>
                Qty
                <input
                  aria-label={`Quantity for ${item.product.name}`}
                  type="number"
                  min="1"
                  max={item.product.stockQuantity}
                  value={item.quantity}
                  disabled={busy === item.id}
                  onChange={(e) => void run(item.id, () => update(item.id, Number(e.target.value)))}
                />
              </label>
              <strong>₹{Number(item.lineTotal).toLocaleString('en-IN')}</strong>
            </article>
          ))}
        </section>
        <aside className="order-summary">
          <p className="eyebrow">Order summary</p>
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>₹{Number(cart.subtotal).toLocaleString('en-IN')}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>Free</dd>
            </div>
            <div className="total-line">
              <dt>Total</dt>
              <dd>₹{Number(cart.total).toLocaleString('en-IN')}</dd>
            </div>
          </dl>
          <Link className="button button-primary" to="/checkout">
            Continue to checkout
          </Link>
          <Link className="text-link" to="/products">
            ← Keep shopping
          </Link>
        </aside>
      </div>
    </main>
  );
}
