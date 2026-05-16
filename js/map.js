let map, markerLayer, hromadyLayer, oblastiLayer;

const UKRAINE_BOUNDS = L.latLngBounds([44.0, 22.0], [52.5, 40.5]);

// ── Pie marker icon ────────────────────────────────

function createPieIcon(clusters, size = 16) {
  const colors = clusters.map(c => CONFIG.CLUSTER_COLORS[c] || CONFIG.CLUSTER_COLORS.default);

  let background;
  if (colors.length === 0) {
    background = CONFIG.CLUSTER_COLORS.default;
  } else if (colors.length === 1) {
    background = colors[0];
  } else {
    const pct = 100 / colors.length;
    const stops = colors.map((c, i) =>
      `${c} ${(i * pct).toFixed(2)}%, ${c} ${((i + 1) * pct).toFixed(2)}%`
    ).join(', ');
    background = `conic-gradient(${stops})`;
  }

  return L.divIcon({
    className: '',
    html: `<div class="pie-marker" style="
      width:${size}px;height:${size}px;
      background:${background};
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [0, -(size / 2) - 4]
  });
}

// ── Tooltip ────────────────────────────────────────

function buildTooltipHTML(lyceum) {
  const badges = lyceum.clusters.map(c => {
    const color = CONFIG.CLUSTER_COLORS[c] || CONFIG.CLUSTER_COLORS.default;
    return `<span class="cluster-badge" style="background:${color}">${c}</span>`;
  }).join('');

  return `
    <div class="tooltip-id">АІКОМ ID: ${lyceum.id}</div>
    <div class="tooltip-name">${lyceum.name}</div>
    <div class="tooltip-meta">Громада: ${lyceum.hromada || '—'}</div>
    ${badges ? `<div class="tooltip-clusters">${badges}</div>` : ''}
  `;
}

// ── Map init ───────────────────────────────────────

function initMap() {
  map = L.map('map', {
    center: CONFIG.MAP_CENTER,
    zoom: CONFIG.MAP_ZOOM,
    minZoom: 6,
    maxZoom: 18,
    maxBounds: UKRAINE_BOUNDS,
    maxBoundsViscosity: 1.0,
    zoomControl: true,
    renderer: L.canvas()
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);
}

// ── GeoJSON layers ─────────────────────────────────

function addHromadyLayer(geojson) {
  hromadyLayer = L.geoJSON(geojson, {
    renderer: L.canvas(),
    style: { weight: 0.6, color: '#b0b8c8', fill: false },
    onEachFeature(feature, layer) {
      const name = feature.properties.adm3_name1 || '';
      layer.bindTooltip(name, {
        sticky: true,
        direction: 'top',
        className: 'hromada-tooltip'
      });
      layer.on('mouseover', function() { this.setStyle({ color: '#64748b', weight: 1.5 }); });
      layer.on('mouseout',  function() { this.setStyle({ color: '#b0b8c8', weight: 0.6 }); });
    }
  }).addTo(map);
}

function addOblastiLayer(geojson) {
  oblastiLayer = L.geoJSON(geojson, {
    renderer: L.canvas(),
    style: { weight: 2, color: '#1a56db', fill: false },
    onEachFeature(feature, layer) {
      layer.on('mouseover', function() { this.setStyle({ color: '#1346c0', weight: 3 }); });
      layer.on('mouseout',  function() { this.setStyle({ color: '#1a56db', weight: 2 }); });
    }
  }).addTo(map);
}

// ── Markers ────────────────────────────────────────

function updateMarkers(lyceums) {
  if (markerLayer) map.removeLayer(markerLayer);
  markerLayer = L.layerGroup();

  lyceums.forEach(lyceum => {
    if (!lyceum.lat || !lyceum.lng) return;

    const marker = L.marker([lyceum.lat, lyceum.lng], {
      icon: createPieIcon(lyceum.clusters)
    });

    marker.bindTooltip(buildTooltipHTML(lyceum), {
      direction: 'top',
      className: 'leaflet-tooltip'
    });

    marker.on('click', () => {
      window.location.href = `lyceum.html?id=${encodeURIComponent(lyceum.id)}`;
    });

    marker.on('mouseover', function() {
      this.setIcon(createPieIcon(lyceum.clusters, 22));
      this.openTooltip();
    });
    marker.on('mouseout', function() {
      this.setIcon(createPieIcon(lyceum.clusters, 16));
    });

    markerLayer.addLayer(marker);
  });

  markerLayer.addTo(map);
}
