import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { OrderStatus, PaginationMeta } from '../types';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state-box" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="alert alert-error" role="alert">
      {message}
    </div>
  );
}

export function SuccessAlert({ message }: { message: string }) {
  return (
    <div className="alert alert-success" role="status">
      {message}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: { label: string; to: string };
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true">
        ◇
      </span>
      <h2>{title}</h2>
      <p>{message}</p>
      {action ? (
        <Link className="button button-primary" to={action.to}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: OrderStatus | string }) {
  return (
    <span className={`status status-${status.toLowerCase()}`}>{status.replace('_', ' ')}</span>
  );
}

export function Pagination({
  meta,
  onPage,
}: {
  meta: PaginationMeta;
  onPage: (page: number) => void;
}) {
  if (meta.totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
        Previous
      </button>
      <span>
        Page {meta.page} of {meta.totalPages}
      </span>
      <button disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>
        Next
      </button>
    </nav>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      {children}
    </header>
  );
}
