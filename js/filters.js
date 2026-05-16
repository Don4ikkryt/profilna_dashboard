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

// ── Multiselect toggle ─────────────────────────────

function initMultiselects() {
  document.querySelectorAll('.multiselect').forEach(dd => {
    const btn = dd.querySelector('.multiselect-btn');
    btn.addEventListener('click', e => {
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

// ── Filter application ─────────────────────────────

function applyFilters() {
  filteredLyceums = allLyceums.filter(l => {
    if (state.search && !l.name.toLowerCase().includes(state.search.toLowerCase())) return false;
    if (state.oblast && l.oblast !== state.oblast) return false;
    if (state.hromada && l.hromada !== state.hromada) return false;
    if (state.lyceums.length > 0 && !state.lyceums.includes(l.id)) return false;
    if (state.locality) {
      const loc = l.locality || '';
      if (state.locality === 'міська'  && !loc.includes('місь')) return false;
      if (state.locality === 'сільська' && !loc.includes('сіл'))  return false;
    }
    if (state.clusters.length > 0 && !state.clusters.some(c => l.clusters.includes(c))) return false;
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
  syncHromadaOptions();
  renderLyceumList();
}

// ── Cascading selects ──────────────────────────────

function syncHromadaOptions() {
  const sel = document.getElementById('filter-hromada');
  if (!sel) return;
  const base = state.oblast ? allLyceums.filter(l => l.oblast === state.oblast) : allLyceums;
  const hromady = [...new Set(base.map(l => l.hromada).filter(Boolean))].sort();
  const current = sel.value;
  sel.innerHTML = '<option value="">Всі громади</option>';
  hromady.forEach(h => {
    const opt = document.createElement('option');
    opt.value = h; opt.textContent = h;
    if (h === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ── Lyceum multiselect with search ────────────────

let _lyceumSearchQuery = '';

function getLyceumPool() {
  let base = allLyceums;
  if (state.oblast)  base = base.filter(l => l.oblast  === state.oblast);
  if (state.hromada) base = base.filter(l => l.hromada === state.hromada);
  return [...base].sort((a, b) => a.name.localeCompare(b.name, 'uk'));
}

function renderLyceumList() {
  const container = document.getElementById('filter-lyceum-list');
  if (!container) return;

  const pool = getLyceumPool();
  const q = _lyceumSearchQuery.toLowerCase();
  const visible = q ? pool.filter(l => l.name.toLowerCase().includes(q)) : pool;

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
      if (cb.target.checked) {
        if (!state.lyceums.includes(l.id)) state.lyceums.push(l.id);
      } else {
        state.lyceums = state.lyceums.filter(id => id !== l.id);
      }
      updateMultiselectLabel('dd-lyceum', state.lyceums, 'Всі заклади');
      applyFilters();
    });
    container.appendChild(label);
  });
}

// ── Populate dynamic options ───────────────────────

function populateFilters(lyceums) {
  const oblasts = [...new Set(lyceums.map(l => l.oblast).filter(Boolean))].sort();
  const oblastSel = document.getElementById('filter-oblast');
  oblasts.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o; opt.textContent = o;
    oblastSel.appendChild(opt);
  });

  const forms = [...new Set(lyceums.map(l => l.educationForm).filter(Boolean))].sort();
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

  syncHromadaOptions();
  renderLyceumList();
}

// ── Bind events ────────────────────────────────────

function bindFilterEvents() {
  initMultiselects();

  // Global search
  let searchTimer;
  document.getElementById('filter-search').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.search = e.target.value.trim(); applyFilters(); }, 250);
  });

  // Oblast
  document.getElementById('filter-oblast').addEventListener('change', e => {
    state.oblast = e.target.value;
    state.hromada = '';
    state.lyceums = [];
    document.getElementById('filter-hromada').value = '';
    updateMultiselectLabel('dd-lyceum', [], 'Всі заклади');
    syncHromadaOptions();
    applyFilters();
  });

  // Hromada
  document.getElementById('filter-hromada').addEventListener('change', e => {
    state.hromada = e.target.value;
    state.lyceums = [];
    updateMultiselectLabel('dd-lyceum', [], 'Всі заклади');
    applyFilters();
  });

  // Lyceum panel search
  const lyceumSearch = document.getElementById('lyceum-panel-search');
  if (lyceumSearch) {
    lyceumSearch.addEventListener('input', e => {
      _lyceumSearchQuery = e.target.value.trim();
      renderLyceumList();
    });
    // Prevent click on search input from closing the dropdown
    lyceumSearch.addEventListener('click', e => e.stopPropagation());
  }

  // Locality
  document.getElementById('filter-locality').addEventListener('change', e => {
    state.locality = e.target.value; applyFilters();
  });

  // Clusters
  document.querySelectorAll('[data-cluster]').forEach(cb => {
    cb.addEventListener('change', () => {
      state.clusters = [...document.querySelectorAll('[data-cluster]:checked')].map(i => i.value);
      updateMultiselectLabel('dd-clusters', state.clusters, 'Всі кластери');
      applyFilters();
    });
  });

  // Boarding
  document.getElementById('filter-boarding').addEventListener('change', e => {
    state.boarding = e.target.value; applyFilters();
  });

  // Mountain
  document.getElementById('filter-mountain').addEventListener('change', e => {
    state.mountain = e.target.value; applyFilters();
  });

  // Reset
  document.getElementById('btn-reset').addEventListener('click', resetFilters);
}

// ── Reset ──────────────────────────────────────────

function resetFilters() {
  Object.assign(state, {
    search: '', oblast: '', hromada: '', lyceums: [],
    locality: '', clusters: [], educationForms: [], boarding: '', mountain: ''
  });
  _lyceumSearchQuery = '';

  document.getElementById('filter-search').value = '';
  document.getElementById('filter-oblast').value = '';
  document.getElementById('filter-hromada').value = '';
  document.getElementById('filter-locality').value = '';
  document.getElementById('filter-boarding').value = '';
  document.getElementById('filter-mountain').value = '';
  const ps = document.getElementById('lyceum-panel-search');
  if (ps) ps.value = '';

  document.querySelectorAll('[data-cluster],[data-edu]').forEach(cb => cb.checked = false);
  updateMultiselectLabel('dd-clusters', [], 'Всі кластери');
  updateMultiselectLabel('dd-edu',      [], 'Всі форми');
  updateMultiselectLabel('dd-lyceum',   [], 'Всі заклади');

  syncHromadaOptions();
  applyFilters();
}

// ── Counter ────────────────────────────────────────

function updateCounter(count, total) {
  const el = document.getElementById('stat-count');
  if (el) el.innerHTML = `Показано: <span>${count}</span> з ${total} ліцеїв`;
}
