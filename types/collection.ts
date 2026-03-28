/**
 * Collection types for dynamic category/promotional pages.
 */

import type { BannerTheme } from "@/components/boty/promotional-banner"

export type CollectionType = 
  | "category"      // Standard category collection
  | "sale"          // Sale/discount collection
  | "new"           // New arrivals
  | "seasonal"      // Seasonal offerings (spring, summer, etc.)
  | "exclusive"     // Limited edition or exclusive items
  | "curated"       // Hand-picked curated collection

export interface CollectionBadge {
  label: string
  variant: "sale" | "new" | "exclusive" | "seasonal" | "default"
}

export interface CollectionBanner {
  eyebrow?: string
  headline: string
  subtext?: string
  image?: string
  theme?: BannerTheme
  ctaLabel?: string
  ctaHref?: string
}

export interface Collection {
  id: string
  slug: string
  name: string
  description: string
  type: CollectionType
  /** Product IDs or category slugs to include */
  productIds?: string[]
  categorySlug?: string
  /** Filter criteria */
  filters?: {
    badges?: string[]
    minDiscount?: number
    tags?: string[]
    dateRange?: { from: string; to: string }
  }
  /** Visual customization */
  banner?: CollectionBanner
  badge?: CollectionBadge
  /** SEO */
  metaTitle?: string
  metaDescription?: string
  /** Display options */
  showBanner?: boolean
  gridColumns?: 2 | 3 | 4
  sortBy?: "price-asc" | "price-desc" | "newest" | "popular"
  isActive: boolean
  createdAt: string
  updatedAt: string
}
