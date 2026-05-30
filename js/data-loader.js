/* =====================================================
   THE LORE VAULT — Dynamic Data Renderer
   Reads window.setsData and window.promosData and
   builds all card tables + accordions at runtime.
   ===================================================== */

'use strict';

const INK_COLORS = {
  Amber:    '#C4680A',
  Amethyst: '#6B28B8',
  Emerald:  '#0B7A56',
  Ruby:     '#B8182E',
  Sapphire: '#1458A8',
  Steel:    '#48566C',
};

/* Treatment classes for badge styling */
const TREATMENT_CLASSES = {
  Foil:       'treatment--foil',
  NonFoil:    'treatment--nonfoil',
  Enchanted:  'treatment--enchanted',
  FullArt:    'treatment--fullart',
  Glimmer:    'treatment--glimmer',
  Serialized: 'treatment--serialized',
  Signature:  'treatment--signature',
};

/* Ink abbreviation map — supports old (A/M/E/R/S/T) and new (P/Y/G/B/R/S) codes */
const INK_ABBREV = {
  A: 'Amber',    Y: 'Amber',
  M: 'Amethyst', P: 'Amethyst',
  E: 'Emerald',  G: 'Emerald',
  R: 'Ruby',
  S: 'Sapphire', B: 'Sapphire',
  T: 'Steel',
};

/* ── Extract treatment from rarity string ────────────────────────────
   "[Foil] Some source text"  →  "Foil"
   "D23 Expo promo"           →  ""    (no brackets = no treatment tag)
*/
function extractTreatment(rarity) {
  if (!rarity) return '';
  const m = rarity.match(/^\[([^\]]+)\]/);
  return m ? m[1] : '';
}

/* ── Ink pip helper ── */
function inkPip(ink) {
  if (!ink || ink === '???') return `<span style="color:var(--text-light)">—</span>`;

  if (ink.startsWith('DualInk')) {
    const match = ink.match(/\((\w)(\w)\)/);
    if (match) {
      const c1 = INK_COLORS[INK_ABBREV[match[1]] || ''] || '#999';
      const c2 = INK_COLORS[INK_ABBREV[match[2]] || ''] || '#999';
      return `<span class="flex items-center gap-8">
        <span style="display:inline-flex">
          <span style="width:12px;height:12px;border-radius:50%;background:${c1};display:inline-block;border:1px solid rgba(0,0,0,.15)"></span>
          <span style="width:12px;height:12px;border-radius:50%;background:${c2};display:inline-block;margin-left:-4px;border:1px solid rgba(0,0,0,.15)"></span>
        </span>
        <span>${ink}</span>
      </span>`;
    }
  }

  const color = INK_COLORS[ink] || '#999';
  return `<span class="flex items-center gap-8">
    <span style="width:12px;height:12px;border-radius:50%;background:${color};display:inline-block;border:1px solid rgba(0,0,0,.15);flex-shrink:0"></span>
    ${ink}
  </span>`;
}

/* ── Rarity cell: badge for treatment + source text ── */
function rarityCell(rarity) {
  if (!rarity || rarity === '???') return `<span style="color:var(--text-light)">—</span>`;
  const treatment = extractTreatment(rarity);
  if (!treatment) return esc(rarity);
  const cls = TREATMENT_CLASSES[treatment] || '';
  const source = rarity.replace(/^\[[^\]]+\]\s*/, '');
  return `<span class="treatment ${cls}">${esc(treatment)}</span> <span style="font-family:'DM Sans',sans-serif;font-size:0.82rem;color:var(--text-mid)">${esc(source)}</span>`;
}

/* ── Escape HTML ── */
function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/* =========================================
   SETS — build accordion list
   ========================================= */
function buildSetsAccordions(containerId) {
  const container = document.getElementById(containerId);
  if (!container || !window.setsData) return;

  container.innerHTML = '';

  window.setsData.forEach((set, idx) => {
    const isFirst = idx === 0;
    const relYear = set.release ? set.release.replace(/(\d{4})-(\d{2})/, (_, y, m) => {
      const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${months[parseInt(m)]} ${y}`;
    }) : '';

    const rows = set.cards.map(c => `
      <tr class="filterable-row">
        <td class="checkbox-col"><input type="checkbox" data-id="s${set.num}-${esc(c.num)}" aria-label="Mark ${esc(c.name)} collected"></td>
        <td><span class="card-num">${esc(c.num)}</span></td>
        <td>${esc(c.name)}</td>
        <td>${inkPip(c.ink)}</td>
        <td>${esc(c.type)}</td>
        <td>${esc(c.rarity)}</td>
      </tr>`).join('');

    const noteRow = set.cards.length < set.count
      ? `<tr><td colspan="6" style="padding:12px 16px;font-family:'DM Sans',sans-serif;font-size:0.78rem;color:var(--text-light);font-style:italic;text-align:center;">
           Showing ${set.cards.length} key cards · ${set.count - set.cards.length} additional commons &amp; uncommons to be catalogued
         </td></tr>`
      : '';

    container.insertAdjacentHTML('beforeend', `
      <div class="accordion" data-set="${set.num}">
        <button class="accordion-header${isFirst ? ' open' : ''}" aria-expanded="${isFirst}">
          <div class="accordion-set-badge">${esc(set.code)}</div>
          <h3>${esc(set.name)}</h3>
          <div class="accordion-meta">
            <span>Set ${set.num}</span>
            <span>${relYear}</span>
            <span>${set.count} cards</span>
          </div>
          <span class="accordion-chevron" aria-hidden="true">▾</span>
        </button>
        <div class="accordion-body${isFirst ? ' open' : ''}">
          <div class="data-table-wrap">
            <table class="data-table" aria-label="${esc(set.name)} cards">
              <thead><tr>
                <th class="checkbox-col"><span class="sr-only">Collected</span></th>
                <th>Card #</th><th>Card Name</th><th>Ink</th><th>Type</th><th>Rarity</th>
              </tr></thead>
              <tbody>${rows}${noteRow}</tbody>
            </table>
          </div>
        </div>
      </div>`);
  });

  if (typeof initAccordions === 'function') initAccordions();
  if (typeof initCheckboxPersistence === 'function') initCheckboxPersistence();
}

/* =========================================
   PROMOS — build series blocks
   ========================================= */
const SERIES_META = {
  P1:  { label:'P1',  name:'Season 1 Promos',              count:41 },
  P2:  { label:'P2',  name:'Season 2 Promos',              count:43 },
  P3:  { label:'P3',  name:'Season 3 Promos',              count:48 },
  C1:  { label:'C1',  name:'Season 1 Tournament Promos',   count:15 },
  C2:  { label:'C2',  name:'Season 2 Tournament Promos',   count:10 },
  D23: { label:'D23', name:'D23 Collection Promos',        count:9  },
  DIS: { label:'DIS', name:'Disney Park Promos',           count:3  },
};

function buildPromoBlocks(containerId) {
  const container = document.getElementById(containerId);
  if (!container || !window.promosData) return;

  container.innerHTML = '';

  Object.entries(window.promosData).forEach(([key, cards]) => {
    const meta = SERIES_META[key] || { label: key, name: key, count: cards.length };

    const rows = cards.map((c, rowIdx) => {
      const isUnconfirmed = !!c.unconfirmed;
      const isPlaceholder = !!c.placeholder;
      const rowClass = isPlaceholder
        ? 'filterable-row placeholder'
        : isUnconfirmed ? 'filterable-row unconfirmed' : 'filterable-row';
      const checkDisabled = isPlaceholder ? ' disabled' : '';

      /* Unique checkbox ID — appends series+index to handle same num, different treatment */
      const checkId = `promo-${key}-${rowIdx}`;

      const treatment = extractTreatment(c.rarity);
      const inkVal    = (c.ink || '').toLowerCase().replace(/\s*\(.*\)/, '').trim();

      const nameTd = isPlaceholder
        ? `<em class="muted">⏳ Not yet revealed</em>`
        : `${esc(c.name)}${isUnconfirmed
            ? ' &nbsp;<span class="badge badge--ruby" style="font-size:0.58rem">⚠ Possibly Never Released</span>'
            : ''}`;

      const inkTd    = (isPlaceholder || c.ink === '???') ? '—' : inkPip(c.ink);
      const rarityTd = isPlaceholder ? `<em class="muted">${esc(c.rarity)}</em>` : rarityCell(c.rarity);
      const regionBadge = c.region
        ? ` <span class="badge badge--steel" style="font-size:0.55rem">${c.region}</span>` : '';

      return `
        <tr class="${rowClass}" data-treatment="${esc(treatment.toLowerCase())}" data-ink="${esc(inkVal)}">
          <td class="checkbox-col"><input type="checkbox" data-id="${esc(checkId)}"${checkDisabled} aria-label="Mark ${esc(c.name)} collected"></td>
          <td><span class="card-num">${esc(c.num)}</span>${regionBadge}</td>
          <td>${nameTd}</td>
          <td>${inkTd}</td>
          <td>${rarityTd}</td>
        </tr>`;
    }).join('');

    container.insertAdjacentHTML('beforeend', `
      <div class="series-block" data-series="${key}">
        <div class="series-header">
          <div>
            <span class="series-header__code">${esc(meta.label)}</span>
            <span class="series-header__name"> — ${esc(meta.name)}</span>
            <span class="series-header__count"> · ${meta.count} cards</span>
          </div>
          <a href="#" class="btn btn--secondary" style="font-size:0.68rem;padding:8px 14px">⬇ ${key} PDF</a>
        </div>
        <div class="data-table-wrap">
          <table class="data-table" aria-label="${esc(meta.label)} promo cards">
            <thead><tr>
              <th class="checkbox-col"><span class="sr-only">Collected</span></th>
              <th>Collector #</th><th>Card Name</th><th>Ink</th><th>Rarity / Source</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`);
  });

  if (typeof initCheckboxPersistence === 'function') initCheckboxPersistence();
  if (typeof initSeriesTabs === 'function') initSeriesTabs();
}

/* =========================================
   STATS — update count badges
   ========================================= */
function updateStats() {
  if (window.promosData) {
    const total = Object.values(window.promosData)
      .reduce((n, arr) => n + arr.filter(c => !c.placeholder).length, 0);
    document.querySelectorAll('[data-stat="promo-count"]').forEach(el => el.textContent = total);
  }
  if (window.setsData) {
    const total = window.setsData.reduce((n, s) => n + s.count, 0);
    document.querySelectorAll('[data-stat="set-count"]').forEach(el => el.textContent = total.toLocaleString());
  }
}

/* =========================================
   SEARCH — live filter across active tab
   ========================================= */
document.addEventListener('input', e => {
  if (!e.target.matches('.filter-search')) return;
  const q = e.target.value.toLowerCase().trim();
  const scope = e.target.closest('[data-filterable]') || document;
  scope.querySelectorAll('.filterable-row').forEach(row => {
    row.style.display = (!q || row.textContent.toLowerCase().includes(q)) ? '' : 'none';
  });
});

/* =========================================
   INIT on page load
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('setsAccordionContainer')) buildSetsAccordions('setsAccordionContainer');
  if (document.getElementById('promosBlockContainer'))   buildPromoBlocks('promosBlockContainer');
  updateStats();
});
