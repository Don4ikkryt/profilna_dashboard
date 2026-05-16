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

    allLyceums = lyceums;
    filteredLyceums = lyceums;

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
  init();
  initMobileSidebar();
});
