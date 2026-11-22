# Lounasapp Tampere: app plan

*Draft 1 · 22.11.2026 · data source: [lounaspaikat-tampere-tutkimus.md](lounaspaikat-tampere-tutkimus.md) + [places-geocoded.json](places-geocoded.json)*

---

## 1. What we're building

A phone-first web app for answering one question fast: **"Where are we going for lunch today?"**

The starting point is Kehräsaari (61.49557, 23.76366). The data covers ~150 lunch places in central Tampere.

### Design principles
1. **Two taps to a decision.** Pick a category (or press *Arvo paikka*) and you have an answer.
2. **Filters stay out of the way.** Group size and distance are always visible. Everything else lives behind a "Lisää suodattimia" sheet.
3. **Your own history matters.** Visit counts and notes shape sorting and the random pick, e.g. "we haven't been to Malika in 6 weeks".
4. **Good looking, not busy.** Big tappable category tiles, food photography or illustration, generous whitespace, smooth micro-animations.
5. **Works offline and loads instantly.** The place data is small (~150 records), so it ships with the app.

---

## 2. Core use cases

| # | As a… | I want to… | So that… |
|---|---|---|---|
| U1 | lunch group | tap a category (e.g. *Aasialainen*, *Kotiruoka*) | I see only matching places, nearest first |
| U2 | lunch group of 7 | set group size = 7 | places that can't seat us disappear |
| U3 | someone in a hurry | set max walk = 5 min | I see only what's close |
| U4 | undecided group | press **Arvo paikka** (random pick) | the app picks for us, respecting the filters |
| U5 | regular | tap **"Kävimme täällä"** | the visit counter goes +1 (with date) and no note is needed |
| U6 | regular | write a note or review (text + optional stars + quick tags) | we remember that "Biáng: big queue at 11:45, go early" |
| U7 | anyone | open a place card | I see price, lunch hours, what's included, group info, dietary options, my notes and visit count |
| U8 | anyone | see places on a map | I can judge the route, e.g. which side of the rapids |
| U9 | picky group | exclude categories or high "dislike risk" places | the random pick doesn't land on raw fish for the person who hates it |

---

## 3. Features

### 3.1 MVP (v1)

**Home screen (Etsi)**
- **Header:** "Lounas tänään" + date + a short status ("ma 23.11. · 112 paikkaa auki lounaalla").
- **Category grid:** large tiles with an icon or illustration and a count. Multi-select is allowed (e.g. *Thai* + *Vietnamilainen*).
- **Quick filter bar** (sticky):
  - 👥 group size stepper (1–20+)
  - 🚶 max walk (3 / 5 / 10 / 15 / any min)
  - 💶 max price (≤12 / ≤14 / ≤16 / any)
  - 🕐 "Auki nyt" toggle (open for lunch right now)
- **Big *Arvo paikka* button** (🎲), pinned at the bottom.
- **Result list** below the grid: place cards sorted by distance (default), price, "haven't been in a while" or rating.

**Place card (list item)**
- Name, category chips, walk time, price, today's lunch hours.
- Badges: *Buffet*, *Vegaani ok*, *Iso ryhmä ok*, *Jono*, *Klusteri*.
- A small **📋 icon button** on the card opens the lunch list directly, without opening the detail page first. It is shown only when the place has a lunch-list link.
- Personal row: "Käyty 7× · viimeksi 12.11." and the average of your own stars.

**Place detail**
- Hero image (or category illustration fallback), name, address, walk time, "Avaa reitti" (opens Google/Apple Maps walking directions).
- **Key facts:** price (+ student/pensioner/soup variants), lunch hours per weekday, format, what's included (salad, coffee, dessert…), group info (seats, booking rules), dietary options, dislike-risk reasons.
- **Big "Kävimme täällä +1" button.** Long-press or swipe on the history entry to undo.
- **Visit history:** dates, with an optional group size.
- **Notes:** list, newest first, with an *Add note* button. A note has free text, 1–5 stars (optional) and quick tags.
- **📋 Lounaslista button**, the most prominent link on the page. It opens the restaurant's lunch list directly in the browser.
  - The label depends on link quality: "Katso tämän viikon lounaslista" (weekly list), "Lounastiedot" (lunch info) or "Verkkosivu" (website only).
  - Prefer the restaurant's own page. Fall back to the mall page (Ratina/Koskikeskus) or an aggregator (lounaat.info, lounasmenu.fi).
  - With no link, the button is hidden.
  - Links come from [lunch-links.json](lunch-links.json).
- **Other links:** website, phone (tap to call), "Avaa reitti".
- "Tiedot tarkistettu 21.11.2026" + a "Ilmoita virheestä" link (stored locally in v1).

**Random pick (Arvonta)**
- Uses the current filters and categories.
- Short slot-machine / card-flip animation (~1.2 s), then the result card with **Mennään!** (logs a visit) and **Arvo uudelleen** (re-roll).
- Weighting (all adjustable in settings):
  - × 0.3 if visited within the last 7 days, × 0.6 within 14 days
  - × 1.0–1.5 by own star average
  - × 0 if the user has hidden the place
  - optional × 0.5 for dislike risk "H"
- Cluster places (Koskikeskus / Kauppahalli / Ratina) can be picked as **one** option ("Mennään Kauppahalliin, jokainen valitsee oman tiskin").

**Map (Kartta)**
- MapLibre GL with OSM-based tiles. Pins coloured by category. Kehräsaari is the home marker with 5 / 10 / 15 min walking rings.
- Tapping a pin opens a bottom-sheet card.

**Omat (my stuff)**
- Stats: most visited, total visits this month, "not visited in 30+ days", favourite categories.
- Hidden places, favourites ⭐.
- Export/import data as JSON (backup, or move to a new phone).

### 3.2 v1.1–v2 (after the MVP proves useful)
- **Shared group mode:** colleagues share notes and visit counts (needs a backend; see §6.3).
- **Group vote:** everyone gets a link, ticks or vetoes categories, and the app shows the intersection and a random pick from it.
- **Today's menu:** fetch daily lunch lists (lounaat.info, Compass/Sodexo JSON feeds, Ratina) and show "Tänään: Lihapullat, Kana-curry…" on cards.
- **Real walking times** via OSRM/GraphHopper, precomputed once per place.
- **Use my location** instead of Kehräsaari (optional).
- **Photos** on notes.
- **Admin/edit mode** to fix place data inside the app.
- **Notifications:** "Klo 10.45 – arvotaanko lounas?"

### 3.3 Out of scope (for now)
Table bookings, payments, delivery, and cities other than Tampere.

---

## 4. Categories (the main navigation)

Category is the primary entry point, so it needs to be **human**, not a raw cuisine taxonomy. Each place gets **1–3 categories** plus format tags.

| Category (FI) | Icon idea | Example places |
|---|---|---|
| Kotiruoka | 🥘 | Mummola, Kotilounas, Suoma, Ståhlberg, Myllärit |
| Buffet (any cuisine) | 🍽️ | Eflatun, Puisto, Semafori, Onni & Leo, Aitoleipä |
| Aasialainen (umbrella) | 🥢 | all below |
| – Thai & Lao | 🌶️ | Sayam9, Faasai, Pure Bite, Thai & Laos, Thai Golden Chang |
| – Kiina & nuudelit | 🍜 | Noodle Master, Biáng, Lam, Shanghai |
| – Vietnam | 🍲 | DinDín, Tötö, OBANH, What The Pho, Lie Mi |
| – Japani & sushi | 🍣 | Itsudemo ×2, Daiwo, Itsuyaki, Osaka, Natsu, Yatai Bimi Ramen, Aloha Ramen |
| – Korea | 🍗 | Seoul Good, Kim's Bap |
| Intia & Nepal | 🍛 | Malika, Toor Shahzada, Aama, Nanda Devi, Sher-E-Punjab, Subham |
| Välimeri & Lähi-itä | 🧆 | Eflatun, Onni & Leo, Zeytuun, Fafa's, Zafran |
| Burgerit | 🍔 | Friends & Brgrs, Boneless, Hamptown, Social, Ohana |
| Pizza & pasta | 🍕 | Via Tribunali, Classic Pizza, Uuno, Napoli, Fiorina |
| Kebab & grilli | 🥙 | Punjab Kebab, Etelän Kebab House, Galata |
| Bistro & ravintola | 🍷 | Koski, 2h+k, 4 Vuodenaikaa, Tampella, Tiiliholvi |
| Kasvis & vegaani | 🥗 | Gopal, Papu ja Pata, Green Hippo + "has vegan option" filter |
| Keitto & kevyt | 🥣 | Amurin Helmi, Moro, soup lunches |
| Klusterit | 🏬 | Koskikeskus, Kauppahalli, Ratina |

Secondary filters (in the "Lisää suodattimia" sheet):
- **Format:** buffet / plated / counter
- **Diet:** vegan, gluten-free, lactose-free, halal
- **Dislike risk:** hide H
- **Lunch until:** e.g. still serving at 14:00
- **Weekday:** e.g. "open on Monday"
- **Booking:** accepts lunch bookings
- **Verified only:** price checked ✔

---

## 5. Data model

All in TypeScript. Place data is **static seed data**, and user data (notes, visits) is stored separately, so seed updates never overwrite them.

```ts
type CategoryId =
  | 'kotiruoka' | 'buffet' | 'aasia' | 'thai' | 'kiina' | 'vietnam' | 'japani' | 'korea'
  | 'intia' | 'valimeri' | 'burger' | 'pizza' | 'kebab' | 'bistro' | 'vege' | 'keitto';

type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type TimeRange = { from: string; to: string };          // "10:30", "14:00"

interface Place {
  id: string;                       // "malika-aleksanterinkatu"
  name: string;
  address: string;
  lat: number; lon: number;
  distanceM: number;                // from Kehräsaari (air)
  walkMin: number;                  // estimate; later from routing
  clusterId?: 'koskikeskus' | 'kauppahalli' | 'ratina';
  categories: CategoryId[];         // 1–3, first = primary
  format: 'buffet' | 'plated' | 'salad_main' | 'soup' | 'by_weight' | 'counter';
  price: {
    lunch?: number;                 // main adult weekday price
    min?: number; max?: number;     // when a range
    student?: number; pensioner?: number; soup?: number;
    note?: string;                  // "kids 1 €/year"
  };
  includes: ('salad' | 'soup' | 'bread' | 'drink' | 'coffee' | 'dessert')[];
  lunchHours: Partial<Record<Weekday, TimeRange[]>>;
  group: {
    comfortMax: number;             // heuristic from research §4
    seats?: number;
    bookingRequiredFrom?: number;   // e.g. Onni & Leo: 8
    acceptsLunchBooking?: boolean;
    peakCrowding?: 'low' | 'medium' | 'high';
  };
  diet: ('vegan' | 'vegetarian' | 'gluten_free' | 'lactose_free' | 'halal')[];
  dislikeRisk: { level: 'L' | 'M' | 'H'; reasons: string[] };   // "spicy", "raw_fish", "vegan_only", "price"
  rating?: { value: number; count: number; source: string };
  links: {
    website?: string;
    lunchList?: string;               // direct link to the lunch list page
    lunchListQuality?: 'lunch_list' | 'lunch_info' | 'site';   // decides the button label
    lunchListSource?: 'own' | 'mall' | 'aggregator';
    lunchListCheckedAt?: string;      // ISO date of the last link check
    phone?: string;
  };
  image?: string;
  status: 'open' | 'verify' | 'closed';
  priceVerified: boolean;           // ✔ in the research doc
  verifiedAt: string;               // ISO date
}

interface Visit { id: string; placeId: string; date: string; groupSize?: number; }
interface Note  { id: string; placeId: string; date: string; text: string; stars?: 1|2|3|4|5; tags: string[]; }
interface UserPrefs { hidden: string[]; favourites: string[]; randomWeights: {...}; defaultFilters: {...}; }
```

Derived at runtime (not stored):
- `isOpenForLunchNow`
- `visitCount`
- `lastVisited`
- `myAvgStars`
- `daysSinceVisit`

### Data pipeline
1. `scripts/build-places.ts` converts the research doc tables and `places-geocoded.json` into **`src/data/places.json`**. This is a one-off semi-manual conversion, then hand-maintained.
2. `scripts/validate-places.ts` checks that ids are unique, coordinates are inside Tampere, categories are valid and hours are parseable. It runs in CI.
3. `scripts/check-links.ts` re-checks every lunch-list link weekly (scheduled CI job). It records the HTTP status and whether the page mentions lunch and current dates, and updates `lunchListQuality` and `lunchListCheckedAt`. A link that stops opening is flagged in the CI output so it can be fixed. This ports the Python checker already used for [lunch-links.json](lunch-links.json).
3. Include only places with `status: 'open'` or `'verify'` and a confirmed lunch. The ~35 unverified places in §2.8 b ship with a `verify` badge or are left out (decision D3).

---

## 6. Tech stack

### 6.1 Front end
| Concern | Choice | Why |
|---|---|---|
| Framework | **React 18 + TypeScript + Vite** | Fast dev loop, huge ecosystem |
| Styling | **Tailwind CSS** + **shadcn/ui** (Radix primitives) | Pretty, accessible components (sheets, dialogs, toggles) without a heavy UI kit |
| Animation | **Framer Motion** | Random-pick card flip, tile press effects, bottom sheets |
| Map | **MapLibre GL JS** + free OSM vector tiles (e.g. OpenFreeMap / MapTiler free tier) | No Google billing; matches the OSM data |
| Local storage | **Dexie.js** (IndexedDB) | Notes, visits, prefs; works offline; easy export |
| State | **Zustand** (filters/UI) + Dexie live queries | Small and simple |
| Routing | **React Router** (or TanStack Router) | 4–5 screens |
| PWA | **vite-plugin-pwa** | Install to home screen, offline |
| i18n | Simple `fi.ts` strings file (Finnish UI), English later | Data is Finnish anyway |
| Testing | **Vitest** + React Testing Library; **Playwright** for 3–4 e2e flows | |

### 6.2 Hosting (v1)
Static hosting: **Cloudflare Pages / Netlify / GitHub Pages**, free. No server needed for v1.

### 6.3 Backend (v2, only if shared group mode is wanted)
**Supabase** (Postgres + auth + row-level security) with `groups`, `members`, `notes` and `visits` tables. Local Dexie stays the cache, and sync happens on reconnect. Join a group through an invite link, with no passwords: magic link or anonymous + group code.

---

## 7. Visual design direction

- **Mood:** warm, appetising, a bit playful: "Nordic lunch café", not "corporate dashboard".
- **Colours:**
  - Warm off-white background (#FBF7F2), deep ink text (#1F2421).
  - Accent: **lingonberry red (#C8364A)** for primary actions (*Arvo paikka*, *Kävimme täällä*).
  - Secondary: **sage green (#7FA387)** for "open now" and vegan.
  - Each category gets a soft pastel tile colour.
  - **Dark mode** with the same hues, desaturated.
- **Typography:** a rounded geometric sans (e.g. *Plus Jakarta Sans* or *Nunito*) for UI, and a friendly display face (e.g. *Fraunces*) for the app name and category titles.
- **Category tiles:** 2-column grid with rounded 20 px corners, a large emoji or flat illustration, the category name and "12 paikkaa". The selected state gets a coloured border and a slight scale-up.
- **Cards:** image or illustration at the top, price as a pill badge, walk time with a 🚶 icon, and subtle shadow.
- **Random pick:** a full-screen sheet where 3–4 place cards shuffle (Framer Motion) and the winner flips to front. Confetti is optional.
- **Visit button:** satisfying tap, with a number bump animation ("7 → 8") and light haptics where supported.
- **Accessibility:** WCAG AA contrast, 44 px touch targets, `prefers-reduced-motion` turns off shuffles.
- **First deliverable:** 3 screen mockups (Home, Detail, Random) before coding the UI. See milestone M1.

### Navigation
Bottom tab bar with 4 tabs:
- **Etsi** (home/categories/list)
- **Kartta**
- **Arvo** (opens the random sheet directly)
- **Omat** (history, notes, stats, settings)

---

## 8. Project structure

```
lounasapp/
├─ docs/                      research + this plan
├─ scripts/                   build-places.ts, validate-places.ts
├─ public/                    icons, manifest, category illustrations
├─ src/
│  ├─ data/places.json        seed data (generated + hand-edited)
│  ├─ data/categories.ts      category ids, labels, icons, colours
│  ├─ db/                     Dexie schema, notes/visits repositories, export/import
│  ├─ domain/                 filters.ts, openingHours.ts, randomPick.ts, scoring.ts (pure, unit-tested)
│  ├─ state/                  filterStore.ts (Zustand)
│  ├─ components/             CategoryGrid, FilterBar, PlaceCard, VisitButton, NoteForm, RandomSheet, MapView…
│  ├─ screens/                Home, PlaceDetail, Map, Random, Mine, Settings
│  ├─ styles/                 tailwind.css, tokens
│  └─ i18n/fi.ts
├─ tests/e2e/                 Playwright
└─ package.json
```

The logic in `domain/` is pure functions (no React), so it's easy to test:
- `filterPlaces(places, filters, userData)`
- `isOpenForLunch(place, date)`
- `pickRandom(places, weights, rng)`, with an injectable rng for tests

---

## 9. Milestones

| # | Milestone | Contents | Done when |
|---|---|---|---|
| **M0** ✅ | Data | Build `places.json` from research (~110 lunch-confirmed places + clusters), validation script | `npm run validate` passes; every place has category, coordinates, lunch hours. **Done 22.11.2026:** 168 places (142 open, 26 verify), 135 with lunch-list links, 72 with verified prices. Source: `data/places.source.ts` → `npm run data`. |
| **M1** ✅ | Design | Design tokens + mockups of Home, Detail, Random (Figma or HTML prototype) | You approve the look. **Done 22.11.2026:** [mockups/index.html](mockups/index.html) (light + dark). |
| **M2** ✅ | Skeleton | Vite + React + TS + Tailwind + router + PWA + tab bar, deploys to static hosting | URL opens on a phone and installs. **Done 22.11.2026:** `npm run dev` / `npm run build`; Home (category grid + list), place detail with 📋 lunch-list button, placeholder tabs; 9 unit tests. Not yet deployed to a host. |
| **M3** ✅ | Browse | Category grid, quick filters, sorted list, place detail (read-only), 📋 lunch-list buttons | U1, U2, U3, U7 work; a lunch-list link opens from both the card and the detail page. **Done 22.11.2026:** quick chips (group, walk, price, open now) + "Lisää" sheet (format, diet, hide H-risk, verified prices, unverified places), 4 sort orders, filters remembered per phone, 20 unit tests. |
| **M4** ✅ | Personal data | Dexie, visit +1 with undo, notes with stars/tags, favourites/hidden, export/import | U5, U6 work and survive a reload. **Done 22.11.2026:** visit counter with undo toast + history, notes (stars, 8 quick tags, edit/delete with undo), ♥ favourites, hide/restore, card badges, "Vain suosikit" / "Näytä piilotetut" filters, "Käyty kauan sitten" sort, Omat screen (stats, lists, JSON backup export/import, delete all). 30 unit tests. |
| **M5** ✅ | Random | Weighted random pick + animation + "Mennään!" logs a visit + clusters as one option | U4, U9 work; unit tests for weights. **Done 22.11.2026:** Arvo screen auto-rolls on open, name shuffle + card flip, no immediate repeats, "Mennään!" logs a visit (undo) with confetti, lunch-list/route/details links on the result, 6 remembered settings (avoid recent, prefer liked, clusters as one, avoid divisive, lunch today only, skip unverified). 40 unit tests. |
| **M6** ✅ | Map | MapLibre map, pins, walking rings, bottom sheet | U8 works. **Done 22.11.2026:** OpenFreeMap tiles (no key), category-emoji pins following the current filters, one marker per cluster/building with a count, Kehräsaari home marker + 5/10/15 min rings, tap → sheet with place cards, "Näytä kartalla" deep link from place pages, map code lazy-loaded (separate 220 kB chunk). 45 unit tests. |
| **M7** ✅ | Polish | Dark mode, empty states, reduced motion, Lighthouse ≥ 90, e2e tests | Ready for daily use. **Done 22.11.2026:** AA colour contrast fixes, focus rings, theme switch (auto/light/dark) without flash, crash fallback screen, screens lazy-loaded (first download 177 → 133 kB gz), PNG + maskable app icons, robots.txt, 6 Playwright e2e tests (`npm run e2e`). Lighthouse (mobile): Performance 97, Accessibility 100, Best practices 100, SEO 91. |
| v2 | Shared | Supabase groups, shared notes/visits, group vote | Several phones see the same counters |
| v2 | Menus | Daily menu fetch (Compass/Sodexo JSON, lounaat.info), routing walk times | "Tänään" line on cards |

M0–M5 is a usable app. M6–M7 makes it nice.

---

## 10. Testing

- **Unit (Vitest):**
  - opening-hours parsing (weekday ranges, Mon closed, Tue–Fri only)
  - filters (group size, walk time, price, open now)
  - random weights (recently visited is down-weighted; hidden is never picked; a seeded RNG gives a deterministic result)
- **Component:**
  - VisitButton increments and undoes
  - NoteForm validates
- **E2E (Playwright, mobile viewport):**
  - pick *Aasialainen* + group 6 + 10 min, then open a card
  - random pick, then "Mennään!", then the visit count goes up
  - add a note, reload, the note persists
  - export, then import

---

## 11. Open decisions

| # | Question | Default if not decided |
|---|---|---|
| D1 | **Personal or shared?** Notes and visit counts per phone, or shared by the whole lunch group? | ✅ **Decided 22.11.2026: personal first.** v1 stores data locally on each phone (IndexedDB) with JSON export/import. The data model uses ids and dates so v2 can add Supabase sync without migration pain. |
| D2 | Platform: web app (PWA) or native app store app? | PWA. One codebase, no store review, installable on iOS/Android |
| D3 | Show the ~35 "unverified" places (no lunch info) or hide them? | Show them with a "tarkista" badge, excluded from random by default |
| D4 | UI language: Finnish only, or Finnish + English? | Finnish, with strings in one file for later English |
| D5 | Photos: our own, the restaurants' (needs permission), or illustrations? | Category illustrations (no copyright issues) |
| D6 | Starting point: always Kehräsaari, or the phone's location? | Kehräsaari, with an optional "use my location" toggle in v1.1 |
