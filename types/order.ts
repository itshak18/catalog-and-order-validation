/**
 * Order and cart type definitions.
 */

import type { Money } from "./catalog"

/**
 * Payment-specific order statuses.
 * This is the single source of truth for order state machine.
 */
export type OrderStatus =
  | "pending_payment"    // Order created, awaiting payment
  | "payment_processing" // Payment initiated with provider
  | "paid"               // Payment confirmed
  | "failed"             // Payment failed
  | "cancelled"          // Order cancelled by user or timeout
  | "refunded"           // Payment refunded
  // Fulfillment statuses (only reachable from "paid")
  | "processing"         // Order being prepared
  | "shipped"            // Order shipped
  | "delivered"          // Order delivered

export type PaymentProvider = "stripe" | "paypal" | "apple_pay" | "yaad" | "card" | "manual"

/**
 * Events that trigger order status transitions.
 */
export type OrderEvent =
  | "PAYMENT_INITIATED"
  | "PAYMENT_CAPTURED"
  | "PAYMENT_FAILED"
  | "PAYMENT_CANCELLED"
  | "PAYMENT_REFUNDED"
  | "ORDER_PROCESSING"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"

/**
 * Payment event log entry for audit trail.
 */
export interface PaymentEvent {
  id: string
  timestamp: string
  event: OrderEvent
  provider: PaymentProvider
  providerTransactionId: string | null
  providerCaptureId: string | null
  providerStatus: string | null
  signatureValid: boolean | null
  rawResponse: Record<string, unknown> | null
  metadata: Record<string, unknown>
}

/**
 * Provider reference storage.
 */
export interface ProviderRefs {
  /** Provider order/transaction ID (e.g., PayPal order ID) */
  orderId: string | null
  /** Provider capture ID (e.g., PayPal capture ID) */
  captureId: string | null
  /** Provider-specific status */
  status: string | null
  /** Last update timestamp from provider */
  lastUpdated: string | null
}

export interface CartLine {
  productId: string
  variantId: string
  name: string
  description: string
  image: string
  unitPrice: number
  quantity: number
}

export interface Address {
  firstName: string
  lastName: string
  address1: string
  address2: string
  city: string
  state: string
  postalCode: string
  country: string
  phone: string
}

export interface CheckoutInput {
  email: string
  shippingAddress: Address
  billingAddress: Address | null   // null = same as shipping
  shippingMethodId: string
  paymentProvider: PaymentProvider
  promoCode: string | null
  notes: string
}

export interface OrderTotals {
  subtotal: Money
  discount: Money
  shipping: Money
  tax: Money
  total: Money
}

export interface Order {
  id: string
  orderNumber: string
  email: string
  status: OrderStatus
  paymentProvider: PaymentProvider
  /** @deprecated Use providerRefs.orderId instead */
  paymentProviderId: string | null
  /** Provider references for reconciliation */
  providerRefs: ProviderRefs
  /** Payment event audit log */
  paymentEvents: PaymentEvent[]
  lines: CartLine[]
  shippingAddress: Address
  billingAddress: Address
  shippingMethodId: string
  promoCode: string | null
  totals: OrderTotals
  createdAt: string
  updatedAt: string
  paidAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
}

/**
 * Result of a transition attempt.
 */
export interface TransitionResult {
  success: boolean
  order: Order | null
  error: string | null
  /** True if the order was already in the target state (idempotent) */
  alreadyInState: boolean
}
