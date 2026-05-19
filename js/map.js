let map, markerLayer, hromadyLayer, oblastiLayer;
let mapMoving = false;

const UKRAINE_BOUNDS = L.latLngBounds([44.0, 16.0], [52.5, 46.0]);

// ── Pie marker icon (SVG) ──────────────────────────

function createPieSVG(clusters, size) {
  const colors = clusters.length > 0
    ? clusters.map(c => getClusterColor(c))
    : [CONFIG.CLUSTER_COLORS.default];

  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 2; // 2px border gap

  if (colors.length === 1) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${colors[0]}" stroke="#fff" stroke-width="2"/>
    </svg>`;
  }

  const step = (2 * Math.PI) / colors.length;
  const slices = colors.map((color, i) => {
    const a1 = i * step - Math.PI / 2;
    const a2 = (i + 1) * step - Math.PI / 2;
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    const large = step > Math.PI ? 1 : 0;
    return `<path d="M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z" fill="${color}"/>`;
  }).join('');

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${slices}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-width="2"/>
  </svg>`;
}

const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;

function createPieIcon(clusters, size = isTouchDevice() ? 20 : 16) {
  return L.divIcon({
    className: 'pie-icon-wrap',
    html: createPieSVG(clusters, size),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [0, -(size / 2) - 4]
  });
}

// ── Tooltip ────────────────────────────────────────

function buildTooltipHTML(lyceum) {
  const badges = lyceum.clusters.map(c => {
    return `<span class="cluster-badge" style="background:${getClusterColor(c)}">${c}</span>`;
  }).join('');

  return `
    <div class="tooltip-id">АІКОМ ID: ${lyceum.id}</div>
    <div class="tooltip-name">${lyceum.name}</div>
    <div class="tooltip-meta">Громада: ${lyceum.hromada || '—'}</div>
    ${badges ? `<div class="tooltip-clusters">${badges}</div>` : ''}
    <div class="tooltip-hint">Натисніть для деталей →</div>
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

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);
}

// ── GeoJSON layers ─────────────────────────────────

function addHromadyLayer(geojson) {
  hromadyLayer = L.geoJSON(geojson, {
    renderer: L.svg(),
    style: { weight: 0.6, color: '#b0b8c8', fill: true, fillOpacity: 0 },
    onEachFeature(feature, layer) {
      const name = feature.properties.adm3_name1 || '';
      layer.bindTooltip(name, {
        sticky: true,
        direction: 'top',
        className: 'hromada-tooltip'
      });
      layer.on('mouseover', function() { if (mapMoving) return; this.setStyle({ color: '#64748b', weight: 1.5, fillOpacity: 0.04 }); });
      layer.on('mouseout',  function() { this.setStyle({ color: '#b0b8c8', weight: 0.6, fillOpacity: 0 }); });
    }
  }).addTo(map);

  map.on('movestart', () => {
    mapMoving = true;
    hromadyLayer.eachLayer(l => {
      l.closeTooltip();
      l.setStyle({ color: '#b0b8c8', weight: 0.6, fillOpacity: 0 });
    });
    if (markerLayer) {
      const baseSize = isTouchDevice() ? 20 : 16;
      markerLayer.eachLayer(l => {
        l.closeTooltip();
        if (l._clusters) l.setIcon(createPieIcon(l._clusters, baseSize));
      });
    }
  });
  map.on('moveend', () => { mapMoving = false; });

  // Block ALL pointer events on interactive layers during drag at the browser
  // level — this prevents Leaflet's own bindTooltip handlers from firing,
  // which the mapMoving flag cannot reach (they are separate internal listeners).
  map.on('dragstart', () => map.getContainer().classList.add('map-dragging'));
  map.on('dragend',   () => map.getContainer().classList.remove('map-dragging'));
}

function addOblastiLayer(geojson) {
  oblastiLayer = L.geoJSON(geojson, {
    renderer: L.canvas(),
    style: { weight: 2, color: '#1a56db', fill: false },
    onEachFeature(feature, layer) {
      layer.on('mouseover', function() { if (mapMoving) return; this.setStyle({ color: '#1346c0', weight: 3 }); });
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

    const baseSize = isTouchDevice() ? 20 : 16;
    const marker = L.marker([lyceum.lat, lyceum.lng], {
      icon: createPieIcon(lyceum.clusters, baseSize)
    });
    marker._clusters = lyceum.clusters;

    marker.bindTooltip(buildTooltipHTML(lyceum), {
      direction: 'top',
      className: 'leaflet-tooltip'
    });

    marker.on('click', () => {
      window.location.href = `lyceum.html?id=${encodeURIComponent(lyceum.id)}`;
    });

    marker.on('mouseover', function() {
      if (mapMoving) return;
      this.setIcon(createPieIcon(lyceum.clusters, baseSize + 6));
      this.openTooltip();
    });
    marker.on('mouseout', function() {
      this.setIcon(createPieIcon(lyceum.clusters, baseSize));
      this.closeTooltip();
    });

    markerLayer.addLayer(marker);
  });

  markerLayer.addTo(map);
}

function fitToMarkers() {
  if (!markerLayer || markerLayer.getLayers().length === 0) return;
  map.fitBounds(markerLayer.getBounds(), { padding: [60, 60], maxZoom: 14 });
}
