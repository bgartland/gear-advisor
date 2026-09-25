import { memo } from 'react'

type Props = {
  id: string | number
  title: string
  productType?: string
  image?: string
  price?: number
  bestseller?: boolean
  selected: boolean
  disabled: boolean
  onToggle: (id: string | number) => void
}

const priceFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function ProductCard({ id, title, productType, image, price, bestseller, selected, disabled, onToggle }: Props) {
  return (
    <button
      type="button"
      className={`product-card${selected ? ' selected' : ''}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onToggle(id)}
    >
      <img src={image} alt="" className="thumb" loading="lazy" />
      {selected && (
        <span className="check" aria-hidden="true">
          ✓
        </span>
      )}
      <span className="meta">
        {productType && <span className="type">{productType}</span>}
        <span className="title">{title}</span>
        {bestseller && <span className="bestseller">Bestseller</span>}
        {price != null && <span className="price">{priceFormat.format(price)}</span>}
      </span>
    </button>
  )
}

export default memo(ProductCard)
