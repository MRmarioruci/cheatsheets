(function () {
  'use strict';

  /* ── Tab / panel switching ── */
  function initTabs() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const panels  = document.querySelectorAll('.panel');

    function activate(tabId) {
      navBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
      panels.forEach(p  => p.classList.toggle('active',  p.id === 'p-' + tabId));
      // Update topbar title
      const active = document.querySelector('.nav-btn.active');
      const titleEl = document.querySelector('.page-title');
      if (active && titleEl) titleEl.textContent = active.textContent.trim();
      // Persist
      try { localStorage.setItem('activeTab', tabId); } catch (e) {}
    }

    navBtns.forEach(btn => {
      btn.addEventListener('click', () => activate(btn.dataset.tab));
    });

    // Restore last tab or default to first
    let saved;
    try { saved = localStorage.getItem('activeTab'); } catch (e) {}
    const first = navBtns[0];
    if (saved && document.getElementById('p-' + saved)) {
      activate(saved);
    } else if (first) {
      activate(first.dataset.tab);
    }
  }

  /* ── Copy buttons on code blocks ── */
  function initCopyButtons() {
    document.querySelectorAll('pre').forEach(pre => {
      const wrap = document.createElement('div');
      wrap.className = 'pre-wrap';
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);

      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = 'copy';
      wrap.appendChild(btn);

      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(pre.innerText);
          btn.textContent = 'copied!';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = 'copy';
            btn.classList.remove('copied');
          }, 1800);
        } catch (e) {
          // Fallback for browsers without clipboard API
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(pre);
          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand('copy');
          sel.removeAllRanges();
          btn.textContent = 'copied!';
          setTimeout(() => { btn.textContent = 'copy'; }, 1800);
        }
      });
    });
  }

  /* ── Search / highlight ── */
  function initSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;

    let debounceTimer;
    let originalContent = new Map(); // cache panel originalHTML

    function clearHighlights() {
      document.querySelectorAll('.panel').forEach(panel => {
        const orig = originalContent.get(panel.id);
        if (orig) panel.innerHTML = orig;
      });
    }

    function highlightText(el, query) {
      if (!query) return;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          // Skip script, style, code (keep pre readable), button text in nav
          const tag = node.parentElement.tagName;
          if (['SCRIPT', 'STYLE', 'BUTTON'].includes(tag)) return NodeFilter.FILTER_REJECT;
          return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }
      });

      const nodes = [];
      let node;
      while ((node = walker.nextNode())) nodes.push(node);

      const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      nodes.forEach(n => {
        if (!re.test(n.textContent)) return;
        re.lastIndex = 0;
        const frag = document.createDocumentFragment();
        const parts = n.textContent.split(re);
        re.lastIndex = 0;
        parts.forEach(part => {
          if (re.test(part)) {
            const mark = document.createElement('mark');
            mark.className = 'highlight';
            mark.textContent = part;
            frag.appendChild(mark);
          } else {
            frag.appendChild(document.createTextNode(part));
          }
          re.lastIndex = 0;
        });
        n.parentNode.replaceChild(frag, n);
      });
    }

    function findAndShowPanel(query) {
      if (!query) {
        clearHighlights();
        return;
      }
      const panels = document.querySelectorAll('.panel');
      let firstMatch = null;

      panels.forEach(panel => {
        // Cache original HTML before first modification
        if (!originalContent.has(panel.id)) {
          originalContent.set(panel.id, panel.innerHTML);
        } else {
          panel.innerHTML = originalContent.get(panel.id);
        }
        if (panel.innerText.toLowerCase().includes(query.toLowerCase())) {
          highlightText(panel, query);
          if (!firstMatch) firstMatch = panel.id.replace('p-', '');
        }
      });

      if (firstMatch) {
        const btn = document.querySelector(`.nav-btn[data-tab="${firstMatch}"]`);
        if (btn) btn.click();
      }
    }

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const q = input.value.trim();
        if (!q) { clearHighlights(); return; }
        findAndShowPanel(q);
      }, 220);
    });

    // Clear on Escape
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { input.value = ''; clearHighlights(); input.blur(); }
    });
  }

  /* ── Mobile sidebar toggle ── */
  function initMobileNav() {
    const toggle = document.getElementById('mobile-nav-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (!toggle || !sidebar) return;

    toggle.addEventListener('click', () => sidebar.classList.toggle('open'));

    // Close when clicking a nav button on mobile
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.innerWidth <= 700) sidebar.classList.remove('open');
      });
    });

    // Close when clicking outside
    document.addEventListener('click', e => {
      if (sidebar.classList.contains('open') &&
          !sidebar.contains(e.target) &&
          e.target !== toggle) {
        sidebar.classList.remove('open');
      }
    });
  }

  /* ── Keyboard shortcuts ── */
  function initKeyboard() {
    document.addEventListener('keydown', e => {
      // Cmd/Ctrl + K → focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('search-input');
        if (input) { input.focus(); input.select(); }
      }
    });
  }

  /* ── Active nav on scroll (optional — useful if panels are long) ── */
  function initScrollSpy() {
    // Only meaningful if panels stack vertically (not tab-based)
    // Skipped for tab layout — tabs handle their own activation
  }

  /* ── Boot ── */
  document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initCopyButtons();
    initSearch();
    initMobileNav();
    initKeyboard();
  });
})();
