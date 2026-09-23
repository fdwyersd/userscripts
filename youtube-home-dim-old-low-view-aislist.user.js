// ==UserScript==
// @name         YouTube Home - Dim Old + Highlight Low-View + AiSList
// @namespace    vm-yt-dim-old2
// @version      1.5.1
// @description  Dims old videos, hides old low-engagement videos, highlights newer low-view videos yellow, and marks AiSList channels. Supports YouTube compact metadata.
// @match        https://www.youtube.com/
// @match        https://www.youtube.com/?*
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// ==/UserScript==

(function () {
  'use strict';

  // ====== CONFIG ======
  const CUTOFF_DAYS = 365;
  const LOW_VIEW_MIN_AGE_DAYS = 1;
  const LOW_VIEW_MAX_VIEWS = 5000;

  // Hide videos that are at least 1 year old and have fewer than 100K views.
  const HIDE_OLD_LOWVIEW_MIN_AGE_DAYS = 365;
  const HIDE_OLD_LOWVIEW_MAX_VIEWS = 100000;

  const DIM_OPACITY = 0.58;
  const DIM_GRAYSCALE = 0.85;
  const DIM_BLUR_PX = 0;

  const HILITE_BG_ALPHA = 0.14;
  const HILITE_BORDER_ALPHA = 0.30;
  const HILITE_SATURATE = 1.05;

  // ====== AiSList CONFIG ======
  const AISLIST_BLOCK_URL =
    'https://raw.githubusercontent.com/Override92/AiSList/refs/heads/main/AiSList/aislist_blocklist.txt';

  const AISLIST_WARN_URL =
    'https://raw.githubusercontent.com/Override92/AiSList/refs/heads/main/AiSList/aislist_warnlist.txt';

  const CACHE_MS = 24 * 60 * 60 * 1000;

  const BLOCK_CACHE_KEY = 'vm-yt-aislist-block-cache-v1';
  const BLOCK_CACHE_TIME_KEY = 'vm-yt-aislist-block-cache-time-v1';

  const WARN_CACHE_KEY = 'vm-yt-aislist-warn-cache-v1';
  const WARN_CACHE_TIME_KEY = 'vm-yt-aislist-warn-cache-time-v1';

  // Confirmed AI = red/pink
  const AI_BLOCK_BG_ALPHA = 0.22;
  const AI_BLOCK_BORDER_ALPHA = 0.75;

  // Warnlist = orange
  const AI_WARN_BG_ALPHA = 0.20;
  const AI_WARN_BORDER_ALPHA = 0.70;

  const CLASS_DIM = 'vm-dim-old-video-tile';
  const CLASS_LOW = 'vm-lowview-video-tile';
  const CLASS_HIDE = 'vm-hide-old-lowview-video-tile';
  const CLASS_AI_BLOCK = 'vm-aislist-block-video-tile';
  const CLASS_AI_WARN = 'vm-aislist-warn-video-tile';

  let aiBlockChannels = new Set();
  let aiWarnChannels = new Set();

  let aiBlockReady = false;
  let aiWarnReady = false;

  // ============================================================
  // CSS
  // ============================================================

  function injectCSS() {
    if (document.getElementById('vm-dim-old-style')) return;

    const style = document.createElement('style');
    style.id = 'vm-dim-old-style';

    style.textContent = `
      .${CLASS_DIM} {
        opacity: ${DIM_OPACITY} !important;
        filter: grayscale(${DIM_GRAYSCALE}) blur(${DIM_BLUR_PX}px) !important;
        transition: opacity 120ms ease-in-out, filter 120ms ease-in-out;
      }

      .${CLASS_DIM}:hover {
        opacity: 1 !important;
        filter: none !important;
      }

      .${CLASS_HIDE} {
        display: none !important;
      }

      .${CLASS_LOW} {
        background-color: rgba(255, 230, 120, ${HILITE_BG_ALPHA}) !important;
        outline: 1px solid rgba(255, 200, 60, ${HILITE_BORDER_ALPHA}) !important;
        outline-offset: 2px !important;
        border-radius: 10px !important;
        filter: saturate(${HILITE_SATURATE}) !important;
      }

      .${CLASS_AI_BLOCK} {
        background-color: rgba(255, 70, 100, ${AI_BLOCK_BG_ALPHA}) !important;
        outline: 2px solid rgba(255, 65, 90, ${AI_BLOCK_BORDER_ALPHA}) !important;
        outline-offset: 2px !important;
        border-radius: 10px !important;
        filter: saturate(1.08) !important;
      }

      .${CLASS_AI_WARN} {
        background-color: rgba(255, 150, 40, ${AI_WARN_BG_ALPHA}) !important;
        outline: 2px solid rgba(255, 145, 30, ${AI_WARN_BORDER_ALPHA}) !important;
        outline-offset: 2px !important;
        border-radius: 10px !important;
        filter: saturate(1.06) !important;
      }
    `;

    document.head.appendChild(style);
  }

  // ============================================================
  // AiSList parsing/cache
  // ============================================================

  function parseAiSList(text) {
    const set = new Set();

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (!line) continue;
      if (line.startsWith('!')) continue;

      if (line.startsWith('@')) {
        set.add(line.toLowerCase());
      } else if (line.startsWith('UC')) {
        set.add(line);
      }
    }

    return set;
  }

  function loadCache(textKey, timeKey) {
    try {
      const text = localStorage.getItem(textKey);
      const timestamp = Number(localStorage.getItem(timeKey) || 0);

      if (!text) return null;

      return { text, timestamp };
    } catch (e) {
      return null;
    }
  }

  function saveCache(textKey, timeKey, text) {
    try {
      localStorage.setItem(textKey, text);
      localStorage.setItem(timeKey, String(Date.now()));
    } catch (e) {
      console.warn('[VM AiSList] Cache save failed:', e);
    }
  }

  function downloadList(url, textKey, timeKey, activateFunction) {
    GM_xmlhttpRequest({
      method: 'GET',
      url: url,

      onload: function (response) {
        if (response.status >= 200 && response.status < 300) {
          saveCache(textKey, timeKey, response.responseText);
          activateFunction(response.responseText, 'download');
        } else {
          console.warn('[VM AiSList] HTTP failure:', response.status, url);
        }
      },

      onerror: function (err) {
        console.warn('[VM AiSList] Download failure:', err, url);
      }
    });
  }

  function activateBlockList(text, source) {
    aiBlockChannels = parseAiSList(text);
    aiBlockReady = true;

    console.log(
      `[VM AiSList] Blocklist: ${aiBlockChannels.size.toLocaleString()} entries (${source})`
    );

    processAll();
  }

  function activateWarnList(text, source) {
    aiWarnChannels = parseAiSList(text);
    aiWarnReady = true;

    console.log(
      `[VM AiSList] Warnlist: ${aiWarnChannels.size.toLocaleString()} entries (${source})`
    );

    processAll();
  }

  function loadOneList(url, textKey, timeKey, activateFunction) {
    const cached = loadCache(textKey, timeKey);

    if (cached) {
      activateFunction(cached.text, 'cache');

      if ((Date.now() - cached.timestamp) >= CACHE_MS) {
        downloadList(
          url,
          textKey,
          timeKey,
          activateFunction
        );
      }

      return;
    }

    downloadList(
      url,
      textKey,
      timeKey,
      activateFunction
    );
  }

  function loadAiLists() {
    loadOneList(
      AISLIST_BLOCK_URL,
      BLOCK_CACHE_KEY,
      BLOCK_CACHE_TIME_KEY,
      activateBlockList
    );

    loadOneList(
      AISLIST_WARN_URL,
      WARN_CACHE_KEY,
      WARN_CACHE_TIME_KEY,
      activateWarnList
    );
  }

  // ============================================================
  // VIDEO AGE / VIEW PARSING
  // ============================================================

  function parseAgeTextToDays(s) {
    if (!s) return null;

    const str = String(s).trim().toLowerCase();

    // Old YouTube format: "3 years ago", "4 days ago", etc.
    let m = str.match(
      /(\d+(?:\.\d+)?)\s+(year|month|week|day|hour|minute)s?\s+ago/
    );

    if (m) {
      const n = parseFloat(m[1]);
      const unit = m[2];

      if (!Number.isFinite(n)) return null;

      switch (unit) {
        case 'year':   return n * 365;
        case 'month':  return n * 30;
        case 'week':   return n * 7;
        case 'day':    return n;
        case 'hour':   return n / 24;
        case 'minute': return n / (60 * 24);
      }
    }

    // New compact YouTube format: "3y ago", "1mo ago", "4d ago", "3h ago".
    // "mo" must be checked before "m", because "m" means minute here.
    m = str.match(
      /(\d+(?:\.\d+)?)\s*(y|yr|yrs|mo|mos|w|wk|wks|d|h|hr|hrs|min|mins|m)\s+ago\b/
    );

    if (m) {
      const n = parseFloat(m[1]);
      const unit = m[2];

      if (!Number.isFinite(n)) return null;

      switch (unit) {
        case 'y':
        case 'yr':
        case 'yrs':
          return n * 365;

        case 'mo':
        case 'mos':
          return n * 30;

        case 'w':
        case 'wk':
        case 'wks':
          return n * 7;

        case 'd':
          return n;

        case 'h':
        case 'hr':
        case 'hrs':
          return n / 24;

        case 'm':
        case 'min':
        case 'mins':
          return n / (60 * 24);
      }
    }

    const t = Date.parse(s);

    if (!Number.isNaN(t)) {
      const days =
        (Date.now() - t) /
        (1000 * 60 * 60 * 24);

      if (Number.isFinite(days) && days >= 0) {
        return days;
      }
    }

    return null;
  }

  function parseViewsTextToNumber(s) {
    if (!s) return null;

    const str = String(s).trim().toLowerCase();

    if (/\bno\s+views\b/.test(str)) return 0;

    if (
      /\bwatching\s+now\b/.test(str) ||
      /\blive\b/.test(str)
    ) {
      return null;
    }

    // Accept both old "1.5M views" and new bare compact counts like "1.5M".
    const m = str.match(
      /^\s*([\d.,]+)\s*([kmb])?\s*(?:views?)?\s*$/
    );

    if (!m) return null;

    const base = parseFloat(
      m[1].replace(/,/g, '')
    );

    if (!Number.isFinite(base)) return null;

    const mult =
      m[2] === 'k' ? 1e3 :
      m[2] === 'm' ? 1e6 :
      m[2] === 'b' ? 1e9 :
      1;

    return Math.round(base * mult);
  }

  // ============================================================
  // TILE DETECTION
  // ============================================================

  function closestTileContainer(a) {
    return a.closest(
      'ytd-rich-item-renderer,' +
      'ytd-video-renderer,' +
      'ytd-grid-video-renderer,' +
      'ytd-rich-grid-media,' +
      'ytd-compact-video-renderer,' +
      'ytd-reel-item-renderer'
    );
  }

  function getMetaForTile(tile) {
    const txt = tile.innerText || '';

    // Age: support both verbose and compact YouTube forms.
    const ageMatch = txt.match(
      /(?:\d+(?:\.\d+)?\s+(?:year|month|week|day|hour|minute)s?\s+ago)|(?:\d+(?:\.\d+)?\s*(?:y|yr|yrs|mo|mos|w|wk|wks|d|h|hr|hrs|min|mins|m)\s+ago\b)/i
    );

    const days =
      ageMatch
        ? parseAgeTextToDays(ageMatch[0])
        : null;

    let views = null;

    // First try the old explicit "... views" format.
    const verboseViewsMatch = txt.match(
      /(?:no\s+views|[\d.,]+\s*[kmb]?\s+views)/i
    );

    if (verboseViewsMatch) {
      views = parseViewsTextToNumber(verboseViewsMatch[0]);
    }

    // New homepage format commonly displays:
    //   "1.5M 3y ago"
    //   "743K 1mo ago"
    //   "79K 3w ago"
    // with no word "views".
    //
    // Anchor the count to the age token so numbers in titles (e.g. "$69 Billion")
    // are not mistaken for view counts.
    if (views == null && ageMatch) {
      const escapedAge = ageMatch[0]
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const pairRegex = new RegExp(
        '([\\d.,]+)\\s*([kmb])?\\s*(?:[•·]\\s*)?(?=' + escapedAge + ')',
        'i'
      );

      const pairMatch = txt.match(pairRegex);

      if (pairMatch) {
        views = parseViewsTextToNumber(
          pairMatch[1] + (pairMatch[2] || '')
        );
      }
    }

    // DOM fallback: metadata is often split into individual spans.
    if (views == null) {
      const metaNodes = tile.querySelectorAll(
        '#metadata-line span, ' +
        'ytd-video-meta-block #metadata-line span, ' +
        'yt-content-metadata-view-model span, ' +
        '[class*="metadata"] span'
      );

      for (const node of metaNodes) {
        const s = (node.innerText || node.textContent || '').trim();

        if (!s) continue;

        if (/\bviews?\b/i.test(s) || /\bno\s+views\b/i.test(s)) {
          const v = parseViewsTextToNumber(s);
          if (v != null) {
            views = v;
            break;
          }
        }

        // Bare compact count, e.g. "1.5M", "743K", "982".
        if (/^[\d.,]+\s*[kmb]?$/i.test(s)) {
          const v = parseViewsTextToNumber(s);
          if (v != null) {
            views = v;
            break;
          }
        }
      }
    }

    return { days, views };
  }

  // ============================================================
  // CHANNEL DETECTION
  // ============================================================

  function getChannelIdentifiers(tile) {
    const identifiers = new Set();

    const links = tile.querySelectorAll(
      'a[href^="/@"], a[href^="/channel/"]'
    );

    for (const link of links) {
      let href = link.getAttribute('href');

      if (!href) continue;

      href = href.split('?')[0];

      if (href.startsWith('/@')) {
        const handle = href.slice(1).split('/')[0];

        if (handle) {
          identifiers.add(handle.toLowerCase());
        }
      }

      else if (href.startsWith('/channel/')) {
        const channelId =
          href.slice('/channel/'.length).split('/')[0];

        if (channelId) {
          identifiers.add(channelId);
        }
      }
    }

    return identifiers;
  }

  function getAiStatus(tile) {
    const identifiers = getChannelIdentifiers(tile);

    // Confirmed takes precedence.
    if (aiBlockReady) {
      for (const id of identifiers) {
        if (aiBlockChannels.has(id)) {
          return 'block';
        }
      }
    }

    if (aiWarnReady) {
      for (const id of identifiers) {
        if (aiWarnChannels.has(id)) {
          return 'warn';
        }
      }
    }

    return null;
  }

  // ============================================================
  // RULES
  // ============================================================

  function applyRules(tile, meta) {
    tile.classList.remove(
      CLASS_DIM,
      CLASS_LOW,
      CLASS_HIDE,
      CLASS_AI_BLOCK,
      CLASS_AI_WARN
    );

    tile.removeAttribute('data-vm-aislist');

    const aiStatus = getAiStatus(tile);

    // CONFIRMED AI — RED/PINK
    if (aiStatus === 'block') {
      tile.classList.add(CLASS_AI_BLOCK);
      tile.setAttribute('data-vm-aislist', 'confirmed');
      tile.title = 'AiSList: confirmed/high-confidence AI channel';
      return;
    }

    // WARNLIST — ORANGE
    if (aiStatus === 'warn') {
      tile.classList.add(CLASS_AI_WARN);
      tile.setAttribute('data-vm-aislist', 'warn');
      tile.title = 'AiSList: warning / possible AI usage';
      return;
    }

    // VIDEO AGE / ENGAGEMENT RULES
    if (meta.days == null) return;

    // Hide old + low-engagement videos completely so the grid can reflow.
    if (
      meta.days >= HIDE_OLD_LOWVIEW_MIN_AGE_DAYS &&
      meta.views != null &&
      meta.views < HIDE_OLD_LOWVIEW_MAX_VIEWS
    ) {
      tile.classList.add(CLASS_HIDE);
      return;
    }

    // Other old videos remain visible but dimmed.
    if (meta.days >= CUTOFF_DAYS) {
      tile.classList.add(CLASS_DIM);
      return;
    }

    // Newer low-view videos get the existing yellow treatment.
    if (
      meta.days >= LOW_VIEW_MIN_AGE_DAYS &&
      meta.views != null &&
      meta.views < LOW_VIEW_MAX_VIEWS
    ) {
      tile.classList.add(CLASS_LOW);
    }
  }

  function processAnchor(a) {
    const tile = closestTileContainer(a);

    if (!tile) return;

    applyRules(
      tile,
      getMetaForTile(tile)
    );
  }

  function processAll() {
    document
      .querySelectorAll(
        'a#thumbnail[href*="watch?v="], ' +
        'a[href^="/watch?v="]'
      )
      .forEach(processAnchor);
  }

  // ============================================================
  // INIT
  // ============================================================

  function init() {
    injectCSS();

    loadAiLists();

    processAll();

    setTimeout(processAll, 1200);
    setTimeout(processAll, 3000);

    // Debounce DOM mutation handling so large UI updates (such as opening
    // YouTube's subscriptions sidebar) do not trigger hundreds of full-page scans.
    let processTimer = null;

    function scheduleProcessAll() {
      clearTimeout(processTimer);

      processTimer = setTimeout(() => {
        processTimer = null;
        processAll();
      }, 200);
    }

    new MutationObserver(scheduleProcessAll)
      .observe(
        document.documentElement,
        {
          childList: true,
          subtree: true
        }
      );

    window.addEventListener(
      'yt-navigate-finish',
      () => {
        setTimeout(processAll, 600);
      }
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );
  } else {
    init();
  }

})();
