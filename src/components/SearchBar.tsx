type Props = {
  query: string
  onChange: (q: string) => void
  count: number
}

export default function SearchBar({ query, onChange, count }: Props) {
  return (
    <form
      className="search-bar"
      role="search"
      aria-label="Search products"
      onSubmit={(e) => e.preventDefault()}
    >
      <label htmlFor="product-search">Search products</label>
      <input
        id="product-search"
        name="product-search"
        type="search"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby="search-count"
        aria-label="Search products"
        placeholder="e.g. down, rain, fleece"
      />
      <div id="search-count" aria-hidden="true">
        {count} result{count === 1 ? '' : 's'}
      </div>
      {/* Offscreen live region for screen readers with query context */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {count} result{count === 1 ? '' : 's'}{query ? ` for ${query}` : ''}
      </div>
    </form>
  )
}

