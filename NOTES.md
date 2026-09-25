# Notes

## Tools used

- **Claude Code** (in VS Code) for the whole build: setup, components, the recommendation mock,
  styling, and scripted browser checks at phone and desktop widths.
- I thought through the requirements first, developed a plan, and then worked through it with
  Claude step by step, reviewing and testing each piece before moving on.

**Representative prompt**

> Write an async getRecommendation(products, userText) mock. Detect which criteria the user's
> input activates (multiple can be active at once), score each product by how many active
> criteria its title+description matches against these keyword groups: [warmth, weather
> protection, sun protection, packability]. Highest score wins; if no criteria are active, or
> there's a tie, break it by preferring a product with bestseller: true, then by lowest price.
> Return { product, reason } where reason names the specific matched criteria and mentions
> bestseller status when relevant. This must work generically against any product's description
> text, not be tuned to specific products. Add a 10–15% random chance of throwing, and a random
> 600–1500ms delay. […] This is V1 of a feature that will later use an LLM, so the reason should
> read like a genuine gear expert at REI.

## AI output I checked, changed, or rejected

**1. The product loader was quietly throwing away half the data.** The AI-written loading hook
looked for Shopify's raw field names, but my product file already used simpler names. So in the
running app every product was missing its description and bestseller flag. Search only matched
names, recommendations only looked at names, and "Bestseller" never showed up. The code looked
reasonable and passed type checking, so it would have been easy to miss. It came up during a
browser check when the live app recommended a different jacket than the same function picked when
run directly against the data. I fixed the hook to read the right fields. The takeaway for me:
check AI output in the running app, not just in the code.

**2. The recommendation misread a real prompt.** I typed *"A camping trip with warm conditions
little chance of rain need spf"* with a down parka, a sun hoodie, and a rain jacket selected, and
it recommended the **down parka** "for staying warm and wet or windy weather." That's the
opposite of what I asked for:

- "warm conditions" was read as *I need warmth*, when it describes the weather
- "little chance of rain" was read as *I need rain protection*, because it ignored the "little chance"
- "spf" wasn't recognized as sun protection at all

I changed the matching so "warm conditions" points toward sun protection, words like "no",
"little", and "without" cancel the need that follows them (while "a little chilly" still counts
as chilly), and "spf" and "sunscreen" count as sun. The same prompt now picks the sun hoodie.

A similar issue came up earlier. The first version recommended a down jacket over a fully
waterproof shell for a rainy hike, because it treated a light water-resistant coating the same as
waterproofing and then picked the cheaper one. That's why stronger features now count for more.

## UI decision and tradeoff

**One open question, no quick-start chips.** I considered adding chips (Warmth, Rain, Sun,
Packable) under the "What's the adventure?" box as a backup in case typed answers didn't match
well. I decided against them. The better fix was making the matching understand more ways of
saying things, and a row of chips would have made it feel like a form, not a conversation with
someone who knows gear.
**Tradeoff:** an unusual phrase like "it'll be scorching" can still miss, and there's no
one-click fallback. I was okay with that for a first version, and an LLM would close that gap.

I also **narrowed the catalog to jackets and layers.** My first sample mixed packs, beanies, and
pants, and comparing a hip pack to a beanie doesn't help anyone decide. The tradeoff is that
it shows a smaller slice of the store.

## How I checked the main flow and edge cases

- **Phone and desktop:** had Claude run scripted browser checks at 375px and 1280px wide. Products
  load, cards show type, bestseller, and price, and nothing scrolls sideways, with or without a
  recommendation showing.
- **Keyboard:** tabbed through the search box, cards, Remove buttons, the question box, and
  Recommend. Each one shows a clear focus outline.
- **No results:** searching "zzz" shows a friendly empty message.
- **Selection limit:** after 3 picks the other cards are disabled, and removing one still works.
- **Recommendation quality:** tried about a dozen prompts against the real products (rainy and
  packing light, freezing ski trip, desert sun, "not cold but rainy", "a little chilly at night",
  a vague prompt, a prompt none of the products fit) and read every answer to make sure it made sense.
- **Failures:** the mock fails about 1 in 8 times on purpose, and it shows the error with **Try
  again**. I also forced the product file to fail to load and confirmed the retry recovers.
- **Staying in sync:** asked for a recommendation and then changed the search, changed the
  selection, or hit Clear all before it came back. In each case the late result never showed up,
  and when I asked again, the result matched what was actually selected.
- **Loading:** slowed the product file down to confirm the "Loading gear…" state shows before
  the products appear.
- **Build:** the production build and type check pass, and the linter is clean.

## What's unfinished

- **Automated tests.** The first one I'd write is the overlapping-requests case from the debugging
  question: start two requests, let the newer one finish first, and make sure its result is the
  one that sticks.
- **Cancelling old requests.** Right now outdated requests are ignored when they finish, but
  they still run. Once this is a real network call, I'd cancel them properly.
- **Smarter recommendations.** Keyword matching has a ceiling. It can't really understand
  what someone means. The next step is an LLM behind the same function, taking the selected
  products and the shopper's words and returning a pick with a reason, so the rest of the app
  wouldn't change.
- **Accessibility polish.** Disabled cards drop out of the tab order. I'd rather keep them
  reachable and add a hint like "remove one to swap."
- **Tray size on phones.** With a recommendation showing, the tray covers about 70% of a phone
  screen. It's readable, but a collapsible tray would be better.
- **Live data.** Replace the hand-picked product file with a transform over the real feed.

**Time spent:** about an hour and a half. The extra time went into switching the catalog to one
category, fixing the recommendation matching after testing it with real prompts, and some final
polish.

## Debugging question

```js
async function recommend(products) {
  setLoading(true);
  try {
    const result = await getRecommendation(products);
    setRecommendation(result);
  } finally {
    setLoading(false);
  }
}
```

**Why it happens.** Each call runs on its own, and nothing checks whether its answer is still the
one the shopper cares about. Request A starts, the search changes, and request B starts. B
finishes first and shows correctly. When A finally finishes, it still calls `setRecommendation`
and overwrites B's newer result with its old one. The code shows results in the order they
*finish*, not the order they were *asked for*.

**How I'd fix it.** Give every request a number and only let the latest one update the screen.
This is what the app does in `App.tsx`:

```ts
const requestIdRef = useRef(0)

async function recommend(products) {
  const id = ++requestIdRef.current
  setLoading(true)
  try {
    const result = await getRecommendation(products)
    if (id === requestIdRef.current) setRecommendation(result)
  } catch (err) {
    if (id === requestIdRef.current) setError(err)
  } finally {
    if (id === requestIdRef.current) setLoading(false)
  }
}
```

Changing the search also bumps the number, so a request that's still running is outdated right
away, even if the shopper never asks again. Cancelling the request with an `AbortController`
would be the more complete fix, since it stops the work too, but the request-number check gets
the same correct result with less code for this scope.

**How I'd verify it.** By hand: ask for a recommendation, change the search before the spinner
stops, and make sure nothing appears. Then ask for A, change the search, ask for B, and make sure
the screen ends on B. As an automated test: use fake timers to give A a long delay and B a short
one, let B finish and then A, and check that B's result is showing and the spinner is off.

I also tested the fix by hand and with scripted browser checks: request a recommendation, then change
the search, change the selection, or hit Clear all before it comes back. The late result never
appeared, and the spinner and error cleared right away. Asking again gave a result that matched
what was selected.

**What else goes wrong with the loading indicator.** The original code turns the spinner off
whenever *any* request finishes. If requests overlap, the older one finishing hides the spinner
while the newer one is still running, so it looks done when it isn't. Its outdated result also
flashes on screen until the newer one replaces it. An
old request that fails could also show an error that no longer applies. That's why the fix checks the request number
before updating the spinner and the error too, not just the recommendation.
