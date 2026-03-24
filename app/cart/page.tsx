"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Minus, Plus, Trash2, ShoppingBag, Tag, ArrowRight, ChevronLeft, Leaf, RotateCcw, Shield, Truck } from "lucide-react"
import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import { useCart } from "@/components/boty/cart-context"

const trustItems = [
  { icon: Truck, label: "Free Shipping", sub: "On orders over $50" },
  { icon: RotateCcw, label: "30-Day Returns", sub: "Hassle-free policy" },
  { icon: Shield, label: "Secure Checkout", sub: "256-bit encryption" },
  { icon: Leaf, label: "Natural Ingredients", sub: "100% clean beauty" },
]

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, clearCart } = useCart()
  const [promoCode, setPromoCode] = useState("")
  const [promoApplied, setPromoApplied] = useState(false)
  const [promoError, setPromoError] = useState("")
  const router = useRouter()

  const shipping = subtotal >= 50 || subtotal === 0 ? 0 : 6.99
  const discount = promoApplied ? Math.round(subtotal * 0.1 * 100) / 100 : 0
  const total = subtotal - discount + shipping

  const handlePromo = () => {
    if (promoCode.trim().toUpperCase() === "BOTY10") {
      setPromoApplied(true)
      setPromoError("")
    } else {
      setPromoError("Invalid promo code. Try BOTY10.")
      setPromoApplied(false)
    }
  }

  return (
    <main className="min-h-screen">
      <Header />

      <div className="pt-28 pb-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          {/* Breadcrumb */}
          <div className="mb-8">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground boty-transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Continue Shopping
            </Link>
          </div>

          {/* Title */}
          <div className="mb-10">
            <span className="text-sm tracking-[0.3em] uppercase text-primary mb-2 block">Your</span>
            <h1 className="font-serif text-4xl md:text-5xl text-foreground">Shopping Cart</h1>
          </div>

          {items.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-24 text-center animate-blur-in">
              <div className="w-24 h-24 rounded-full bg-card flex items-center justify-center mb-6 boty-shadow">
                <ShoppingBag className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h2 className="font-serif text-3xl text-foreground mb-3">Your cart is empty</h2>
              <p className="text-muted-foreground mb-8 max-w-sm">
                Looks like you haven't added anything yet. Explore our natural skincare collection.
              </p>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full text-sm tracking-wide hover:bg-primary/90 boty-transition boty-shadow"
              >
                Shop All Products
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_380px] gap-10 xl:gap-16">

              {/* Cart Items */}
              <div>
                {/* Column Headers */}
                <div className="hidden sm:grid grid-cols-[1fr_120px_80px] gap-4 pb-4 border-b border-border/50 text-sm text-muted-foreground">
                  <span>Product</span>
                  <span className="text-center">Quantity</span>
                  <span className="text-right">Total</span>
                </div>

                <div className="divide-y divide-border/50">
                  {items.map((item) => (
                    <div key={item.id} className="py-6 grid sm:grid-cols-[1fr_120px_80px] gap-4 items-center">
                      {/* Product */}
                      <div className="flex gap-4 items-center">
                        <Link href={`/product/${item.id}`} className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-2xl overflow-hidden bg-card boty-shadow">
                          <Image
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </Link>
                        <div className="min-w-0">
                          <Link href={`/product/${item.id}`} className="font-serif text-lg text-foreground hover:text-primary boty-transition block">
                            {item.name}
                          </Link>
                          <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                          <p className="text-sm font-medium text-foreground mt-1">${item.price}</p>
                          {/* Mobile quantity & remove */}
                          <div className="flex items-center gap-3 mt-3 sm:hidden">
                            <div className="flex items-center border border-border rounded-full">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="p-1.5 hover:bg-muted boty-transition rounded-l-full"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-3 text-sm font-medium w-8 text-center">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="p-1.5 hover:bg-muted boty-transition rounded-r-full"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="p-1.5 text-muted-foreground hover:text-destructive boty-transition"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Quantity */}
                      <div className="hidden sm:flex items-center justify-center gap-2">
                        <div className="flex items-center border border-border rounded-full">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-2 hover:bg-muted boty-transition rounded-l-full"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-3 text-sm font-medium w-8 text-center">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-2 hover:bg-muted boty-transition rounded-r-full"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-muted-foreground hover:text-destructive boty-transition"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Line Total */}
                      <div className="hidden sm:block text-right">
                        <span className="font-medium text-foreground">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Clear cart */}
                <div className="mt-4 pt-4 border-t border-border/50 flex justify-end">
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-sm text-muted-foreground hover:text-destructive boty-transition"
                  >
                    Remove all items
                  </button>
                </div>
              </div>

              {/* Order Summary */}
              <div>
                <div className="bg-card rounded-3xl p-6 boty-shadow sticky top-28">
                  <h2 className="font-serif text-2xl text-foreground mb-6">Order Summary</h2>

                  {/* Promo Code */}
                  <div className="mb-6">
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Promo Code
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => {
                            setPromoCode(e.target.value)
                            setPromoError("")
                            if (promoApplied) setPromoApplied(false)
                          }}
                          placeholder="Enter code"
                          className="w-full pl-9 pr-4 py-3 rounded-full bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring boty-transition"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handlePromo}
                        className="px-4 py-3 rounded-full bg-primary text-primary-foreground text-sm hover:bg-primary/90 boty-transition boty-shadow"
                      >
                        Apply
                      </button>
                    </div>
                    {promoError && (
                      <p className="text-xs text-destructive mt-2">{promoError}</p>
                    )}
                    {promoApplied && (
                      <p className="text-xs text-primary mt-2">10% discount applied!</p>
                    )}
                  </div>

                  {/* Price Breakdown */}
                  <div className="space-y-3 pb-5 border-b border-border/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground">${subtotal.toFixed(2)}</span>
                    </div>
                    {promoApplied && (
                      <div className="flex justify-between text-sm">
                        <span className="text-primary">Discount (10%)</span>
                        <span className="text-primary">-${discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="text-foreground">
                        {shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}
                      </span>
                    </div>
                    {subtotal < 50 && subtotal > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Add ${(50 - subtotal).toFixed(2)} more for free shipping
                      </p>
                    )}
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center pt-5 mb-6">
                    <span className="font-medium text-foreground text-base">Total</span>
                    <span className="font-serif text-2xl text-foreground">${total.toFixed(2)}</span>
                  </div>

                  {/* Checkout Button */}
                  <button
                    type="button"
                    onClick={() => router.push("/checkout")}
                    className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-full text-sm tracking-wide hover:bg-primary/90 boty-transition boty-shadow"
                  >
                    Proceed to Checkout
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <Link
                    href="/shop"
                    className="w-full inline-flex items-center justify-center mt-3 border border-border text-foreground py-4 rounded-full text-sm tracking-wide hover:bg-muted boty-transition"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Trust Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20">
            {trustItems.map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-3 p-6 bg-card rounded-3xl boty-shadow text-center"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
