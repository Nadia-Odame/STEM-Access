/* ═══════════════════════════════════════════════════════════════
   STEM Access Awareness Dashboard — Main Application Script
   ═══════════════════════════════════════════════════════════════ */

let rawData = [];
let filteredData = [];
let charts = {};
let currentPage = 1;
const rowsPerPage = 10;
let sortColumn = null;
let sortDirection = 'asc';

// ─── Initialize ───
document.addEventListener('DOMContentLoaded', async () => {
  initThemeToggle();
  initScrollReveal();
  await loadData();
  populateFilters();
  applyFilters();
  initEventListeners();
});

// ─── Data Loading ───
async function loadData() {
  try {
    const response = await fetch('/api/data');
    rawData = await response.json();
    filteredData = [...rawData];
  } catch (err) {
    console.error('Failed to load data:', err);
    rawData = [];
    filteredData = [];
  }
}

// ─── Theme Toggle ───
function initThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  toggle.textContent = saved === 'dark' ? '🌙' : '☀️';

  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    toggle.textContent = next === 'dark' ? '🌙' : '☀️';
    updateChartsTheme();
  });
}

// ─── Scroll Reveal ───
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ─── Event Listeners ───
function initEventListeners() {
  document.getElementById('filterCountry').addEventListener('change', applyFilters);
  document.getElementById('filterYear').addEventListener('change', applyFilters);
  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('resetFilters').addEventListener('click', resetFilters);
  document.getElementById('downloadCsv').addEventListener('click', downloadCSV);

  document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (sortColumn === col) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortColumn = col;
        sortDirection = 'asc';
      }
      renderTable();
    });
  });
}

// ─── Filters ───
function populateFilters() {
  const countries = [...new Set(rawData.map(d => d.country))].sort();
  const years = [...new Set(rawData.map(d => d.year))].sort();

  const countrySelect = document.getElementById('filterCountry');
  countries.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    countrySelect.appendChild(opt);
  });

  const yearSelect = document.getElementById('filterYear');
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  });
}

function applyFilters() {
  const country = document.getElementById('filterCountry').value;
  const year = document.getElementById('filterYear').value;
  const search = document.getElementById('searchInput').value.toLowerCase().trim();

  filteredData = rawData.filter(d => {
    if (country !== 'all' && d.country !== country) return false;
    if (year !== 'all' && String(d.year) !== year) return false;
    if (search && !d.country.toLowerCase().includes(search)) return false;
    return true;
  });

  currentPage = 1;
  updateDashboard();
}

function resetFilters() {
  document.getElementById('filterCountry').value = 'all';
  document.getElementById('filterYear').value = 'all';
  document.getElementById('searchInput').value = '';
  applyFilters();
}

// ─── Dashboard Update ───
function updateDashboard() {
  updateStats();
  renderBarChart();
  renderPieChart();
  renderLineChart();
  renderRuralUrbanChart();
  renderHeatmap();
  renderInsights();
  renderTable();
}

// ─── Stats Cards with Animated Counters ───
function updateStats() {
  const data2023 = filteredData.filter(d => d.year === 2023);
  const latestData = data2023.length > 0 ? data2023 : filteredData;

  const countries = new Set(filteredData.map(d => d.country)).size;
  const avgGirls = latestData.length > 0
    ? (latestData.reduce((s, d) => s + d.girls_stem_enrollment, 0) / latestData.length).toFixed(1)
    : 0;
  const avgInternet = latestData.length > 0
    ? (latestData.reduce((s, d) => s + d.internet_access, 0) / latestData.length).toFixed(1)
    : 0;
  const avgGap = latestData.length > 0
    ? (latestData.reduce((s, d) => s + (d.boys_stem_enrollment - d.girls_stem_enrollment), 0) / latestData.length).toFixed(1)
    : 0;

  animateCounter('statCountries', countries, false);
  animateCounter('statEnrollment', avgGirls, true);
  animateCounter('statInternet', avgInternet, true);
  animateCounter('statGap', avgGap, true);
}

function animateCounter(id, target, hasPercent) {
  const el = document.getElementById(id);
  const targetNum = parseFloat(target);
  const duration = 1200;
  const start = performance.now();
  const startVal = 0;

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = startVal + (targetNum - startVal) * eased;

    if (Number.isInteger(targetNum) && !hasPercent) {
      el.textContent = Math.round(current);
    } else {
      el.textContent = current.toFixed(1) + (hasPercent ? '%' : '');
    }

    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// ─── Chart Helpers ───
function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    text: isDark ? '#a7a9be' : '#4a4a6a',
    grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    bg: isDark ? '#0f0e17' : '#f8f7ff',
  };
}

function chartDefaults() {
  const colors = getChartColors();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: colors.text,
          font: { family: 'Inter', size: 12, weight: '500' },
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15,14,23,0.92)',
        titleColor: '#fff',
        bodyColor: '#a7a9be',
        titleFont: { family: 'Inter', size: 13, weight: '600' },
        bodyFont: { family: 'Inter', size: 12 },
        padding: 14,
        cornerRadius: 10,
        displayColors: true,
        boxPadding: 6,
      }
    },
    scales: {
      x: {
        ticks: { color: colors.text, font: { family: 'Inter', size: 11 } },
        grid: { color: colors.grid },
        border: { display: false },
      },
      y: {
        ticks: { color: colors.text, font: { family: 'Inter', size: 11 } },
        grid: { color: colors.grid },
        border: { display: false },
      }
    }
  };
}

function destroyChart(name) {
  if (charts[name]) {
    charts[name].destroy();
    charts[name] = null;
  }
}

// ─── Color Palette ───
const palette = {
  purple: 'rgba(127,90,240,0.85)',
  green: 'rgba(44,182,125,0.85)',
  coral: 'rgba(225,97,98,0.85)',
  orange: 'rgba(255,137,6,0.85)',
  blue: 'rgba(59,130,246,0.85)',
  pink: 'rgba(236,72,153,0.85)',
  teal: 'rgba(20,184,166,0.85)',
  indigo: 'rgba(99,102,241,0.85)',
  purpleBg: 'rgba(127,90,240,0.15)',
  greenBg: 'rgba(44,182,125,0.15)',
  coralBg: 'rgba(225,97,98,0.15)',
  orangeBg: 'rgba(255,137,6,0.15)',
};

const barColors = [
  palette.purple, palette.green, palette.coral, palette.orange,
  palette.blue, palette.pink, palette.teal, palette.indigo,
  'rgba(139,92,246,0.85)', 'rgba(6,182,212,0.85)',
  'rgba(245,158,11,0.85)', 'rgba(16,185,129,0.85)',
  'rgba(239,68,68,0.85)', 'rgba(168,85,247,0.85)',
  'rgba(14,165,233,0.85)', 'rgba(249,115,22,0.85)',
  'rgba(34,197,94,0.85)', 'rgba(244,63,94,0.85)',
  'rgba(99,102,241,0.85)', 'rgba(236,72,153,0.85)',
];

// ─── Bar Chart ───
function renderBarChart() {
  destroyChart('bar');
  const data2023 = filteredData.filter(d => d.year === 2023);
  const sorted = [...data2023].sort((a, b) => b.girls_stem_enrollment - a.girls_stem_enrollment);

  const ctx = document.getElementById('barChart').getContext('2d');
  const defaults = chartDefaults();

  charts.bar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(d => d.country),
      datasets: [{
        label: 'Girls STEM Enrollment %',
        data: sorted.map(d => d.girls_stem_enrollment),
        backgroundColor: sorted.map((_, i) => barColors[i % barColors.length]),
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 40,
      }]
    },
    options: {
      ...defaults,
      indexAxis: 'y',
      plugins: {
        ...defaults.plugins,
        legend: { display: false },
      },
      scales: {
        x: {
          ...defaults.scales.x,
          title: { display: true, text: 'Enrollment %', color: getChartColors().text, font: { family: 'Inter', size: 12 } },
        },
        y: {
          ...defaults.scales.y,
          ticks: { ...defaults.scales.y.ticks, font: { family: 'Inter', size: 10 } },
        }
      }
    }
  });
}

// ─── Pie Chart ───
function renderPieChart() {
  destroyChart('pie');
  const latestData = filteredData.filter(d => d.year === 2023);
  const src = latestData.length > 0 ? latestData : filteredData;

  const totalGirls = src.reduce((s, d) => s + d.girls_stem_enrollment, 0);
  const totalBoys = src.reduce((s, d) => s + d.boys_stem_enrollment, 0);

  const ctx = document.getElementById('pieChart').getContext('2d');
  const defaults = chartDefaults();

  charts.pie = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Girls Enrollment', 'Boys Enrollment'],
      datasets: [{
        data: [totalGirls, totalBoys],
        backgroundColor: [palette.purple, palette.green],
        borderColor: ['rgba(127,90,240,0.3)', 'rgba(44,182,125,0.3)'],
        borderWidth: 2,
        hoverOffset: 12,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        ...defaults.plugins,
        legend: {
          position: 'bottom',
          labels: {
            ...defaults.plugins.legend.labels,
            padding: 20,
          }
        },
      }
    }
  });
}

// ─── Line Chart ───
function renderLineChart() {
  destroyChart('line');
  const years = [...new Set(filteredData.map(d => d.year))].sort();

  const girlsAvg = years.map(y => {
    const yearData = filteredData.filter(d => d.year === y);
    return yearData.reduce((s, d) => s + d.girls_stem_enrollment, 0) / yearData.length;
  });

  const boysAvg = years.map(y => {
    const yearData = filteredData.filter(d => d.year === y);
    return yearData.reduce((s, d) => s + d.boys_stem_enrollment, 0) / yearData.length;
  });

  const gradAvg = years.map(y => {
    const yearData = filteredData.filter(d => d.year === y);
    return yearData.reduce((s, d) => s + d.graduation_rate, 0) / yearData.length;
  });

  const ctx = document.getElementById('lineChart').getContext('2d');
  const defaults = chartDefaults();

  charts.line = new Chart(ctx, {
    type: 'line',
    data: {
      labels: years,
      datasets: [
        {
          label: 'Girls Avg Enrollment',
          data: girlsAvg,
          borderColor: palette.purple,
          backgroundColor: palette.purpleBg,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: palette.purple,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          borderWidth: 3,
        },
        {
          label: 'Boys Avg Enrollment',
          data: boysAvg,
          borderColor: palette.green,
          backgroundColor: palette.greenBg,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: palette.green,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          borderWidth: 3,
        },
        {
          label: 'Avg Graduation Rate',
          data: gradAvg,
          borderColor: palette.orange,
          backgroundColor: palette.orangeBg,
          fill: false,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: palette.orange,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          borderWidth: 2,
          borderDash: [6, 4],
        }
      ]
    },
    options: {
      ...defaults,
      plugins: {
        ...defaults.plugins,
        legend: {
          ...defaults.plugins.legend,
          position: 'top',
        }
      },
      scales: {
        x: {
          ...defaults.scales.x,
          title: { display: true, text: 'Year', color: getChartColors().text, font: { family: 'Inter', size: 12 } },
        },
        y: {
          ...defaults.scales.y,
          title: { display: true, text: 'Percentage (%)', color: getChartColors().text, font: { family: 'Inter', size: 12 } },
          beginAtZero: false,
        }
      },
      interaction: {
        intersect: false,
        mode: 'index',
      }
    }
  });
}

// ─── Rural vs Urban Chart ───
function renderRuralUrbanChart() {
  destroyChart('ruralUrban');
  const data2023 = filteredData.filter(d => d.year === 2023);
  const sorted = [...data2023].sort((a, b) => b.urban_access_rate - a.urban_access_rate).slice(0, 10);

  const ctx = document.getElementById('ruralUrbanChart').getContext('2d');
  const defaults = chartDefaults();

  charts.ruralUrban = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(d => d.country),
      datasets: [
        {
          label: 'Rural Access %',
          data: sorted.map(d => d.rural_access_rate),
          backgroundColor: palette.coral,
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: 'Urban Access %',
          data: sorted.map(d => d.urban_access_rate),
          backgroundColor: palette.blue,
          borderRadius: 4,
          borderSkipped: false,
        }
      ]
    },
    options: {
      ...defaults,
      plugins: {
        ...defaults.plugins,
        legend: {
          ...defaults.plugins.legend,
          position: 'top',
        }
      },
      scales: {
        x: {
          ...defaults.scales.x,
          ticks: { ...defaults.scales.x.ticks, maxRotation: 45, minRotation: 30 },
        },
        y: {
          ...defaults.scales.y,
          title: { display: true, text: 'Access Rate %', color: getChartColors().text, font: { family: 'Inter', size: 12 } },
        }
      }
    }
  });
}

// ─── Heatmap ───
function renderHeatmap() {
  const countries = [...new Set(filteredData.map(d => d.country))].sort();
  const years = [...new Set(filteredData.map(d => d.year))].sort();

  const thead = document.querySelector('#heatmapTable thead');
  const tbody = document.querySelector('#heatmapTable tbody');
  thead.innerHTML = '';
  tbody.innerHTML = '';

  const headerRow = document.createElement('tr');
  headerRow.innerHTML = '<th>Country</th>' + years.map(y => `<th>${y}</th>`).join('');
  thead.appendChild(headerRow);

  const allValues = filteredData.map(d => d.stem_funding_index);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);

  countries.forEach(country => {
    const row = document.createElement('tr');
    let html = `<td>${country}</td>`;
    years.forEach(year => {
      const record = filteredData.find(d => d.country === country && d.year === year);
      if (record) {
        const val = record.stem_funding_index;
        const ratio = (val - minVal) / (maxVal - minVal || 1);
        const color = heatmapColor(ratio);
        html += `<td style="background:${color};color:${ratio > 0.5 ? '#fff' : '#1a1a2e'}" title="${country} (${year}): ${val}">${val}</td>`;
      } else {
        html += '<td>—</td>';
      }
    });
    row.innerHTML = html;
    tbody.appendChild(row);
  });
}

function heatmapColor(ratio) {
  if (ratio < 0.25) return `rgba(225,97,98,${0.3 + ratio * 2})`;
  if (ratio < 0.5) return `rgba(255,137,6,${0.3 + ratio * 1.2})`;
  if (ratio < 0.75) return `rgba(44,182,125,${0.3 + ratio * 0.8})`;
  return `rgba(127,90,240,${0.4 + ratio * 0.5})`;
}

// ─── Insights ───
function renderInsights() {
  const grid = document.getElementById('insightsGrid');
  grid.innerHTML = '';

  const data2023 = filteredData.filter(d => d.year === 2023);
  const data2019 = filteredData.filter(d => d.year === 2019);
  const src = data2023.length > 0 ? data2023 : filteredData;

  const topCountry = [...src].sort((a, b) => b.girls_stem_enrollment - a.girls_stem_enrollment)[0];
  const bottomCountry = [...src].sort((a, b) => a.girls_stem_enrollment - b.girls_stem_enrollment)[0];
  const avgGap = src.length > 0
    ? (src.reduce((s, d) => s + (d.boys_stem_enrollment - d.girls_stem_enrollment), 0) / src.length).toFixed(1)
    : 0;

  const avgRural = src.length > 0
    ? (src.reduce((s, d) => s + d.rural_access_rate, 0) / src.length).toFixed(1)
    : 0;
  const avgUrban = src.length > 0
    ? (src.reduce((s, d) => s + d.urban_access_rate, 0) / src.length).toFixed(1)
    : 0;

  let growthInsight = '';
  if (data2019.length > 0 && data2023.length > 0) {
    const avg19 = data2019.reduce((s, d) => s + d.girls_stem_enrollment, 0) / data2019.length;
    const avg23 = data2023.reduce((s, d) => s + d.girls_stem_enrollment, 0) / data2023.length;
    const growth = ((avg23 - avg19) / avg19 * 100).toFixed(1);
    growthInsight = `Girls' STEM enrollment has grown by ${growth}% on average between 2019 and 2023 across tracked countries, demonstrating encouraging progress toward gender parity.`;
  }

  const insights = [
    {
      icon: '🏆',
      title: 'Highest Girls Enrollment',
      text: topCountry
        ? `${topCountry.country} leads with ${topCountry.girls_stem_enrollment}% girls STEM enrollment, setting a benchmark for other nations to follow in closing the gender gap.`
        : 'No data available for the selected filters.',
      metric: topCountry ? `${topCountry.girls_stem_enrollment}%` : '—',
    },
    {
      icon: '⚠️',
      title: 'Region Needing Improvement',
      text: bottomCountry
        ? `${bottomCountry.country} has the lowest girls STEM enrollment at ${bottomCountry.girls_stem_enrollment}%. Targeted investment in infrastructure, internet access, and teacher training could significantly improve outcomes.`
        : 'No data available.',
      metric: bottomCountry ? `${bottomCountry.girls_stem_enrollment}%` : '—',
    },
    {
      icon: '📊',
      title: 'Gender Gap Analysis',
      text: `The average gender gap across all tracked countries stands at ${avgGap} percentage points. While significant progress has been made, systemic barriers in curriculum design, mentorship access, and cultural norms continue to impede full parity.`,
      metric: `${avgGap}pp gap`,
    },
    {
      icon: '🏙️',
      title: 'Urban vs Rural Divide',
      text: `Urban areas average ${avgUrban}% STEM access compared to just ${avgRural}% in rural regions — a ${(avgUrban - avgRural).toFixed(1)} percentage-point gap highlighting the critical need for decentralized STEM infrastructure and digital learning platforms.`,
      metric: `${(avgUrban - avgRural).toFixed(1)}pp divide`,
    },
    {
      icon: '📈',
      title: 'Growth Trajectory',
      text: growthInsight || 'Select "All Years" to see growth trends across the full time range.',
      metric: growthInsight ? '↑ Positive Trend' : '—',
    },
    {
      icon: '🌐',
      title: 'Internet as an Enabler',
      text: `Countries with higher internet access rates consistently show stronger STEM enrollment. The average internet access across tracked nations is ${(src.reduce((s, d) => s + d.internet_access, 0) / (src.length || 1)).toFixed(1)}%, but the disparity between high-income and low-income countries remains stark.`,
      metric: `${(src.reduce((s, d) => s + d.internet_access, 0) / (src.length || 1)).toFixed(1)}% avg`,
    }
  ];

  insights.forEach(ins => {
    const card = document.createElement('div');
    card.className = 'insight-card reveal';
    card.innerHTML = `
      <div class="insight-icon">${ins.icon}</div>
      <h3 class="insight-title">${ins.title}</h3>
      <p class="insight-text">${ins.text}</p>
      <div class="insight-metric">📌 ${ins.metric}</div>
    `;
    grid.appendChild(card);
  });

  // Re-observe new reveal elements
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  grid.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ─── Data Table ───
function renderTable() {
  let data = [...filteredData];

  if (sortColumn) {
    data.sort((a, b) => {
      let va = a[sortColumn];
      let vb = b[sortColumn];
      if (typeof va === 'string') {
        va = va.toLowerCase();
        vb = vb.toLowerCase();
        return sortDirection === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDirection === 'asc' ? va - vb : vb - va;
    });
  }

  const totalPages = Math.ceil(data.length / rowsPerPage) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * rowsPerPage;
  const pageData = data.slice(start, start + rowsPerPage);

  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  pageData.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.country}</td>
      <td>${d.year}</td>
      <td>${d.girls_stem_enrollment}%</td>
      <td>${d.boys_stem_enrollment}%</td>
      <td>${d.rural_access_rate}%</td>
      <td>${d.urban_access_rate}%</td>
      <td>${d.internet_access}%</td>
      <td>${d.graduation_rate}%</td>
      <td>${d.stem_funding_index}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('tableInfo').textContent =
    `Showing ${start + 1}–${Math.min(start + rowsPerPage, data.length)} of ${data.length} entries`;

  document.getElementById('paginationInfo').textContent =
    `Page ${currentPage} of ${totalPages}`;

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const controls = document.getElementById('paginationControls');
  controls.innerHTML = '';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'pagination-btn';
  prevBtn.textContent = '← Prev';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => { currentPage--; renderTable(); });
  controls.appendChild(prevBtn);

  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.className = 'pagination-btn' + (i === currentPage ? ' active' : '');
    btn.textContent = i;
    btn.addEventListener('click', () => { currentPage = i; renderTable(); });
    controls.appendChild(btn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = 'pagination-btn';
  nextBtn.textContent = 'Next →';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => { currentPage++; renderTable(); });
  controls.appendChild(nextBtn);
}

// ─── CSV Download ───
function downloadCSV() {
  const headers = [
    'country', 'year', 'girls_stem_enrollment', 'boys_stem_enrollment',
    'rural_access_rate', 'urban_access_rate', 'internet_access',
    'graduation_rate', 'stem_funding_index'
  ];

  let csv = headers.join(',') + '\n';
  filteredData.forEach(d => {
    csv += headers.map(h => d[h]).join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'stem_access_data_filtered.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Theme Update for Charts ───
function updateChartsTheme() {
  renderBarChart();
  renderPieChart();
  renderLineChart();
  renderRuralUrbanChart();
}
