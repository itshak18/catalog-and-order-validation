/**
 * Collection helpers for dynamic category/promotional pages.
 */

import collectionsData from "@/data/collections.json"
import type { Collection } from "@/types/collection"
import type { ProductListItem } from "@/types/catalog"
import { getAllProducts, getProductsByCategory } from "./catalog"

const collections = collectionsData as Collection[]

/**
 * Get all active collections.
 */
export function getAllCollections(): Collection[] {
  return collections.filter((c) => c.isActive)
}

/**
 * Get a collection by slug.
 */
export function getCollectionBySlug(slug: string): Collection | null {
  return collections.find((c) => c.slug === slug && c.isActive) ?? null
}

/**
 * Get products for a collection based on its configuration.
 */
export function getCollectionProducts(collection: Collection): ProductListItem[] {
  const allProducts = getAllProducts()
  let products: ProductListItem[] = []

  // If specific product IDs are defined, use those
  if (collection.productIds && collection.productIds.length > 0) {
    const productMap = new Map(allProducts.map((p) => [p.id, p]))
    products = collection.productIds
      .map((id) => productMap.get(id))
      .filter((p): p is typeof allProducts[0] => p !== undefined)
      .map(productToListItem)
  }
  // If category slug is defined, filter by category
  else if (collection.categorySlug) {
    products = getProductsByCategory(collection.categorySlug)
  }
  // If filters are defined, apply them
  else if (collection.filters) {
    products = allProducts
      .filter((product) => {
        // Filter by badges
        if (collection.filters?.badges?.length) {
          if (!product.badge || !collection.filters.badges.includes(product.badge)) {
            return false
          }
        }
        // Filter by tags
        if (collection.filters?.tags?.length) {
          const hasTag = collection.filters.tags.some((tag) =>
            product.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase())
          )
          if (!hasTag) return false
        }
        // Filter by min discount
        if (collection.filters?.minDiscount) {
          const variant = product.variants[0]
          if (!variant.compareAtPrice) return false
          const discount = 
            ((variant.compareAtPrice.amount - variant.price.amount) / variant.compareAtPrice.amount) * 100
          if (discount < collection.filters.minDiscount) return false
        }
        return true
      })
      .map(productToListItem)
  }
  // Default: return all products
  else {
    products = allProducts.map(productToListItem)
  }

  // Apply sorting
  if (collection.sortBy) {
    products = sortProducts(products, collection.sortBy)
  }

  return products
}

/**
 * Sort products by the given criteria.
 */
function sortProducts(
  products: ProductListItem[],
  sortBy: Collection["sortBy"]
): ProductListItem[] {
  const sorted = [...products]
  
  switch (sortBy) {
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price)
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price)
    case "newest":
      // Products with "New" badge first, then by ID (assuming newer IDs are added later)
      return sorted.sort((a, b) => {
        if (a.badge === "New" && b.badge !== "New") return -1
        if (b.badge === "New" && a.badge !== "New") return 1
        return 0
      })
    case "popular":
      // Products with "Bestseller" badge first
      return sorted.sort((a, b) => {
        if (a.badge === "Bestseller" && b.badge !== "Bestseller") return -1
        if (b.badge === "Bestseller" && a.badge !== "Bestseller") return 1
        return 0
      })
    default:
      return sorted
  }
}

/**
 * Get collections by type.
 */
export function getCollectionsByType(type: Collection["type"]): Collection[] {
  return getAllCollections().filter((c) => c.type === type)
}

/**
 * Get featured collections for homepage/navigation.
 */
export function getFeaturedCollections(limit = 4): Collection[] {
  return getAllCollections()
    .filter((c) => c.showBanner)
    .slice(0, limit)
}

// Helper to convert Product to ProductListItem
function productToListItem(product: ReturnType<typeof getAllProducts>[0]): ProductListItem {
  const defaultVariant = product.variants[0]
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.tagline || product.description.slice(0, 60),
    price: defaultVariant.price.amount,
    originalPrice: defaultVariant.compareAtPrice?.amount ?? null,
    image: product.images[0]?.src ?? "/placeholder.svg",
    badge: product.badge,
    category: product.categoryId,
  }
}
