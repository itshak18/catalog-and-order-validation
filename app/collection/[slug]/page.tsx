"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams, notFound } from "next/navigation"
import { ShoppingBag, ArrowLeft, Grid3X3, LayoutGrid, SlidersHorizontal } from "lucide-react"
import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import { PromotionalBanner } from "@/components/boty/promotional-banner"
import { useCart } from "@/components/boty/cart-context"
import { getCollectionBySlug, getCollectionProducts } from "@/lib/collections"
import { formatMoney } from "@/lib/pricing"
import type { ProductListItem } from "@/types/catalog"
import type { Collection, CollectionBadge } from "@/types/collection"

// ─────────────────────────────────────────────────────────────────────────────
// Badge styling helper
// ─────────────────────────────────────────────────────────────────────────────

function getBadgeStyles(badge?: CollectionBadge | null): string {
  if (!badge) return ""
  
  switch (badge.variant) {
    case "sale":
      return "bg-destructive/10 text-destructive"
    case "new":
      return "bg-primary/10 text-primary"
    case "exclusive":
      return "bg-[#4F5B3A]/10 text-[#4F5B3A]"
    case "seasonal":
      return "bg-amber-500/10 text-amber-700"
    default:
      return "bg-accent text-accent-foreground"
  }
}

function getProductBadgeStyles(badge?: string | null): string {
  if (!badge) return ""
  
  switch (badge) {
    case "Sale":
      return "bg-destructive/10 text-destructive"
    case "New":
      return "bg-primary/10 text-primary"
    case "Bestseller":
      return "bg-[#4F5B3A]/10 text-[#4F5B3A]"
    case "Exclusive":
      return "bg-amber-500/10 text-amber-700"
    default:
      return "bg-accent text-accent-foreground"
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CollectionPage() {
  const params = useParams()
  const slug = params.slug as string
  
  const collection = useMemo(() => getCollectionBySlug(slug), [slug])
  const products = useMemo(
    () => (collection ? getCollectionProducts(collection) : []),
    [collection]
  )
  
  const [gridColumns, setGridColumns] = useState<2 | 3 | 4>(collection?.gridColumns ?? 3)
  const [sortBy, setSortBy] = useState(collection?.sortBy ?? "popular")
  const [isVisible, setIsVisible] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const { addItem } = useCart()

  // Handle 404
  if (!collection) {
    notFound()
  }

  // Intersection observer for animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (gridRef.current) {
      observer.observe(gridRef.current)
    }

    return () => {
      if (gridRef.current) {
        observer.unobserve(gridRef.current)
      }
    }
  }, [])

  // Sort products client-side when sortBy changes
  const sortedProducts = useMemo(() => {
    const sorted = [...products]
    switch (sortBy) {
      case "price-asc":
        return sorted.sort((a, b) => a.price - b.price)
      case "price-desc":
        return sorted.sort((a, b) => b.price - a.price)
      case "newest":
        return sorted.sort((a, b) => {
          if (a.badge === "New" && b.badge !== "New") return -1
          if (b.badge === "New" && a.badge !== "New") return 1
          return 0
        })
      case "popular":
      default:
        return sorted.sort((a, b) => {
          if (a.badge === "Bestseller" && b.badge !== "Bestseller") return -1
          if (b.badge === "Bestseller" && a.badge !== "Bestseller") return 1
          return 0
        })
    }
  }, [products, sortBy])

  const handleAddToCart = (product: ProductListItem, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      productId: product.id,
      variantId: `${product.id}-default`,
      name: product.name,
      description: product.description,
      unitPrice: product.price,
      image: product.image,
    })
  }

  const gridColsClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  }[gridColumns]

  return (
    <main className="min-h-screen">
      <Header />
      
      {/* Banner Section */}
      {collection.showBanner && collection.banner && (
        <div className="pt-20">
          <PromotionalBanner
            eyebrow={collection.banner.eyebrow}
            headline={collection.banner.headline}
            subtext={collection.banner.subtext}
            theme={collection.banner.theme ?? "default"}
            layout={collection.banner.image ? "split" : "centered"}
            image={
              collection.banner.image
                ? { src: collection.banner.image, alt: collection.name }
                : undefined
            }
            cta={
              collection.banner.ctaLabel
                ? { label: collection.banner.ctaLabel, href: "#products" }
                : undefined
            }
          />
        </div>
      )}

      <div className={`${collection.showBanner ? "pt-12" : "pt-28"} pb-20`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <Link
              href="/collections"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground boty-transition"
            >
              <ArrowLeft className="w-4 h-4" />
              All Collections
            </Link>
          </nav>

          {/* Header (shown when no banner) */}
          {!collection.showBanner && (
            <div className="text-center mb-12">
              {collection.badge && (
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs tracking-wide mb-4 ${getBadgeStyles(collection.badge)}`}
                >
                  {collection.badge.label}
                </span>
              )}
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground mb-4 text-balance">
                {collection.name}
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                {collection.description}
              </p>
            </div>
          )}

          {/* Collection info when banner is shown */}
          {collection.showBanner && (
            <div className="mb-10" id="products">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  {collection.badge && (
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs tracking-wide mb-2 ${getBadgeStyles(collection.badge)}`}
                    >
                      {collection.badge.label}
                    </span>
                  )}
                  <h2 className="font-serif text-2xl md:text-3xl text-foreground">
                    {collection.name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-lg">
                    {collection.description}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {sortedProducts.length} {sortedProducts.length === 1 ? "product" : "products"}
                </span>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/50">
            {/* Sort */}
            <div className="flex items-center gap-3">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-transparent text-sm text-foreground focus:outline-none cursor-pointer"
              >
                <option value="popular">Most Popular</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>

            {/* Grid toggle */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGridColumns(2)}
                className={`p-2 rounded-lg boty-transition ${
                  gridColumns === 2 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label="2 columns"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setGridColumns(3)}
                className={`p-2 rounded-lg boty-transition ${
                  gridColumns === 3 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label="3 columns"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Product Grid */}
          {sortedProducts.length > 0 ? (
            <div ref={gridRef} className={`grid ${gridColsClass} gap-6`}>
              {sortedProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  isVisible={isVisible}
                  onAddToCart={handleAddToCart}
                  collectionBadge={collection.badge}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4 boty-shadow">
                <ShoppingBag className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="font-serif text-2xl text-foreground mb-2">No products found</p>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                This collection is currently empty. Check back soon!
              </p>
              <Link
                href="/shop"
                className="px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm hover:bg-primary/90 boty-transition"
              >
                Browse All Products
              </Link>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Product Card Component
// ─────────────────────────────────────────────────────────────────────────────

function ProductCard({
  product,
  index,
  isVisible,
  onAddToCart,
  collectionBadge,
}: {
  product: ProductListItem
  index: number
  isVisible: boolean
  onAddToCart: (product: ProductListItem, e: React.MouseEvent) => void
  collectionBadge?: CollectionBadge | null
}) {
  const [imageLoaded, setImageLoaded] = useState(false)

  // Show collection badge OR product badge
  const displayBadge = product.badge || (collectionBadge ? collectionBadge.label : null)
  const badgeStyles = product.badge
    ? getProductBadgeStyles(product.badge)
    : getBadgeStyles(collectionBadge)

  return (
    <Link
      href={`/product/${product.slug}`}
      className={`group transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className="bg-card rounded-3xl overflow-hidden boty-shadow boty-transition group-hover:scale-[1.02]">
        {/* Image */}
        <div className="relative aspect-square bg-muted overflow-hidden">
          {/* Skeleton */}
          <div
            className={`absolute inset-0 bg-gradient-to-br from-muted via-muted/50 to-muted animate-pulse transition-opacity duration-500 ${
              imageLoaded ? "opacity-0" : "opacity-100"
            }`}
          />

          <Image
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            fill
            className={`object-cover boty-transition group-hover:scale-105 transition-opacity duration-500 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImageLoaded(true)}
          />

          {/* Badge */}
          {displayBadge && (
            <span
              className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs tracking-wide ${badgeStyles}`}
            >
              {displayBadge}
            </span>
          )}

          {/* Quick add button */}
          <button
            type="button"
            className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 boty-transition boty-shadow"
            onClick={(e) => onAddToCart(product, e)}
            aria-label="Add to cart"
          >
            <ShoppingBag className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Info */}
        <div className="p-6">
          <h3 className="font-serif text-xl text-foreground mb-1">{product.name}</h3>
          <p className="text-sm text-muted-foreground mb-4">{product.description}</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-foreground">
              {formatMoney(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatMoney(product.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
