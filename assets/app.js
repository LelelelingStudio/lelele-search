/**
 * 了了了搜 - 首页逻辑
 * 功能：快捷入口（随机→频率记录）、每日语录、多语言切换
 */

(function () {
  'use strict';

  // ===== 多语言字典 =====
  const i18n = {
    zh: {
      logo: '了了了搜',
      subtitle: '聚合搜索 · 纯净体验',
      shortcuts: '快捷入口',
      support: '支持我们',
      search_placeholder: '输入关键词搜索...',
      quote_loading: '正在加载语录...',
      quote_error: '语录加载失败，但生活还要继续 ✨'
    },
    en: {
      logo: 'Lelele Search',
      subtitle: 'Aggregated Search · Pure Experience',
      shortcuts: 'Quick Access',
      support: 'Support Us',
      search_placeholder: 'Enter keywords to search...',
      quote_loading: 'Loading quote...',
      quote_error: 'Failed to load quote, but life goes on ✨'
    },
    ja: {
      logo: '了了了検索',
      subtitle: '統合検索・ピュア体験',
      shortcuts: 'クイックアクセス',
      support: 'サポート',
      search_placeholder: 'キーワードを入力...',
      quote_loading: '名言を読み込み中...',
      quote_error: '読み込み失敗、でも人生は続く ✨'
    },
    fr: {
      logo: 'Lelele Recherche',
      subtitle: 'Recherche agrégée · Expérience pure',
      shortcuts: 'Accès rapide',
      support: 'Nous soutenir',
      search_placeholder: 'Entrez des mots-clés...',
      quote_loading: 'Chargement...',
      quote_error: 'Échec du chargement, mais la vie continue ✨'
    }
  };

  // ===== 快捷入口数据（内置库）=====
  const shortcutLibrary = [
    { name: '百度', icon: '🔍', url: 'https://www.baidu.com', category: '搜索' },
    { name: 'GitHub', icon: '🐙', url: 'https://github.com', category: '开发' },
    { name: 'Bilibili', icon: '📺', url: 'https://www.bilibili.com', category: '视频' },
    { name: '了了了搜', icon: '🔮', url: 'https://search.leleleling.site', category: '工作室' },
    { name: '了了了岭', icon: '🏠', url: 'https://leleleling.site', category: '工作室' },
    { name: '原神', icon: '🎮', url: 'https://ys.mihoyo.com', category: '游戏' },
    { name: '抖音', icon: '🎵', url: 'https://www.douyin.com', category: '视频' },
    { name: '知乎', icon: '💡', url: 'https://www.zhihu.com', category: '社区' },
    { name: '微博', icon: '📢', url: 'https://weibo.com', category: '社交' },
    { name: '网易云音乐', icon: '🎶', url: 'https://music.163.com', category: '音乐' },
    { name: '淘宝', icon: '🛒', url: 'https://www.taobao.com', category: '购物' },
    { name: '豆瓣', icon: '📖', url: 'https://www.douban.com', category: '社区' },
    { name: 'Steam', icon: '🎯', url: 'https://store.steampowered.com', category: '游戏' },
    { name: 'Notion', icon: '📝', url: 'https://www.notion.so', category: '工具' },
    { name: 'Figma', icon: '🎨', url: 'https://www.figma.com', category: '设计' },
    { name: 'Twitter', icon: '🐦', url: 'https://twitter.com', category: '社交' }
  ];

  // ===== 语言切换 =====
  let currentLang = localStorage.getItem('lll_lang') || 'zh';

  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lll_lang', lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;

    // 更新按钮状态
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // 替换文本
    const dict = i18n[lang] || i18n.zh;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    // 搜索框 placeholder
    const searchInput = document.querySelector('.search-input');
    if (searchInput && dict.search_placeholder) {
      searchInput.placeholder = dict.search_placeholder;
    }
  }

  // ===== 快捷入口逻辑 =====
  const FREQ_KEY = 'lll_shortcut_freq';
  const MAX_SHOWN = 8;

  function getFrequency() {
    try {
      return JSON.parse(localStorage.getItem(FREQ_KEY)) || {};
    } catch { return {}; }
  }

  function saveFrequency(freq) {
    localStorage.setItem(FREQ_KEY, JSON.stringify(freq));
  }

  function renderShortcuts() {
    const grid = document.getElementById('shortcutsGrid');
    if (!grid) return;

    const freq = getFrequency();
    let selected;

    // 如果有频率记录，按频率排序取前8；否则随机选8个
    if (Object.keys(freq).length > 0) {
      selected = [...shortcutLibrary]
        .map(item => ({ ...item, _freq: freq[item.name] || 0 }))
        .sort((a, b) => b._freq - a._freq)
        .slice(0, MAX_SHOWN);
    } else {
      // 随机洗牌
      selected = [...shortcutLibrary].sort(() => Math.random() - 0.5).slice(0, MAX_SHOWN);
    }

    grid.innerHTML = selected.map(item => `
      <a class="shortcut-item" href="${item.url}" target="_blank" data-name="${item.name}">
        <span class="shortcut-icon">${item.icon}</span>
        <span class="shortcut-name">${item.name}</span>
      </a>
    `).join('');

    // 点击记录频率
    grid.querySelectorAll('.shortcut-item').forEach(el => {
      el.addEventListener('click', () => {
        const name = el.dataset.name;
        const freq = getFrequency();
        freq[name] = (freq[name] || 0) + 1;
        saveFrequency(freq);
      });
    });
  }

  // ===== 每日语录 =====
  function renderQuote() {
    const quoteText = document.getElementById('quoteText');
    const quoteAuthor = document.getElementById('quoteAuthor');
    const dict = i18n[currentLang] || i18n.zh;

    if (!quoteText) return;

    quoteText.textContent = dict.quote_loading || 'Loading...';

    // motivationalQuotes.js 暴露全局变量 motivationalQuotes（数组）
    setTimeout(() => {
      try {
        const quotes = window.motivationalQuotes;
        if (Array.isArray(quotes) && quotes.length > 0) {
          const randomIndex = Math.floor(Math.random() * quotes.length);
          const q = quotes[randomIndex];
          // 支持格式：{ text, author } 或纯字符串
          if (typeof q === 'string') {
            quoteText.textContent = `"${q}"`;
            quoteAuthor.textContent = '';
          } else if (q.text) {
            quoteText.textContent = `"${q.text}"`;
            quoteAuthor.textContent = q.author ? `— ${q.author}` : '';
          }
        } else {
          throw new Error('no quotes');
        }
      } catch (e) {
        quoteText.textContent = dict.quote_error || 'Quote loading failed';
        quoteAuthor.textContent = '';
      }
    }, 300);
  }

  // ===== 初始化 =====
  function init() {
    // 语言
    applyLanguage(currentLang);
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
    });

    // 快捷入口
    renderShortcuts();

    // 每日语录
    renderQuote();

    // 搜索框回车增强（已通过 form 的 GET 提交，这里只加一个清空按钮逻辑预留）
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
      // 自动聚焦（桌面端）
      if (window.innerWidth > 768) {
        searchInput.focus();
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
