import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export function Layout() {
  const { user, logout } = useAuth();
  const { cart, clearLocal } = useCart();
  const navigate = useNavigate();
  const quantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  const signOut = async () => {
    await logout();
    clearLocal();
    navigate('/');
  };

  return (
    <div className="app-frame">
      <header className="site-header">
        <NavLink className="brand" to="/" aria-label="ShopSphere home">
          <span>Shop</span>Sphere
        </NavLink>
        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to="/products">Shop</NavLink>
          {user ? <NavLink to="/orders">Orders</NavLink> : null}
          {user?.role === 'ADMIN' ? <NavLink to="/admin">Admin</NavLink> : null}
        </nav>
        <nav className="account-nav" aria-label="Account navigation">
          {user ? (
            <NavLink to="/profile">Hi, {user.firstName}</NavLink>
          ) : (
            <NavLink to="/login">Sign in</NavLink>
          )}
          {user ? (
            <button className="link-button" onClick={() => void signOut()}>
              Sign out
            </button>
          ) : null}
          <NavLink className="cart-link" to="/cart">
            Cart <span>{quantity}</span>
          </NavLink>
        </nav>
      </header>
      <div className="announcement">
        Free delivery on every simulated order · Built for learning, ready for operations
      </div>
      <Outlet />
      <footer className="site-footer">
        <div>
          <strong>ShopSphere</strong>
          <p>A secure, full-stack demonstration store.</p>
        </div>
        <div>
          <strong>Explore</strong>
          <NavLink to="/products">All products</NavLink>
          <NavLink to="/profile">Your account</NavLink>
        </div>
        <p>© 2026 ShopSphere. Payments are simulated.</p>
      </footer>
    </div>
  );
}

export function AdminLayout() {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <p className="eyebrow">Operations</p>
        <h2>Admin console</h2>
        <nav aria-label="Admin navigation">
          <NavLink end to="/admin">
            Dashboard
          </NavLink>
          <NavLink to="/admin/products">Products</NavLink>
          <NavLink to="/admin/inventory">Inventory</NavLink>
          <NavLink to="/admin/orders">Orders</NavLink>
        </nav>
      </aside>
      <section className="admin-content">
        <Outlet />
      </section>
    </div>
  );
}
