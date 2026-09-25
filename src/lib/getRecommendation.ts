import type { Product } from '../hooks/useProducts'

// V1: keyword-scored mock. The signature (products + free text in, { product, reason } out,
// async, can throw) is the contract a later LLM-backed version should keep, so callers
// don't change when the implementation does.

export type Recommendation = {
  product: Product
  reason: string
}

type CriterionKey = 'warmth' | 'weather' | 'sun' | 'packability'

type Criterion = {
  key: CriterionKey
  /** words in the shopper's text that signal this need (activities count, e.g. "ski") */
  triggers: string[]
  /** evidence in a product's text, weighted: 2 = strong (waterproof, down), 1 = weak (DWR, fleece) */
  features: Record<string, 1 | 2>
  /** what the shopper needs, e.g. "For packing light, ..." */
  need: string
  /** why the pick delivers it, as a clause */
  benefit: string
  /** why it beats another option on this criterion */
  edge: string
}

// All terms match at the start of a word, so "rain" also catches "rainy" and "pack"
// catches "packable", without "sun" matching inside unrelated words.
// Weights encode general gear knowledge (a seam-sealed shell beats a DWR finish in rain),
// not anything about specific products.
const CRITERIA: Criterion[] = [
  {
    key: 'warmth',
    triggers: ['warm', 'cold', 'freez', 'chill', 'winter', 'frigid', 'snow', 'ski', 'cozy', 'insulat', 'down', 'fleece', 'camp', 'bonfire', 'alpine'],
    features: { down: 2, insulat: 2, primaloft: 2, fill: 2, puffer: 1, fleece: 1, warm: 1, cozy: 1, winter: 1 },
    need: 'staying warm',
    benefit: "it'll actually hold heat when the temperature drops",
    edge: "it's the warmer of the two",
  },
  {
    key: 'weather',
    triggers: ['rain', 'wet', 'storm', 'wind', 'snow', 'shower', 'drizzl', 'weather', 'waterproof', 'damp', 'mist', 'coast', 'thunder'],
    features: { waterproof: 2, seam: 2, rain: 2, storm: 2, thunder: 2, '3l': 2, dwr: 1, 'water-resistant': 1, 'weather-resistant': 1, wind: 1, weather: 1, shower: 1, element: 1, snow: 1 },
    need: 'wet or windy weather',
    benefit: "it'll keep you dry when the weather turns",
    edge: "it'll handle wet, windy weather better",
  },
  {
    key: 'sun',
    triggers: ['sun', 'upf', 'uv', 'hot', 'heat', 'desert', 'bright', 'beach', 'tropic', 'summer', 'humid'],
    features: { upf: 2, uv: 2, sun: 1 },
    need: 'long hours in the sun',
    benefit: 'it keeps the sun off your skin without making you overheat',
    edge: 'it has real sun protection built in',
  },
  {
    key: 'packability',
    triggers: ['pack', 'light', 'ultralight', 'compact', 'carry', 'travel', 'small', 'backpack', 'minimal', 'flight'],
    features: { packs: 2, packable: 2, stow: 2, compact: 2, lightweight: 1, light: 1, ultralight: 1, travel: 1 },
    need: 'packing light',
    benefit: "it packs down small, so it won't eat up room in your bag",
    edge: 'it packs down smaller',
  },
]

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const wordStart = (term: string) => new RegExp(`\\b${escapeRegExp(term)}`, 'i')

const triggerMatchers = new Map(CRITERIA.map((c) => [c.key, c.triggers.map(wordStart)]))
const featureMatchers = new Map(
  CRITERIA.map((c) => [c.key, Object.entries(c.features).map(([term, weight]) => ({ re: wordStart(term), weight }))]),
)

function isActive(userText: string, criterion: Criterion): boolean {
  return triggerMatchers.get(criterion.key)!.some((re) => re.test(userText))
}

/** Sum of weights for the distinct feature terms found; 0 means no evidence. */
function strength(productText: string, criterion: Criterion): number {
  return featureMatchers.get(criterion.key)!.reduce((sum, { re, weight }) => (re.test(productText) ? sum + weight : sum), 0)
}

const priceFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

/** "Fuego Down Hooded Jacket - Men's" -> "Fuego Down Hooded Jacket" */
const shortName = (p: Product) => p.title.split(' - ')[0]

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

type Scored = {
  product: Product
  /** active criteria this product has any evidence for */
  matched: Criterion[]
  /** evidence strength per active criterion */
  strengths: Map<CriterionKey, number>
  total: number
}

// Most active criteria covered first, then strongest evidence overall;
// remaining ties go to a bestseller, then to the lower price.
function compare(a: Scored, b: Scored): number {
  if (b.matched.length !== a.matched.length) return b.matched.length - a.matched.length
  if (b.total !== a.total) return b.total - a.total
  if (!!b.product.bestseller !== !!a.product.bestseller) return b.product.bestseller ? 1 : -1
  return (a.product.price ?? Infinity) - (b.product.price ?? Infinity)
}

function writeReason(active: Criterion[], winner: Scored, runnerUp: Scored | undefined): string {
  const name = `the ${shortName(winner.product)}`
  const sentences: string[] = []
  let mentionedBestseller = false

  if (active.length === 0) {
    sentences.push(`Without knowing much about the trip, I'd start with ${name}.`)
    if (winner.product.bestseller) {
      sentences.push("It's one of Cotopaxi's best sellers, and it's the one I'd trust to cover the most situations.")
    } else if (winner.product.price != null) {
      sentences.push(`At ${priceFormat.format(winner.product.price)}, it's the easiest of these to say yes to.`)
    }
    return sentences.join(' ')
  }

  const needs = joinList(active.map((c) => c.need))
  if (winner.matched.length === 0) {
    sentences.push(`Honestly, none of these are built for ${needs}, but if I had to choose I'd lean toward ${name}.`)
  } else {
    sentences.push(`For ${needs}, I'd go with ${name}.`)
    const benefits = winner.matched.map((c) => c.benefit)
    sentences.push(`${benefits[0].charAt(0).toUpperCase()}${benefits[0].slice(1)}${benefits.length > 1 ? `, and ${joinList(benefits.slice(1))}` : ''}.`)
  }

  if (runnerUp) {
    const other = `the ${shortName(runnerUp.product)}`
    const edges = winner.matched.filter((c) => winner.strengths.get(c.key)! > (runnerUp.strengths.get(c.key) ?? 0))
    if (edges.length > 0) {
      sentences.push(`${other.charAt(0).toUpperCase()}${other.slice(1)} is a solid layer too, but I'd pick this one because ${joinList(edges.map((c) => c.edge))}.`)
    } else if (winner.product.bestseller && !runnerUp.product.bestseller) {
      sentences.push(`It's a close call with ${other}, but this one's a customer favorite, and there's usually a reason for that.`)
      mentionedBestseller = true
    } else if (winner.product.price != null && runnerUp.product.price != null && winner.product.price < runnerUp.product.price) {
      const diff = priceFormat.format(runnerUp.product.price - winner.product.price)
      sentences.push(`It's a close call with ${other}, but this one gets the job done for ${diff} less.`)
    } else {
      sentences.push(`It's a close call with ${other}. Honestly, you'd be happy with either.`)
    }
  }

  if (winner.product.bestseller && !mentionedBestseller) {
    sentences.push("It's also one of Cotopaxi's best sellers.")
  }

  return sentences.join(' ')
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function getRecommendation(products: Product[], userText: string): Promise<Recommendation> {
  await sleep(600 + Math.random() * 900)

  if (Math.random() < 0.12) {
    throw new Error("Couldn't get a recommendation right now.")
  }
  if (products.length === 0) {
    throw new Error('Select at least one product to get a recommendation.')
  }

  const active = CRITERIA.filter((c) => isActive(userText, c))
  const scored = products
    .map((product): Scored => {
      const text = `${product.title} ${product.description ?? ''}`
      const strengths = new Map(active.map((c) => [c.key, strength(text, c)]))
      return {
        product,
        strengths,
        matched: active.filter((c) => strengths.get(c.key)! > 0),
        total: [...strengths.values()].reduce((a, b) => a + b, 0),
      }
    })
    .sort(compare)

  const [winner, runnerUp] = scored
  return { product: winner.product, reason: writeReason(active, winner, runnerUp) }
}
