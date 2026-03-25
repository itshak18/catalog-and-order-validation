"use client"

import { createContext, useContext, useState, useMemo, useEffect, type ReactNode } from "react"
import type { CartLine } from "@/types/order"
import {
  calculatePricing,
  formatMoney,
  getShippingMessage,
  type PricingBreakdown,
} from "@/lib/pricing"
import { validateCoupon, getCouponDiscount, formatDiscountPercent } from "@/lib/coupons"

// localStorage keys for cart persistence
const CART_STORAGE_KEY = "juliris_cart"
const PROMO_STORAGE_KEY = "juliris_promo"

// Re-export CartLine type for consumers
export type { CartLine }

// Legacy CartItem alias for backwards compatibility
export type CartItem = CartLine

interface CartContextType {
  // Cart state
  items: CartLine[]
  itemCount: number

  // Cart actions
  addItem: (item: Omit<CartLine, "quantity">) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  restoreCart: (lines: CartLine[]) => void

  // Drawer state
  isOpen: boolean
  setIsOpen: (open: boolean) => void

  // Promo code
  promoCode: string | null
  promoError: string | null
  applyPromoCode: (code: string) => boolean
  clearPromoCode: () => void

  // Pricing (computed from shared helpers)
  subtotal: number
  discount: number
  shipping: number
  tax: number
  total: number
  pricing: PricingBreakdown
  shippingMessage: string | null
  discountLabel: string | null
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  // Initialize with a function to avoid SSR/hydration mismatch
  const [items, setItems] = useState<CartLine[]>(() => {
    // Only access localStorage on client side
    if (typeof window === "undefined") return []
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY)
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart)
        if (Array.isArray(parsedCart) && parsedCart.length > 0) {
          return parsedCart
        }
      }
    } catch (error) {
      console.error("Failed to load cart from localStorage:", error)
    }
    return []
  })

  const [promoCode, setPromoCode] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    try {
      return localStorage.getItem(PROMO_STORAGE_KEY)
    } catch {
      return null
    }
  })

  const [isOpen, setIsOpen] = useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)

  // ─────────────────────────────────────────────────────────────────────────
  // Persist cart to localStorage on changes
  // Use a ref to track if this is the initial mount to avoid overwriting
  // ─────────────────────────────────────────────────────────────────────────
  const isInitialMount = useState(true)

  useEffect(() => {
    // Skip the very first render to avoid overwriting localStorage with initial state
    if (isInitialMount[0]) {
      isInitialMount[0] = false
      return
    }

    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.error("Failed to save cart to localStorage:", error)
    }
  }, [items])

  useEffect(() => {
    try {
      if (promoCode) {
        localStorage.setItem(PROMO_STORAGE_KEY, promoCode)
      } else {
        localStorage.removeItem(PROMO_STORAGE_KEY)
      }
    } catch (error) {
      console.error("Failed to save promo to localStorage:", error)
    }
  }, [promoCode])

  // ─────────────────────────────────────────────────────────────────────────
  // Cart actions
  // ─────────────────────────────────────────────────────────────────────────

  const addItem = (newItem: Omit<CartLine, "quantity">) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.productId === newItem.productId)
      if (existingItem) {
        return currentItems.map((item) =>
          item.productId === newItem.productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...currentItems, { ...newItem, quantity: 1 }]
    })
    setIsOpen(true)
  }

  const removeItem = (id: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.productId !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(id)
      return
    }
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.productId === id ? { ...item, quantity } : item
      )
    )
  }

  const clearCart = () => {
    setItems([])
    setPromoCode(null)
    setPromoError(null)
    // Also clear localStorage
    try {
      localStorage.removeItem(CART_STORAGE_KEY)
      localStorage.removeItem(PROMO_STORAGE_KEY)
    } catch (error) {
      console.error("Failed to clear cart from localStorage:", error)
    }
  }

  const restoreCart = (lines: CartLine[]) => {
    if (!lines || lines.length === 0) return
    setItems(lines)
    // Explicitly persist to localStorage so the cart survives navigation
    // (don't rely on the useEffect chain which has an isInitialMount guard)
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines))
    } catch (error) {
      console.error("Failed to persist restored cart:", error)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Promo code actions
  // ─────────────────────────────────────────────────────────────────────────

  const applyPromoCode = (code: string): boolean => {
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const result = validateCoupon(code, subtotal)

    if (result.valid) {
      setPromoCode(code.trim().toUpperCase())
      setPromoError(null)
      return true
    } else {
      setPromoCode(null)
      setPromoError(result.error)
      return false
    }
  }

  const clearPromoCode = () => {
    setPromoCode(null)
    setPromoError(null)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Computed values (using shared pricing helpers)
  // ─────────────────────────────────────────────────────────────────────────

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  )

  const discountPercent = useMemo(() => {
    if (!promoCode) return 0
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    return getCouponDiscount(promoCode, subtotal)
  }, [items, promoCode])

  const pricing = useMemo(
    () => calculatePricing(items, discountPercent),
    [items, discountPercent]
  )

  const shippingMessage = useMemo(
    () => getShippingMessage(pricing.subtotal),
    [pricing.subtotal]
  )

  const discountLabel = useMemo(
    () => (discountPercent > 0 ? `Discount (${formatDiscountPercent(discountPercent)})` : null),
    [discountPercent]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Context value
  // ─────────────────────────────────────────────────────────────────────────

  const value: CartContextType = {
    items,
    itemCount,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    restoreCart,
    isOpen,
    setIsOpen,
    promoCode,
    promoError,
    applyPromoCode,
    clearPromoCode,
    subtotal: pricing.subtotal,
    discount: pricing.discount,
    shipping: pricing.shipping,
    tax: pricing.tax,
    total: pricing.total,
    pricing,
    shippingMessage,
    discountLabel,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
