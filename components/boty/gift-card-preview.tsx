"use client"

import Image from "next/image"
import { useState } from "react"

interface GiftCardPreviewProps {
  amount: number
  backgroundColor: string
  customImage?: string
  useCustomImage?: boolean
}

// Convert hex to RGB for calculating luminance
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

// Calculate relative luminance for WCAG contrast
function getLuminance(hex: string) {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0.5
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((x) => {
    x = x / 255
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Determine if light or dark text based on background
function getTextColor(bgHex: string) {
  const luminance = getLuminance(bgHex)
  return luminance > 0.5 ? "#2C2C2C" : "#F7F4EF"
}

export function GiftCardPreview({
  amount,
  backgroundColor,
  customImage,
  useCustomImage = false,
}: GiftCardPreviewProps) {
  const textColor = getTextColor(backgroundColor)
  const isDarkBg = textColor === "#F7F4EF"

  return (
    <div className="sticky top-24 w-full">
      {/* Card Container - 16:9 Aspect Ratio */}
      <div
        className="relative w-full rounded-2xl overflow-hidden boty-shadow"
        style={{
          aspectRatio: "16 / 9",
          minHeight: "280px",
          backgroundColor: useCustomImage ? "#f0f0f0" : backgroundColor,
        }}
      >
        {/* Custom Image Mode */}
        {useCustomImage && customImage ? (
          <div className="relative w-full h-full">
            <Image
              src={customImage}
              alt="Gift card custom background"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>
        ) : (
          <>
            {/* Shimmer/Foil Effect */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background: `linear-gradient(
                  135deg,
                  rgba(255, 255, 255, 0.8) 0%,
                  transparent 30%,
                  transparent 70%,
                  rgba(255, 255, 255, 0.3) 100%
                )`,
                pointerEvents: "none",
              }}
            />

            {/* Background Pattern/Watermark */}
            <div
              className="absolute inset-0 opacity-5 text-6xl font-serif flex items-center justify-center"
              style={{ color: textColor }}
            >
              ₪
            </div>

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-between p-8 text-white">
              {/* Top Section */}
              <div>
                {/* Decorative Line */}
                <div
                  className="w-12 h-1 rounded-full mb-4"
                  style={{ backgroundColor: textColor, opacity: 0.6 }}
                />

                {/* Business Name */}
                <h1
                  className="font-serif text-3xl md:text-4xl font-bold mb-2"
                  style={{ color: textColor }}
                >
                  Juliris Boutique
                </h1>

                {/* Gift Card Label */}
                <p
                  className="text-sm tracking-widest uppercase"
                  style={{ color: textColor, opacity: 0.8 }}
                >
                  Gift Card
                </p>
              </div>

              {/* Bottom Section - Amount */}
              <div className="text-right">
                <p
                  className="text-xs md:text-sm uppercase tracking-widest mb-2"
                  style={{ color: textColor, opacity: 0.7 }}
                >
                  Amount
                </p>
                <p
                  className="font-serif text-4xl md:text-5xl font-bold"
                  style={{ color: textColor }}
                >
                  ₪{amount}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Preview Label */}
      <p className="text-xs text-muted-foreground mt-4 text-center">
        Card preview — actual card will be emailed
      </p>
    </div>
  )
}
