'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/client';

export interface CartItem {
    variantId: string;
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
}

interface CartContextValue {
    cartItems: CartItem[];
    loading: boolean;
    itemLoadingStates: Record<string, boolean>;
    storeSlug: string;
    addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
    updateCartLine: (variantId: string, quantity: number) => void;
    removeFromCart: (variantId: string) => void;
    refreshCart: () => void;
    clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children, storeSlug }: { children: ReactNode; storeSlug: string }) {
    const STORAGE_KEY = `cart_${storeSlug}`;
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [itemLoadingStates, setItemLoadingStates] = useState<Record<string, boolean>>({});

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) setCartItems(JSON.parse(stored));
        } catch { }
        setLoading(false);
    }, [STORAGE_KEY]);

    // Persist to localStorage on every change
    useEffect(() => {
        if (!loading) localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    }, [cartItems, loading, STORAGE_KEY]);

    const setItemLoading = (id: string, state: boolean) =>
        setItemLoadingStates(prev => ({ ...prev, [id]: state }));

    const addToCart = useCallback((item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
        setCartItems(prev => {
            const existing = prev.find(i => i.variantId === item.variantId);
            if (existing) {
                return prev.map(i =>
                    i.variantId === item.variantId
                        ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
                        : i
                );
            }
            return [...prev, { ...item, quantity: item.quantity ?? 1 }];
        });
    }, []);

    const updateCartLine = useCallback((variantId: string, quantity: number) => {
        setItemLoading(variantId, true);
        setCartItems(prev =>
            prev.map(i => (i.variantId === variantId ? { ...i, quantity } : i))
        );
        setItemLoading(variantId, false);
    }, []);

    const removeFromCart = useCallback((variantId: string) => {
        setItemLoading(variantId, true);
        setCartItems(prev => prev.filter(i => i.variantId !== variantId));
        setItemLoading(variantId, false);
    }, []);

    const clearCart = useCallback(() => {
        setCartItems([]);
        localStorage.removeItem(STORAGE_KEY);
    }, [STORAGE_KEY]);

    const refreshCart = useCallback(() => { }, []); // no-op for localStorage cart

    return (
        <CartContext.Provider value={{
            cartItems, loading, itemLoadingStates, storeSlug,
            addToCart, updateCartLine, removeFromCart, refreshCart, clearCart,
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within CartProvider');
    return ctx;
}
