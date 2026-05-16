let clusterChart = null;
let eduChart = null;

function initCharts() {
  const clusterCtx = document.getElementById('chart-clusters');
  const eduCtx = document.getElementById('chart-edu');
  if (!clusterCtx || !eduCtx) return;

  const clusterKeys = Object.keys(CONFIG.CLUSTER_LABELS);
  const clusterColors = clusterKeys.map(k => CONFIG.CLUSTER_COLORS[k] || CONFIG.CLUSTER_COLORS.default);

  clusterChart = new Chart(clusterCtx, {
    type: 'doughnut',
    data: {
      labels: clusterKeys,
      datasets: [{
        data: clusterKeys.map(() => 0),
        backgroundColor: clusterColors,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: 'Inter', size: 10 },
            padding: 8,
            boxWidth: 10,
            boxHeight: 10
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw}`
          }
        }
      },
      cutout: '55%'
    }
  });

  eduChart = new Chart(eduCtx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: '#1a56db',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.raw} ліцеїв`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 10 } }
        },
        y: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 10 } }
        }
      }
    }
  });
}

function updateCharts(lyceums) {
  if (!clusterChart || !eduChart) return;

  const clusterKeys = Object.keys(CONFIG.CLUSTER_LABELS);
  const clusterCounts = clusterKeys.map(k =>
    lyceums.filter(l => l.clusters.includes(k)).length
  );
  clusterChart.data.datasets[0].data = clusterCounts;
  clusterChart.update('none');

  const eduMap = {};
  lyceums.forEach(l => {
    const f = l.educationForm || 'Не вказано';
    eduMap[f] = (eduMap[f] || 0) + 1;
  });
  const eduEntries = Object.entries(eduMap).sort((a, b) => b[1] - a[1]);
  eduChart.data.labels = eduEntries.map(([k]) => k);
  eduChart.data.datasets[0].data = eduEntries.map(([, v]) => v);
  eduChart.update('none');
}
