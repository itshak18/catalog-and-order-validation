/**
 * PromotionalBanner — versatile, campaign-ready banner component
 *
 * Themes (preset via `theme` prop):
 *   "default"   — brand cream/olive, suits everyday promotions
 *   "festive"   — deep charcoal background with warm accents, holidays
 *   "seasonal"  — muted sage/beige, spring/summer launches
 *   "bold"      — high-contrast olive fill, flash sales
 *   "minimal"   — white/border only, editorial new collections
 *
 * Layout variants (via `layout` prop):
 *   "centered"  — all content centered, hero-style
 *   "split"     — text left, image right (reverses on mobile)
 *   "inline"    — compact single-row strip (great for top-of-page banners)
 *
 * All text, links, images, and colors can be overridden per instance.
 */

"use client"

import Image from "next/image"
import Link from "next/link"
import { X } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type BannerTheme = "default" | "festive" | "seasonal" | "bold" | "minimal"
export type BannerLayout = "centered" | "split" | "inline"

export interface BannerCTA {
  label: string
  href: string
  /** Opens in a new tab */
  external?: boolean
}

export interface PromotionalBannerProps {
  /** Short label displayed above the headline, e.g. "Limited Time" */
  eyebrow?: string
  /** Main attention-grabbing headline */
  headline: string
  /** Optional supporting message below the headline */
  subtext?: string
  /** Primary call-to-action button */
  cta?: BannerCTA
  /** Optional secondary / ghost CTA */
  ctaSecondary?: BannerCTA
  /** Optional image (used in "split" and "centered" layouts) */
  image?: {
    src: string
    alt: string
    /** Tailwind object-position class, e.g. "object-top" */
    position?: string
  }
  /** Visual preset — controls background, text, and button colors */
  theme?: BannerTheme
  /** Controls the structural layout of content */
  layout?: BannerLayout
  /** Whether to show a dismiss (×) button */
  dismissible?: boolean
  /** Extra class applied to the outermost wrapper */
  className?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Theme token maps
// ─────────────────────────────────────────────────────────────────────────────

const themeStyles: Record<
  BannerTheme,
  {
    wrapper: string
    eyebrow: string
    headline: string
    subtext: string
    ctaPrimary: string
    ctaSecondary: string
    dismiss: string
    border: string
  }
> = {
  default: {
    wrapper: "bg-[#EDE6DC]",
    eyebrow: "text-[#4F5B3A]",
    headline: "text-[#2C2C2C]",
    subtext: "text-[#6B6560]",
    ctaPrimary: "bg-[#4F5B3A] text-[#F7F4EF] hover:bg-[#3d4730]",
    ctaSecondary: "border border-[#4F5B3A] text-[#4F5B3A] hover:bg-[#4F5B3A] hover:text-[#F7F4EF]",
    dismiss: "text-[#6B6560] hover:text-[#2C2C2C]",
    border: "border-b border-[#D8CFC4]",
  },
  festive: {
    wrapper: "bg-[#2C2C2C]",
    eyebrow: "text-[#D8CFC4]",
    headline: "text-[#F7F4EF]",
    subtext: "text-[#B8ADA3]",
    ctaPrimary: "bg-[#F7F4EF] text-[#2C2C2C] hover:bg-[#EDE6DC]",
    ctaSecondary: "border border-[#B8ADA3] text-[#F7F4EF] hover:bg-[#F7F4EF] hover:text-[#2C2C2C]",
    dismiss: "text-[#B8ADA3] hover:text-[#F7F4EF]",
    border: "",
  },
  seasonal: {
    wrapper: "bg-[#8B9A6D]",
    eyebrow: "text-[#EDE6DC]",
    headline: "text-[#F7F4EF]",
    subtext: "text-[#EDE6DC]/80",
    ctaPrimary: "bg-[#F7F4EF] text-[#4F5B3A] hover:bg-[#EDE6DC]",
    ctaSecondary: "border border-[#EDE6DC] text-[#F7F4EF] hover:bg-[#F7F4EF] hover:text-[#4F5B3A]",
    dismiss: "text-[#EDE6DC] hover:text-[#F7F4EF]",
    border: "",
  },
  bold: {
    wrapper: "bg-[#4F5B3A]",
    eyebrow: "text-[#D8CFC4]",
    headline: "text-[#F7F4EF]",
    subtext: "text-[#D8CFC4]",
    ctaPrimary: "bg-[#F7F4EF] text-[#4F5B3A] hover:bg-[#EDE6DC]",
    ctaSecondary: "border border-[#D8CFC4] text-[#F7F4EF] hover:bg-[#F7F4EF] hover:text-[#4F5B3A]",
    dismiss: "text-[#D8CFC4] hover:text-[#F7F4EF]",
    border: "",
  },
  minimal: {
    wrapper: "bg-[#F7F4EF]",
    eyebrow: "text-[#6B6560]",
    headline: "text-[#2C2C2C]",
    subtext: "text-[#6B6560]",
    ctaPrimary: "bg-transparent border border-[#2C2C2C] text-[#2C2C2C] hover:bg-[#2C2C2C] hover:text-[#F7F4EF]",
    ctaSecondary: "text-[#6B6560] underline underline-offset-4 hover:text-[#2C2C2C]",
    dismiss: "text-[#B8ADA3] hover:text-[#2C2C2C]",
    border: "border border-[#D8CFC4]",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function PromotionalBanner({
  eyebrow,
  headline,
  subtext,
  cta,
  ctaSecondary,
  image,
  theme = "default",
  layout = "centered",
  dismissible = false,
  className,
}: PromotionalBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const t = themeStyles[theme]

  if (dismissed) return null

  // ── Inline layout ──────────────────────────────────────────────────────────
  if (layout === "inline") {
    return (
      <div
        className={cn(
          "relative w-full px-4 py-3",
          t.wrapper,
          t.border,
          className
        )}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-center sm:text-left">
          {eyebrow && (
            <span className={cn("text-xs font-medium tracking-widest uppercase font-sans", t.eyebrow)}>
              {eyebrow}
            </span>
          )}
          <p className={cn("text-sm font-medium font-sans text-balance", t.headline)}>
            {headline}
            {subtext && (
              <span className={cn("ml-2 font-normal", t.subtext)}>{subtext}</span>
            )}
          </p>
          {cta && (
            <Link
              href={cta.href}
              target={cta.external ? "_blank" : undefined}
              rel={cta.external ? "noopener noreferrer" : undefined}
              className={cn(
                "shrink-0 text-xs font-medium tracking-wide px-4 py-1.5 rounded-full boty-transition font-sans",
                t.ctaPrimary
              )}
            >
              {cta.label}
            </Link>
          )}
        </div>
        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss banner"
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 p-1 boty-transition",
              t.dismiss
            )}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  // ── Split layout ───────────────────────────────────────────────────────────
  if (layout === "split") {
    return (
      <div className={cn("relative w-full overflow-hidden", t.wrapper, t.border, className)}>
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 min-h-[420px]">
          {/* Text side */}
          <div className="flex flex-col justify-center px-8 py-12 md:px-14 gap-5">
            {eyebrow && (
              <span className={cn("text-xs font-medium tracking-widest uppercase font-sans", t.eyebrow)}>
                {eyebrow}
              </span>
            )}
            <h2
              className={cn(
                "font-serif text-3xl md:text-4xl lg:text-5xl leading-tight text-balance",
                t.headline
              )}
            >
              {headline}
            </h2>
            {subtext && (
              <p className={cn("text-base leading-relaxed font-sans max-w-sm", t.subtext)}>
                {subtext}
              </p>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              {cta && (
                <Link
                  href={cta.href}
                  target={cta.external ? "_blank" : undefined}
                  rel={cta.external ? "noopener noreferrer" : undefined}
                  className={cn(
                    "px-6 py-3 rounded-full text-sm font-medium font-sans boty-transition boty-shadow",
                    t.ctaPrimary
                  )}
                >
                  {cta.label}
                </Link>
              )}
              {ctaSecondary && (
                <Link
                  href={ctaSecondary.href}
                  target={ctaSecondary.external ? "_blank" : undefined}
                  rel={ctaSecondary.external ? "noopener noreferrer" : undefined}
                  className={cn(
                    "px-6 py-3 rounded-full text-sm font-medium font-sans boty-transition",
                    t.ctaSecondary
                  )}
                >
                  {ctaSecondary.label}
                </Link>
              )}
            </div>
          </div>

          {/* Image side */}
          {image && (
            <div className="relative min-h-[280px] md:min-h-full overflow-hidden">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                className={cn("object-cover", image.position ?? "object-center")}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          )}
        </div>

        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss banner"
            className={cn("absolute right-5 top-5 p-1.5 rounded-full boty-transition", t.dismiss)}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    )
  }

  // ── Centered layout (default) ──────────────────────────────────────────────
  return (
    <div className={cn("relative w-full overflow-hidden", t.wrapper, t.border, className)}>
      {/* Background image if provided */}
      {image && (
        <div className="absolute inset-0">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            className={cn("object-cover", image.position ?? "object-center")}
            sizes="100vw"
          />
          {/* Scrim for readability */}
          <div className="absolute inset-0 bg-black/35" />
        </div>
      )}

      <div className="relative max-w-3xl mx-auto px-6 py-16 md:py-24 flex flex-col items-center text-center gap-5">
        {eyebrow && (
          <span
            className={cn(
              "text-xs font-medium tracking-widest uppercase font-sans",
              image ? "text-white/80" : t.eyebrow
            )}
          >
            {eyebrow}
          </span>
        )}
        <h2
          className={cn(
            "font-serif text-3xl md:text-5xl lg:text-6xl leading-tight text-balance",
            image ? "text-white" : t.headline
          )}
        >
          {headline}
        </h2>
        {subtext && (
          <p
            className={cn(
              "text-base md:text-lg leading-relaxed font-sans text-balance max-w-xl",
              image ? "text-white/80" : t.subtext
            )}
          >
            {subtext}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {cta && (
            <Link
              href={cta.href}
              target={cta.external ? "_blank" : undefined}
              rel={cta.external ? "noopener noreferrer" : undefined}
              className={cn(
                "px-8 py-3 rounded-full text-sm font-medium font-sans boty-transition boty-shadow",
                image
                  ? "bg-white text-[#2C2C2C] hover:bg-[#F7F4EF]"
                  : t.ctaPrimary
              )}
            >
              {cta.label}
            </Link>
          )}
          {ctaSecondary && (
            <Link
              href={ctaSecondary.href}
              target={ctaSecondary.external ? "_blank" : undefined}
              rel={ctaSecondary.external ? "noopener noreferrer" : undefined}
              className={cn(
                "px-8 py-3 rounded-full text-sm font-medium font-sans boty-transition",
                image
                  ? "border border-white text-white hover:bg-white hover:text-[#2C2C2C]"
                  : t.ctaSecondary
              )}
            >
              {ctaSecondary.label}
            </Link>
          )}
        </div>
      </div>

      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss banner"
          className={cn(
            "absolute right-5 top-5 p-1.5 rounded-full boty-transition",
            image ? "text-white/70 hover:text-white" : t.dismiss
          )}
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}
