"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check, Package, Mail, ArrowRight, Leaf, Heart, Recycle, Award } from "lucide-react"
import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"

const orderNumber = `BOTY-${Math.floor(100000 + Math.random() * 900000)}`

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

export default function ThankYouPage() {
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <main className="min-h-screen">
      <Header />

      <div className="pt-28 pb-24">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">

          {/* Success Icon */}
          <div
            className={`transition-all duration-700 ease-out ${
              animate ? "opacity-100 scale-100" : "opacity-0 scale-75"
            }`}
          >
            <div className="relative inline-flex items-center justify-center mb-8">
              <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center boty-shadow">
                  <Check className="w-10 h-10 text-primary-foreground" strokeWidth={2.5} />
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
            <span className="text-sm tracking-[0.3em] uppercase text-primary mb-3 block">
              Thank You
            </span>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground mb-4 text-balance">
              Your order is confirmed
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed mb-3">
              We're thrilled to be part of your skincare ritual. Your natural glow is on its way.
            </p>
            <p className="text-sm text-muted-foreground">
              Order{" "}
              <span className="font-medium text-foreground font-mono">{orderNumber}</span>
            </p>
          </div>

          {/* Order Progress */}
          <div
            className={`mt-12 transition-all duration-700 delay-300 ease-out ${
              animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <div className="bg-card rounded-3xl p-8 boty-shadow">
              <div className="flex items-start justify-between relative">
                {/* connecting line */}
                <div className="absolute top-5 left-[calc(16.66%)] right-[calc(16.66%)] h-px bg-border" aria-hidden="true" />
                {steps.map((step, i) => (
                  <div key={step.label} className="flex flex-col items-center gap-3 flex-1 relative z-10">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center boty-transition boty-shadow ${
                        i === 0
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground"
                      }`}
                    >
                      <step.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          i === 0 ? "text-foreground" : "text-muted-foreground"
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

          {/* What's Next */}
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

          {/* Brand Values */}
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

        </div>
      </div>

      <Footer />
    </main>
  )
}
