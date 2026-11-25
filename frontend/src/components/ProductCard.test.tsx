import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Product } from '../types';
import { ProductCard } from './ProductCard';

const product: Product = {
  id: '9ad7f9b2-92cf-4b44-a776-026a8e7f2032',
  name: 'Canvas Weekender',
  description: 'A useful bag.',
  sku: 'BAG-001',
  price: '2499.00',
  stockQuantity: 4,
  availability: 'IN_STOCK',
  imageUrl: null,
  isActive: true,
  category: {
    id: '70cd1725-28ee-42ae-b847-d1e4f49632dd',
    name: 'Lifestyle',
    slug: 'lifestyle',
    description: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('ProductCard', () => {
  it('shows catalogue information and detail link', () => {
    render(
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: product.name })).toBeInTheDocument();
    expect(screen.getByText('In stock')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: product.name })).toHaveAttribute(
      'href',
      `/products/${product.id}`,
    );
  });
});
