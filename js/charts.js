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
