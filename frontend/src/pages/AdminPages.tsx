import { useEffect, useState, type FormEvent } from 'react';
import {
  ErrorAlert,
  LoadingState,
  PageHeader,
  Pagination,
  StatusBadge,
  SuccessAlert,
} from '../components/UI';
import { api, apiError } from '../services/api';
import type {
  Category,
  DashboardMetrics,
  Order,
  OrderStatus,
  PaginationMeta,
  Product,
} from '../types';

const blankMeta: PaginationMeta = { page: 1, limit: 20, totalItems: 0, totalPages: 0 };
const money = (value: string) => `₹${Number(value).toLocaleString('en-IN')}`;

export function AdminDashboardPage() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.admin
      .dashboard()
      .then(setData)
      .catch((e) => setError(apiError(e)));
  }, []);
  return (
    <>
      <PageHeader eyebrow="At a glance" title="Dashboard">
        <p>Live operational totals across ShopSphere.</p>
      </PageHeader>
      {error ? (
        <ErrorAlert message={error} />
      ) : !data ? (
        <LoadingState label="Loading dashboard…" />
      ) : (
        <>
          <section className="metric-grid">
            <article>
              <span>Customers</span>
              <strong>{data.customers}</strong>
            </article>
            <article>
              <span>Active products</span>
              <strong>{data.activeProducts}</strong>
            </article>
            <article className={data.lowStockProducts ? 'metric-warning' : ''}>
              <span>Low stock</span>
              <strong>{data.lowStockProducts}</strong>
            </article>
            <article>
              <span>All orders</span>
              <strong>{data.orders}</strong>
            </article>
            <article>
              <span>Needs attention</span>
              <strong>{data.pendingOrders}</strong>
            </article>
            <article>
              <span>Confirmed revenue</span>
              <strong>{money(data.confirmedRevenue)}</strong>
            </article>
          </section>
          <section className="panel admin-welcome">
            <div>
              <p className="eyebrow">Operations center</p>
              <h2>Everything is in one place.</h2>
              <p>Maintain the catalogue, watch inventory, and move orders through fulfilment.</p>
            </div>
            <span aria-hidden="true">↗</span>
          </section>
        </>
      )}
    </>
  );
}

type ProductForm = {
  name: string;
  description: string;
  sku: string;
  price: string;
  stockQuantity: string;
  imageUrl: string;
  categoryId: string;
};
const emptyProduct: ProductForm = {
  name: '',
  description: '',
  sku: '',
  price: '',
  stockQuantity: '0',
  imageUrl: '',
  categoryId: '',
};

function CategoryManager({
  categories,
  refresh,
}: {
  categories: Category[];
  refresh: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const reset = () => {
    setEditing(null);
    setForm({ name: '', slug: '', description: '' });
  };
  const select = (category: Category) => {
    setEditing(category);
    setForm({ name: category.name, slug: category.slug, description: category.description ?? '' });
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const input = { ...form, description: form.description || null };
      if (editing) await api.admin.updateCategory(editing.id, input);
      else await api.admin.createCategory(input);
      setMessage(editing ? 'Category updated.' : 'Category created.');
      reset();
      await refresh();
    } catch (cause) {
      setError(apiError(cause));
    }
  };
  const toggle = async (category: Category) => {
    setError('');
    setMessage('');
    try {
      await api.admin.updateCategory(category.id, { isActive: !category.isActive });
      setMessage(`${category.name} ${category.isActive ? 'deactivated' : 'activated'}.`);
      await refresh();
    } catch (cause) {
      setError(apiError(cause));
    }
  };
  return (
    <details className="panel editor-panel">
      <summary>Manage categories</summary>
      <div className="category-manager">
        {error ? <ErrorAlert message={error} /> : null}
        {message ? <SuccessAlert message={message} /> : null}
        <form className="form-stack" onSubmit={(event) => void submit(event)}>
          <div className="form-grid">
            <label>
              Name
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label>
              Slug
              <input
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </label>
          </div>
          <label>
            Description
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>
          <div className="button-row">
            <button className="button button-primary">
              {editing ? 'Save category' : 'Create category'}
            </button>
            {editing ? (
              <button type="button" className="button button-secondary" onClick={reset}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
        <div className="category-list">
          {categories.map((category) => (
            <div key={category.id}>
              <span>
                <strong>{category.name}</strong>
                <small>
                  {category.slug} · {category.isActive ? 'Active' : 'Inactive'}
                </small>
              </span>
              <button onClick={() => select(category)}>Edit</button>
              <button
                className={category.isActive ? 'danger' : ''}
                onClick={() => void toggle(category)}
              >
                {category.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [meta, setMeta] = useState(blankMeta);
  const [form, setForm] = useState<ProductForm>(emptyProduct);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = async (page = meta.page) => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([api.admin.products({ page }), api.admin.categories()]);
      setProducts(p.data.products);
      setMeta(p.meta);
      setCategories(c);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [meta.page]);
  const change = (name: string, value: string) => setForm((f) => ({ ...f, [name]: value }));
  const edit = (p: Product) => {
    setEditing(p.id);
    setForm({
      name: p.name,
      description: p.description,
      sku: p.sku,
      price: p.price,
      stockQuantity: String(p.stockQuantity),
      imageUrl: p.imageUrl ?? '',
      categoryId: p.category.id,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const reset = () => {
    setEditing(null);
    setForm(emptyProduct);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const base = {
        name: form.name,
        description: form.description,
        sku: form.sku,
        price: form.price,
        imageUrl: form.imageUrl || null,
        categoryId: form.categoryId,
      };
      if (editing) await api.admin.updateProduct(editing, base);
      else await api.admin.createProduct({ ...base, stockQuantity: Number(form.stockQuantity) });
      setMessage(editing ? 'Product updated.' : 'Product created.');
      reset();
      await load();
    } catch (cause) {
      setError(apiError(cause));
    } finally {
      setBusy(false);
    }
  };
  const deactivate = async (id: string) => {
    if (!window.confirm('Deactivate this product?')) return;
    try {
      await api.admin.deactivateProduct(id);
      setMessage('Product deactivated.');
      await load();
    } catch (e) {
      setError(apiError(e));
    }
  };
  return (
    <>
      <PageHeader eyebrow="Catalogue" title="Product management">
        <p>Create products and maintain their customer-facing details.</p>
      </PageHeader>
      {error ? <ErrorAlert message={error} /> : null}
      {message ? <SuccessAlert message={message} /> : null}
      <details className="panel editor-panel" open={Boolean(editing)}>
        <summary>{editing ? 'Edit product' : 'Add a product'}</summary>
        <form className="form-stack" onSubmit={(e) => void submit(e)}>
          <div className="form-grid">
            <label>
              Name
              <input required value={form.name} onChange={(e) => change('name', e.target.value)} />
            </label>
            <label>
              SKU
              <input required value={form.sku} onChange={(e) => change('sku', e.target.value)} />
            </label>
            <label>
              Price
              <input
                required
                inputMode="decimal"
                value={form.price}
                onChange={(e) => change('price', e.target.value)}
              />
            </label>
            {!editing ? (
              <label>
                Initial stock
                <input
                  required
                  type="number"
                  min="0"
                  value={form.stockQuantity}
                  onChange={(e) => change('stockQuantity', e.target.value)}
                />
              </label>
            ) : null}
            <label>
              Category
              <select
                required
                value={form.categoryId}
                onChange={(e) => change('categoryId', e.target.value)}
              >
                <option value="">Choose category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Image URL <small>(optional)</small>
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => change('imageUrl', e.target.value)}
              />
            </label>
          </div>
          <label>
            Description
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => change('description', e.target.value)}
            />
          </label>
          <div className="button-row">
            <button className="button button-primary" disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Save product' : 'Create product'}
            </button>
            {editing ? (
              <button className="button button-secondary" type="button" onClick={reset}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </details>
      <CategoryManager categories={categories} refresh={() => load()} />
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td>{p.sku}</td>
                    <td>{p.category.name}</td>
                    <td>{money(p.price)}</td>
                    <td>{p.stockQuantity}</td>
                    <td>
                      <span className={p.isActive ? 'stock-in' : 'stock-out'}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-actions">
                      <button onClick={() => edit(p)}>Edit</button>
                      {p.isActive ? (
                        <button className="danger" onClick={() => void deactivate(p.id)}>
                          Deactivate
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={meta} onPage={(page) => setMeta((m) => ({ ...m, page }))} />
        </>
      )}
    </>
  );
}

export function AdminInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState(blankMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const load = () => {
    setLoading(true);
    api.admin
      .products({ page: meta.page, limit: 50 })
      .then((r) => {
        setProducts(r.data.products);
        setMeta(r.meta);
        setDrafts(Object.fromEntries(r.data.products.map((p) => [p.id, String(p.stockQuantity)])));
      })
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, [meta.page]);
  const save = async (p: Product) => {
    setError('');
    setMessage('');
    try {
      await api.admin.updateInventory(p.id, Number(drafts[p.id]));
      setMessage(`${p.name} inventory updated.`);
      load();
    } catch (e) {
      setError(apiError(e));
    }
  };
  return (
    <>
      <PageHeader eyebrow="Stock control" title="Inventory">
        <p>Products at five units or fewer are highlighted for replenishment.</p>
      </PageHeader>
      {error ? <ErrorAlert message={error} /> : null}
      {message ? <SuccessAlert message={message} /> : null}
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Current state</th>
                  <th>Quantity</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className={p.stockQuantity <= 5 ? 'low-stock-row' : ''}>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td>{p.sku}</td>
                    <td>
                      <span className={p.stockQuantity > 0 ? 'stock-in' : 'stock-out'}>
                        {p.stockQuantity === 0
                          ? 'Out of stock'
                          : p.stockQuantity <= 5
                            ? 'Low stock'
                            : 'Healthy'}
                      </span>
                    </td>
                    <td>
                      <input
                        className="stock-input"
                        type="number"
                        min="0"
                        value={drafts[p.id] ?? p.stockQuantity}
                        onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                      />
                    </td>
                    <td>
                      <button className="button button-small" onClick={() => void save(p)}>
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={meta} onPage={(page) => setMeta((m) => ({ ...m, page }))} />
        </>
      )}
    </>
  );
}

const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};
export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState(blankMeta);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const load = () => {
    setLoading(true);
    api.admin
      .orders({ page: meta.page, status: status || undefined })
      .then((r) => {
        setOrders(r.data.orders);
        setMeta(r.meta);
      })
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, [meta.page, status]);
  const update = async (order: Order, next: OrderStatus) => {
    setError('');
    setMessage('');
    try {
      await api.admin.updateOrderStatus(order.id, next);
      setMessage(`${order.orderNumber} moved to ${next.toLowerCase()}.`);
      load();
    } catch (e) {
      setError(apiError(e));
    }
  };
  const view = async (orderId: string) => {
    setError('');
    try {
      setSelected(await api.admin.order(orderId));
    } catch (cause) {
      setError(apiError(cause));
    }
  };
  return (
    <>
      <PageHeader eyebrow="Fulfilment" title="Order management">
        <p>Review and advance orders through their valid fulfilment states.</p>
      </PageHeader>
      <label className="admin-filter">
        Status
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setMeta((m) => ({ ...m, page: 1 }));
          }}
        >
          <option value="">All statuses</option>
          {Object.keys(nextStatuses).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      {error ? <ErrorAlert message={error} /> : null}
      {message ? <SuccessAlert message={message} /> : null}
      {selected ? (
        <section className="panel admin-order-detail">
          <div className="detail-heading">
            <div>
              <p className="eyebrow">Order detail</p>
              <h2>{selected.orderNumber}</h2>
            </div>
            <button className="link-button" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <p>
            {selected.shipping.name} · {selected.shipping.city}, {selected.shipping.country}
          </p>
          {selected.items.map((item) => (
            <div className="line-item" key={item.id}>
              <span>
                {item.quantity} × {item.productName}
              </span>
              <strong>{money(item.lineTotal)}</strong>
            </div>
          ))}
        </section>
      ) : null}
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Next action</th>
                  <th>
                    <span className="sr-only">Detail</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <strong>{o.orderNumber}</strong>
                    </td>
                    <td>
                      <button className="link-button" onClick={() => void view(o.id)}>
                        View
                      </button>
                    </td>
                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td>{o.items.length}</td>
                    <td>{money(o.total)}</td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td>
                      {nextStatuses[o.status].length ? (
                        <select
                          aria-label={`Update ${o.orderNumber}`}
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) void update(o, e.target.value as OrderStatus);
                          }}
                        >
                          <option value="">Choose…</option>
                          {nextStatuses[o.status].map((s) => (
                            <option key={s} value={s}>
                              {s.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>Complete</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={meta} onPage={(page) => setMeta((m) => ({ ...m, page }))} />
        </>
      )}
    </>
  );
}
