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

document.addEventListener('DOMContentLoaded', init);
