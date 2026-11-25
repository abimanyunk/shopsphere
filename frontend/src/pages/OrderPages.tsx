import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  EmptyState,
  ErrorAlert,
  LoadingState,
  Pagination,
  StatusBadge,
  SuccessAlert,
} from '../components/UI';
import { api, apiError } from '../services/api';
import type { Order, PaginationMeta } from '../types';
import { useAuth } from '../context/AuthContext';

function OrderCard({ order }: { order: Order }) {
  return (
    <article className="order-card">
      <div>
        <p className="eyebrow">{new Date(order.createdAt).toLocaleDateString()}</p>
        <h2>{order.orderNumber}</h2>
      </div>
      <StatusBadge status={order.status} />
      <p>
        {order.items.length} item{order.items.length === 1 ? '' : 's'}
      </p>
      <strong>₹{Number(order.total).toLocaleString('en-IN')}</strong>
      <Link to={`/orders/${order.id}`}>View details →</Link>
    </article>
  );
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    setLoading(true);
    api.orders
      .list(meta.page)
      .then((r) => {
        setOrders(r.data.orders);
        setMeta(r.meta);
      })
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }, [meta.page]);
  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Your account</p>
        <h1>Order history</h1>
      </header>
      {error ? (
        <ErrorAlert message={error} />
      ) : loading ? (
        <LoadingState />
      ) : orders.length ? (
        <>
          <div className="orders-list">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
          <Pagination meta={meta} onPage={(page) => setMeta((m) => ({ ...m, page }))} />
        </>
      ) : (
        <EmptyState
          title="No orders yet"
          message="When you place an order, its progress will appear here."
          action={{ label: 'Start shopping', to: '/products' }}
        />
      )}
    </main>
  );
}

export function OrderDetailPage({ confirmation = false }: { confirmation?: boolean }) {
  const { id = '' } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.orders
      .detail(id)
      .then(setOrder)
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }, [id]);
  const cancel = async () => {
    if (!window.confirm('Cancel this order and restore its inventory?')) return;
    setBusy(true);
    try {
      setOrder(await api.orders.cancel(id));
      setMessage('Order cancelled.');
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return (
      <main className="page-shell">
        <LoadingState label="Loading order…" />
      </main>
    );
  if (!order)
    return (
      <main className="page-shell">
        <ErrorAlert message={error || 'Order not found.'} />
      </main>
    );
  return (
    <main className="page-shell">
      {confirmation ? (
        <section className="confirmation">
          <span>✓</span>
          <p className="eyebrow">Order received</p>
          <h1>Thank you for your order.</h1>
          <p>Your simulated payment succeeded and your order is now in the queue.</p>
        </section>
      ) : (
        <header className="page-header">
          <p className="eyebrow">Order details</p>
          <h1>{order.orderNumber}</h1>
        </header>
      )}
      {error ? <ErrorAlert message={error} /> : null}
      {message ? <SuccessAlert message={message} /> : null}
      <div className="order-detail-grid">
        <section>
          <div className="detail-heading">
            <h2>Items</h2>
            <StatusBadge status={order.status} />
          </div>
          {order.items.map((item) => (
            <article className="line-item" key={item.id}>
              <div>
                <strong>{item.productName}</strong>
                <p>
                  {item.sku} · Qty {item.quantity}
                </p>
              </div>
              <strong>₹{Number(item.lineTotal).toLocaleString('en-IN')}</strong>
            </article>
          ))}
          <div className="order-total">
            <span>Total</span>
            <strong>₹{Number(order.total).toLocaleString('en-IN')}</strong>
          </div>
        </section>
        <aside className="address-card">
          <h2>Shipping to</h2>
          <address>
            {order.shipping.name}
            <br />
            {order.shipping.addressLine1}
            <br />
            {order.shipping.addressLine2 ? (
              <>
                {order.shipping.addressLine2}
                <br />
              </>
            ) : null}
            {order.shipping.city}, {order.shipping.state} {order.shipping.postalCode}
            <br />
            {order.shipping.country}
          </address>
          <h2>Payment</h2>
          <p>
            {order.payment?.method ?? '—'} · {order.payment?.status ?? '—'}
          </p>
          {['PENDING', 'CONFIRMED'].includes(order.status) ? (
            <button className="button button-danger" disabled={busy} onClick={() => void cancel()}>
              {busy ? 'Cancelling…' : 'Cancel order'}
            </button>
          ) : null}
        </aside>
      </div>
      <div className="button-row">
        <Link className="button button-secondary" to="/orders">
          All orders
        </Link>
        <Link className="button button-primary" to="/products">
          Continue shopping
        </Link>
      </div>
    </main>
  );
}

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setUser(await api.users.update({ ...form, phone: form.phone || null }));
      setMessage('Profile updated.');
    } catch (cause) {
      setError(apiError(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="page-shell narrow-page">
      <header className="page-header">
        <p className="eyebrow">Account settings</p>
        <h1>Your profile</h1>
        <p>{user?.email}</p>
      </header>
      {error ? <ErrorAlert message={error} /> : null}
      {message ? <SuccessAlert message={message} /> : null}
      <form className="panel form-stack" onSubmit={(e) => void submit(e)}>
        <div className="form-grid">
          <label>
            First name
            <input
              required
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            />
          </label>
          <label>
            Last name
            <input
              required
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            />
          </label>
        </div>
        <label>
          Phone
          <input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </label>
        <button className="button button-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </main>
  );
}
