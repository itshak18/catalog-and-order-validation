"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { 
  Check, 
  Package, 
  Mail, 
  ArrowRight, 
  Leaf, 
  Heart, 
  Recycle, 
  Award,
  AlertCircle,
  Clock,
  XCircle,
  RefreshCw,
} from "lucide-react"
import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import { formatMoney } from "@/lib/pricing"
import type { Order, OrderStatus } from "@/types/order"

/**
 * Order state display configuration.
 * Maps internal status to user-friendly display.
 */
const STATUS_CONFIG: Record<OrderStatus, {
  icon: typeof Check
  title: string
  subtitle: string
  color: "success" | "warning" | "error" | "info"
}> = {
  pending_payment: {
    icon: Clock,
    title: "Payment Pending",
    subtitle: "Your payment is being processed. Please wait...",
    color: "warning",
  },
  payment_processing: {
    icon: Clock,
    title: "Processing Payment",
    subtitle: "Your payment is being confirmed with the provider.",
    color: "warning",
  },
  paid: {
    icon: Check,
    title: "Order Confirmed",
    subtitle: "Your payment was successful. Thank you for your order!",
    color: "success",
  },
  failed: {
    icon: XCircle,
    title: "Payment Failed",
    subtitle: "Unfortunately, your payment could not be processed.",
    color: "error",
  },
  cancelled: {
    icon: XCircle,
    title: "Order Cancelled",
    subtitle: "This order has been cancelled.",
    color: "error",
  },
  refunded: {
    icon: RefreshCw,
    title: "Order Refunded",
    subtitle: "Your payment has been refunded.",
    color: "info",
  },
  processing: {
    icon: Package,
    title: "Being Prepared",
    subtitle: "Your order is being prepared for shipping.",
    color: "success",
  },
  shipped: {
    icon: Package,
    title: "On Its Way",
    subtitle: "Your order has been shipped!",
    color: "success",
  },
  delivered: {
    icon: Check,
    title: "Delivered",
    subtitle: "Your order has been delivered. Enjoy!",
    color: "success",
  },
}

const steps = [
  { icon: Check, label: "Order Confirmed", sub: "We've received your order" },
  { icon: Package, label: "Being Prepared", sub: "Your order is being packaged" },
  { icon: Mail, label: "On Its Way", sub: "Your package is shipped" },
]

const whatsNext = [
  {
    icon: Mail,
    title: "Confirmation Email",
    description: "A confirmation email with your order details has been sent to your inbox.",
  },
  {
    icon: Package,
    title: "Shipping Update",
    description: "You'll receive a tracking number once your order has been dispatched.",
  },
  {
    icon: Leaf,
    title: "Eco Packaging",
    description: "Your order is carefully packed in our 100% recyclable, plastic-free materials.",
  },
]

const values = [
  { icon: Leaf, label: "Natural Ingredients" },
  { icon: Heart, label: "Cruelty Free" },
  { icon: Recycle, label: "Eco Packaging" },
  { icon: Award, label: "Expert Approved" },
]

/**
 * Fetch order from server API to ensure we get fresh state.
 * This prevents any stale client-side data issues.
 */
async function fetchOrder(orderId: string): Promise<Order | null> {
  try {
    const response = await fetch(`/api/orders/${orderId}`)
    if (!response.ok) return null
    const data = await response.json()
    return data.order
  } catch {
    return null
  }
}

/**
 * Get step index based on order status.
 */
function getStepIndex(status: OrderStatus): number {
  switch (status) {
    case "paid":
    case "processing":
      return 0
    case "shipped":
      return 2
    case "delivered":
      return 3
    default:
      return 0
  }
}

export default function ThankYouPage() {
  const searchParams = useSearchParams()
  const [animate, setAnimate] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const orderId = searchParams.get("orderId")
  const orderNumber = searchParams.get("orderNumber")

  // Fetch order from server on mount - single source of truth
  useEffect(() => {
    async function loadOrder() {
      setLoading(true)
      setError(null)

      if (!orderId && !orderNumber) {
        setError("No order reference provided")
        setLoading(false)
        return
      }

      try {
        // Fetch from API to get authoritative state
        const endpoint = orderId 
          ? `/api/orders/${orderId}`
          : `/api/orders/by-number/${orderNumber}`
        
        const response = await fetch(endpoint)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Order not found")
          } else {
            setError("Failed to load order details")
          }
          setLoading(false)
          return
        }

        const data = await response.json()
        setOrder(data.order)
      } catch (err) {
        console.error("Error loading order:", err)
        setError("Failed to load order details")
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [orderId, orderNumber])

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100)
    return () => clearTimeout(t)
  }, [])

  // Get status configuration
  const statusConfig = order ? STATUS_CONFIG[order.status] : null
  const isPaid = order?.status === "paid" || order?.status === "processing" || order?.status === "shipped" || order?.status === "delivered"
  const isFailed = order?.status === "failed" || order?.status === "cancelled"
  const isPending = order?.status === "pending_payment" || order?.status === "payment_processing"

  // Determine current step for progress display
  const currentStep = order ? getStepIndex(order.status) : 0

  return (
    <main className="min-h-screen">
      <Header />

      <div className="pt-28 pb-24">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">

          {/* Loading State */}
          {loading && (
            <div className="py-20">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted animate-pulse" />
              <p className="text-muted-foreground">Loading order details...</p>
            </div>
          )}

          {/* Error State - No Order Found */}
          {!loading && error && (
            <div className="py-20">
              <div className="w-28 h-28 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-8">
                <div className="w-20 h-20 rounded-full bg-destructive flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-destructive-foreground" />
                </div>
              </div>
              <h1 className="font-serif text-3xl text-foreground mb-4">Order Not Found</h1>
              <p className="text-muted-foreground mb-8">{error}</p>
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full text-sm hover:bg-primary/90 boty-transition"
              >
                Continue Shopping
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Order Found - Display Based on Status */}
          {!loading && !error && order && statusConfig && (
            <>
              {/* Status Icon */}
              <div
                className={`transition-all duration-700 ease-out ${
                  animate ? "opacity-100 scale-100" : "opacity-0 scale-75"
                }`}
              >
                <div className="relative inline-flex items-center justify-center mb-8">
                  <div className={`w-28 h-28 rounded-full flex items-center justify-center ${
                    statusConfig.color === "success" ? "bg-primary/10" :
                    statusConfig.color === "error" ? "bg-destructive/10" :
                    statusConfig.color === "warning" ? "bg-yellow-500/10" :
                    "bg-blue-500/10"
                  }`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center boty-shadow ${
                      statusConfig.color === "success" ? "bg-primary" :
                      statusConfig.color === "error" ? "bg-destructive" :
                      statusConfig.color === "warning" ? "bg-yellow-500" :
                      "bg-blue-500"
                    }`}>
                      <statusConfig.icon className={`w-10 h-10 ${
                        statusConfig.color === "success" ? "text-primary-foreground" :
                        statusConfig.color === "error" ? "text-destructive-foreground" :
                        "text-white"
                      }`} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Heading */}
              <div
                className={`transition-all duration-700 delay-200 ease-out ${
                  animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                {isPaid && (
                  <span className="text-sm tracking-[0.3em] uppercase text-primary mb-3 block">
                    Thank You
                  </span>
                )}
                <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground mb-4 text-balance">
                  {statusConfig.title}
                </h1>
                <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed mb-3">
                  {statusConfig.subtitle}
                </p>
                <p className="text-sm text-muted-foreground">
                  Order{" "}
                  <span className="font-medium text-foreground font-mono">{order.orderNumber}</span>
                </p>
                {order.email && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {isPaid ? "Confirmation sent to" : "Order associated with"}{" "}
                    <span className="font-medium text-foreground">{order.email}</span>
                  </p>
                )}
              </div>

              {/* Failed/Cancelled State - Retry Option */}
              {isFailed && (
                <div
                  className={`mt-8 transition-all duration-700 delay-250 ease-out ${
                    animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                >
                  <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 max-w-md mx-auto">
                    <p className="text-sm text-muted-foreground mb-4">
                      {order.status === "cancelled" 
                        ? "Your order was cancelled. You can try placing a new order."
                        : "There was an issue processing your payment. Please try again or use a different payment method."
                      }
                    </p>
                    <Link
                      href="/checkout"
                      className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm hover:bg-primary/90 boty-transition"
                    >
                      Try Again
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Pending State - Waiting Message */}
              {isPending && (
                <div
                  className={`mt-8 transition-all duration-700 delay-250 ease-out ${
                    animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                >
                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-6 max-w-md mx-auto">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-yellow-600">Processing</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Please do not refresh this page. Your payment is being confirmed...
                    </p>
                  </div>
                </div>
              )}

              {/* Order Summary */}
              {order && (
                <div
                  className={`mt-8 transition-all duration-700 delay-250 ease-out ${
                    animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                >
                  <div className="bg-card rounded-2xl p-6 boty-shadow text-left max-w-md mx-auto">
                    <h3 className="font-medium text-foreground mb-4">Order Details</h3>
                    <div className="space-y-3 text-sm">
                      {order.lines.map((line) => (
                        <div key={`${line.productId}-${line.variantId}`} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {line.name} x {line.quantity}
                          </span>
                          <span className="text-foreground">{formatMoney(line.unitPrice * line.quantity)}</span>
                        </div>
                      ))}
                      <div className="pt-3 border-t border-border/50">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="text-foreground">{formatMoney(order.totals.subtotal.amount)}</span>
                        </div>
                        {order.totals.discount.amount > 0 && (
                          <div className="flex justify-between text-primary">
                            <span>Discount</span>
                            <span>-{formatMoney(order.totals.discount.amount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Shipping</span>
                          <span className="text-foreground">
                            {order.totals.shipping.amount === 0 ? "Free" : formatMoney(order.totals.shipping.amount)}
                          </span>
                        </div>
                        <div className="flex justify-between font-medium pt-2">
                          <span className="text-foreground">Total</span>
                          <span className="text-foreground">{formatMoney(order.totals.total.amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Progress - Only show for paid orders */}
              {isPaid && (
                <div
                  className={`mt-12 transition-all duration-700 delay-300 ease-out ${
                    animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                >
                  <div className="bg-card rounded-3xl p-8 boty-shadow">
                    <div className="flex items-start justify-between relative">
                      <div className="absolute top-5 left-[calc(16.66%)] right-[calc(16.66%)] h-px bg-border" aria-hidden="true" />
                      {steps.map((step, i) => (
                        <div key={step.label} className="flex flex-col items-center gap-3 flex-1 relative z-10">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center boty-transition boty-shadow ${
                              i <= currentStep
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-muted-foreground"
                            }`}
                          >
                            <step.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p
                              className={`text-sm font-medium ${
                                i <= currentStep ? "text-foreground" : "text-muted-foreground"
                              }`}
                            >
                              {step.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{step.sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* What's Next - Only show for paid orders */}
              {isPaid && (
                <div
                  className={`mt-12 transition-all duration-700 delay-[400ms] ease-out ${
                    animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                >
                  <h2 className="font-serif text-2xl text-foreground mb-6">What happens next?</h2>
                  <div className="grid gap-4 text-left">
                    {whatsNext.map((item, i) => (
                      <div
                        key={item.title}
                        className={`flex gap-4 p-5 bg-card rounded-2xl boty-shadow transition-all duration-700 ease-out ${
                          animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                        }`}
                        style={{ transitionDelay: `${500 + i * 100}ms` }}
                      >
                        <div className="w-10 h-10 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                          <item.icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1">{item.title}</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Brand Values - Only show for paid orders */}
              {isPaid && (
                <div
                  className={`mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 transition-all duration-700 delay-[700ms] ease-out ${
                    animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                >
                  {values.map((v) => (
                    <div
                      key={v.label}
                      className="flex flex-col items-center gap-2 p-4 bg-card rounded-2xl boty-shadow"
                    >
                      <v.icon className="w-5 h-5 text-primary" />
                      <span className="text-xs text-muted-foreground">{v.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* CTA Buttons */}
              <div
                className={`mt-12 flex flex-col sm:flex-row gap-4 justify-center transition-all duration-700 delay-[800ms] ease-out ${
                  animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full text-sm tracking-wide hover:bg-primary/90 boty-transition boty-shadow"
                >
                  Continue Shopping
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center border border-border text-foreground px-8 py-4 rounded-full text-sm tracking-wide hover:bg-muted boty-transition"
                >
                  Back to Home
                </Link>
              </div>

              {/* Brand sign-off */}
              <div
                className={`mt-16 transition-all duration-700 delay-[900ms] ease-out ${
                  animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                <p className="font-serif text-5xl text-foreground/10 select-none">Boty</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Questions? Contact us at{" "}
                  <a href="mailto:hello@boty.com" className="underline hover:text-foreground boty-transition">
                    hello@boty.com
                  </a>
                </p>
              </div>
            </>
          )}

        </div>
      </div>

      <Footer />
    </main>
  )
}
