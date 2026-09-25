import ProductCard from './ProductCard'
import type { Product } from '../hooks/useProducts'

type Props = {
  products: Product[]
  selectedIds: Set<string | number>
  maxSelected: number
  onToggle: (id: string | number) => void
}

export default function ProductGrid({ products, selectedIds, maxSelected, onToggle }: Props) {
  const full = selectedIds.size >= maxSelected
  return (
    <section className="product-grid" aria-label="Search results">
      {products.map((p) => {
        const selected = selectedIds.has(p.id)
        return (
          <ProductCard
            key={p.id}
            id={p.id}
            title={p.title}
            productType={p.productType}
            image={p.image}
            price={p.price}
            bestseller={p.bestseller}
            selected={selected}
            disabled={full && !selected}
            onToggle={onToggle}
          />
        )
      })}
    </section>
  )
}
