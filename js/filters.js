let allLyceums = [];
let filteredLyceums = [];

const state = {
  search: '',
  oblast: '',
  hromada: '',
  lyceums: [],
  locality: '',
  clusters: [],
  educationForms: [],
  boarding: '',
  mountain: ''
};

let _oblastSearch  = '';
let _hromadaSearch = '';
let _lyceumSearchQuery = '';

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

// ── Multiselect toggle ─────────────────────────────

function initMultiselects() {
  document.querySelectorAll('.multiselect').forEach(dd => {
    dd.querySelector('.multiselect-btn').addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = dd.classList.contains('open');
      closeAllMultiselects();
      if (!isOpen) dd.classList.add('open');
    });
  });
  document.addEventListener('click', closeAllMultiselects);
}

function closeAllMultiselects() {
  document.querySelectorAll('.multiselect.open').forEach(dd => dd.classList.remove('open'));
}

function updateMultiselectLabel(ddId, values, placeholder) {
  const label = document.querySelector(`#${ddId} .multiselect-label`);
  if (!label) return;
  label.textContent = values.length === 0 ? placeholder : `Обрано: ${values.length}`;
}

function setSingleLabel(ddId, value, placeholder) {
  const label = document.querySelector(`#${ddId} .multiselect-label`);
  if (label) label.textContent = value || placeholder;
}

// ── Single-select options (Місцевість, Пансіон, Гірський) ──

function initSingleSelects() {
  document.querySelectorAll('.ss-opt').forEach(opt => {
    opt.addEventListener('click', e => {
      e.stopPropagation();
      const ddId  = opt.dataset.dd;
      const value = opt.dataset.value;
      const dd    = document.getElementById(ddId);

      dd.querySelectorAll('.ss-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      closeAllMultiselects();

      if (ddId === 'dd-locality') { state.locality = value; setSingleLabel(ddId, opt.textContent.trim() !== 'Всі' ? opt.textContent.trim() : '', 'Всі'); }
      if (ddId === 'dd-boarding') { state.boarding = value; setSingleLabel(ddId, opt.textContent.trim() !== 'Всі' ? opt.textContent.trim() : '', 'Всі'); }
      if (ddId === 'dd-mountain') { state.mountain = value; setSingleLabel(ddId, opt.textContent.trim() !== 'Всі' ? opt.textContent.trim() : '', 'Всі'); }
      applyFilters();
    });
  });
}

// ── Searchable single-select (Oblast, Hromada) ─────

function renderOblastList() {
  const container = document.getElementById('oblast-list');
  if (!container) return;
  const q = _oblastSearch.toLowerCase();
  const oblasts = [...new Set(allLyceums.map(l => l.oblast).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'uk'))
    .filter(o => !q || o.toLowerCase().includes(q));

  container.innerHTML = '';

  const allDiv = makeSSRow('', 'Всі області', state.oblast === '');
  allDiv.addEventListener('click', e => { e.stopPropagation(); selectOblast('', 'Всі області'); });
  container.appendChild(allDiv);

  oblasts.forEach(o => {
    const row = makeSSRow(o, o, state.oblast === o);
    row.addEventListener('click', e => { e.stopPropagation(); selectOblast(o, o); });
    container.appendChild(row);
  });
}

function selectOblast(value, label) {
  state.oblast  = value;
  state.hromada = '';
  state.lyceums = [];
  setSingleLabel('dd-oblast',  value ? label : '', 'Всі області');
  setSingleLabel('dd-hromada', '', 'Всі громади');
  updateMultiselectLabel('dd-lyceum', [], 'Всі заклади');
  closeAllMultiselects();
  renderOblastList();
  renderHromadaList();
  renderLyceumList();
  applyFilters();
}

function renderHromadaList() {
  const container = document.getElementById('hromada-list');
  if (!container) return;
  const q = _hromadaSearch.toLowerCase();
  let base = allLyceums;
  if (state.oblast) base = base.filter(l => l.oblast === state.oblast);
  const hromady = [...new Set(base.map(l => l.hromada).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'uk'))
    .filter(h => !q || h.toLowerCase().includes(q));

  container.innerHTML = '';

  const allDiv = makeSSRow('', 'Всі громади', state.hromada === '');
  allDiv.addEventListener('click', e => { e.stopPropagation(); selectHromada('', 'Всі громади'); });
  container.appendChild(allDiv);

  hromady.forEach(h => {
    const row = makeSSRow(h, h, state.hromada === h);
    row.addEventListener('click', e => { e.stopPropagation(); selectHromada(h, h); });
    container.appendChild(row);
  });
}

function selectHromada(value, label) {
  state.hromada = value;
  state.lyceums = [];
  setSingleLabel('dd-hromada', value ? label : '', 'Всі громади');
  updateMultiselectLabel('dd-lyceum', [], 'Всі заклади');
  closeAllMultiselects();
  renderHromadaList();
  renderLyceumList();
  applyFilters();
}

function makeSSRow(value, label, isActive) {
  const div = document.createElement('div');
  div.className = 'multiselect-option ss-row' + (isActive ? ' active' : '');
  div.dataset.value = value;
  div.textContent = label;
  return div;
}

// ── Lyceum multiselect with search ────────────────

function getLyceumPool() {
  let base = allLyceums;
  if (state.oblast)  base = base.filter(l => l.oblast  === state.oblast);
  if (state.hromada) base = base.filter(l => l.hromada === state.hromada);
  return [...base].sort((a, b) => a.name.localeCompare(b.name, 'uk'));
}

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

// ── Filter application ─────────────────────────────

function applyFilters() {
  filteredLyceums = allLyceums.filter(l => {
    if (state.oblast  && l.oblast  !== state.oblast)  return false;
    if (state.hromada && l.hromada !== state.hromada) return false;
    if (state.lyceums.length > 0 && !state.lyceums.includes(l.id)) return false;
    if (state.locality) {
      const loc = l.locality || '';
      if (state.locality === 'міська'   && !loc.includes('місь')) return false;
      if (state.locality === 'сільська' && !loc.includes('сіл'))  return false;
    }
    if (state.clusters.length > 0) {
      const lc = l.clusters.map(c => c.toLowerCase());
      if (!state.clusters.some(c => lc.some(lcc => lcc.includes(c.toLowerCase()) || c.toLowerCase().includes(lcc)))) return false;
    }
    if (state.educationForms.length > 0) {
      const form = (l.educationForm || '').toLowerCase();
      if (!state.educationForms.some(f => form.includes(f.toLowerCase()))) return false;
    }
    if (state.boarding === 'так' && !l.hasBoarding) return false;
    if (state.boarding === 'ні'  &&  l.hasBoarding) return false;
    if (state.mountain === 'так' && !l.isMountain)  return false;
    if (state.mountain === 'ні'  &&  l.isMountain)  return false;
    return true;
  });

  updateMarkers(filteredLyceums);
  updateCounter(filteredLyceums.length, allLyceums.length);
}

// ── Populate on load ───────────────────────────────

function populateFilters(lyceums) {
  const forms = [...new Set(lyceums.map(l => l.educationForm).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'uk'));
  const eduPanel = document.getElementById('filter-edu-forms');
  eduPanel.innerHTML = '';
  forms.forEach(f => {
    const label = document.createElement('label');
    label.className = 'multiselect-option';
    label.innerHTML = `<input type="checkbox" data-edu value="${f}"> ${f}`;
    eduPanel.appendChild(label);
    label.querySelector('input').addEventListener('change', () => {
      state.educationForms = [...document.querySelectorAll('[data-edu]:checked')].map(i => i.value);
      updateMultiselectLabel('dd-edu', state.educationForms, 'Всі форми');
      applyFilters();
    });
  });

  renderOblastList();
  renderHromadaList();
  renderLyceumList();
}

// ── Bind events ────────────────────────────────────

function bindFilterEvents() {
  initMultiselects();
  initSingleSelects();

  // Oblast search
  const oblastSearch = document.getElementById('oblast-search');
  if (oblastSearch) {
    oblastSearch.addEventListener('input', e => { _oblastSearch = e.target.value.trim(); renderOblastList(); });
    oblastSearch.addEventListener('click', e => e.stopPropagation());
  }

  // Hromada search
  const hromadaSearch = document.getElementById('hromada-search');
  if (hromadaSearch) {
    hromadaSearch.addEventListener('input', e => { _hromadaSearch = e.target.value.trim(); renderHromadaList(); });
    hromadaSearch.addEventListener('click', e => e.stopPropagation());
  }

  // Lyceum search
  const lyceumSearch = document.getElementById('lyceum-panel-search');
  if (lyceumSearch) {
    lyceumSearch.addEventListener('input', e => { _lyceumSearchQuery = e.target.value.trim(); renderLyceumList(); });
    lyceumSearch.addEventListener('click', e => e.stopPropagation());
  }

  // Clusters
  document.querySelectorAll('[data-cluster]').forEach(cb => {
    cb.addEventListener('change', () => {
      state.clusters = [...document.querySelectorAll('[data-cluster]:checked')].map(i => i.value);
      updateMultiselectLabel('dd-clusters', state.clusters, 'Всі кластери');
      applyFilters();
    });
  });

  // Reset
  document.getElementById('btn-reset').addEventListener('click', resetFilters);
}

// ── Reset ──────────────────────────────────────────

function resetFilters() {
  Object.assign(state, {
    oblast: '', hromada: '', lyceums: [],
    locality: '', clusters: [], educationForms: [], boarding: '', mountain: ''
  });
  _oblastSearch = ''; _hromadaSearch = ''; _lyceumSearchQuery = '';

  const oblastS = document.getElementById('oblast-search');   if (oblastS)  oblastS.value  = '';
  const hromadaS = document.getElementById('hromada-search'); if (hromadaS) hromadaS.value = '';
  const lyceumS = document.getElementById('lyceum-panel-search'); if (lyceumS) lyceumS.value = '';

  setSingleLabel('dd-oblast',   '', 'Всі області');
  setSingleLabel('dd-hromada',  '', 'Всі громади');
  setSingleLabel('dd-locality', '', 'Всі');
  setSingleLabel('dd-boarding', '', 'Всі');
  setSingleLabel('dd-mountain', '', 'Всі');
  updateMultiselectLabel('dd-lyceum',   [], 'Всі заклади');
  updateMultiselectLabel('dd-clusters', [], 'Всі кластери');
  updateMultiselectLabel('dd-edu',      [], 'Всі форми');

  document.querySelectorAll('.ss-opt').forEach(o => o.classList.toggle('active', o.dataset.value === ''));
  document.querySelectorAll('[data-cluster],[data-edu]').forEach(cb => cb.checked = false);

  renderOblastList();
  renderHromadaList();
  renderLyceumList();
  applyFilters();
}

// ── Counter ────────────────────────────────────────

function updateCounter(count, total) {
  const el = document.getElementById('stat-count');
  if (el) el.innerHTML = `Показано: <span>${count}</span> з ${total} ліцеїв`;
}
