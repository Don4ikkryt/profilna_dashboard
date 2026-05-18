# Analytics Tab, Ukrainian Map Tiles & Trigram Search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add trigram-based search to the lyceum name filter, switch the map base layer to Ukrainian-label OSM tiles, and add an Analytics tab to the header that shows stat cards and 5 charts for all lyceum data.

**Architecture:** Pure frontend (no build system). Three independent features: (1) one-line tile URL swap in `map.js`; (2) trigram index built at load time in `filters.js`, used in `renderLyceumList`; (3) analytics tab adds `#analytics-panel` to the layout alongside `.map-container`, switching via JS — `charts.js` is fully rewritten to 5 charts + stat card logic, `app.js` gains `initTabs()`.

**Tech Stack:** Vanilla JS, Leaflet 1.9.4, Chart.js 4.4.0 (added via CDN), PapaParse 5.4.1, no build tools.

---

## File Map

| File | Action |
|---|---|
| `js/map.js` | Modify: change tile URL (line 79) |
| `js/filters.js` | Modify: add trigram functions before `renderLyceumList`, rewrite `renderLyceumList` |
| `js/app.js` | Rewrite: add `initTabs`, call `buildTrigramIndex` + `initCharts` + `initTabs` |
| `index.html` | Modify: replace header badge with tabs, add analytics panel with canvases, add Chart.js CDN, remove MutationObserver block |
| `css/style.css` | Modify: add tab + analytics panel styles, update `.chart-wrap` height |
| `js/charts.js` | Rewrite: 5 charts + `updateStatCards` + `renderAnalytics` |

---

## Task 1: Ukrainian map tiles

**Files:**
- Modify: `js/map.js:79–83`

- [ ] **Step 1: Replace tile URL**

In `js/map.js`, replace lines 79–83:

```js
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);
```

with:

```js
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19
}).addTo(map);
```

- [ ] **Step 2: Verify in browser**

Open `index.html` via a local server. Zoom into Ukraine — city names and streets should appear in Cyrillic. No JS errors in console.

- [ ] **Step 3: Commit**

```bash
git add js/map.js
git commit -m "feat: switch map tiles to OpenStreetMap for Ukrainian labels"
```

---

## Task 2: Trigram search for lyceum filter

**Files:**
- Modify: `js/filters.js`
- Modify: `js/app.js` (Step 3 only — save the full `app.js` rewrite for Task 5)

- [ ] **Step 1: Add trigram module variables and functions to `js/filters.js`**

After line 18 (`let _lyceumSearchQuery = '';`), insert:

```js
let _trigramIndex = new Map(); // id → Set<trigram>

function makeTrigrams(str) {
  const s = str.toLowerCase().replace(/\s+/g, ' ').trim();
  const tris = new Set();
  for (let i = 0; i <= s.length - 3; i++) tris.add(s.slice(i, i + 3));
  return tris;
}

function buildTrigramIndex(lyceums) {
  _trigramIndex.clear();
  lyceums.forEach(l => _trigramIndex.set(l.id, makeTrigrams(l.name)));
}

function trigramScore(lyceum, query) {
  const qTris = makeTrigrams(query);
  if (qTris.size === 0) return 0;
  const lTris = _trigramIndex.get(lyceum.id);
  if (!lTris) return 0;
  let hits = 0;
  qTris.forEach(t => { if (lTris.has(t)) hits++; });
  return hits / qTris.size;
}
```

- [ ] **Step 2: Rewrite `renderLyceumList` in `js/filters.js`**

Replace the entire `renderLyceumList` function (lines 159–183) with:

```js
function renderLyceumList() {
  const container = document.getElementById('filter-lyceum-list');
  if (!container) return;
  const q = _lyceumSearchQuery.toLowerCase().trim();
  const pool = getLyceumPool();

  let visible;
  if (!q) {
    visible = pool;
  } else if (q.length < 3) {
    visible = pool.filter(l => l.name.toLowerCase().includes(q));
  } else {
    visible = pool
      .map(l => ({ lyceum: l, score: trigramScore(l, q) }))
      .filter(({ score }) => score >= 0.2)
      .sort((a, b) => b.score - a.score)
      .map(({ lyceum }) => lyceum);
  }

  container.innerHTML = '';
  if (visible.length === 0) {
    container.innerHTML = '<div class="multiselect-empty">Нічого не знайдено</div>';
    return;
  }
  visible.forEach(l => {
    const label = document.createElement('label');
    label.className = 'multiselect-option';
    const checked = state.lyceums.includes(l.id) ? 'checked' : '';
    label.innerHTML = `<input type="checkbox" data-lyceum value="${l.id}" ${checked}> ${l.name}`;
    label.querySelector('input').addEventListener('change', cb => {
      if (cb.target.checked) { if (!state.lyceums.includes(l.id)) state.lyceums.push(l.id); }
      else { state.lyceums = state.lyceums.filter(id => id !== l.id); }
      updateMultiselectLabel('dd-lyceum', state.lyceums, 'Всі заклади');
      applyFilters();
    });
    container.appendChild(label);
  });
}
```

- [ ] **Step 3: Add `buildTrigramIndex` call to `js/app.js`**

In the existing `init()` function in `js/app.js`, after `allLyceums = lyceums;` (line 28), add:

```js
buildTrigramIndex(lyceums);
```

- [ ] **Step 4: Verify in browser**

Open `index.html`. Open the "Заклад" dropdown and test:
- Type `"харьків"` → finds Харківські ліцеї despite wrong spelling
- Type `"академіч"` → finds ліцеї з "Академічний" у назві
- Type `"лі"` (2 chars, < 3) → substring fallback, shows matching results
- Clear input → all lyceums in alphabetical order

- [ ] **Step 5: Commit**

```bash
git add js/filters.js js/app.js
git commit -m "feat: trigram search for lyceum name filter"
```

---

## Task 3: Analytics panel HTML

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace header badge with tab buttons**

In `index.html`, replace:

```html
<div class="header-badge" id="header-count">Завантаження…</div>
```

with:

```html
<div class="header-tabs">
  <button class="header-tab active" data-tab="map">Карта</button>
  <button class="header-tab" data-tab="analytics">Аналітика</button>
</div>
```

- [ ] **Step 2: Add analytics panel to layout**

After `</div><!-- /map-container -->` (line 229), before `</div><!-- /layout -->`, insert:

```html
<!-- ── Analytics panel ──────────────────────── -->
<div id="analytics-panel" class="analytics-panel hidden">

  <div class="analytics-stats">
    <div class="stat-card">
      <div class="stat-value" id="stat-total">—</div>
      <div class="stat-label">Всього ліцеїв</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" id="stat-boarding">—</div>
      <div class="stat-label">З пансіоном</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" id="stat-mountain">—</div>
      <div class="stat-label">Гірські</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" id="stat-only">—</div>
      <div class="stat-label">Єдиний у громаді</div>
    </div>
  </div>

  <div class="analytics-grid">
    <div class="analytics-chart analytics-chart--wide">
      <h3 class="chart-title">Розподіл по областях</h3>
      <div class="chart-wrap chart-wrap--tall"><canvas id="chart-oblast"></canvas></div>
    </div>
    <div class="analytics-chart">
      <h3 class="chart-title">Кластери</h3>
      <div class="chart-wrap"><canvas id="chart-clusters"></canvas></div>
    </div>
    <div class="analytics-chart">
      <h3 class="chart-title">Місто / Село</h3>
      <div class="chart-wrap"><canvas id="chart-locality"></canvas></div>
    </div>
    <div class="analytics-chart">
      <h3 class="chart-title">Учнів по кластерах</h3>
      <div class="chart-wrap"><canvas id="chart-students"></canvas></div>
    </div>
    <div class="analytics-chart">
      <h3 class="chart-title">Форми навчання</h3>
      <div class="chart-wrap"><canvas id="chart-edu"></canvas></div>
    </div>
  </div>

</div><!-- /analytics-panel -->
```

- [ ] **Step 3: Add Chart.js CDN and remove obsolete MutationObserver**

Before `<script src="js/config.js"></script>`, add:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
```

Remove the entire `<script>` block at the bottom of `<body>` (the MutationObserver that synced `stat-count` → `header-count`). It referenced `header-count` which no longer exists.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add analytics panel HTML, tab buttons, Chart.js CDN"
```

---

## Task 4: Analytics CSS

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: Update `.chart-wrap` default height**

On line 136, change `height: 120px` to `height: 180px`. (This makes sidebar-area chart wraps larger; the analytics panel overrides with `.chart-wrap--tall` for the oblast chart.)

- [ ] **Step 2: Add header tab styles**

After the `.header-badge { ... }` block (ends around line 81), add:

```css
/* ── Header tabs ─────────────────────────────── */
.header-tabs {
  display: flex;
  gap: 3px;
  background: rgba(255,255,255,.12);
  border-radius: 8px;
  padding: 3px;
}

.header-tab {
  padding: 4px 16px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(255,255,255,.75);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: background .15s, color .15s;
}

.header-tab.active {
  background: #fff;
  color: var(--primary);
}

.header-tab:hover:not(.active) {
  color: #fff;
  background: rgba(255,255,255,.2);
}
```

- [ ] **Step 3: Add analytics panel and chart styles**

After the `.map-container { ... }` block (ends around line 381), add:

```css
.map-container.hidden { display: none; }

/* ── Analytics panel ─────────────────────────── */
.analytics-panel {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: var(--gray-100);
}

.analytics-panel.hidden { display: none; }

.analytics-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  text-align: center;
  box-shadow: var(--shadow);
}

.stat-value {
  font-size: 30px;
  font-weight: 700;
  color: var(--primary);
  line-height: 1.1;
}

.stat-label {
  font-size: 11px;
  color: var(--gray-500);
  margin-top: 4px;
}

.analytics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.analytics-chart {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  box-shadow: var(--shadow);
}

.analytics-chart--wide {
  grid-column: 1 / -1;
}

.chart-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--gray-900);
  margin: 0 0 12px;
}

.chart-wrap--tall { height: 360px; }
```

- [ ] **Step 4: Add mobile responsive styles for analytics**

Inside the existing `@media (max-width: 768px)` block, add:

```css
  .analytics-stats { grid-template-columns: repeat(2, 1fr); }
  .analytics-grid { grid-template-columns: 1fr; }
  .analytics-chart--wide { grid-column: 1; }
```

- [ ] **Step 5: Commit**

```bash
git add css/style.css
git commit -m "feat: add analytics panel and header tab styles"
```

---

## Task 5: Analytics charts and tab switching

**Files:**
- Rewrite: `js/charts.js`
- Rewrite: `js/app.js`

- [ ] **Step 1: Rewrite `js/charts.js`**

Replace the entire file content with:

```js
let clusterChart  = null;
let eduChart      = null;
let oblastChart   = null;
let localityChart = null;
let studentsChart = null;

function getClusterKey(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('stem')) return 'STEM';
  if (n.includes('літератур') || n.includes('мовно')) return 'Мовно-літературний';
  if (n.includes('соціально') || n.includes('гуманіт')) return 'Соціально-гуманітарний';
  return null;
}

function initCharts() {
  const clusterCtx  = document.getElementById('chart-clusters');
  const eduCtx      = document.getElementById('chart-edu');
  const oblastCtx   = document.getElementById('chart-oblast');
  const localityCtx = document.getElementById('chart-locality');
  const studentsCtx = document.getElementById('chart-students');
  if (!clusterCtx || !eduCtx || !oblastCtx || !localityCtx || !studentsCtx) return;

  const clusterKeys   = Object.keys(CONFIG.CLUSTER_LABELS);
  const clusterColors = clusterKeys.map(k => CONFIG.CLUSTER_COLORS[k]);

  const yBarOpts = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } },
      y: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } }
    }
  };

  clusterChart = new Chart(clusterCtx, {
    type: 'doughnut',
    data: {
      labels: clusterKeys,
      datasets: [{ data: clusterKeys.map(() => 0), backgroundColor: clusterColors, borderWidth: 2, borderColor: '#fff' }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'Inter', size: 10 }, padding: 8, boxWidth: 10, boxHeight: 10 }
        },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}` } }
      }
    }
  });

  eduChart = new Chart(eduCtx, {
    type: 'bar',
    data: { labels: [], datasets: [{ data: [], backgroundColor: '#1a56db', borderRadius: 4 }] },
    options: {
      ...yBarOpts,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.raw} ліцеїв` } }
      }
    }
  });

  oblastChart = new Chart(oblastCtx, {
    type: 'bar',
    data: { labels: [], datasets: [{ data: [], backgroundColor: '#1a56db', borderRadius: 4 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.raw} ліцеїв` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } },
        y: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 }, autoSkip: false } }
      }
    }
  });

  localityChart = new Chart(localityCtx, {
    type: 'doughnut',
    data: {
      labels: ['Міська', 'Сільська', 'Інше'],
      datasets: [{ data: [0, 0, 0], backgroundColor: ['#1a56db', '#16a34a', '#94a3b8'], borderWidth: 2, borderColor: '#fff' }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'Inter', size: 10 }, padding: 8, boxWidth: 10, boxHeight: 10 }
        },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}` } }
      }
    }
  });

  studentsChart = new Chart(studentsCtx, {
    type: 'bar',
    data: {
      labels: clusterKeys,
      datasets: [{ data: clusterKeys.map(() => 0), backgroundColor: clusterColors, borderRadius: 4 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.raw} учнів` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } },
        y: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } }
      }
    }
  });
}

function updateStatCards(lyceums) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('stat-total',    lyceums.length);
  set('stat-boarding', lyceums.filter(l => l.hasBoarding).length);
  set('stat-mountain', lyceums.filter(l => l.isMountain).length);
  set('stat-only',     lyceums.filter(l => l.isOnlyLyceum).length);
}

function updateCharts(lyceums) {
  if (!clusterChart || !eduChart || !oblastChart || !localityChart || !studentsChart) return;

  const clusterKeys = Object.keys(CONFIG.CLUSTER_LABELS);

  // Clusters doughnut — count lyceums per cluster type
  clusterChart.data.datasets[0].data = clusterKeys.map(k =>
    lyceums.filter(l => l.clusters.some(c => getClusterKey(c) === k)).length
  );
  clusterChart.update('none');

  // Education form bar
  const eduMap = {};
  lyceums.forEach(l => { const f = l.educationForm || 'Не вказано'; eduMap[f] = (eduMap[f] || 0) + 1; });
  const eduEntries = Object.entries(eduMap).sort((a, b) => b[1] - a[1]);
  eduChart.data.labels = eduEntries.map(([k]) => k);
  eduChart.data.datasets[0].data = eduEntries.map(([, v]) => v);
  eduChart.update('none');

  // Oblast bar
  const oblastMap = {};
  lyceums.forEach(l => { const o = l.oblast || 'Не вказано'; oblastMap[o] = (oblastMap[o] || 0) + 1; });
  const oblastEntries = Object.entries(oblastMap).sort((a, b) => b[1] - a[1]);
  oblastChart.data.labels = oblastEntries.map(([k]) => k);
  oblastChart.data.datasets[0].data = oblastEntries.map(([, v]) => v);
  oblastChart.update('none');

  // Locality doughnut
  const urban = lyceums.filter(l => (l.locality || '').includes('місь')).length;
  const rural = lyceums.filter(l => (l.locality || '').includes('сіл')).length;
  localityChart.data.datasets[0].data = [urban, rural, lyceums.length - urban - rural];
  localityChart.update('none');

  // Students per cluster bar — sum studentCount across all profiles
  const studentsMap = {};
  clusterKeys.forEach(k => { studentsMap[k] = 0; });
  lyceums.forEach(l => {
    l.profiles.forEach(p => {
      const k = getClusterKey(p.cluster);
      if (k) studentsMap[k] += p.studentCount || 0;
    });
  });
  studentsChart.data.datasets[0].data = clusterKeys.map(k => studentsMap[k]);
  studentsChart.update('none');
}

function renderAnalytics(lyceums) {
  updateStatCards(lyceums);
  updateCharts(lyceums);
}
```

- [ ] **Step 2: Rewrite `js/app.js`**

Replace the entire file content with:

```js
function hideLoading() {
  const el = document.getElementById('loading-overlay');
  if (el) el.classList.add('hidden');
}

function showError(msg) {
  hideLoading();
  const el = document.getElementById('loading-overlay');
  if (el) {
    el.classList.remove('hidden');
    el.innerHTML = `<div class="error-msg">⚠️ ${msg}</div>`;
  }
}

function initTabs() {
  const mapContainer   = document.querySelector('.map-container');
  const analyticsPanel = document.getElementById('analytics-panel');
  if (!mapContainer || !analyticsPanel) return;
  document.querySelectorAll('.header-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.header-tab').forEach(b => b.classList.toggle('active', b === btn));
      const isAnalytics = btn.dataset.tab === 'analytics';
      mapContainer.classList.toggle('hidden', isAnalytics);
      analyticsPanel.classList.toggle('hidden', !isAnalytics);
      if (isAnalytics) renderAnalytics(allLyceums);
    });
  });
}

async function init() {
  initMap();

  try {
    const [lyceums, hromadyGeo, oblastiGeo] = await Promise.all([
      loadData(),
      loadGeoJSON('geojson/hromady.geojson'),
      loadGeoJSON('geojson/oblasti.geojson')
    ]);

    addHromadyLayer(hromadyGeo);
    addOblastiLayer(oblastiGeo);

    allLyceums     = lyceums;
    filteredLyceums = lyceums;

    buildTrigramIndex(lyceums);
    populateFilters(lyceums);
    bindFilterEvents();
    updateMarkers(lyceums);
    updateCounter(lyceums.length, lyceums.length);

    hideLoading();
  } catch (err) {
    console.error(err);
    showError('Не вдалося завантажити дані. Перевірте підключення до інтернету та доступ до Google Таблиці.');
  }
}

function initMobileSidebar() {
  const btn     = document.getElementById('mobile-filter-btn');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!btn || !sidebar || !overlay) return;

  function open()  { sidebar.classList.add('mobile-open');    overlay.classList.add('active'); }
  function close() { sidebar.classList.remove('mobile-open'); overlay.classList.remove('active'); }

  btn.addEventListener('click', () =>
    sidebar.classList.contains('mobile-open') ? close() : open()
  );
  overlay.addEventListener('click', close);
}

document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  initTabs();
  init();
  initMobileSidebar();
});
```

- [ ] **Step 3: Verify in browser**

Open `index.html`. Click **Аналітика**:
- 4 stat cards show numeric values (not `—`)
- Oblast bar shows ~25 oblasts sorted by count (highest first)
- Clusters doughnut has 3 colored sectors matching map marker colors (blue/green/orange)
- Місто/село doughnut has 2–3 sectors
- Учнів bar shows 3 bars (one per cluster)
- Форми навчання bar shows education form rows

Click **Карта** — map returns, all filters still work.

Resize to mobile (< 768px): stat cards show 2 columns, charts stack into single column.

- [ ] **Step 4: Commit**

```bash
git add js/charts.js js/app.js
git commit -m "feat: analytics tab with 5 charts, stat cards, and tab switching"
```
