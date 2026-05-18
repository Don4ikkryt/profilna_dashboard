# Design: Analytics Tab, Ukrainian Map Tiles, Trigram Search

**Date:** 2026-05-18  
**Project:** Профільні академічні ліцеї України (index.html dashboard)

---

## Overview

Three independent features added to the existing pure-frontend dashboard (HTML/CSS/JS, Leaflet, Chart.js, PapaParse, no build system):

1. **Trigram search** in the lyceum name filter
2. **Ukrainian map tiles** replacing CARTO light
3. **Analytics tab** in the header with charts for all data

---

## Feature 1: Trigram Search for Lyceum Filter

### Problem

Current search in `renderLyceumList()` uses `l.name.toLowerCase().includes(q)` — requires exact substring match. Partial words from the middle, typos, or alternate spellings yield no results.

### Solution

Client-side trigram index built once at load time. Each lyceum name is split into overlapping 3-character windows. At query time, the query's trigrams are compared against each lyceum's set, yielding a score 0–1. Results are filtered by a threshold (0.2) and sorted by descending score.

### Implementation

**New function `buildTrigramIndex(lyceums)`** — called once in `app.js` after `loadData()` resolves. Stores a `Map<id, Set<trigram>>` in module scope.

**Helper `trigramScore(lyceum, query)`** — returns intersection size divided by query trigram count.

**Modified `renderLyceumList()`** — when `_lyceumSearchQuery` is non-empty, use trigram scoring instead of `includes`. When empty, existing alphabetical sort unchanged.

**Scope:** ~25 lines added to `filters.js`. No new dependencies.

**Edge cases:**
- Query shorter than 3 chars → fall back to `includes` (trigrams need at least 3 chars)
- Empty query → show all, sorted alphabetically (unchanged)

---

## Feature 2: Ukrainian Map Tiles

### Problem

Current tile provider is CARTO `light_all` which renders place names in Latin/English. Ukrainian users expect Cyrillic labels.

### Solution

Switch to standard OpenStreetMap tiles. OSM renders place names in the local language of the country — for Ukraine this means Cyrillic throughout.

### Change

Single line in `map.js:79`:

```js
// Before
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '...',
  subdomains: 'abcd',
  maxZoom: 19
})

// After
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19
})
```

Visual difference: OSM tiles are slightly more detailed and darker than CARTO light, but remain readable with the existing pie markers and GeoJSON overlays.

---

## Feature 3: Analytics Tab

### Navigation

The header badge `Показано: N з N ліцеїв` (id `header-count`) is replaced with two tab buttons:

```html
<button class="header-tab active" data-tab="map">Карта</button>
<button class="header-tab" data-tab="analytics">Аналітика</button>
```

Clicking "Аналітика" hides `.map-container`, shows `#analytics-panel`. The sidebar with filters remains visible but **does not affect analytics** — it always shows statistics for all lyceums regardless of current filter state.

### Analytics Panel Layout

```
┌─ Stat cards (4 inline) ──────────────────────────────────┐
│  149 ліцеїв  │  47 з пансіоном  │  12 гірських  │  38 єдиних │
└──────────────────────────────────────────────────────────┘

┌─ Розподіл по областях (full width) ──────────────────────┐
│  Horizontal bar chart, sorted descending, 25 oblasts     │
└──────────────────────────────────────────────────────────┘

┌─ Кластери ────────────────┐  ┌─ Місто / Село ────────────┐
│  Doughnut, 3 sectors      │  │  Doughnut, 2 sectors      │
│  colors match map markers │  │  міська / сільська        │
└───────────────────────────┘  └───────────────────────────┘

┌─ Учнів по кластерах ──────┐  ┌─ Форми навчання ──────────┐
│  Vertical bar, 3 columns  │  │  Horizontal bar           │
│  sum of studentCount      │  │  sorted descending        │
└───────────────────────────┘  └───────────────────────────┘
```

### Stat Cards

| Card | Source |
|---|---|
| Всього ліцеїв | `allLyceums.length` |
| З пансіоном | `filter(l => l.hasBoarding).length` |
| Гірські | `filter(l => l.isMountain).length` |
| Єдиний ліцей у громаді | `filter(l => l.isOnlyLyceum).length` |

### Charts

| Chart | Type | Data source |
|---|---|---|
| Розподіл по областях | Horizontal bar | `group by oblast`, sorted desc |
| Кластери | Doughnut | existing `CLUSTER_LABELS` keys + count |
| Місто / Село | Doughnut | `locality.includes('місь')` vs `includes('сіл')` |
| Учнів по кластерах | Vertical bar | `profiles[].studentCount` summed by cluster |
| Форми навчання | Horizontal bar | `group by educationForm`, sorted desc |

Chart colors reuse `CONFIG.CLUSTER_COLORS` where applicable for visual consistency with the map.

### Files Changed

- `index.html` — replace `header-count` badge with tab buttons; add `#analytics-panel` div with canvas elements; add Chart.js CDN script tag
- `js/charts.js` — expand with oblast, locality, students-per-cluster, tab-switch logic; rename `updateCharts` → called on tab open with `allLyceums`
- `css/style.css` — tab button styles, analytics panel grid layout, stat card styles
- `js/app.js` — call `buildTrigramIndex` after data load; wire tab switching

### Data flow

```
loadData() → allLyceums
             ↓
         buildTrigramIndex()   ← trigram index built once
             ↓
         [tab: Карта]          ← existing map flow unchanged
         [tab: Аналітика]      → renderAnalytics(allLyceums) → updateCharts()
```

---

## Out of Scope

- No server-side changes (pure frontend)
- No changes to `lyceum.html` detail page
- No changes to GeoJSON files
- Minority languages stat card excluded (too few data points to be informative)
