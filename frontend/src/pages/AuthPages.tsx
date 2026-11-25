import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ErrorAlert } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../services/api';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await login(email, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? (user.role === 'ADMIN' ? '/admin' : '/'));
    } catch (cause) {
      setError(apiError(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Welcome back</p>
        <h1>Sign in to ShopSphere</h1>
        <p>Access your cart, orders, and account details.</p>
        {error ? <ErrorAlert message={error} /> : null}
        <form className="form-stack" onSubmit={(e) => void submit(e)}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="button button-primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p>
          New here? <Link to="/register">Create an account</Link>
        </p>
      </section>
      <aside className="auth-aside">
        <span>“</span>
        <blockquote>A calm, clear storefront for finding what matters.</blockquote>
      </aside>
    </main>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (name: string, value: string) => setForm((v) => ({ ...v, [name]: value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register({ ...form, phone: form.phone || undefined });
      navigate('/products');
    } catch (cause) {
      setError(apiError(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Join the sphere</p>
        <h1>Create your account</h1>
        <p>Save your cart and follow every order.</p>
        {error ? <ErrorAlert message={error} /> : null}
        <form className="form-stack" onSubmit={(e) => void submit(e)}>
          <div className="form-grid">
            <label>
              First name
              <input
                required
                autoComplete="given-name"
                value={form.firstName}
                onChange={(e) => change('firstName', e.target.value)}
              />
            </label>
            <label>
              Last name
              <input
                required
                autoComplete="family-name"
                value={form.lastName}
                onChange={(e) => change('lastName', e.target.value)}
              />
            </label>
          </div>
          <label>
            Email
            <input
              required
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => change('email', e.target.value)}
            />
          </label>
          <label>
            Phone <small>(optional)</small>
            <input
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => change('phone', e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              minLength={12}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => change('password', e.target.value)}
            />
            <small>At least 12 characters with upper/lowercase, number, and symbol.</small>
          </label>
          <button className="button button-primary" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </section>
      <aside className="auth-aside auth-aside-light">
        <span>SS</span>
        <blockquote>Your next favorite thing is closer than you think.</blockquote>
      </aside>
    </main>
  );
}
