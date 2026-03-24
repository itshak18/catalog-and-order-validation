"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronDown, Lock, CreditCard, Smartphone } from "lucide-react"
import { Header } from "@/components/boty/header"
import { useCart } from "@/components/boty/cart-context"

type PaymentMethod = "card" | "paypal" | "apple"

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring boty-transition"

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart()
  const router = useRouter()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card")
  const [sameAddress, setSameAddress] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const shipping = subtotal >= 50 || subtotal === 0 ? 0 : 6.99
  const total = subtotal + shipping

  const steps = ["Cart", "Checkout", "Confirmation"]

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    // Simulate order processing
    await new Promise((resolve) => setTimeout(resolve, 1500))
    clearCart()
    router.push("/thank-you")
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
                      <input type="text" placeholder="First name" required className={inputClass} />
                      <input type="text" placeholder="Last name" required className={inputClass} />
                    </div>
                    <input type="text" placeholder="Address" required className={inputClass} />
                    <input type="text" placeholder="Apartment, suite, etc. (optional)" className={inputClass} />
                    <div className="grid sm:grid-cols-3 gap-4">
                      <input type="text" placeholder="City" required className={inputClass} />
                      <input type="text" placeholder="State" required className={inputClass} />
                      <input type="text" placeholder="ZIP code" required className={inputClass} />
                    </div>
                    <div className="relative">
                      <select required className={`${inputClass} appearance-none pr-10`}>
                        <option value="">Country</option>
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="GB">United Kingdom</option>
                        <option value="AU">Australia</option>
                        <option value="FR">France</option>
                        <option value="DE">Germany</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                    <input type="tel" placeholder="Phone (optional)" className={inputClass} />
                  </div>
                </section>

                {/* Shipping Method */}
                <section>
                  <h2 className="font-serif text-2xl text-foreground mb-6">Shipping Method</h2>
                  <div className="space-y-3">
                    {[
                      { id: "standard", label: "Standard Shipping", sub: "5-7 business days", price: shipping === 0 ? "Free" : `$${shipping.toFixed(2)}` },
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
                            defaultChecked={method.id === "standard"}
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
                      { id: "card", label: "Credit Card", icon: CreditCard },
                      { id: "paypal", label: "PayPal", icon: null },
                      { id: "apple", label: "Apple Pay", icon: Smartphone },
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

                  {paymentMethod === "card" && (
                    <div className="space-y-4">
                      <input type="text" placeholder="Card number" required className={inputClass} />
                      <input type="text" placeholder="Name on card" required className={inputClass} />
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="MM / YY" required className={inputClass} />
                        <input type="text" placeholder="CVC" required className={inputClass} />
                      </div>
                    </div>
                  )}
                  {paymentMethod === "paypal" && (
                    <div className="p-6 bg-card rounded-2xl text-center text-sm text-muted-foreground boty-shadow">
                      You'll be redirected to PayPal to complete your purchase securely.
                    </div>
                  )}
                  {paymentMethod === "apple" && (
                    <div className="p-6 bg-card rounded-2xl text-center text-sm text-muted-foreground boty-shadow">
                      Complete your purchase using Apple Pay on a supported device.
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
                        <input type="text" placeholder="First name" required className={inputClass} />
                        <input type="text" placeholder="Last name" required className={inputClass} />
                      </div>
                      <input type="text" placeholder="Address" required className={inputClass} />
                      <div className="grid sm:grid-cols-3 gap-4">
                        <input type="text" placeholder="City" required className={inputClass} />
                        <input type="text" placeholder="State" required className={inputClass} />
                        <input type="text" placeholder="ZIP code" required className={inputClass} />
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
                        <div key={item.id} className="flex gap-3 items-center">
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
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Totals */}
                  <div className="space-y-3 pt-4 pb-5 border-b border-border/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="text-foreground">
                        {shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-5 mb-6">
                    <span className="font-medium text-foreground">Total</span>
                    <span className="font-serif text-2xl text-foreground">${total.toFixed(2)}</span>
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
