import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('./services/api', () => ({
  api: { auth: { session: vi.fn().mockRejectedValue(new Error('No session')) } },
}));

describe('App', () => {
  it('renders the customer storefront home page', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { name: /find your next\s*favorite thing/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /shop the collection/i })).toHaveAttribute(
      'href',
      '/products',
    );
  });
});
