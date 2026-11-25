import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ErrorAlert } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api, apiError } from '../services/api';

export function CheckoutPage() {
  const { user } = useAuth();
  const { cart, clearLocal } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user ? `${user.firstName} ${user.lastName}` : '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'IN',
  });
  const [outcome, setOutcome] = useState<'SUCCEEDED' | 'FAILED'>('SUCCEEDED');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!cart.items.length) return <Navigate to="/cart" replace />;
  const change = (name: string, value: string) => setForm((v) => ({ ...v, [name]: value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const order = await api.orders.checkout({
        shipping: {
          ...form,
          addressLine2: form.addressLine2 || null,
          country: form.country.toUpperCase(),
        },
        payment: { method: 'SIMULATED', outcome },
      });
      clearLocal();
      navigate(`/orders/${order.id}/confirmation`);
    } catch (cause) {
      setError(apiError(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Almost there</p>
        <h1>Checkout</h1>
      </header>
      {error ? <ErrorAlert message={error} /> : null}
      <form className="checkout-layout" onSubmit={(e) => void submit(e)}>
        <section className="checkout-form">
          <h2>Shipping details</h2>
          <label>
            Full name
            <input required value={form.name} onChange={(e) => change('name', e.target.value)} />
          </label>
          <label>
            Address line 1
            <input
              required
              autoComplete="address-line1"
              value={form.addressLine1}
              onChange={(e) => change('addressLine1', e.target.value)}
            />
          </label>
          <label>
            Address line 2 <small>(optional)</small>
            <input
              autoComplete="address-line2"
              value={form.addressLine2}
              onChange={(e) => change('addressLine2', e.target.value)}
            />
          </label>
          <div className="form-grid">
            <label>
              City
              <input required value={form.city} onChange={(e) => change('city', e.target.value)} />
            </label>
            <label>
              State
              <input
                required
                value={form.state}
                onChange={(e) => change('state', e.target.value)}
              />
            </label>
            <label>
              Postal code
              <input
                required
                value={form.postalCode}
                onChange={(e) => change('postalCode', e.target.value)}
              />
            </label>
            <label>
              Country code
              <input
                required
                minLength={2}
                maxLength={2}
                value={form.country}
                onChange={(e) => change('country', e.target.value)}
              />
            </label>
          </div>
          <fieldset className="simulation-box">
            <legend>Simulated payment</legend>
            <p>No real payment is collected. Choose an outcome to exercise the workflow.</p>
            <label>
              <input
                type="radio"
                checked={outcome === 'SUCCEEDED'}
                onChange={() => setOutcome('SUCCEEDED')}
              />{' '}
              Approve payment
            </label>
            <label>
              <input
                type="radio"
                checked={outcome === 'FAILED'}
                onChange={() => setOutcome('FAILED')}
              />{' '}
              Simulate failure
            </label>
          </fieldset>
        </section>
        <aside className="order-summary">
          <p className="eyebrow">Review order</p>
          {cart.items.map((item) => (
            <div className="summary-item" key={item.id}>
              <span>
                {item.quantity} × {item.product.name}
              </span>
              <strong>₹{Number(item.lineTotal).toLocaleString('en-IN')}</strong>
            </div>
          ))}
          <dl>
            <div className="total-line">
              <dt>Total</dt>
              <dd>₹{Number(cart.total).toLocaleString('en-IN')}</dd>
            </div>
          </dl>
          <button className="button button-primary" disabled={busy}>
            {busy ? 'Placing order…' : 'Place simulated order'}
          </button>
        </aside>
      </form>
    </main>
  );
}
