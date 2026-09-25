import { useState, useMemo, useRef, useCallback } from 'react'
import './App.scss'
import SearchBar from './components/SearchBar'
import useProducts from './hooks/useProducts'
import ProductGrid from './components/ProductGrid'
import SelectionTray from './components/SelectionTray'
import { getRecommendation, type Recommendation } from './lib/getRecommendation'
import type { Product } from './hooks/useProducts'

const MAX_SELECTED = 3

// Apostrophes are dropped so "womens" finds "Women's" (the feed uses both ' and ’).
const normalize = (s: string) => s.toLowerCase().replace(/['’]/g, '')

function matchesQuery(p: Product, query: string): boolean {
  const q = normalize(query.trim())
  if (!q) return true
  const text = normalize([p.title, p.productType, p.description].filter(Boolean).join(' '))
  // Match from the start of a word, so "men" doesn't also match inside "women".
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}`).test(text)
}

function App() {
  const { products, status, error, retry } = useProducts()
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [adventure, setAdventure] = useState('')
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [recLoading, setRecLoading] = useState(false)
  const [recError, setRecError] = useState<string | null>(null)

  const filtered = useMemo(() => products.filter((p) => matchesQuery(p, query)), [products, query])

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedIds.has(p.id)),
    [products, selectedIds],
  )

  // Each request takes a new id; only the latest one may touch state. Without this,
  // a slow earlier response could overwrite a newer result, or flip loading off
  // while the newer request is still running.
  const recRequestIdRef = useRef(0)

  // A recommendation only describes the exact search + selection it was made for, so any
  // change to either clears it. Bumping the id also drops any response still in flight.
  const resetRecommendation = useCallback(() => {
    recRequestIdRef.current++
    setRecommendation(null)
    setRecError(null)
    setRecLoading(false)
  }, [])

  async function handleRecommend() {
    const id = ++recRequestIdRef.current
    setRecLoading(true)
    setRecError(null)
    try {
      const result = await getRecommendation(selectedProducts, adventure)
      if (id === recRequestIdRef.current) setRecommendation(result)
    } catch (err) {
      if (id === recRequestIdRef.current) {
        setRecError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    } finally {
      if (id === recRequestIdRef.current) setRecLoading(false)
    }
  }

  function handleQueryChange(next: string) {
    setQuery(next)
    // The tray is a comparison list the shopper builds while browsing, so picks stay
    // put across searches. The recommendation still clears: it was made for the old search.
    resetRecommendation()
  }

  const handleToggle = useCallback(
    (id: string | number) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else if (next.size < MAX_SELECTED) next.add(id)
        return next
      })
      resetRecommendation()
    },
    [resetRecommendation],
  )

  function handleClearAll() {
    setSelectedIds(new Set())
    setAdventure('')
    resetRecommendation()
    // the tray (and the button that had focus) disappears, so hand focus back to the top
    document.getElementById('product-search')?.focus()
  }

  const handleDeselect = useCallback(
    (id: string | number) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      resetRecommendation()
    },
    [resetRecommendation],
  )

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Gear Advisor</h1>
        <p className="tagline">Find the right layer for your next adventure.</p>
        <SearchBar query={query} onChange={handleQueryChange} count={filtered.length} />
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
        onClearAll={handleClearAll}
      />
    </div>
  )
}

export default App
