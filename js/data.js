// Finds first header that contains all given substrings (case-insensitive, Ukrainian-aware)
function findHeader(headers, ...parts) {
  const norm = s => s.toLowerCase();
  return headers.find(h => parts.every(p => norm(h).includes(norm(p)))) || null;
}

function parseBool(val) {
  if (!val) return false;
  return val.trim().toLowerCase().startsWith('так');
}

function parseProfile(row, headers, n) {
  const clusterCol = headers.find(h => {
    const l = h.toLowerCase();
    return l.includes('кластер') && h.includes(String(n));
  });
  if (!clusterCol) return null;
  const cluster = (row[clusterCol] || '').trim();
  if (!cluster) return null;

  const profileCol = headers.find(h => {
    const l = h.toLowerCase();
    return (l === `профіль ${n}` || h === `Профіль ${n}`) ;
  }) || headers.find(h => {
    return h.startsWith('Профіль') && h.endsWith(String(n)) && !h.toLowerCase().includes('кластер');
  });

  const deepCol = headers.find(h => h.includes(String(n)) && h.toLowerCase().includes('поглибленого'));
  const electInCol = headers.find(h => h.includes(String(n)) && h.toLowerCase().includes('межах профілю'));
  const electOutCol = headers.find(h => h.includes(String(n)) && h.toLowerCase().includes('поза профілем'));
  const studCol = headers.find(h => h.includes(String(n)) && (h.toLowerCase().includes('учнів') || h.toLowerCase().includes('учениць')));

  return {
    cluster,
    name: profileCol ? (row[profileCol] || '').trim() : '',
    deepSubjects: deepCol ? (row[deepCol] || '').trim() : '',
    electivesWithin: electInCol ? (row[electInCol] || '').trim() : '',
    electivesOutside: electOutCol ? (row[electOutCol] || '').trim() : '',
    studentCount: studCol ? (parseInt(row[studCol]) || 0) : 0
  };
}

function parseLyceum(row, headers) {
  const idCol = findHeader(headers, 'АІКОМ');
  const nameCol = findHeader(headers, 'Повна назва');
  const oblastCol = headers.find(h => h.trim() === 'Область');
  const localityCol = findHeader(headers, 'Місцевість');
  const onlyCol = findHeader(headers, 'єдиним ліцеєм');
  const eduCol = findHeader(headers, 'Форма навчання');
  const boardingCol = findHeader(headers, 'пансіон');
  const mountainCol = findHeader(headers, 'гірського');
  const minorityCol = findHeader(headers, 'корінних народів') || findHeader(headers, 'меншин');
  const hromadaCol = headers.find(h => h.trim() === 'Громада');
  const hromadaCodeCol = findHeader(headers, 'КАТОТТГ');
  const latCol = headers.find(h => h.trim() === 'latitude');
  const lngCol = headers.find(h => h.trim() === 'longitude');

  const id = idCol ? (row[idCol] || '').trim() : '';
  const lat = latCol ? parseFloat(row[latCol]) : NaN;
  const lng = lngCol ? parseFloat(row[lngCol]) : NaN;

  if (!id || isNaN(lat) || isNaN(lng)) return null;

  const profiles = [];
  for (let i = 1; i <= 6; i++) {
    const p = parseProfile(row, headers, i);
    if (p) profiles.push(p);
  }

  const clusters = [...new Set(profiles.map(p => p.cluster).filter(Boolean))];

  return {
    id,
    name: nameCol ? (row[nameCol] || '').trim() : '',
    oblast: oblastCol ? (row[oblastCol] || '').trim() : '',
    hromada: hromadaCol ? (row[hromadaCol] || '').trim() : '',
    hromadaCode: hromadaCodeCol ? (row[hromadaCodeCol] || '').trim() : '',
    lat,
    lng,
    locality: localityCol ? (row[localityCol] || '').trim().toLowerCase() : '',
    isOnlyLyceum: onlyCol ? parseBool(row[onlyCol]) : false,
    educationForm: eduCol ? (row[eduCol] || '').trim() : '',
    hasBoarding: boardingCol ? parseBool(row[boardingCol]) : false,
    isMountain: mountainCol ? parseBool(row[mountainCol]) : false,
    minorityLanguages: minorityCol ? parseBool(row[minorityCol]) : false,
    profiles,
    clusters
  };
}

function loadData() {
  return new Promise((resolve, reject) => {
    Papa.parse(CONFIG.SHEETS_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields || [];
        const lyceums = results.data
          .map(row => parseLyceum(row, headers))
          .filter(Boolean);
        resolve(lyceums);
      },
      error: reject
    });
  });
}

function loadGeoJSON(path) {
  return fetch(path).then(r => r.json());
}
