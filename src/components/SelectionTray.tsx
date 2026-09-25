type Item = { id: string | number; title: string; image?: string }

type Props = {
  items: Item[]
  max: number
  onDeselect: (id: string | number) => void
}

export default function SelectionTray({ items, max, onDeselect }: Props) {
  if (!items.length) return null
  return (
    <aside className="selection-tray" aria-label="Selected products">
      <div className="tray-inner">
        <p className="tray-count" aria-live="polite">
          {items.length} of {max} selected
        </p>
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
      </div>
    </aside>
  )
}
