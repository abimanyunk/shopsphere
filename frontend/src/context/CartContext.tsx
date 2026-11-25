import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../services/api';
import type { Cart } from '../types';
import { useAuth } from './AuthContext';

const emptyCart: Cart = { id: null, items: [], subtotal: '0.00', total: '0.00' };

interface CartContextValue {
  cart: Cart;
  loading: boolean;
  refresh: () => Promise<void>;
  add: (productId: string, quantity: number) => Promise<void>;
  update: (itemId: string, quantity: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  clearLocal: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!user) {
      setCart(emptyCart);
      return;
    }
    setLoading(true);
    try {
      setCart(await api.cart.get());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [user?.id]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      loading,
      refresh,
      add: async (productId, quantity) => setCart(await api.cart.add(productId, quantity)),
      update: async (itemId, quantity) => setCart(await api.cart.update(itemId, quantity)),
      remove: async (itemId) => setCart(await api.cart.remove(itemId)),
      clearLocal: () => setCart(emptyCart),
    }),
    [cart, loading, user?.id],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
