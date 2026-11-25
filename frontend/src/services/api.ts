import axios, { isAxiosError } from 'axios';
import type {
  Cart,
  Category,
  DashboardMetrics,
  Order,
  OrderStatus,
  PaginationMeta,
  Product,
  User,
} from '../types';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  withCredentials: true,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

async function csrf(force = false): Promise<string> {
  if (!force && csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = client
      .get<{ data: { csrfToken: string } }>('/auth/csrf')
      .then((response) => {
        csrfToken = response.data.data.csrfToken;
        return csrfToken;
      })
      .finally(() => {
        csrfRequest = null;
      });
  }
  return csrfRequest;
}

async function mutate<T>(
  method: 'post' | 'patch' | 'delete',
  url: string,
  data?: unknown,
): Promise<T> {
  const token = await csrf();
  const response = await client.request<T>({
    method,
    url,
    data,
    headers: { 'x-csrf-token': token },
  });
  return response.data;
}

export function apiError(error: unknown): string {
  if (isAxiosError<{ error?: { message?: string } }>(error)) {
    return error.response?.data?.error?.message ?? 'The request could not be completed.';
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

export function apiErrorDetails(error: unknown): Record<string, unknown> | undefined {
  if (isAxiosError<{ error?: { details?: Record<string, unknown> } }>(error)) {
    return error.response?.data?.error?.details;
  }
  return undefined;
}

export const api = {
  auth: {
    session: async () =>
      (await client.get<{ data: { user: User } }>('/auth/session')).data.data.user,
    login: async (input: { email: string; password: string }) => {
      const token = await csrf(true);
      const response = await client.post<{ data: { user: User; csrfToken: string } }>(
        '/auth/login',
        input,
        { headers: { 'x-csrf-token': token } },
      );
      csrfToken = response.data.data.csrfToken;
      return response.data.data.user;
    },
    register: async (input: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
    }) => {
      const token = await csrf(true);
      const response = await client.post<{ data: { user: User; csrfToken: string } }>(
        '/auth/register',
        input,
        { headers: { 'x-csrf-token': token } },
      );
      csrfToken = response.data.data.csrfToken;
      return response.data.data.user;
    },
    logout: async () => {
      await mutate('post', '/auth/logout');
      csrfToken = null;
    },
  },
  users: {
    update: async (input: { firstName?: string; lastName?: string; phone?: string | null }) =>
      (await mutate<{ data: { user: User } }>('patch', '/users/me', input)).data.user,
  },
  categories: {
    list: async () =>
      (await client.get<{ data: { categories: Category[] } }>('/categories')).data.data.categories,
  },
  products: {
    list: async (params: Record<string, string | number | boolean | undefined> = {}) => {
      const response = await client.get<{
        data: { products: Product[] };
        meta: PaginationMeta;
      }>('/products', { params });
      return response.data;
    },
    detail: async (id: string) =>
      (await client.get<{ data: { product: Product } }>(`/products/${id}`)).data.data.product,
  },
  cart: {
    get: async () => (await client.get<{ data: { cart: Cart } }>('/cart')).data.data.cart,
    add: async (productId: string, quantity: number) =>
      (await mutate<{ data: { cart: Cart } }>('post', '/cart/items', { productId, quantity })).data
        .cart,
    update: async (itemId: string, quantity: number) =>
      (await mutate<{ data: { cart: Cart } }>('patch', `/cart/items/${itemId}`, { quantity })).data
        .cart,
    remove: async (itemId: string) =>
      (await mutate<{ data: { cart: Cart } }>('delete', `/cart/items/${itemId}`)).data.cart,
  },
  orders: {
    checkout: async (input: unknown) =>
      (await mutate<{ data: { order: Order } }>('post', '/orders/checkout', input)).data.order,
    list: async (page = 1) =>
      (
        await client.get<{ data: { orders: Order[] }; meta: PaginationMeta }>('/orders', {
          params: { page },
        })
      ).data,
    detail: async (id: string) =>
      (await client.get<{ data: { order: Order } }>(`/orders/${id}`)).data.data.order,
    cancel: async (id: string) =>
      (await mutate<{ data: { order: Order } }>('post', `/orders/${id}/cancel`)).data.order,
  },
  admin: {
    dashboard: async () =>
      (await client.get<{ data: { metrics: DashboardMetrics } }>('/admin/dashboard')).data.data
        .metrics,
    products: async (params: Record<string, string | number | undefined> = {}) =>
      (
        await client.get<{ data: { products: Product[] }; meta: PaginationMeta }>(
          '/admin/products',
          { params },
        )
      ).data,
    createProduct: async (input: unknown) =>
      (await mutate<{ data: { product: Product } }>('post', '/admin/products', input)).data.product,
    updateProduct: async (id: string, input: unknown) =>
      (await mutate<{ data: { product: Product } }>('patch', `/admin/products/${id}`, input)).data
        .product,
    updateInventory: async (id: string, stockQuantity: number) =>
      (
        await mutate<{ data: { product: Product } }>('patch', `/admin/products/${id}/inventory`, {
          stockQuantity,
        })
      ).data.product,
    deactivateProduct: async (id: string) =>
      (await mutate<{ data: { product: Product } }>('delete', `/admin/products/${id}`)).data
        .product,
    categories: async () =>
      (await client.get<{ data: { categories: Category[] } }>('/admin/categories')).data.data
        .categories,
    createCategory: async (input: unknown) =>
      (await mutate<{ data: { category: Category } }>('post', '/admin/categories', input)).data
        .category,
    updateCategory: async (id: string, input: unknown) =>
      (await mutate<{ data: { category: Category } }>('patch', `/admin/categories/${id}`, input))
        .data.category,
    orders: async (params: Record<string, string | number | undefined> = {}) =>
      (
        await client.get<{ data: { orders: Order[] }; meta: PaginationMeta }>('/admin/orders', {
          params,
        })
      ).data,
    order: async (id: string) =>
      (await client.get<{ data: { order: Order } }>(`/admin/orders/${id}`)).data.data.order,
    updateOrderStatus: async (id: string, status: OrderStatus) =>
      (
        await mutate<{ data: { order: Order } }>('patch', `/admin/orders/${id}/status`, {
          status,
        })
      ).data.order,
  },
};
