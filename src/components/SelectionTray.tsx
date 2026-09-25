import type { Recommendation } from '../lib/getRecommendation'

type Item = { id: string | number; title: string; image?: string }

type Props = {
  items: Item[]
  max: number
  adventure: string
  onAdventureChange: (text: string) => void
  onRecommend: () => void
  recommendation: Recommendation | null
  loading: boolean
  error: string | null
  onDeselect: (id: string | number) => void
  onClearAll: () => void
}

export default function SelectionTray({
  items,
  max,
  adventure,
  onAdventureChange,
  onRecommend,
  recommendation,
  loading,
  error,
  onDeselect,
  onClearAll,
}: Props) {
  if (!items.length) return null
  return (
    <aside className="selection-tray" aria-label="Selected products">
      <div className="tray-inner">
        <div className="tray-header">
          <p className="tray-count" aria-live="polite">
            {items.length} of {max} selected
          </p>
          <button type="button" className="btn-link" onClick={onClearAll}>
            Clear all
          </button>
        </div>
        <ul className="tray-items">
          {items.map((it) => (
            <li className="tray-item" key={it.id}>
              <img src={it.image} alt="" />
              <div className="tray-meta">
                <span className="tray-title">{it.title}</span>
                <button type="button" className="btn-link" aria-label={`Remove ${it.title}`} onClick={() => onDeselect(it.id)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
        <form
          className="adventure-form"
          onSubmit={(e) => {
            e.preventDefault()
            onRecommend()
          }}
        >
          <div className="adventure-field">
            <label htmlFor="adventure-input">What's the adventure?</label>
            <input
              id="adventure-input"
              type="text"
              value={adventure}
              onChange={(e) => onAdventureChange(e.target.value)}
              placeholder="e.g. a rainy weekend hike, need to pack light"
              autoComplete="off"
            />
          </div>
          <button type="submit" className="btn" disabled={loading} aria-busy={loading}>
            Recommend
          </button>
          {loading && <span className="spinner" role="status" aria-label="Finding a recommendation" />}
        </form>

        <div aria-live="polite">
          {error && (
            <div className="rec-error" role="alert">
              <span>{error}</span>
              <button type="button" className="btn-link" onClick={onRecommend}>
                Try again
              </button>
            </div>
          )}
          {recommendation && (
            <div className="recommendation">
              {/* decorative: the product name is right next to it */}
              <img className="rec-image" src={recommendation.product.image} alt="" />
              <div className="rec-body">
                <span className="recommended-label">Recommended</span>
                <p className="rec-title">{recommendation.product.title}</p>
                <p className="rec-reason">{recommendation.reason}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
