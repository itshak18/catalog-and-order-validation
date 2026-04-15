"use client"

import { useState } from "react"
import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import { GiftCardPreview } from "@/components/boty/gift-card-preview"
import { ChevronDown, Upload, Plus, Minus, Check } from "lucide-react"

const PRESET_AMOUNTS = [100, 200, 300, 400, 500]
const CARD_COLORS = [
  { name: "Cream", hex: "#F7F4EF" },
  { name: "Olive", hex: "#4F5B3A" },
  { name: "Warm Beige", hex: "#D8CFC4" },
  { name: "Soft Taupe", hex: "#B8ADA3" },
  { name: "Charcoal", hex: "#2C2C2C" },
  { name: "Gold", hex: "#8B9A6D" },
]

type DeliveryType = "email" | "print"

interface FormState {
  amount: number
  customAmount: string
  selectedColor: string
  deliveryType: DeliveryType
  recipientName: string
  recipientEmail: string
  personalMessage: string
  senderName: string
  quantity: number
  useCustomImage: boolean
  customImage?: string
}

export default function GiftCardsPage() {
  const [form, setForm] = useState<FormState>({
    amount: 200,
    customAmount: "",
    selectedColor: CARD_COLORS[0].hex,
    deliveryType: "email",
    recipientName: "",
    recipientEmail: "",
    personalMessage: "",
    senderName: "",
    quantity: 1,
    useCustomImage: false,
  })

  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Calculate total
  const displayAmount = form.customAmount ? parseInt(form.customAmount) : form.amount
  const subtotal = displayAmount * form.quantity
  const total = subtotal

  // Handle amount selection
  const handleAmountSelect = (amt: number) => {
    setForm((prev) => ({
      ...prev,
      amount: amt,
      customAmount: "",
    }))
  }

  // Handle custom amount
  const handleCustomAmount = (value: string) => {
    const numValue = parseInt(value) || 0
    if (numValue >= 50 || value === "") {
      setForm((prev) => ({
        ...prev,
        customAmount: value,
        amount: 0,
      }))
    }
  }

  // Handle color selection
  const handleColorSelect = (hex: string) => {
    setForm((prev) => ({
      ...prev,
      selectedColor: hex,
    }))
  }

  // Handle file upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setImagePreview(result)
        setForm((prev) => ({
          ...prev,
          customImage: result,
          useCustomImage: true,
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  // Toggle custom image mode
  const toggleCustomImage = () => {
    setForm((prev) => ({
      ...prev,
      useCustomImage: !prev.useCustomImage,
    }))
    if (form.useCustomImage) {
      setImagePreview(null)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Breadcrumb */}
      <div className="pt-28 px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-muted-foreground">
            <a href="/" className="hover:text-foreground boty-transition">
              Home
            </a>
            {" > "}
            <span className="text-foreground">Gift Cards</span>
          </p>
        </div>
      </div>

      {/* Page Header */}
      <section className="px-4 py-12">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="font-serif text-5xl md:text-6xl text-foreground mb-4">
            Gift Cards
          </h1>
          <p className="text-lg text-foreground/70">
            Give the gift of Juliris Boutique — for any occasion
          </p>
        </div>
      </section>

      {/* Two Column Layout */}
      <section className="px-4 pb-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* LEFT COLUMN - Gift Card Preview */}
          <div>
            <GiftCardPreview
              amount={displayAmount}
              backgroundColor={form.selectedColor}
              customImage={form.customImage}
              useCustomImage={form.useCustomImage}
            />

            {/* Custom Image Upload */}
            <div className="mt-8">
              <button
                type="button"
                onClick={toggleCustomImage}
                className={`w-full border-2 border-dashed rounded-lg p-6 text-center boty-transition ${
                  form.useCustomImage
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary"
                }`}
              >
                <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {form.useCustomImage ? "Using custom image" : "Upload custom image"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {form.useCustomImage ? "Click to remove" : "JPG, PNG up to 10MB"}
                </p>
              </button>

              {!form.useCustomImage && (
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="image-upload"
                  onChange={handleImageUpload}
                />
              )}
              {!form.useCustomImage && (
                <label
                  htmlFor="image-upload"
                  className="block mt-2 text-center text-xs text-primary cursor-pointer hover:underline"
                >
                  Choose image
                </label>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - Purchase Options */}
          <div className="space-y-8">
            {/* 1. AMOUNT SELECTOR */}
            <div>
              <h3 className="font-serif text-xl text-foreground mb-4">Select Amount</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleAmountSelect(amt)}
                    className={`relative p-6 rounded-lg border-2 boty-transition group ${
                      form.amount === amt && !form.customAmount
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    {/* ₪ Watermark */}
                    <span className="absolute inset-0 flex items-center justify-center text-4xl opacity-5 group-hover:opacity-10 boty-transition font-serif">
                      ₪
                    </span>

                    <div className="relative z-10 text-center">
                      <p className="text-xs text-muted-foreground mb-1">₪</p>
                      <p className="font-serif text-2xl font-bold text-foreground">{amt}</p>
                    </div>
                  </button>
                ))}

                {/* Custom Amount Card */}
                <div className="col-span-2 md:col-span-1">
                  <button
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        customAmount: prev.customAmount || "50",
                      }))
                    }
                    className={`w-full p-6 rounded-lg border-2 boty-transition ${
                      form.customAmount
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground">Custom</p>
                  </button>
                </div>
              </div>

              {/* Custom Amount Input */}
              {form.customAmount && (
                <div className="mt-4">
                  <label className="block text-sm text-muted-foreground mb-2">
                    Enter amount in ₪
                  </label>
                  <input
                    type="number"
                    min="50"
                    placeholder="50"
                    value={form.customAmount}
                    onChange={(e) => handleCustomAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            {/* 2. CARD COLOR */}
            <div>
              <h3 className="font-serif text-xl text-foreground mb-4">Card Color</h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {CARD_COLORS.map((color) => (
                  <button
                    key={color.hex}
                    onClick={() => handleColorSelect(color.hex)}
                    className="group relative flex-shrink-0"
                    title={color.name}
                  >
                    <div
                      className={`w-11 h-11 rounded-full border-2 boty-transition flex items-center justify-center ${
                        form.selectedColor === color.hex
                          ? "border-foreground"
                          : "border-border hover:border-foreground"
                      }`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {form.selectedColor === color.hex && (
                        <Check className="w-4 h-4 text-white drop-shadow" />
                      )}
                    </div>
                    <span className="absolute top-14 left-1/2 -translate-x-1/2 text-xs text-foreground bg-card rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 boty-transition pointer-events-none">
                      {color.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. DELIVERY OPTIONS */}
            <div>
              <h3 className="font-serif text-xl text-foreground mb-4">Delivery</h3>
              <div className="flex gap-2">
                {(["email", "print"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setForm((prev) => ({ ...prev, deliveryType: type }))}
                    className={`flex-1 px-4 py-3 rounded-full font-medium boty-transition ${
                      form.deliveryType === type
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {type === "email" ? "📧 Email" : "🖨️ Print at Home"}
                  </button>
                ))}
              </div>

              {/* Delivery Sub-form */}
              {form.deliveryType === "email" && (
                <div className="mt-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Recipient Name"
                    value={form.recipientName}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, recipientName: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="email"
                    placeholder="Recipient Email"
                    value={form.recipientEmail}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, recipientEmail: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              {form.deliveryType === "print" && (
                <div className="mt-4 p-4 bg-card rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">
                    PDF will be available after purchase. You&apos;ll be able to download and print
                    it at home.
                  </p>
                </div>
              )}
            </div>

            {/* 4. PERSONAL MESSAGE */}
            <div>
              <h3 className="font-serif text-xl text-foreground mb-4">Personal Message</h3>
              <div className="relative">
                <textarea
                  placeholder="Add a personal message (optional)"
                  maxLength={160}
                  value={form.personalMessage}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, personalMessage: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={3}
                />
                <span className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                  {form.personalMessage.length}/160
                </span>
              </div>
            </div>

            {/* 5. SENDER NAME */}
            <div>
              <h3 className="font-serif text-xl text-foreground mb-4">From</h3>
              <input
                type="text"
                placeholder="Your name"
                value={form.senderName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, senderName: e.target.value }))
                }
                className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* 6. QUANTITY */}
            <div>
              <h3 className="font-serif text-xl text-foreground mb-4">Quantity</h3>
              <div className="flex items-center gap-4 w-fit">
                <button
                  onClick={() =>
                    setForm((prev) => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))
                  }
                  className="p-2 rounded-lg border border-border hover:bg-muted boty-transition"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-2xl font-serif w-8 text-center">{form.quantity}</span>
                <button
                  onClick={() =>
                    setForm((prev) => ({ ...prev, quantity: prev.quantity + 1 }))
                  }
                  className="p-2 rounded-lg border border-border hover:bg-muted boty-transition"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 7. ORDER SUMMARY */}
            <div className="bg-card rounded-lg p-6 border border-border">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">₪{displayAmount} × {form.quantity}</span>
                  <span className="font-medium text-foreground">₪{total}</span>
                </div>
              </div>

              <button
                type="button"
                className="w-full px-6 py-4 rounded-lg bg-primary text-primary-foreground font-medium mb-2 hover:opacity-90 boty-transition"
              >
                Add to Cart
              </button>
              <button
                type="button"
                className="w-full px-6 py-4 rounded-lg border border-primary text-primary font-medium hover:bg-primary/5 boty-transition"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
