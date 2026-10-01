/**
 * 了了了搜 - 结果页逻辑
 * 功能：Worker调用 + 三级词条匹配 + AI总结 + 搜索结果渲染
 */

(function () {
  'use strict';

  // ===== 配置 =====
  const WORKER_URL = 'https://lelele-search.lelelelingstudio1.workers.dev';
  const INDEX_URL = 'searchart/artindexa1.json';
  const MAX_LEXICON_SHOWN = 3;

  // ===== DOM 引用 =====
  const headerSearchInput = document.getElementById('headerSearchInput');
  const summaryBox = document.getElementById('summaryBox');
  const summaryBody = document.getElementById('summaryBody');
  const summaryEngine = document.getElementById('summaryEngine');
  const lexiconSection = document.getElementById('lexiconSection');
  const lexiconList = document.getElementById('lexiconList');
  const lexiconMoreBtn = document.getElementById('lexiconMoreBtn');
  const resultMeta = document.getElementById('resultMeta');
  const resultList = document.getElementById('resultList');
  const searchLoading = document.getElementById('searchLoading');
  const searchError = document.getElementById('searchError');
  const pagination = document.getElementById('pagination');
  const pagePrev = document.getElementById('pagePrev');
  const pageNext = document.getElementById('pageNext');
  const pageInfo = document.getElementById('pageInfo');
  const langSelect = document.getElementById('langSelect');

  // ===== 状态 =====
  let currentQuery = '';
  let currentPage = 1;
  let lexiconIndex = null;       // 索引数据缓存
  let lexiconMatches = [];       // 匹配到的词条（已分级）
  let lexiconExpanded = false;   // 是否展开更多
  let searchResults = [];        // Worker 返回的结果
  let currentLang = localStorage.getItem('lll_lang') || 'zh';

  // ===== 初始化 =====
  function init() {
    // 读取搜索词
    const params = new URLSearchParams(window.location.search);
    currentQuery = params.get('q') || '';

    if (!currentQuery) {
      window.location.href = 'index.html';
      return;
    }

    // 填充搜索框
    if (headerSearchInput) {
      headerSearchInput.value = currentQuery;
    }

    // 语言
    if (langSelect) {
      langSelect.value = currentLang === 'zh' ? 'zh-CN' : currentLang === 'en' ? 'en-US' : currentLang === 'ja' ? 'ja-JP' : 'fr-FR';
      langSelect.addEventListener('change', () => {
        const val = langSelect.value;
        currentLang = val === 'zh-CN' ? 'zh' : val === 'en-US' ? 'en' : val === 'ja-JP' ? 'ja' : 'fr';
        localStorage.setItem('lll_lang', currentLang);
        // 重新搜索
        doSearch();
      });
    }

    // 绑定事件
    if (lexiconMoreBtn) {
      lexiconMoreBtn.addEventListener('click', () => {
        lexiconExpanded = true;
        renderLexicon();
      });
    }

    // 开始搜索
    doSearch();
  }

  // ===== 主搜索流程 =====
  async function doSearch() {
    showLoading(true);
    hideAll();

    try {
      // 并行：加载索引 + 调用 Worker
      const [indexData] = await Promise.all([
        loadLexiconIndex(),
        Promise.resolve() // Worker 调用在下面单独处理错误
      ]);

      // 词条匹配
      if (indexData && indexData.items) {
        lexiconIndex = indexData;
        matchLexicon(currentQuery);
        renderLexicon();
      }

      // 调用 Worker
      await fetchSearchResults();

    } catch (err) {
      showError('搜索失败：' + err.message);
    } finally {
      showLoading(false);
    }
  }

  // ===== 加载词条索引 =====
  async function loadLexiconIndex() {
    if (lexiconIndex) return lexiconIndex;
    try {
      const res = await fetch(INDEX_URL);
      if (!res.ok) throw new Error('索引加载失败');
      return await res.json();
    } catch (e) {
      console.warn('词条索引加载失败:', e);
      return null;
    }
  }

  // ===== 三级词条匹配 =====
  function matchLexicon(query) {
    if (!lexiconIndex || !lexiconIndex.items) {
      lexiconMatches = [];
      return;
    }

    const q = query.trim().toLowerCase();
    const exact = [];
    const include = [];
    const fuzzy = [];

    lexiconIndex.items.forEach(item => {
      const title = (item.title || '').toLowerCase();
      const aliases = (item.aliases || []).map(a => a.toLowerCase());

      // 精确匹配：title 或 alias 完全等于搜索词
      if (title === q || aliases.includes(q)) {
        exact.push({ ...item, matchType: 'exact' });
        return;
      }

      // 包含匹配：title 包含搜索词 或 搜索词包含 title（title 长度>1）
      if (title.includes(q) || (title.length > 1 && q.includes(title))) {
        include.push({ ...item, matchType: 'include' });
        return;
      }

      // alias 包含匹配
      for (const alias of aliases) {
        if (alias.includes(q) || (alias.length > 1 && q.includes(alias))) {
          include.push({ ...item, matchType: 'include' });
          return;
        }
      }

      // 模糊匹配：分词交叉（简单版：搜索词每个字都在 title 里出现）
      if (q.length >= 2) {
        const chars = q.split('');
        const matchCount = chars.filter(c => title.includes(c)).length;
        if (matchCount >= Math.ceil(q.length * 0.6)) {
          fuzzy.push({ ...item, matchType: 'fuzzy', score: matchCount });
        }
      }
    });

    // 模糊按匹配度排序
    fuzzy.sort((a, b) => b.score - a.score);

    lexiconMatches = [...exact, ...include, ...fuzzy];
  }

  // ===== 渲染词条卡片 =====
  function renderLexicon() {
    if (lexiconMatches.length === 0) {
      lexiconSection.classList.add('hidden');
      return;
    }

    lexiconSection.classList.remove('hidden');

    const toShow = lexiconExpanded
      ? lexiconMatches
      : lexiconMatches.slice(0, MAX_LEXICON_SHOWN);

    const matchLabels = {
      exact: '精确匹配',
      include: '包含匹配',
      fuzzy: '相关推荐'
    };

    lexiconList.innerHTML = toShow.map(item => `
      <div class="lexicon-card match-${item.matchType}" data-id="${item.id}">
        <div class="lexicon-thumb">
          <img src="assets/placeholder.png" alt="" loading="lazy" onerror="this.style.display='none'">
        </div>
        <div class="lexicon-content">
          <div class="lexicon-title">${escapeHtml(item.title)}</div>
          ${item.aliases && item.aliases.length > 0 ? `<div class="lexicon-aliases">${item.aliases.slice(0, 3).map(a => escapeHtml(a)).join('、')}</div>` : ''}
          <div class="lexicon-abstract">正在加载摘要...</div>
          <div class="lexicon-meta">
            <span class="lexicon-tag">${escapeHtml(item.category || '')}</span>
            <span class="lexicon-match-label">${matchLabels[item.matchType] || ''}</span>
          </div>
        </div>
      </div>
    `).join('');

    // 绑定点击跳转词条详情
    lexiconList.querySelectorAll('.lexicon-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        window.location.href = `leleart.html?id=${id}`;
      });
    });

    // 加载每个匹配词条的摘要
    toShow.forEach(item => {
      fetch(`searchart/artindexa1/art${item.id}.json`)
        .then(res => res.json())
        .then(data => {
          const card = lexiconList.querySelector(`[data-id="${item.id}"]`);
          if (card) {
            const abstract = card.querySelector('.lexicon-abstract');
            if (abstract && data.abstract) {
              abstract.textContent = data.abstract;
            }
            const thumb = card.querySelector('.lexicon-thumb img');
            if (thumb && data.thumb) {
              thumb.src = data.thumb;
              thumb.style.display = '';
            }
          }
        })
        .catch(() => {});
    });

    // 更多按钮
    if (lexiconMatches.length > MAX_LEXICON_SHOWN && !lexiconExpanded) {
      lexiconMoreBtn.classList.remove('hidden');
      lexiconMoreBtn.textContent = `查看更多相关词条（还有 ${lexiconMatches.length - MAX_LEXICON_SHOWN} 个）`;
    } else {
      lexiconMoreBtn.classList.add('hidden');
    }
  }

  // ===== 调用 Worker 搜索 =====
  async function fetchSearchResults() {
    try {
      const params = new URLSearchParams({
        q: currentQuery,
        page: currentPage,
        lang: currentLang
      });

      const res = await fetch(`${WORKER_URL}/search?${params}`, {
        headers: {
          'x-api-key': 'lelelesearch-leleleling930happy30874031heosfjdah' // 替换为你的实际 key
        }
      });

      if (!res.ok) {
        throw new Error(`Worker 返回 ${res.status}`);
      }

      const data = await res.json();
      renderSearchResults(data);

    } catch (err) {
      console.warn('Worker 调用失败:', err);
      // 即使 Worker 失败，词条卡片仍然可以显示
      if (lexiconMatches.length === 0) {
        showError('搜索服务暂时不可用，请稍后重试');
      }
    }
  }

  // ===== 渲染搜索结果 =====
  function renderSearchResults(data) {
    if (!data || !data.results || data.results.length === 0) {
      if (lexiconMatches.length === 0) {
        resultList.innerHTML = '<li class="result-item"><div class="result-title">未找到结果</div><div class="result-snippet">试试其他关键词吧</div></li>';
      }
      return;
    }

    searchResults = data.results;

    // AI 总结
    if (data.summary) {
      summaryBox.classList.remove('hidden');
      summaryBody.innerHTML = `<p>${escapeHtml(data.summary).replace(/\n/g, '</p><p>')}</p>`;
      if (data.engine) {
        summaryEngine.textContent = `来源: ${data.engine}`;
      }
    }

    // 结果统计
    if (data.total !== undefined) {
      resultMeta.classList.remove('hidden');
      resultMeta.textContent = `找到约 ${data.total} 条结果（用时 ${data.time || '?'} 秒）`;
    }

    // 结果列表
    resultList.innerHTML = searchResults.map(item => `
      <li class="result-item">
        <div class="result-title">
          <a href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener">${escapeHtml(item.title || '无标题')}</a>
        </div>
        ${item.url ? `<div class="result-url">${escapeHtml(item.url)}</div>` : ''}
        ${item.snippet ? `<div class="result-snippet">${escapeHtml(item.snippet)}</div>` : ''}
        ${item.source ? `<span class="result-source">${escapeHtml(item.source)}</span>` : ''}
      </li>
    `).join('');

    // 翻页
    if (data.hasMore || currentPage > 1) {
      pagination.classList.remove('hidden');
      pageInfo.textContent = `第 ${currentPage} 页`;
      pagePrev.disabled = currentPage <= 1;
      pageNext.disabled = !data.hasMore;
    }
  }

  // ===== 工具函数 =====
  function showLoading(show) {
    if (show) {
      searchLoading.classList.remove('hidden');
    } else {
      searchLoading.classList.add('hidden');
    }
  }

  function hideAll() {
    summaryBox.classList.add('hidden');
    lexiconSection.classList.add('hidden');
    resultMeta.classList.add('hidden');
    resultList.innerHTML = '';
    searchError.classList.add('hidden');
    pagination.classList.add('hidden');
  }

  function showError(msg) {
    searchError.classList.remove('hidden');
    searchError.textContent = msg;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  // ===== 翻页事件 =====
  if (pagePrev) {
    pagePrev.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        doSearch();
        window.scrollTo(0, 0);
      }
    });
  }

  if (pageNext) {
    pageNext.addEventListener('click', () => {
      currentPage++;
      doSearch();
      window.scrollTo(0, 0);
    });
  }

  // ===== 启动 =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
