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

    allLyceums      = lyceums;
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
