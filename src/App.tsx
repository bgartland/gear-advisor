import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import './App.scss'
import SearchBar from './components/SearchBar'
import useProducts from './hooks/useProducts'
import ProductGrid from './components/ProductGrid'
import SelectionTray from './components/SelectionTray'
import { getRecommendation, type Recommendation } from './lib/getRecommendation'

const MAX_SELECTED = 3

function App() {
  const { products, status, error, retry } = useProducts()
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [adventure, setAdventure] = useState('')
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [recLoading, setRecLoading] = useState(false)
  const [recError, setRecError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => {
      const hay = [p.title, p.productType, p.description].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [products, query])

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedIds.has(p.id)),
    [products, selectedIds],
  )

  async function handleRecommend() {
    setRecLoading(true)
    setRecError(null)
    try {
      const result = await getRecommendation(selectedProducts, adventure)
      setRecommendation(result)
    } catch (err) {
      setRecError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setRecLoading(false)
    }
  }

  const handleToggle = useCallback((id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < MAX_SELECTED) next.add(id)
      return next
    })
  }, [])

  const handleDeselect = useCallback((id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  useEffect(() => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setSelectedIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => filtered.some((p) => p.id === id)))
      return next
    })

    return () => {
      abortRef.current?.abort()
    }
  }, [query, filtered])

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Gear Advisor</h1>
        <p className="tagline">Find the right layer for your next adventure.</p>
        <SearchBar query={query} onChange={setQuery} count={filtered.length} />
      </header>

      <main>
        {status === 'loading' && (
          <p className="status-message" role="status">
            Loading gear…
          </p>
        )}

        {status === 'error' && (
          <div className="status-message" role="alert">
            <span>Couldn't load products{error ? `: ${error}` : '.'}</span>
            <button type="button" className="btn" onClick={retry}>
              Try again
            </button>
          </div>
        )}

        {status === 'success' &&
          (filtered.length === 0 ? (
            <p className="status-message" role="status">
              No gear matches "{query}". Try a broader term like "jacket" or "fleece".
            </p>
          ) : (
            <ProductGrid
              products={filtered}
              selectedIds={selectedIds}
              maxSelected={MAX_SELECTED}
              onToggle={handleToggle}
            />
          ))}
      </main>

      <SelectionTray
        items={selectedProducts}
        max={MAX_SELECTED}
        adventure={adventure}
        onAdventureChange={setAdventure}
        onRecommend={handleRecommend}
        recommendation={recommendation}
        loading={recLoading}
        error={recError}
        onDeselect={handleDeselect}
      />
    </div>
  )
}

export default App
