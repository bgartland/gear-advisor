# Gear Advisor

A small product discovery and recommendation widget built on real
[Cotopaxi](https://www.cotopaxi.com) jackets and layers. You can search the catalog, pick up to
three options, describe your trip in your own words, and get one recommendation with a short,
specific reason, the way a friendly gear expert in a shop would explain it.

My notes on decisions, AI tool usage, and the debugging question are in [NOTES.md](NOTES.md).

## Running it

You'll need Node 20 or newer (I built it with Node 24).

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build
npm run preview   # serve the production build
```

There's no backend, API key, or environment setup. The product data is a static file in `public/`.

## Using it

1. **Search** matches on the product name, type, and description, so "waterproof" finds shells
   even when the name doesn't say it. It matches from the start of a word and ignores
   apostrophes, so "womens" finds women's products and "mens" doesn't pull them in too.
2. **Select** up to 3 products by clicking a card (or tabbing to it and pressing Enter). They show
   up in a tray at the bottom, where you can remove them one at a time or hit **Clear all** to
   start over. Your picks stay in the tray while you keep searching, so you can compare
   products from different searches.
3. **Describe the adventure** in the tray, for example *"a rainy weekend hike, need to pack light"*,
   and press **Recommend**.
4. You get one pick, with its photo and a reason that says what it's good for and why it beat the
   other options.

The recommendation is a mock for now. It waits about a second and fails roughly 1 in 8 times on
purpose, so you can see the loading and retry states. If it fails, click **Try again**.

## Stack

- **Vite, React, and TypeScript.** This is a client-side widget with no server rendering,
  routing, or login, so Next.js would have added setup without adding anything useful.
- **SCSS**, with colors, type sizes, and spacing defined once as CSS variables.
- No UI or state libraries. Plain React state is plenty at this size.

## Project structure

```
public/products.json            30 curated Cotopaxi jackets and layers
src/
  App.tsx                       page state: search, selection, recommendation
  hooks/useProducts.ts          loads products, with loading / error / retry
  lib/getRecommendation.ts      the mock recommendation: scoring + the written reason
  components/
    SearchBar.tsx               labeled search box with a live result count
    ProductGrid.tsx             responsive grid of product cards
    ProductCard.tsx             a card that works as one big select button
    SelectionTray.tsx           bottom tray: your picks, the question, the result
  index.scss                    colors, type, spacing, base styles
  App.scss                      component styles
```

## Data

`public/products.json` has 30 real products from Cotopaxi's public product feed, simplified to
what the UI needs: name, type, price, image, description, and whether it's a bestseller. The live
feed blocks requests from the browser (CORS), so I saved a sample, which the assignment allows.

I kept it to **jackets and layers** on purpose. My first sample mixed packs, beanies, and pants,
and comparing a hip pack to a beanie doesn't give anyone a useful recommendation. Within one
category there's still real variety: down and synthetic insulation, fleece, rain shells, packable
windbreakers, and sun layers. The feed has about 90 distinct jackets and layers. I picked 30 that
cover every need with a mix of prices, styles, and bestsellers, and trimmed their descriptions
down to Cotopaxi's own product copy.

In a real product I'd generate this from the live feed with a small transform function instead of
hand-picking a snapshot, so it stays in sync with the actual catalog. I also dropped sizes and
colors, which is fine for helping someone choose, but a cart would need them.

## Key decisions

- **Search only, no category filter.** Search was required and filtering was optional, so I put
  the time into search and the recommendation.
- **Click the whole card to select, with a tray at the bottom.** It's the comparison pattern most
  shoppers already know from other stores. It's capped at 3.
- **One free-text question, answered like a friendly expert.** I wanted this to feel like asking
  a knowledgeable person in a gear shop, not like filling out a form or using a bolted-on AI
  feature. You describe the trip in your own words, and the answer is grounded in what the product
  descriptions actually say. It explains the pick the way a person would: what it's good for and
  why it beats the other option.
- **Picks are based on what the product actually offers.** A product ranks higher when it covers
  more of what you asked for, and stronger features count for more. A fully waterproof shell beats
  a water-resistant finish for a rainy trip, for example. Ties go to the bestseller, then the lower price.
- **Recommendations stay in sync with what you're looking at.** If you change the search or your
  selection, the old recommendation clears, and any request that's still loading is ignored when
  it comes back.
- **Built so an LLM can replace the mock.** The recommendation lives in one function that takes
  your selected products and your words and returns a pick with a reason. A real AI version could
  replace it without changing anything else.

## Known limitations

- The recommendation matches keywords. It handles synonyms, simple negatives like "little chance
  of rain", and phrases like "warm conditions", but it doesn't truly understand what you mean.
- There are no automated tests yet. I checked everything by hand and with scripted browser runs.
- Once 3 products are selected, the other cards are disabled, which also takes them out of the
  keyboard tab order.
- Old recommendation requests are ignored when they finish, but they aren't cancelled.
