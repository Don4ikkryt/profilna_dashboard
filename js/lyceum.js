function yesNo(val) {
  return val
    ? '<span class="badge-yes">Так</span>'
    : '<span class="badge-no">Ні</span>';
}

function renderInfoTable(lyceum) {
  const rows = [
    ['Область', lyceum.oblast],
    ['Громада', lyceum.hromada],
    ['Місцевість', lyceum.locality ? (lyceum.locality.charAt(0).toUpperCase() + lyceum.locality.slice(1)) : '—'],
    ['Єдиний ліцей у громаді', yesNo(lyceum.isOnlyLyceum)],
    ['Форма навчання', lyceum.educationForm || '—'],
    ['Наявність пансіону', yesNo(lyceum.hasBoarding)],
    ['Гірський заклад', yesNo(lyceum.isMountain)],
    ['Навчання мовами нацменшин', yesNo(lyceum.minorityLanguages)]
  ];

  return `
    <table class="info-table">
      <tbody>
        ${rows.map(([label, val]) => `
          <tr>
            <td>${label}</td>
            <td>${val}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderProfiles(profiles) {
  if (!profiles || profiles.length === 0) {
    return '<div style="padding:16px 20px;color:var(--gray-500)">Інформація про профілі відсутня</div>';
  }

  return `
    <div class="profiles-grid">
      ${profiles.map(p => {
        const color = getClusterColor(p.cluster);
        return `
          <div class="profile-card">
            <div class="profile-header">
              <div class="profile-name">${p.name || 'Профіль'}</div>
              <span class="profile-cluster-badge" style="background:${color}">${p.cluster}</span>
              ${p.studentCount ? `<span class="profile-students">👥 ${p.studentCount} учн.</span>` : ''}
            </div>
            ${p.deepSubjects ? `
              <div class="profile-row">
                <div class="profile-row-label">Предмети поглибленого рівня</div>
                <div class="profile-row-value">${p.deepSubjects}</div>
              </div>
            ` : ''}
            ${p.electivesWithin ? `
              <div class="profile-row">
                <div class="profile-row-label">Вибіркові в межах профілю</div>
                <div class="profile-row-value">${p.electivesWithin}</div>
              </div>
            ` : ''}
            ${p.electivesOutside ? `
              <div class="profile-row">
                <div class="profile-row-label">Вибіркові поза профілем</div>
                <div class="profile-row-value">${p.electivesOutside}</div>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderPage(lyceum) {
  document.title = lyceum.name + ' — Академічні ліцеї';

  document.getElementById('lyceum-name').textContent = lyceum.name;
  document.getElementById('lyceum-oblast').textContent = lyceum.oblast || '';
  document.getElementById('lyceum-id').textContent = `АІКОМ ID: ${lyceum.id}`;

  document.getElementById('section-info').innerHTML = renderInfoTable(lyceum);
  document.getElementById('section-profiles').innerHTML = renderProfiles(lyceum.profiles);
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    document.getElementById('main-content').innerHTML = '<div class="error-msg">Ліцей не знайдено. <a href="index.html">← Повернутись на карту</a></div>';
    return;
  }

  try {
    const lyceums = await loadData();
    const lyceum = lyceums.find(l => l.id === id);

    if (!lyceum) {
      document.getElementById('main-content').innerHTML = `<div class="error-msg">Ліцей з ID ${id} не знайдено. <a href="index.html">← Повернутись на карту</a></div>`;
      return;
    }

    document.getElementById('loading-overlay').classList.add('hidden');
    renderPage(lyceum);
  } catch (err) {
    console.error(err);
    document.getElementById('loading-overlay').innerHTML = '<div class="error-msg">⚠️ Не вдалося завантажити дані.</div>';
  }
}

document.addEventListener('DOMContentLoaded', init);
