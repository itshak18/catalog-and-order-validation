/**
 * Order management utilities with state machine and idempotency protection.
 * 
 * PERSISTENCE: Orders are stored in a JSON file to survive restarts.
 * In production, this should be replaced with a proper database.
 */

import type {
  Order,
  OrderStatus,
  OrderEvent,
  CartLine,
  CheckoutInput,
  PaymentProvider,
  PaymentEvent,
  ProviderRefs,
  TransitionResult,
} from "@/types/order"
import { calculatePricing } from "./pricing"
import { getCouponDiscount, incrementCouponUsage } from "./coupons"
import * as fs from "fs"
import * as path from "path"

/**
 * File path for order persistence.
 */
const ORDERS_FILE = path.join(process.cwd(), "data", "orders.json")
const CAPTURES_FILE = path.join(process.cwd(), "data", "processed-captures.json")

/**
 * Ensure data directory exists.
 */
function ensureDataDir(): void {
  const dataDir = path.join(process.cwd(), "data")
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

/**
 * Load orders from file.
 */
function loadOrders(): Map<string, Order> {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, "utf-8")
      const ordersArray: [string, Order][] = JSON.parse(data)
      return new Map(ordersArray)
    }
  } catch (error) {
    console.error("Failed to load orders from file:", error)
  }
  return new Map()
}

/**
 * Save orders to file.
 */
function saveOrders(): void {
  try {
    ensureDataDir()
    const ordersArray = Array.from(orders.entries())
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(ordersArray, null, 2))
  } catch (error) {
    console.error("Failed to save orders to file:", error)
  }
}

/**
 * Load processed captures from file.
 */
function loadCaptures(): Map<string, string> {
  try {
    if (fs.existsSync(CAPTURES_FILE)) {
      const data = fs.readFileSync(CAPTURES_FILE, "utf-8")
      const capturesArray: [string, string][] = JSON.parse(data)
      return new Map(capturesArray)
    }
  } catch (error) {
    console.error("Failed to load captures from file:", error)
  }
  return new Map()
}

/**
 * Save processed captures to file.
 */
function saveCaptures(): void {
  try {
    ensureDataDir()
    const capturesArray = Array.from(processedCaptures.entries())
    fs.writeFileSync(CAPTURES_FILE, JSON.stringify(capturesArray, null, 2))
  } catch (error) {
    console.error("Failed to save captures to file:", error)
  }
}

/**
 * Order store with file persistence.
 * Loads from file on startup, saves on every mutation.
 */
const orders: Map<string, Order> = loadOrders()

/**
 * Track processed provider captures to prevent double-capture.
 * Map of providerCaptureId -> orderId
 * Note: This uses the actual capture ID from the provider, not the order ID.
 */
const processedCaptures: Map<string, string> = loadCaptures()

/**
 * Valid state transitions.
 * Key: current status, Value: allowed next statuses with their triggering events.
 */
const STATE_MACHINE: Record<OrderStatus, Partial<Record<OrderEvent, OrderStatus>>> = {
  pending_payment: {
    PAYMENT_INITIATED: "payment_processing",
    PAYMENT_CAPTURED: "paid",
    PAYMENT_FAILED: "failed",
    PAYMENT_CANCELLED: "cancelled",
  },
  payment_processing: {
    PAYMENT_CAPTURED: "paid",
    PAYMENT_FAILED: "failed",
    PAYMENT_CANCELLED: "cancelled",
  },
  paid: {
    PAYMENT_REFUNDED: "refunded",
    ORDER_PROCESSING: "processing",
    ORDER_SHIPPED: "shipped",
  },
  failed: {
    // Allow retry: can go back to pending_payment or payment_processing
    PAYMENT_INITIATED: "payment_processing",
    PAYMENT_CAPTURED: "paid",
  },
  cancelled: {
    // Allow retry from cancelled
    PAYMENT_INITIATED: "payment_processing",
  },
  refunded: {
    // Terminal state for payment, no further payment transitions
  },
  processing: {
    ORDER_SHIPPED: "shipped",
    PAYMENT_REFUNDED: "refunded",
  },
  shipped: {
    ORDER_DELIVERED: "delivered",
    PAYMENT_REFUNDED: "refunded",
  },
  delivered: {
    PAYMENT_REFUNDED: "refunded",
  },
}

/**
 * Generate a unique ID.
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Generate a unique order number.
 */
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `BOTY-${timestamp}-${random}`
}

/**
 * Check if a transition is valid.
 */
export function isValidTransition(currentStatus: OrderStatus, event: OrderEvent): boolean {
  const allowedTransitions = STATE_MACHINE[currentStatus]
  return event in allowedTransitions
}

/**
 * Get the target status for a transition.
 */
export function getTargetStatus(currentStatus: OrderStatus, event: OrderEvent): OrderStatus | null {
  return STATE_MACHINE[currentStatus][event] ?? null
}

/**
 * Create a payment event entry.
 */
function createPaymentEvent(
  event: OrderEvent,
  provider: PaymentProvider,
  payload: {
    providerTransactionId?: string | null
    providerCaptureId?: string | null
    providerStatus?: string | null
    signatureValid?: boolean | null
    rawResponse?: Record<string, unknown> | null
    metadata?: Record<string, unknown>
  } = {}
): PaymentEvent {
  return {
    id: generateId("evt"),
    timestamp: new Date().toISOString(),
    event,
    provider,
    providerTransactionId: payload.providerTransactionId ?? null,
    providerCaptureId: payload.providerCaptureId ?? null,
    providerStatus: payload.providerStatus ?? null,
    signatureValid: payload.signatureValid ?? null,
    rawResponse: payload.rawResponse ?? null,
    metadata: payload.metadata ?? {},
  }
}

/**
 * Transition an order to a new state with full validation and idempotency.
 */
export function transitionOrderStatus(
  orderId: string,
  event: OrderEvent,
  payload: {
    providerTransactionId?: string | null
    providerCaptureId?: string | null
    providerStatus?: string | null
    signatureValid?: boolean | null
    rawResponse?: Record<string, unknown> | null
    metadata?: Record<string, unknown>
  } = {}
): TransitionResult {
  const order = orders.get(orderId)

  if (!order) {
    return {
      success: false,
      order: null,
      error: "Order not found",
      alreadyInState: false,
    }
  }

  const targetStatus = getTargetStatus(order.status, event)

  // Check if already in the target state (idempotent)
  if (targetStatus && order.status === targetStatus) {
    return {
      success: true,
      order,
      error: null,
      alreadyInState: true,
    }
  }

  // Special idempotency check for PAYMENT_CAPTURED on already-paid orders
  if (event === "PAYMENT_CAPTURED" && order.status === "paid") {
    // Check if this is the same capture attempt
    if (
      payload.providerTransactionId &&
      order.providerRefs.orderId === payload.providerTransactionId
    ) {
      return {
        success: true,
        order,
        error: null,
        alreadyInState: true,
      }
    }
    // Different capture on already-paid order - reject
    return {
      success: false,
      order,
      error: "Order already paid. Cannot capture again.",
      alreadyInState: false,
    }
  }

  // Validate the transition
  if (!isValidTransition(order.status, event)) {
    return {
      success: false,
      order,
      error: `Invalid transition: ${order.status} + ${event}. Order is already in '${order.status}' state.`,
      alreadyInState: false,
    }
  }

  // Double-capture protection: check if this capture was already processed.
  // Use providerCaptureId if available (most reliable), fall back to providerTransactionId.
  if (event === "PAYMENT_CAPTURED") {
    const captureKey = payload.providerCaptureId || payload.providerTransactionId
    if (captureKey) {
      const existingOrderId = processedCaptures.get(captureKey)
      if (existingOrderId) {
        if (existingOrderId === orderId) {
          // Same order, same capture - idempotent
          return {
            success: true,
            order,
            error: null,
            alreadyInState: true,
          }
        } else {
          // Different order trying to use same capture - fraud attempt
          return {
            success: false,
            order,
            error: "This payment was already applied to a different order.",
            alreadyInState: false,
          }
        }
      }
    // Mark this capture as processed
    processedCaptures.set(captureKey, orderId)
    saveCaptures()
  }
  }

  // Perform the transition
  const now = new Date().toISOString()
  const previousStatus = order.status
  order.status = targetStatus!
  order.updatedAt = now

  // Update provider refs
  if (payload.providerTransactionId) {
    order.providerRefs.orderId = payload.providerTransactionId
    order.paymentProviderId = payload.providerTransactionId // backward compat
  }
  if (payload.providerCaptureId) {
    order.providerRefs.captureId = payload.providerCaptureId
  }
  if (payload.providerStatus) {
    order.providerRefs.status = payload.providerStatus
  }
  order.providerRefs.lastUpdated = now

  // Set timestamps based on new status
  if (targetStatus === "paid") {
    order.paidAt = now
    // Increment coupon usage on first payment
    if (order.promoCode && previousStatus !== "paid") {
      incrementCouponUsage(order.promoCode)
    }
  } else if (targetStatus === "shipped") {
    order.shippedAt = now
  } else if (targetStatus === "delivered") {
    order.deliveredAt = now
  }

  // Append payment event to audit log
  const paymentEvent = createPaymentEvent(event, order.paymentProvider, payload)
  order.paymentEvents.push(paymentEvent)

  // Persist changes to file
  saveOrders()

  return {
    success: true,
    order,
    error: null,
    alreadyInState: false,
  }
}

/**
 * Create a pending order from cart lines and checkout input.
 * Always starts in 'pending_payment' status.
 */
export function createPendingOrder(
  lines: CartLine[],
  input: CheckoutInput
): Order {
  const discountPercent = input.promoCode
    ? getCouponDiscount(input.promoCode, lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0))
    : 0

  const pricing = calculatePricing(lines, discountPercent)

  const now = new Date().toISOString()

  const order: Order = {
    id: generateId("order"),
    orderNumber: generateOrderNumber(),
    email: input.email,
    status: "pending_payment", // Always start here
    paymentProvider: input.paymentProvider,
    paymentProviderId: null,
    providerRefs: {
      orderId: null,
      captureId: null,
      status: null,
      lastUpdated: null,
    },
    paymentEvents: [],
    lines: [...lines],
    shippingAddress: input.shippingAddress,
    billingAddress: input.billingAddress ?? input.shippingAddress,
    shippingMethodId: input.shippingMethodId,
    promoCode: input.promoCode,
    totals: {
      subtotal: { amount: pricing.subtotal, currency: "USD" },
      discount: { amount: pricing.discount, currency: "USD" },
      shipping: { amount: pricing.shipping, currency: "USD" },
      tax: { amount: pricing.tax, currency: "USD" },
      total: { amount: pricing.total, currency: "USD" },
    },
    createdAt: now,
    updatedAt: now,
    paidAt: null,
    shippedAt: null,
    deliveredAt: null,
  }

  orders.set(order.id, order)
  saveOrders()
  return order
}

/**
 * Attach a payment provider ID to an order and mark as processing.
 */
export function attachPaymentProviderId(orderId: string, providerId: string): TransitionResult {
  return transitionOrderStatus(orderId, "PAYMENT_INITIATED", {
    providerTransactionId: providerId,
    providerStatus: "created",
  })
}

/**
 * Mark an order as paid (use transitionOrderStatus for full control).
 */
export function markOrderPaid(
  orderId: string,
  payload: {
    providerTransactionId?: string
    providerCaptureId?: string
    providerStatus?: string
    rawResponse?: Record<string, unknown>
  } = {}
): TransitionResult {
  return transitionOrderStatus(orderId, "PAYMENT_CAPTURED", {
    providerTransactionId: payload.providerTransactionId,
    providerCaptureId: payload.providerCaptureId,
    providerStatus: payload.providerStatus ?? "COMPLETED",
    rawResponse: payload.rawResponse,
  })
}

/**
 * Mark an order as failed, distinguishing between customer/payment failures
 * and provider/API failures.
 */
export function markOrderFailed(
  orderId: string,
  payload: {
    providerTransactionId?: string
    providerStatus?: string
    isProviderError?: boolean
    rawResponse?: Record<string, unknown>
  } = {}
): TransitionResult {
  // Only transition to PAYMENT_FAILED if it's a customer/payment issue
  // Provider/API errors should be logged but not transition the order state
  if (payload.isProviderError) {
    const order = orders.get(orderId)
    if (order) {
      // Log to audit trail without transitioning
      const paymentEvent = createPaymentEvent(
        "PAYMENT_FAILED",
        order.paymentProvider,
        {
          providerTransactionId: payload.providerTransactionId,
          providerStatus: `PROVIDER_ERROR_${payload.providerStatus}`,
          rawResponse: payload.rawResponse,
          metadata: { isProviderError: true, requiresRetry: true },
        }
      )
      order.paymentEvents.push(paymentEvent)
      order.updatedAt = new Date().toISOString()
      // Persist the audit event
      saveOrders()
      return {
        success: true,
        order,
        error: null,
        alreadyInState: false,
      }
    }
  }

  return transitionOrderStatus(orderId, "PAYMENT_FAILED", {
    providerTransactionId: payload.providerTransactionId,
    providerStatus: payload.providerStatus ?? "FAILED",
    rawResponse: payload.rawResponse,
  })
}

/**
 * Mark an order as cancelled.
 */
export function markOrderCancelled(
  orderId: string,
  payload: {
    providerTransactionId?: string
    rawResponse?: Record<string, unknown>
  } = {}
): TransitionResult {
  return transitionOrderStatus(orderId, "PAYMENT_CANCELLED", {
    providerTransactionId: payload.providerTransactionId,
    providerStatus: "CANCELLED",
    rawResponse: payload.rawResponse,
  })
}

/**
 * Mark an order as refunded.
 */
export function markOrderRefunded(
  orderId: string,
  payload: {
    providerTransactionId?: string
    rawResponse?: Record<string, unknown>
  } = {}
): TransitionResult {
  return transitionOrderStatus(orderId, "PAYMENT_REFUNDED", {
    providerTransactionId: payload.providerTransactionId,
    providerStatus: "REFUNDED",
    rawResponse: payload.rawResponse,
  })
}

/**
 * Update provider refs directly (for storing additional metadata).
 */
export function updateProviderRefs(
  orderId: string,
  refs: Partial<ProviderRefs>
): Order | null {
  const order = orders.get(orderId)
  if (!order) return null

  if (refs.orderId !== undefined) order.providerRefs.orderId = refs.orderId
  if (refs.captureId !== undefined) order.providerRefs.captureId = refs.captureId
  if (refs.status !== undefined) order.providerRefs.status = refs.status
  order.providerRefs.lastUpdated = new Date().toISOString()
  order.updatedAt = order.providerRefs.lastUpdated

  // Backward compatibility
  if (refs.orderId) order.paymentProviderId = refs.orderId

  // Persist changes
  saveOrders()

  return order
}

/**
 * Get an order by ID.
 */
export function getOrderById(orderId: string): Order | null {
  return orders.get(orderId) ?? null
}

/**
 * Get an order by order number.
 */
export function getOrderByNumber(orderNumber: string): Order | null {
  for (const order of orders.values()) {
    if (order.orderNumber === orderNumber) return order
  }
  return null
}

/**
 * Get an order by provider transaction ID.
 */
export function getOrderByProviderTransactionId(providerTransactionId: string): Order | null {
  for (const order of orders.values()) {
    if (order.providerRefs.orderId === providerTransactionId) return order
  }
  return null
}

/**
 * Get orders by email.
 */
export function getOrdersByEmail(email: string): Order[] {
  const result: Order[] = []
  for (const order of orders.values()) {
    if (order.email.toLowerCase() === email.toLowerCase()) {
      result.push(order)
    }
  }
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/**
 * Check if an order is in a terminal payment state (no more payment changes expected).
 */
export function isPaymentTerminal(order: Order): boolean {
  return ["paid", "refunded"].includes(order.status)
}

/**
 * Check if an order allows payment retry.
 */
export function canRetryPayment(order: Order): boolean {
  return ["failed", "cancelled", "pending_payment"].includes(order.status)
}
