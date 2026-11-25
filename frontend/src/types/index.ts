export type Role = 'CUSTOMER' | 'ADMIN';
export type OrderStatus =
  'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  price: string;
  stockQuantity: number;
  availability: 'IN_STOCK' | 'OUT_OF_STOCK';
  imageUrl: string | null;
  isActive: boolean;
  category: Category;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface CartItem {
  id: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  product: {
    id: string;
    name: string;
    sku: string;
    imageUrl: string | null;
    stockQuantity: number;
    isAvailable: boolean;
  };
}

export interface Cart {
  id: string | null;
  items: CartItem[];
  subtotal: string;
  total: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: string;
  total: string;
  shipping: {
    name: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
    unitPrice: string;
    quantity: number;
    lineTotal: string;
  }>;
  payment: {
    method: string;
    status: string;
    amount: string;
    reference: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
}

export interface DashboardMetrics {
  customers: number;
  activeProducts: number;
  lowStockProducts: number;
  orders: number;
  pendingOrders: number;
  confirmedRevenue: string;
}
