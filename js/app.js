/* =====================================================
   THE LORE VAULT — Shared JavaScript
   ===================================================== */

'use strict';

/* ── Navigation ── */
document.addEventListener('DOMContentLoaded', () => {

  // Hamburger / mobile drawer
  const hamburger = document.getElementById('hamburger');
  const drawer    = document.getElementById('mobileDrawer');
  if (hamburger && drawer) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      drawer.classList.toggle('open');
      document.body.style.overflow = drawer.classList.contains('open') ? 'hidden' : '';
    });
    // Close on link click
    drawer.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hamburger.classList.remove('open');
        drawer.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Nav search toggle
  const searchToggle = document.getElementById('navSearchToggle');
  const searchBar    = document.getElementById('navSearchBar');
  if (searchToggle && searchBar) {
    searchToggle.addEventListener('click', () => {
      searchBar.classList.toggle('open');
      if (searchBar.classList.contains('open')) {
        searchBar.querySelector('input')?.focus();
      }
    });
  }

  // Active nav link
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-drawer a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

  // Tabs (Cards page)
  initTabs();

  // Accordions
  initAccordions();

  // Series sub-tabs (Promos)
  initSeriesTabs();

  // Jump nav (Other page) + IntersectionObserver
  initJumpNav();

  // Filter chips
  initFilterChips();

  // Checkbox state persistence
  initCheckboxPersistence();

  // Suggested search chips
  initSearchChips();
});

/* ── Tabs ── */
function initTabs() {
  document.querySelectorAll('.tabs-bar').forEach(bar => {
    bar.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        bar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const container = bar.closest('.tabs-container') || document;
        container.querySelectorAll('.tab-panel').forEach(panel => {
          panel.classList.toggle('active', panel.id === target);
        });
      });
    });
  });
}

/* ── Accordions ── */
function initAccordions() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const body = header.nextElementSibling;
      const isOpen = header.classList.contains('open');
      header.classList.toggle('open', !isOpen);
      body.classList.toggle('open', !isOpen);
    });
  });
}

/* ── Series Sub-tabs ── */
function initSeriesTabs() {
  document.querySelectorAll('.series-tabs').forEach(tabs => {
    tabs.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const series = chip.dataset.series;
        tabs.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const panel = chip.closest('.tab-panel') || document;
        panel.querySelectorAll('.series-block').forEach(block => {
          if (series === 'all') {
            block.classList.remove('hidden');
          } else {
            block.classList.toggle('hidden', block.dataset.series !== series);
          }
        });
      });
    });
  });
}

/* ── Jump Nav (Other page) ── */
function initJumpNav() {
  const jumpLinks = document.querySelectorAll('.jump-link');
  if (!jumpLinks.length) return;

  jumpLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        const offset = 64 + 50; // nav + jump nav height
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // Highlight active section on scroll
  const sections = Array.from(jumpLinks).map(l => document.querySelector(l.getAttribute('href'))).filter(Boolean);
  if (!sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = '#' + entry.target.id;
        jumpLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === id));
      }
    });
  }, { rootMargin: '-64px 0px -60% 0px', threshold: 0 });

  sections.forEach(s => observer.observe(s));
}

/* ── Filter Chips ── */
function initFilterChips() {
  document.querySelectorAll('.filter-row').forEach(row => {
    row.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        // For single-select groups
        if (chip.dataset.group) {
          row.querySelectorAll(`.chip[data-group="${chip.dataset.group}"]`).forEach(c => c.classList.remove('active'));
        }
        chip.classList.toggle('active');
        applyFilters(chip.closest('[data-filterable]') || document);
      });
    });
  });
}

function applyFilters(scope) {
  const searchInput = scope.querySelector?.('.filter-search');
  const query = searchInput?.value.toLowerCase().trim() || '';

  const activeChips = {};
  scope.querySelectorAll?.('.chip.active[data-filter-key]').forEach(chip => {
    const key = chip.dataset.filterKey;
    if (!activeChips[key]) activeChips[key] = [];
    activeChips[key].push(chip.dataset.filterVal?.toLowerCase());
  });

  scope.querySelectorAll?.('.filterable-row').forEach(row => {
    let show = true;
    const text = row.textContent.toLowerCase();
    if (query && !text.includes(query)) show = false;
    Object.entries(activeChips).forEach(([key, vals]) => {
      const rowVal = row.dataset[key]?.toLowerCase();
      if (!vals.includes(rowVal)) show = false;
    });
    row.style.display = show ? '' : 'none';
  });
}

/* ── Live search (in-page) ── */
document.addEventListener('input', e => {
  if (e.target.matches('.filter-search')) {
    const query = e.target.value.toLowerCase().trim();
    const scope = e.target.closest('[data-filterable]') || document;
    scope.querySelectorAll('.filterable-row').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
  }
});

/* ── Suggested Search Chips ── */
function initSearchChips() {
  document.querySelectorAll('.suggested-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.textContent.trim();
      const input = chip.closest('.hero-search-panel, .search-panel')?.querySelector('input');
      if (input) {
        input.value = query;
        input.focus();
      }
    });
  });
}

/* ── Checkbox Persistence (localStorage) ── */
function initCheckboxPersistence() {
  const STORAGE_KEY = 'lore-vault-checked';
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) {}

  document.querySelectorAll('input[type="checkbox"][data-id]').forEach(cb => {
    const id = cb.dataset.id;
    if (stored[id]) cb.checked = true;
    cb.addEventListener('change', () => {
      stored[id] = cb.checked;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stored)); } catch (e) {}
    });
  });
}

/* ── Utility: debounce ── */
function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
