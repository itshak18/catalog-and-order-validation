"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import { getAllCategories } from "@/lib/catalog"

export default function CollectionsPage() {
  const collections = getAllCategories()

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

      {/* Collections Grid */}
      <section className="px-4 pb-20">
        <div className="max-w-7xl mx-auto">
          {/* Featured Large Collection - First Item */}
          {collections.length > 0 && (
            <div className="mb-16 animate-fade-in" style={{ animationDelay: "100ms" }}>
              <Link href={`/shop?category=${collections[0].slug}`}>
                <div className="relative overflow-hidden rounded-3xl bg-card boty-shadow group cursor-pointer">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    {/* Image */}
                    <div className="relative h-64 md:h-96 overflow-hidden bg-muted">
                      {collections[0].image && (
                        <Image
                          src={collections[0].image}
                          alt={collections[0].name}
                          fill
                          className="object-cover group-hover:scale-105 boty-transition"
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-8 md:p-12 flex flex-col justify-center">
                      <span className="text-sm font-medium text-primary mb-2 uppercase tracking-wide">
                        Featured
                      </span>
                      <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
                        {collections[0].name}
                      </h2>
                      <p className="text-foreground/70 mb-8 leading-relaxed">
                        {collections[0].description}
                      </p>
                      <div className="flex items-center gap-2 text-primary font-medium group-hover:gap-4 boty-transition">
                        <span>Explore Collection</span>
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Secondary Collections Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {collections.slice(1).map((collection, idx) => (
              <Link
                key={collection.id}
                href={`/shop?category=${collection.slug}`}
                className="group animate-fade-in"
                style={{ animationDelay: `${(idx + 1) * 100}ms` }}
              >
                <div className="relative overflow-hidden rounded-2xl bg-card boty-shadow hover:boty-shadow-lg boty-transition h-full">
                  {/* Image Container */}
                  <div className="relative h-72 overflow-hidden bg-muted">
                    {collection.image && (
                      <Image
                        src={collection.image}
                        alt={collection.name}
                        fill
                        className="object-cover group-hover:scale-110 boty-transition"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 boty-transition" />
                  </div>

                  {/* Content Overlay */}
                  <div className="p-6">
                    <h3 className="font-serif text-2xl text-foreground mb-2 group-hover:text-primary boty-transition">
                      {collection.name}
                    </h3>
                    <p className="text-sm text-foreground/70 mb-4 line-clamp-2">
                      {collection.description}
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
