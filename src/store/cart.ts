"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  variantId: string;
  name: string;
  variantName: string;
  price: number;
  quantity: number;
  stockQuantity?: number;
  imageUrl?: string;
  sku: string;
}

interface CartStore {
  items: CartItem[];
  discountCode: string | null;
  affiliateCode: string | null;
  isOpen: boolean;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  setDiscountCode: (code: string | null) => void;
  setAffiliateCode: (code: string | null) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  subtotal: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      discountCode: null,
      affiliateCode: null,
      isOpen: false,

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? {
                      ...i,
                      quantity: Math.min(
                        i.stockQuantity ?? Number.MAX_SAFE_INTEGER,
                        i.quantity + (item.quantity ?? 1)
                      ),
                    }
                  : i
              ),
              isOpen: true,
            };
          }
          return {
            items: [...state.items, { ...item, quantity: item.quantity ?? 1 }],
            isOpen: true,
          };
        });
      },

      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),

      updateQuantity: (variantId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.variantId !== variantId)
              : state.items.map((i) =>
                  i.variantId === variantId
                    ? {
                        ...i,
                        quantity: Math.min(
                          i.stockQuantity ?? Number.MAX_SAFE_INTEGER,
                          quantity
                        ),
                      }
                    : i
                ),
        })),

      clearCart: () => set({ items: [], discountCode: null }),
      setDiscountCode: (code) => set({ discountCode: code }),
      setAffiliateCode: (code) => set({ affiliateCode: code }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      subtotal: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      itemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: "ovipeps-cart",
      version: 4,
      migrate: (persistedState) => {
        const state = persistedState as Partial<CartStore>;
        return { ...state, items: state.items ?? [] } as CartStore;
      },
    }
  )
);
