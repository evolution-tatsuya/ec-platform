import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product } from '../types';

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity: number) => void;
  removeItem: (cartItemKey: string) => void;
  updateQuantity: (cartItemKey: string, quantity: number) => void;
  clearCart: () => void;
  getTotalAmount: () => number;
  getItemCount: () => number;
  getBankTransferDiscount: () => number;
  getFinalAmount: () => number;
}

// カートアイテムの一意キーを生成（商品ID + 商品名）
const getCartItemKey = (productId: string, productName: string): string => {
  return `${productId}::${productName}`;
};

const BANK_TRANSFER_DISCOUNT_RATE = 0.036; // 3.6%

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity) => {
        set((state) => {
          // バリエーション対応: 商品IDと商品名の組み合わせで識別
          const itemKey = getCartItemKey(product.id, product.name);
          const existingItem = state.items.find(
            (item) => getCartItemKey(item.productId, item.product.name) === itemKey
          );

          if (existingItem) {
            // 既存商品の数量を増やす
            return {
              items: state.items.map((item) =>
                getCartItemKey(item.productId, item.product.name) === itemKey
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          } else {
            // 新しい商品を追加
            return {
              items: [
                ...state.items,
                {
                  productId: product.id,
                  quantity,
                  product,
                },
              ],
            };
          }
        });
      },

      removeItem: (cartItemKey) => {
        set((state) => ({
          items: state.items.filter(
            (item) => getCartItemKey(item.productId, item.product.name) !== cartItemKey
          ),
        }));
      },

      updateQuantity: (cartItemKey, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            getCartItemKey(item.productId, item.product.name) === cartItemKey
              ? { ...item, quantity }
              : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalAmount: () => {
        const state = get();
        return state.items.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        );
      },

      getItemCount: () => {
        const state = get();
        return state.items.reduce((count, item) => count + item.quantity, 0);
      },

      getBankTransferDiscount: () => {
        const state = get();
        const totalAmount = state.getTotalAmount();
        return Math.floor(totalAmount * BANK_TRANSFER_DISCOUNT_RATE);
      },

      getFinalAmount: () => {
        const state = get();
        const totalAmount = state.getTotalAmount();
        const discount = state.getBankTransferDiscount();
        return totalAmount - discount;
      },
    }),
    {
      name: 'cart-storage', // localStorageのキー名
    }
  )
);
