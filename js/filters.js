let allLyceums = [];
let filteredLyceums = [];

const state = {
  search: '',
  oblast: '',
  hromada: '',
  locality: '',
  clusters: [],
  educationForms: [],
  boarding: '',
  mountain: ''
};

// ── Multiselect logic ──────────────────────────────

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
  label.textContent = values.length === 0 ? placeholder : values.join(', ');
}

// ── Filter application ─────────────────────────────

function applyFilters() {
  filteredLyceums = allLyceums.filter(l => {
    if (state.search) {
      if (!l.name.toLowerCase().includes(state.search.toLowerCase())) return false;
    }
    if (state.oblast && l.oblast !== state.oblast) return false;
    if (state.hromada && l.hromada !== state.hromada) return false;
    if (state.locality) {
      const loc = l.locality || '';
      if (state.locality === 'міська' && !loc.includes('місь')) return false;
      if (state.locality === 'сільська' && !loc.includes('сіл')) return false;
    }
    if (state.clusters.length > 0) {
      if (!state.clusters.some(c => l.clusters.includes(c))) return false;
    }
    if (state.educationForms.length > 0) {
      const form = (l.educationForm || '').toLowerCase();
      if (!state.educationForms.some(f => form.includes(f.toLowerCase()))) return false;
    }
    if (state.boarding === 'так' && !l.hasBoarding) return false;
    if (state.boarding === 'ні' && l.hasBoarding) return false;
    if (state.mountain === 'так' && !l.isMountain) return false;
    if (state.mountain === 'ні' && l.isMountain) return false;
    return true;
  });

  updateMarkers(filteredLyceums);
  updateCounter(filteredLyceums.length, allLyceums.length);
  syncHromadaOptions();
}

function syncHromadaOptions() {
  const sel = document.getElementById('filter-hromada');
  if (!sel) return;
  const base = state.oblast ? allLyceums.filter(l => l.oblast === state.oblast) : allLyceums;
  const hromady = [...new Set(base.map(l => l.hromada).filter(Boolean))].sort();
  const current = sel.value;
  sel.innerHTML = '<option value="">Всі громади</option>';
  hromady.forEach(h => {
    const opt = document.createElement('option');
    opt.value = h;
    opt.textContent = h;
    if (h === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ── Populate dynamic options ───────────────────────

function populateFilters(lyceums) {
  // Oblast
  const oblasts = [...new Set(lyceums.map(l => l.oblast).filter(Boolean))].sort();
  const oblastSel = document.getElementById('filter-oblast');
  oblasts.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o;
    opt.textContent = o;
    oblastSel.appendChild(opt);
  });

  // Education forms (dynamic multiselect options)
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
}

// ── Bind all filter events ─────────────────────────

function bindFilterEvents() {
  initMultiselects();

  // Search
  let searchTimer;
  document.getElementById('filter-search').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = e.target.value.trim();
      applyFilters();
    }, 250);
  });

  // Oblast
  document.getElementById('filter-oblast').addEventListener('change', e => {
    state.oblast = e.target.value;
    state.hromada = '';
    document.getElementById('filter-hromada').value = '';
    syncHromadaOptions();
    applyFilters();
  });

  // Hromada
  document.getElementById('filter-hromada').addEventListener('change', e => {
    state.hromada = e.target.value;
    applyFilters();
  });

  // Locality
  document.getElementById('filter-locality').addEventListener('change', e => {
    state.locality = e.target.value;
    applyFilters();
  });

  // Clusters (multiselect checkboxes)
  document.querySelectorAll('[data-cluster]').forEach(cb => {
    cb.addEventListener('change', () => {
      state.clusters = [...document.querySelectorAll('[data-cluster]:checked')].map(i => i.value);
      updateMultiselectLabel('dd-clusters', state.clusters, 'Всі кластери');
      applyFilters();
    });
  });

  // Boarding
  document.getElementById('filter-boarding').addEventListener('change', e => {
    state.boarding = e.target.value;
    applyFilters();
  });

  // Mountain
  document.getElementById('filter-mountain').addEventListener('change', e => {
    state.mountain = e.target.value;
    applyFilters();
  });

  // Reset
  document.getElementById('btn-reset').addEventListener('click', resetFilters);
}

// ── Reset ──────────────────────────────────────────

function resetFilters() {
  state.search = '';
  state.oblast = '';
  state.hromada = '';
  state.locality = '';
  state.clusters = [];
  state.educationForms = [];
  state.boarding = '';
  state.mountain = '';

  document.getElementById('filter-search').value = '';
  document.getElementById('filter-oblast').value = '';
  document.getElementById('filter-hromada').value = '';
  document.getElementById('filter-locality').value = '';
  document.getElementById('filter-boarding').value = '';
  document.getElementById('filter-mountain').value = '';

  document.querySelectorAll('[data-cluster]').forEach(cb => cb.checked = false);
  document.querySelectorAll('[data-edu]').forEach(cb => cb.checked = false);

  updateMultiselectLabel('dd-clusters', [], 'Всі кластери');
  updateMultiselectLabel('dd-edu', [], 'Всі форми');

  syncHromadaOptions();
  applyFilters();
}

// ── Counter ────────────────────────────────────────

function updateCounter(count, total) {
  const el = document.getElementById('stat-count');
  if (el) el.innerHTML = `Показано: <span>${count}</span> з ${total} ліцеїв`;
}
