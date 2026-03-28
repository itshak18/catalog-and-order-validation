/**
 * /app/banners/page.tsx
 *
 * Live showcase of every PromotionalBanner preset so the team can see
 * and copy-paste configurations directly into any page.
 *
 * To use a banner anywhere in the app:
 *   import { PromotionalBanner } from "@/components/boty/promotional-banner"
 *   <PromotionalBanner theme="festive" layout="split" headline="..." cta={{ label: "...", href: "..." }} />
 */

import { PromotionalBanner } from "@/components/boty/promotional-banner"
import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"

export const metadata = {
  title: "Banner Showcase — Juliris",
  description: "Promotional banner presets for campaigns, sales, and seasonal events.",
}

export default function BannersPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* ── Page header ──────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 py-16 md:py-20">
          <p className="text-xs font-medium tracking-widest uppercase text-primary font-sans mb-4">
            Design System
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-foreground text-balance leading-tight">
            Promotional Banners
          </h1>
          <p className="mt-4 text-muted-foreground font-sans text-base leading-relaxed max-w-xl">
            Ready-to-use banner presets for holiday sales, new collections, seasonal discounts,
            and other campaigns. Each variant is fully customisable — swap the headline, image,
            CTA, or theme without touching the component code.
          </p>

          {/* Quick-reference table */}
          <div className="mt-10 overflow-x-auto rounded-2xl border border-border boty-shadow">
            <table className="w-full text-sm font-sans">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Prop</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Options</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["theme", "default · festive · seasonal · bold · minimal", "Controls background, text & button colours"],
                  ["layout", "centered · split · inline", "Structural layout of content and image"],
                  ["eyebrow", "string (optional)", "Small label above the headline (e.g. 'Limited Time')"],
                  ["headline", "string (required)", "Main attention-grabbing headline"],
                  ["subtext", "string (optional)", "Supporting message below the headline"],
                  ["cta", "{ label, href, external? }", "Primary call-to-action button"],
                  ["ctaSecondary", "{ label, href, external? }", "Optional secondary / ghost CTA"],
                  ["image", "{ src, alt, position? }", "Optional image (used in split & centered layouts)"],
                  ["dismissible", "boolean", "Whether a dismiss (×) button is shown"],
                ].map(([prop, options, desc]) => (
                  <tr key={prop} className="hover:bg-muted/30 boty-transition">
                    <td className="px-5 py-3 font-mono text-primary text-xs">{prop}</td>
                    <td className="px-5 py-3 text-foreground/70">{options}</td>
                    <td className="px-5 py-3 text-muted-foreground">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Inline banners ───────────────────────────────────────────── */}
        <section className="space-y-1">
          <SectionLabel label="Layout: Inline" note="Best for top-of-page announcement strips" />

          <PromotionalBanner
            layout="inline"
            theme="default"
            eyebrow="Free Shipping"
            headline="Spend $50 or more and get free delivery on your order."
            cta={{ label: "Shop Now", href: "/shop" }}
            dismissible
          />

          <PromotionalBanner
            layout="inline"
            theme="bold"
            eyebrow="Flash Sale"
            headline="20% off everything today only — use code FLASH20 at checkout."
            cta={{ label: "Claim Offer", href: "/shop" }}
            dismissible
          />

          <PromotionalBanner
            layout="inline"
            theme="festive"
            eyebrow="Holiday Gifting"
            headline="Complimentary gift wrapping on all orders until 24 December."
            cta={{ label: "Browse Gifts", href: "/collections" }}
            dismissible
          />

          <PromotionalBanner
            layout="inline"
            theme="minimal"
            headline="New arrivals just dropped — The Ritual Glow Collection is live."
            cta={{ label: "Discover", href: "/collections" }}
          />
        </section>

        {/* ── Centered banners ─────────────────────────────────────────── */}
        <section className="space-y-8 mt-16">
          <SectionLabel label="Layout: Centered" note="Full-width hero-style banners for homepage sections" />

          {/* Default — no image */}
          <PromotionalBanner
            layout="centered"
            theme="default"
            eyebrow="New Collection"
            headline="The Ritual Glow Collection"
            subtext="Six products. One ritual. Formulated with cold-pressed botanicals for your most luminous skin."
            cta={{ label: "Shop the Collection", href: "/collections" }}
            ctaSecondary={{ label: "Learn More", href: "/about" }}
          />

          {/* Seasonal — no image */}
          <PromotionalBanner
            layout="centered"
            theme="seasonal"
            eyebrow="Spring Edit"
            headline="Renew Your Ritual"
            subtext="Lighter textures, brighter botanicals. Discover what spring does for your skin."
            cta={{ label: "Explore Spring", href: "/shop?category=serums" }}
          />

          {/* Festive — no image */}
          <PromotionalBanner
            layout="centered"
            theme="festive"
            eyebrow="Holiday 2024"
            headline="Give the Gift of Glow"
            subtext="Curated gift sets, complimentary wrapping, and free shipping on every order this December."
            cta={{ label: "Shop Gift Sets", href: "/collections" }}
            ctaSecondary={{ label: "View All", href: "/shop" }}
          />

          {/* Bold — no image */}
          <PromotionalBanner
            layout="centered"
            theme="bold"
            eyebrow="Weekend Sale"
            headline="30% Off Sitewide"
            subtext="Two days only. No code needed — discount applied automatically at checkout."
            cta={{ label: "Shop the Sale", href: "/shop" }}
            dismissible
          />

          {/* Minimal — no image */}
          <PromotionalBanner
            layout="centered"
            theme="minimal"
            eyebrow="Editorial"
            headline="Slow Beauty, Intentional Living"
            subtext="An introduction to the philosophy behind every Juliris formula."
            cta={{ label: "Read the Story", href: "/about" }}
          />

          {/* Centered with background image */}
          <PromotionalBanner
            layout="centered"
            theme="default"
            eyebrow="Holiday Collection"
            headline="Glow Through the Season"
            subtext="Indulge in warmth. Rich oils and balms crafted for cold-weather radiance."
            cta={{ label: "Discover More", href: "/collections" }}
            ctaSecondary={{ label: "Gift Sets", href: "/shop" }}
            image={{ src: "/images/banners/holiday-banner.jpg", alt: "Holiday skincare collection" }}
          />

          <PromotionalBanner
            layout="centered"
            theme="seasonal"
            eyebrow="Spring Refresh"
            headline="Bloom Into Your Best Skin"
            subtext="Lightweight serums and gentle cleansers for the season of renewal."
            cta={{ label: "Shop Spring", href: "/shop" }}
            image={{ src: "/images/banners/spring-banner.jpg", alt: "Spring skincare collection" }}
          />
        </section>

        {/* ── Split banners ────────────────────────────────────────────── */}
        <section className="space-y-8 mt-16 mb-24">
          <SectionLabel label="Layout: Split" note="Text beside image — great for new launches and feature moments" />

          <PromotionalBanner
            layout="split"
            theme="default"
            eyebrow="Now Available"
            headline="Radiance Serum No.3"
            subtext="Our most concentrated vitamin C formula yet. Clinically proven to visibly brighten in 14 days."
            cta={{ label: "Shop Now", href: "/product/radiance-serum" }}
            ctaSecondary={{ label: "See Ingredients", href: "/about" }}
            image={{ src: "/images/banners/collection-banner.jpg", alt: "Radiance Serum product shot" }}
          />

          <PromotionalBanner
            layout="split"
            theme="festive"
            eyebrow="The Gift Edit"
            headline="Something Special for Everyone"
            subtext="Thoughtfully curated sets for the people who deserve the best. Giftwrap included."
            cta={{ label: "Browse Gift Sets", href: "/collections" }}
            image={{ src: "/images/banners/holiday-banner.jpg", alt: "Holiday gift sets", position: "object-top" }}
          />

          <PromotionalBanner
            layout="split"
            theme="seasonal"
            eyebrow="Spring Collection"
            headline="Effortless Glow Starts Here"
            subtext="Everything you need for a complete spring ritual — from cleanser to SPF serum."
            cta={{ label: "View Collection", href: "/shop?category=serums" }}
            ctaSecondary={{ label: "Learn the Ritual", href: "/about" }}
            image={{ src: "/images/banners/spring-banner.jpg", alt: "Spring skincare ritual" }}
          />

          <PromotionalBanner
            layout="split"
            theme="minimal"
            eyebrow="New In"
            headline="The Ritual Collection"
            subtext="Six essentials. One complete routine. Designed for every skin type, every day."
            cta={{ label: "Discover", href: "/collections" }}
            image={{ src: "/images/banners/collection-banner.jpg", alt: "Ritual collection" }}
          />
        </section>
      </main>

      <Footer />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ label, note }: { label: string; note: string }) {
  return (
    <div className="max-w-7xl mx-auto px-6 pt-4 pb-2 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
      <span className="font-serif text-xl text-foreground">{label}</span>
      <span className="text-sm text-muted-foreground font-sans">{note}</span>
    </div>
  )
}
