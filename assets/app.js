/**
 * 了了了搜 - 首页逻辑
 * 功能：每日语录 + 搜索框 + 快捷入口（随机→频率排序）
 */

(function () {
  'use strict';

  // ===== 配置 =====
  const QUOTES_URL = 'https://leleleling_guliyu_a.surge.sh/motivationalQuotes.js';
  const INDEX_URL = 'searchart/artindexa1.json';
  const MAX_SHORTCUTS = 6;

  // ===== DOM 引用 =====
  const quoteText = document.getElementById('quoteText');
  const quoteLoading = document.getElementById('quoteLoading');
  const searchInput = document.getElementById('homeSearchInput');
  const searchBtn = document.getElementById('homeSearchBtn');
  const shortcutList = document.getElementById('shortcutList');
  const langSelect = document.getElementById('langSelect');

  // ===== 状态 =====
  let quotesData = [];
  let indexData = null;
  let currentLang = localStorage.getItem('lll_lang') || 'zh';

  // ===== 初始化 =====
  function init() {
    // 语言
    if (langSelect) {
      langSelect.value = currentLang === 'zh' ? 'zh-CN' : currentLang === 'en' ? 'en-US' : currentLang === 'ja' ? 'ja-JP' : 'fr-FR';
      langSelect.addEventListener('change', () => {
        const val = langSelect.value;
        currentLang = val === 'zh-CN' ? 'zh' : val === 'en-US' ? 'en' : val === 'ja-JP' ? 'ja' : 'fr';
        localStorage.setItem('lll_lang', currentLang);
        // 语录不重新加载，只刷新页面
        window.location.reload();
      });
    }

    // 搜索
    if (searchBtn) {
      searchBtn.addEventListener('click', doSearch);
    }
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doSearch();
      });
    }

    // 并行加载
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

  // ===== 加载语录（fetch 文本 → 去 export → eval 拿数组）=====
  async function loadQuote() {
    if (!quoteText) return;

    try {
      const res = await fetch(QUOTES_URL);
      if (!res.ok) throw new Error('语录加载失败');

      let text = await res.text();

      // 去掉 export default 行，让代码变成纯变量声明
      text = text.replace(/export\s+default\s+\w+;?/g, '');
      text = text.replace(/export\s+default\s+\w+/g, '');

      // 执行脚本，拿到 quotes 数组
      // 用 Function 构造器在隔离作用域里执行
      const fn = new Function(text + '\nreturn quotes;');
      quotesData = fn();

      if (!Array.isArray(quotesData) || quotesData.length === 0) {
        throw new Error('语录数据为空');
      }

      showRandomQuote();

    } catch (err) {
      console.warn('语录加载失败:', err);
      if (quoteText) {
        quoteText.textContent = '「每一天都是新的开始。」';
      }
    } finally {
      if (quoteLoading) {
        quoteLoading.classList.add('hidden');
      }
    }
  }

  // ===== 随机显示一条语录 =====
  function showRandomQuote() {
    if (!quoteText || quotesData.length === 0) return;

    const randomIndex = Math.floor(Math.random() * quotesData.length);
    const quote = quotesData[randomIndex];

    // 打字机效果
    quoteText.textContent = '';
    let i = 0;
    const speed = 30; // ms per char

    function typeChar() {
      if (i < quote.length) {
        quoteText.textContent += quote[i];
        i++;
        setTimeout(typeChar, speed);
      }
    }

    typeChar();
  }

  // ===== 加载快捷入口 =====
  async function loadShortcuts() {
    if (!shortcutList) return;

    try {
      const res = await fetch(INDEX_URL);
      if (!res.ok) throw new Error('索引加载失败');

      indexData = await res.json();
      const items = indexData.items || [];

      // 读取访问频率
      const freqMap = JSON.parse(localStorage.getItem('lll_lexicon_freq') || '{}');

      let sorted;
      const hasFreq = Object.keys(freqMap).length > 0;

      if (hasFreq) {
        // 按频率排序
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
      shortcutList.innerHTML = '<li class="shortcut-empty">加载失败</li>';
    }
  }

  // ===== 渲染快捷入口 =====
  function renderShortcuts(items) {
    if (!shortcutList || items.length === 0) return;

    shortcutList.innerHTML = items.map(item => `
      <li class="shortcut-item" data-id="${item.id}" tabindex="0">
        <span class="shortcut-icon">📖</span>
        <span class="shortcut-label">${escapeHtml(item.title)}</span>
      </li>
    `).join('');

    // 绑定点击
    shortcutList.querySelectorAll('.shortcut-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        // 更新频率
        const freqMap = JSON.parse(localStorage.getItem('lll_lexicon_freq') || '{}');
        freqMap[id] = (freqMap[id] || 0) + 1;
        localStorage.setItem('lll_lexicon_freq', JSON.stringify(freqMap));

        window.location.href = `leleart.html?id=${id}`;
      });

      // 键盘回车
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') el.click();
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
