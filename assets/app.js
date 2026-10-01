/**
 * 了了了搜 - 首页逻辑
 * 功能：每日语录（随机 + 换一条）+ 搜索框 + 快捷入口（随机→频率排序）+ 主题切换
 */

(function () {
  'use strict';

  // ===== 配置 =====
  // 语录数据已本地化到 assets/quotes.json。
  // 原因：原远程源 (surge.sh) 既没有 CORS 头、又含 `export default` 语句，
  // 导致 fetch 被跨域拦截、<script> 直接引入报语法错误，语录始终加载失败。
  const QUOTES_URL = 'assets/quotes.json';
  const INDEX_URL = 'searchart/artindexa1.json';
  const MAX_SHORTCUTS = 6;

  // ===== 图标映射 =====
  // 1) 具体词条优先（让快捷入口各具特色，避免清一色同一个图标）
  const TITLE_ICONS = {
    'github': '🐙', 'git': '🌿', 'visual studio code': '🖥️', 'docker': '🐳',
    'slack': '💬', 'figma': '🎨', 'notion': '📝', 'postman': '📮',
    'jira': '📋', 'tableau': '📊', 'jenkins': '🔧', 'tensorflow': '🧠',
    'kubernetes': '☸️', 'react': '⚛️', 'node.js': '🟢', 'unity': '🎮',
    'redis': '🗄️', 'mongodb': '🍃', 'wordpress': '📰', 'android studio': '🤖',
    'nginx': '🌐', 'canva': '🖌️', 'baidu': '🔍', '百度': '🔍',
    'twitter': '🐦', 'instagram': '📷', 'spotify': '🎧', 'netflix': '🎬',
    'tiktok': '🎵', '抖音': '🎵', 'bilibili': '📺', '原神': '⚔️',
    '故宫': '🏛️', '了了了搜': '🔎', 'lelelesearch': '🔎',
    '了了了岭工作室': '🏢', '了了了词条': '📖', '了了了旧聊': '💭',
    '了了了游': '🕹️', '了了了读': '📚', '了了了助': '🛟'
  };

  // 2) 分类兜底
  const CATEGORY_ICONS = {
    '文化': '🏛️', '科技': '💡', '游戏': '🎮', '产品': '🚀', '互联网': '🌐',
    '工作室': '🏢', '社交': '💬', '娱乐': '🎬', '历史': '📜', '地理': '🗺️',
    '艺术': '🎨', '科学': '🔬', '人物': '👤', '影视': '🎬', '音乐': '🎵',
    '体育': '⚽', '教育': '📚', '商业': '💼', '生活': '🌱'
  };
  const FALLBACK_ICON = '📄';

  // ===== DOM 引用 =====
  const quoteText = document.getElementById('quoteText');
  const quoteAuthor = document.getElementById('quoteAuthor');
  const quoteRefresh = document.getElementById('quoteRefresh');
  const shortcutsGrid = document.getElementById('shortcutsGrid');
  const searchInput = document.querySelector('.search-input');
  const searchBtn = document.querySelector('.search-btn');

  // ===== 状态 =====
  let quotesData = [];
  let lastQuoteIndex = -1;
  let typingTimer = null;
  let indexData = null;

  // ===== 初始化 =====
  function init() {
    // ---- 搜索 ----
    if (searchBtn) {
      searchBtn.addEventListener('click', doSearch);
    }
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doSearch();
      });
    }

    // ---- 换一条语录 ----
    if (quoteRefresh) {
      quoteRefresh.addEventListener('click', () => {
        showRandomQuote();
      });
    }

    // ---- 并行加载 ----
    loadQuote();
    loadShortcuts();
  }

  // ===== 搜索 =====
  function doSearch() {
    if (!searchInput) return;
    const q = searchInput.value.trim();
    if (q) {
      window.location.href = `search.html?q=${encodeURIComponent(q)}`;
    }
  }

  // ===== 加载语录 =====
  // 数据来自同源静态文件 assets/quotes.json（见文件顶部说明）。
  async function loadQuote() {
    if (!quoteText) return;

    try {
      const res = await fetch(QUOTES_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      quotesData = Array.isArray(data) ? data : (data.quotes || []);

      if (!Array.isArray(quotesData) || quotesData.length === 0) {
        throw new Error('语录数据为空');
      }

      showRandomQuote();
    } catch (err) {
      console.warn('语录加载失败:', err);
      if (quoteText) {
        quoteText.textContent = '「每一天都是新的开始。」';
      }
      if (quoteRefresh) quoteRefresh.classList.add('hidden');
    }
  }

  // ===== 随机显示一条语录（打字机效果）=====
  function showRandomQuote() {
    if (!quoteText || quotesData.length === 0) return;

    // 避免连续抽到同一条
    let randomIndex = Math.floor(Math.random() * quotesData.length);
    if (quotesData.length > 1 && randomIndex === lastQuoteIndex) {
      randomIndex = (randomIndex + 1) % quotesData.length;
    }
    lastQuoteIndex = randomIndex;

    const quote = quotesData[randomIndex];

    // 打断上一条的打字动画，避免文字叠加
    if (typingTimer) {
      clearTimeout(typingTimer);
      typingTimer = null;
    }

    quoteText.textContent = '';
    if (quoteAuthor) quoteAuthor.textContent = '';

    let i = 0;
    const speed = 30;

    function typeChar() {
      if (i < quote.length) {
        quoteText.textContent += quote[i];
        i++;
        typingTimer = setTimeout(typeChar, speed);
      } else {
        typingTimer = null;
      }
    }

    typeChar();
  }

  // ===== 加载快捷入口 =====
  async function loadShortcuts() {
    if (!shortcutsGrid) return;

    try {
      const res = await fetch(INDEX_URL);
      if (!res.ok) throw new Error('索引加载失败');

      indexData = await res.json();
      const items = indexData.items || [];

      if (items.length === 0) {
        shortcutsGrid.innerHTML = '<span class="shortcuts-empty">暂无词条</span>';
        return;
      }

      // 读取访问频率
      const freqMap = JSON.parse(localStorage.getItem('lll_lexicon_freq') || '{}');

      let sorted;
      if (Object.keys(freqMap).length > 0) {
        // 按频率排序（同频时保持稳定）
        sorted = [...items].sort((a, b) => {
          return (freqMap[b.id] || 0) - (freqMap[a.id] || 0);
        }).slice(0, MAX_SHORTCUTS);
      } else {
        // 初始随机
        sorted = shuffle([...items]).slice(0, MAX_SHORTCUTS);
      }

      renderShortcuts(sorted);

    } catch (err) {
      console.warn('快捷入口加载失败:', err);
      shortcutsGrid.innerHTML = '<span class="shortcuts-empty">加载失败</span>';
    }
  }

  // ===== 取词条图标 =====
  function iconFor(item) {
    const title = (item.title || '').toLowerCase().trim();

    // 1) 精确标题匹配
    if (TITLE_ICONS[title]) return TITLE_ICONS[title];

    // 2) 标题包含匹配（例如 "Twitter（X）" 命中 "twitter"）
    for (const key in TITLE_ICONS) {
      if (title.includes(key)) return TITLE_ICONS[key];
    }

    // 3) 分类兜底
    const cat = item.category || '';
    if (CATEGORY_ICONS[cat]) return CATEGORY_ICONS[cat];

    return FALLBACK_ICON;
  }

  // ===== 渲染快捷入口 =====
  function renderShortcuts(items) {
    if (!shortcutsGrid || items.length === 0) return;

    shortcutsGrid.innerHTML = items.map(item => `
      <div class="shortcut-item" data-id="${item.id}" tabindex="0" role="link">
        <span class="shortcut-icon">${iconFor(item)}</span>
        <span class="shortcut-name">${escapeHtml(item.title)}</span>
      </div>
    `).join('');

    shortcutsGrid.querySelectorAll('.shortcut-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const freqMap = JSON.parse(localStorage.getItem('lll_lexicon_freq') || '{}');
        freqMap[id] = (freqMap[id] || 0) + 1;
        localStorage.setItem('lll_lexicon_freq', JSON.stringify(freqMap));
        window.location.href = `leleart.html?id=${id}`;
      });

      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          el.click();
        }
      });
    });
  }

  // ===== 工具函数 =====
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  // ===== 启动 =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
