"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronDown, Lock, CreditCard, Smartphone, AlertCircle } from "lucide-react"
import { Header } from "@/components/boty/header"
import { useCart } from "@/components/boty/cart-context"
import { formatMoney } from "@/lib/pricing"
import type { PaymentProvider, Address } from "@/types/order"

type PaymentMethod = "card" | "paypal" | "yaad"

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring boty-transition"

export default function CheckoutPage() {
  const { items, subtotal, discount, shipping, total, clearCart, promoCode, discountLabel } = useCart()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("paypal")
  const [sameAddress, setSameAddress] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [email, setEmail] = useState("")
  const [shippingAddress, setShippingAddress] = useState<Address>({
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
    phone: "",
  })
  const [billingAddress, setBillingAddress] = useState<Address>({
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
    phone: "",
  })
  const [shippingMethodId, setShippingMethodId] = useState("standard")

  // Check for error or cancellation in URL
  useEffect(() => {
    const errorParam = searchParams.get("error")
    const cancelledParam = searchParams.get("cancelled")
    
    if (cancelledParam === "true") {
      setError("Payment was cancelled. Your cart has been preserved.")
    } else if (errorParam) {
      const errorMessages: Record<string, string> = {
        payment_failed: "Payment failed. Please try again.",
        payment_cancelled: "Payment was cancelled. Your cart has been preserved.",
        missing_order: "Order not found. Please try again.",
        order_not_found: "Order not found. Please try again.",
        invalid_signature: "Payment verification failed. Please try again.",
        callback_error: "An error occurred. Please try again.",
        unknown_callback: "An unexpected error occurred. Please try again.",
      }
      setError(errorMessages[errorParam] || "An error occurred. Please try again.")
    }
  }, [searchParams])

  const steps = ["Cart", "Checkout", "Confirmation"]

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // Step 1: Create internal order
      const orderResponse = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
          email,
          shippingAddress,
          billingAddress: sameAddress ? null : billingAddress,
          shippingMethodId,
          paymentProvider: paymentMethod as PaymentProvider,
          promoCode,
        }),
      })

      const orderData = await orderResponse.json()

      if (!orderResponse.ok) {
        throw new Error(orderData.error || "Failed to create order")
      }

      const orderId = orderData.order.id

      // Step 2: Branch based on payment method
      if (paymentMethod === "paypal") {
        // Create PayPal order
        const paypalResponse = await fetch("/api/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        })

        const paypalData = await paypalResponse.json()

        if (!paypalResponse.ok) {
          throw new Error(paypalData.error || "Failed to create PayPal order")
        }

        // For mock mode or if no approval URL, simulate success
        if (paypalData.mock || !paypalData.approvalUrl) {
          // Capture the mock payment
          const captureResponse = await fetch("/api/paypal/capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paypalOrderId: paypalData.paypalOrderId,
              orderId,
            }),
          })

          const captureData = await captureResponse.json()

          if (captureResponse.ok) {
            clearCart()
            router.push(`/thank-you?orderId=${orderId}&orderNumber=${orderData.order.orderNumber}`)
          } else {
            throw new Error(captureData.error || "Payment capture failed")
          }
        } else {
          // Redirect to PayPal for approval
          // PayPal will redirect back to /api/paypal/return after user approves
          window.location.href = paypalData.approvalUrl
        }
      } else if (paymentMethod === "yaad") {
        // Create Yaad session
        const yaadResponse = await fetch("/api/yaad/create-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        })

        const yaadData = await yaadResponse.json()

        if (!yaadResponse.ok) {
          throw new Error(yaadData.error || "Failed to create payment session")
        }

        // For mock mode, redirect to thank you page
        if (yaadData.mock) {
          clearCart()
          router.push(`/thank-you?orderId=${orderId}&orderNumber=${orderData.order.orderNumber}`)
        } else {
          // Redirect to Yaad payment page
          window.location.href = yaadData.redirectUrl
        }
      } else {
        // Card payment (placeholder - would integrate with Stripe or similar)
        // For now, simulate success
        clearCart()
        router.push(`/thank-you?orderId=${orderId}&orderNumber=${orderData.order.orderNumber}`)
      }
    } catch (err) {
      console.error("Checkout error:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen">
      <Header />

      <div className="pt-28 pb-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          {/* Breadcrumb */}
          <div className="mb-8 flex items-center gap-2">
            <Link
              href="/cart"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground boty-transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Cart
            </Link>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="ml-auto text-destructive/60 hover:text-destructive"
              >
                &times;
              </button>
            </div>
          )}

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-10">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium boty-transition ${
                      i === 1
                        ? "bg-primary text-primary-foreground"
                        : i < 1
                        ? "bg-primary/30 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={`text-sm boty-transition ${
                      i === 1 ? "text-foreground font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {step}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="w-8 h-px bg-border" />
                )}
              </div>
            ))}
          </div>

          {/* Title */}
          <div className="mb-10">
            <span className="text-sm tracking-[0.3em] uppercase text-primary mb-2 block">Secure</span>
            <h1 className="font-serif text-4xl md:text-5xl text-foreground">Checkout</h1>
          </div>

          <form onSubmit={handlePlaceOrder}>
            <div className="grid lg:grid-cols-[1fr_400px] gap-12 xl:gap-20">

              {/* Left: Form */}
              <div className="space-y-10">

                {/* Contact */}
                <section>
                  <h2 className="font-serif text-2xl text-foreground mb-6">Contact</h2>
                  <div className="space-y-4">
                    <input
                      type="email"
                      placeholder="Email address"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                    />
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative w-5 h-5">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="peer sr-only"
                        />
                        <div className="w-5 h-5 rounded border border-border bg-background peer-checked:bg-primary peer-checked:border-primary boty-transition" />
                        <svg
                          className="absolute inset-0 w-5 h-5 text-primary-foreground opacity-0 peer-checked:opacity-100 boty-transition pointer-events-none"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <span className="text-sm text-muted-foreground">Email me with news and offers</span>
                    </label>
                  </div>
                </section>

                {/* Shipping Address */}
                <section>
                  <h2 className="font-serif text-2xl text-foreground mb-6">Shipping Address</h2>
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="First name"
                        required
                        value={shippingAddress.firstName}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, firstName: e.target.value })}
                        className={inputClass}
                      />
                      <input
                        type="text"
                        placeholder="Last name"
                        required
                        value={shippingAddress.lastName}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, lastName: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Address"
                      required
                      value={shippingAddress.address1}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, address1: e.target.value })}
                      className={inputClass}
                    />
                    <input
                      type="text"
                      placeholder="Apartment, suite, etc. (optional)"
                      value={shippingAddress.address2}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, address2: e.target.value })}
                      className={inputClass}
                    />
                    <div className="grid sm:grid-cols-3 gap-4">
                      <input
                        type="text"
                        placeholder="City"
                        required
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                        className={inputClass}
                      />
                      <input
                        type="text"
                        placeholder="State"
                        required
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                        className={inputClass}
                      />
                      <input
                        type="text"
                        placeholder="ZIP code"
                        required
                        value={shippingAddress.postalCode}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div className="relative">
                      <select
                        required
                        value={shippingAddress.country}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                        className={`${inputClass} appearance-none pr-10`}
                      >
                        <option value="">Country</option>
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="GB">United Kingdom</option>
                        <option value="AU">Australia</option>
                        <option value="FR">France</option>
                        <option value="DE">Germany</option>
                        <option value="IL">Israel</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                    <input
                      type="tel"
                      placeholder="Phone (optional)"
                      value={shippingAddress.phone}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </section>

                {/* Shipping Method */}
                <section>
                  <h2 className="font-serif text-2xl text-foreground mb-6">Shipping Method</h2>
                  <div className="space-y-3">
                    {[
                      { id: "standard", label: "Standard Shipping", sub: "5-7 business days", price: shipping === 0 ? "Free" : formatMoney(shipping) },
                      { id: "express", label: "Express Shipping", sub: "2-3 business days", price: "$12.99" },
                    ].map((method) => (
                      <label
                        key={method.id}
                        className="flex items-center justify-between p-4 rounded-2xl bg-card border-2 border-transparent has-[:checked]:border-primary boty-shadow cursor-pointer boty-transition"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shipping-method"
                            value={method.id}
                            checked={shippingMethodId === method.id}
                            onChange={(e) => setShippingMethodId(e.target.value)}
                            className="accent-primary"
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground">{method.label}</p>
                            <p className="text-xs text-muted-foreground">{method.sub}</p>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-foreground">{method.price}</span>
                      </label>
                    ))}
                  </div>
                </section>

                {/* Payment */}
                <section>
                  <h2 className="font-serif text-2xl text-foreground mb-6">Payment</h2>
                  <div className="flex items-center gap-2 mb-4">
                    <Lock className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">All transactions are secure and encrypted</span>
                  </div>

                  {/* Payment Tabs */}
                  <div className="flex gap-2 mb-5">
                    {([
                      { id: "paypal", label: "PayPal", icon: null },
                      { id: "yaad", label: "Yaad Pay", icon: CreditCard },
                      { id: "card", label: "Credit Card", icon: CreditCard },
                    ] as { id: PaymentMethod; label: string; icon: React.ElementType | null }[]).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPaymentMethod(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm boty-transition border-2 ${
                          paymentMethod === tab.id
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border bg-card text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tab.icon && <tab.icon className="w-4 h-4" />}
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>

                  {paymentMethod === "paypal" && (
                    <div className="p-6 bg-card rounded-2xl text-center text-sm text-muted-foreground boty-shadow">
                      You'll be redirected to PayPal to complete your purchase securely.
                    </div>
                  )}
                  {paymentMethod === "yaad" && (
                    <div className="p-6 bg-card rounded-2xl text-center text-sm text-muted-foreground boty-shadow">
                      You'll be redirected to Yaad Pay to complete your purchase securely.
                    </div>
                  )}
                  {paymentMethod === "card" && (
                    <div className="p-6 bg-card rounded-2xl text-center text-sm text-muted-foreground boty-shadow">
                      Credit card payments are coming soon. Please use PayPal or Yaad Pay.
                    </div>
                  )}
                </section>

                {/* Billing Address */}
                <section>
                  <h2 className="font-serif text-2xl text-foreground mb-6">Billing Address</h2>
                  <label className="flex items-center gap-3 cursor-pointer mb-4">
                    <div className="relative w-5 h-5">
                      <input
                        type="checkbox"
                        checked={sameAddress}
                        onChange={(e) => setSameAddress(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="w-5 h-5 rounded border border-border bg-background peer-checked:bg-primary peer-checked:border-primary boty-transition" />
                      <svg
                        className="absolute inset-0 w-5 h-5 text-primary-foreground opacity-0 peer-checked:opacity-100 boty-transition pointer-events-none"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <span className="text-sm text-muted-foreground">Same as shipping address</span>
                  </label>

                  {!sameAddress && (
                    <div className="space-y-4 mt-2">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="First name"
                          required
                          value={billingAddress.firstName}
                          onChange={(e) => setBillingAddress({ ...billingAddress, firstName: e.target.value })}
                          className={inputClass}
                        />
                        <input
                          type="text"
                          placeholder="Last name"
                          required
                          value={billingAddress.lastName}
                          onChange={(e) => setBillingAddress({ ...billingAddress, lastName: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Address"
                        required
                        value={billingAddress.address1}
                        onChange={(e) => setBillingAddress({ ...billingAddress, address1: e.target.value })}
                        className={inputClass}
                      />
                      <div className="grid sm:grid-cols-3 gap-4">
                        <input
                          type="text"
                          placeholder="City"
                          required
                          value={billingAddress.city}
                          onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                          className={inputClass}
                        />
                        <input
                          type="text"
                          placeholder="State"
                          required
                          value={billingAddress.state}
                          onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })}
                          className={inputClass}
                        />
                        <input
                          type="text"
                          placeholder="ZIP code"
                          required
                          value={billingAddress.postalCode}
                          onChange={(e) => setBillingAddress({ ...billingAddress, postalCode: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  )}
                </section>

              </div>

              {/* Right: Order Summary */}
              <div>
                <div className="bg-card rounded-3xl p-6 boty-shadow sticky top-28">
                  <h2 className="font-serif text-2xl text-foreground mb-6">Order Summary</h2>

                  {/* Items */}
                  <div className="space-y-4 pb-6 border-b border-border/50">
                    {items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Your cart is empty.</p>
                    ) : (
                      items.map((item) => (
                        <div key={item.productId} className="flex gap-3 items-center">
                          <div className="relative w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-muted boty-shadow">
                            <Image
                              src={item.image || "/placeholder.svg"}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium">
                              {item.quantity}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {formatMoney(item.unitPrice * item.quantity)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Totals */}
                  <div className="space-y-3 pt-4 pb-5 border-b border-border/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground">{formatMoney(subtotal)}</span>
                    </div>
                    {discount > 0 && discountLabel && (
                      <div className="flex justify-between text-sm">
                        <span className="text-primary">{discountLabel}</span>
                        <span className="text-primary">-{formatMoney(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="text-foreground">
                        {shipping === 0 ? "Free" : formatMoney(shipping)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-5 mb-6">
                    <span className="font-medium text-foreground">Total</span>
                    <span className="font-serif text-2xl text-foreground">{formatMoney(total)}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || items.length === 0}
                    className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-full text-sm tracking-wide hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed boty-transition boty-shadow"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Place Order
                      </>
                    )}
                  </button>

                  <p className="text-xs text-muted-foreground text-center mt-4 leading-relaxed">
                    By placing your order, you agree to our{" "}
                    <Link href="/" className="underline hover:text-foreground boty-transition">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/" className="underline hover:text-foreground boty-transition">
                      Privacy Policy
                    </Link>.
                  </p>
                </div>
              </div>

            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
