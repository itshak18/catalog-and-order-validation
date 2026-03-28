"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Sparkles, Tag, Gift, Star } from "lucide-react"
import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import { getAllCategories } from "@/lib/catalog"
import { getAllCollections } from "@/lib/collections"
import type { Collection } from "@/types/collection"

// Helper to get icon for collection type
function getCollectionIcon(type: Collection["type"]) {
  switch (type) {
    case "sale":
      return <Tag className="w-4 h-4" />
    case "new":
      return <Sparkles className="w-4 h-4" />
    case "seasonal":
      return <Gift className="w-4 h-4" />
    case "exclusive":
      return <Star className="w-4 h-4" />
    default:
      return null
  }
}

// Helper to get badge styles for collection type
function getCollectionBadgeStyles(type: Collection["type"]) {
  switch (type) {
    case "sale":
      return "bg-destructive/10 text-destructive"
    case "new":
      return "bg-primary/10 text-primary"
    case "seasonal":
      return "bg-amber-500/10 text-amber-700"
    case "exclusive":
      return "bg-[#4F5B3A]/10 text-[#4F5B3A]"
    default:
      return "bg-accent text-accent-foreground"
  }
}

export default function CollectionsPage() {
  const categories = getAllCategories()
  const specialCollections = getAllCollections().filter(c => c.type !== "category")

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center animate-fade-in">
          <h1 className="font-serif text-5xl md:text-6xl text-foreground mb-6 text-balance">
            Explore Our Collections
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Curated skincare collections designed to target specific concerns and enhance your natural beauty.
          </p>
        </div>
      </section>

      {/* Special Collections (Sales, New Arrivals, etc.) */}
      {specialCollections.length > 0 && (
        <section className="px-4 pb-16">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-serif text-3xl text-foreground mb-8 animate-fade-in">
              Featured Collections
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {specialCollections.map((collection, idx) => (
                <Link
                  key={collection.id}
                  href={`/collection/${collection.slug}`}
                  className="group animate-fade-in"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <div className="relative overflow-hidden rounded-2xl bg-card boty-shadow hover:boty-shadow-lg boty-transition h-full">
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden bg-muted">
                      {collection.banner?.image ? (
                        <Image
                          src={collection.banner.image}
                          alt={collection.name}
                          fill
                          className="object-cover group-hover:scale-110 boty-transition"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 boty-transition" />
                      
                      {/* Badge */}
                      {collection.badge && (
                        <span
                          className={`absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs tracking-wide ${getCollectionBadgeStyles(collection.type)}`}
                        >
                          {getCollectionIcon(collection.type)}
                          {collection.badge.label}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="font-serif text-xl text-foreground mb-2 group-hover:text-primary boty-transition">
                        {collection.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {collection.description}
                      </p>
                      <div className="flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 boty-transition">
                        <span>Shop Collection</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Category Collections Grid */}
      <section className="px-4 pb-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-serif text-3xl text-foreground mb-8 animate-fade-in">
            Shop by Category
          </h2>
          
          {/* Featured Large Category - First Item */}
          {categories.length > 0 && (
            <div className="mb-12 animate-fade-in" style={{ animationDelay: "100ms" }}>
              <Link href={`/shop?category=${categories[0].slug}`}>
                <div className="relative overflow-hidden rounded-3xl bg-card boty-shadow group cursor-pointer">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    {/* Image */}
                    <div className="relative h-64 md:h-80 overflow-hidden bg-muted">
                      {categories[0].image && (
                        <Image
                          src={categories[0].image}
                          alt={categories[0].name}
                          fill
                          className="object-cover group-hover:scale-105 boty-transition"
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-8 md:p-12 flex flex-col justify-center">
                      <span className="text-sm font-medium text-primary mb-2 uppercase tracking-wide">
                        Featured Category
                      </span>
                      <h3 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                        {categories[0].name}
                      </h3>
                      <p className="text-foreground/70 mb-6 leading-relaxed">
                        {categories[0].description}
                      </p>
                      <div className="flex items-center gap-2 text-primary font-medium group-hover:gap-4 boty-transition">
                        <span>Explore Category</span>
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Secondary Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.slice(1).map((category, idx) => (
              <Link
                key={category.id}
                href={`/shop?category=${category.slug}`}
                className="group animate-fade-in"
                style={{ animationDelay: `${(idx + 1) * 80}ms` }}
              >
                <div className="relative overflow-hidden rounded-2xl bg-card boty-shadow hover:boty-shadow-lg boty-transition h-full">
                  {/* Image Container */}
                  <div className="relative h-56 overflow-hidden bg-muted">
                    {category.image && (
                      <Image
                        src={category.image}
                        alt={category.name}
                        fill
                        className="object-cover group-hover:scale-110 boty-transition"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 boty-transition" />
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="font-serif text-xl text-foreground mb-2 group-hover:text-primary boty-transition">
                      {category.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {category.description}
                    </p>
                    <div className="flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 boty-transition">
                      <span>Shop Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-card py-16 px-4">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-6">
            Can't decide?
          </h2>
          <p className="text-foreground/70 mb-8 text-lg">
            Browse our complete skincare collection to find the perfect products for your routine.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 boty-transition boty-shadow"
          >
            View All Products
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}
