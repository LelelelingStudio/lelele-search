/**
 * 了了了搜 - 结果页逻辑
 * 功能：Worker调用 + 三级词条匹配 + AI总结 + 搜索结果渲染
 */

(function () {
  'use strict';

  // ===== 配置 =====
  const WORKER_URL = 'https://lelele-search.lelelelingstudio1.workers.dev';
  // ⚠️ 安全提示：前端代码中的密钥会随公开仓库暴露，任何人都能在浏览器里看到。
  // 这只是"防随手盗用"的门槛，真正的防护应依赖 Worker 端的
  // Origin/Referer 白名单 + 频率限制，此外建议定期轮换此密钥。
  const WORKER_API_KEY = 'lelelesearch-leleleling930happy30874031heosfjdah';
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

  // ===== 状态 =====
  let currentQuery = '';
  let currentPage = 1;
  let lexiconIndex = null;       // 索引数据缓存
  let lexiconMatches = [];       // 匹配到的词条（已分级）
  let lexiconExpanded = false;   // 是否展开更多
  let searchResults = [];        // Worker 返回的结果
  let workerFailed = false;      // Worker 是否调用失败
  const currentLang = 'zh';      // 语言切换已移除，固定中文

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
      // 加载索引
      const indexData = await loadLexiconIndex();

      // 词条匹配 —— 必须每次都重置，避免残留上一次的结果
      if (indexData && Array.isArray(indexData.items)) {
        lexiconIndex = indexData;
        matchLexicon(currentQuery);
        renderLexicon();
      } else {
        // 索引不可用：清空匹配，避免显示上一次的词条
        lexiconMatches = [];
        lexiconExpanded = false;
        lexiconSection.classList.add('hidden');
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
          <span class="lexicon-thumb-fallback">${categoryIcon(item.category)}</span>
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
      const card = lexiconList.querySelector(`[data-id="${item.id}"]`);
      if (!card) return;

      const abstractEl = card.querySelector('.lexicon-abstract');
      const thumbEl = card.querySelector('.lexicon-thumb');

      fetch(`searchart/artindexa1/art${item.id}.json`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (abstractEl && data.abstract) {
            abstractEl.textContent = data.abstract;
          }
          // 只有当 thumb 确实是非空字符串时才替换为图片
          const thumbUrl = typeof data.thumb === 'string' ? data.thumb.trim() : '';
          if (thumbEl && thumbUrl) {
            const img = document.createElement('img');
            img.alt = data.title || '';
            img.loading = 'lazy';
            img.onerror = () => {
              // 图片加载失败时保留分类图标占位
              img.remove();
            };
            img.src = thumbUrl;
            thumbEl.appendChild(img);
          }
        })
        .catch(err => {
          // 单个词条加载失败不应影响其它卡片
          if (abstractEl && abstractEl.textContent === '正在加载摘要...') {
            abstractEl.textContent = '摘要加载失败';
          }
          console.warn(`词条 ${item.id} 加载失败:`, err);
        });
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
          'x-api-key': WORKER_API_KEY
        }
      });

      if (!res.ok) {
        // 403 通常是来源校验或 key 失效，给出更明确提示
        if (res.status === 403) {
          throw new Error('搜索服务拒绝了本次请求（来源校验或密钥失效）');
        }
        throw new Error(`搜索服务返回 ${res.status}`);
      }

      const data = await res.json();
      workerFailed = false;
      renderSearchResults(data);

    } catch (err) {
      console.warn('Worker 调用失败:', err);
      workerFailed = true;

      // 把技术性错误转换成用户能理解的提示
      let friendly = '网页搜索暂时不可用，请稍后重试';
      if (/Failed to fetch|NetworkError|Load failed/i.test(err.message)) {
        friendly = '无法连接搜索服务，请检查网络后重试';
      } else if (/403/.test(err.message)) {
        friendly = '搜索服务拒绝了本次请求（来源校验或密钥失效）';
      } else if (/50\d/.test(err.message)) {
        friendly = '搜索服务暂时故障，请稍后重试';
      }

      // 无论有没有词条命中，都要提示用户"网页搜索"这一块出了问题，
      // 否则用户会误以为"搜索没有结果"。
      showError(friendly);
      if (resultMeta) resultMeta.classList.add('hidden');
    }
  }

  // ===== 渲染搜索结果 =====
  function renderSearchResults(data) {
    const results = (data && Array.isArray(data.results)) ? data.results : [];
    searchResults = results;

    // ---- AI 总结（无论有没有结果都要显示）----
    if (data && data.summary) {
      summaryBox.classList.remove('hidden');
      summaryBody.innerHTML = `<p>${escapeHtml(data.summary).replace(/\n/g, '</p><p>')}</p>`;
      if (summaryEngine && data.summary_by) {
        const byLabel = {
          'rule_fallback': '规则兜底',
          'ai': 'AI 生成',
          'llm': 'AI 生成'
        }[data.summary_by] || data.summary_by;
        summaryEngine.textContent = `来源: ${byLabel}`;
      } else if (summaryEngine && data.engine) {
        summaryEngine.textContent = `来源: ${data.engine}`;
      }
    } else if (summaryBox) {
      summaryBox.classList.add('hidden');
    }

    // ---- 结果统计 ----
    // 注意：Worker 返回的是 total_estimated / page_size，兼容旧的 total / time
    const total = (data && (data.total_estimated !== undefined ? data.total_estimated : data.total));
    if (total !== undefined && total !== null) {
      resultMeta.classList.remove('hidden');
      const timePart = (data && data.time) ? `（用时 ${data.time} 秒）` : '';
      resultMeta.textContent = total > 0
        ? `找到约 ${total} 条结果${timePart}`
        : '未找到网页结果';
    }

    // ---- 结果列表 ----
    if (results.length > 0) {
      resultList.innerHTML = results.map(item => `
        <li class="result-item">
          <div class="result-title">
            <a href="${escapeUrl(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title || '无标题')}</a>
          </div>
          ${item.url ? `<div class="result-url">${escapeHtml(item.url)}</div>` : ''}
          ${item.snippet ? `<div class="result-snippet">${escapeHtml(item.snippet)}</div>` : ''}
          ${item.source ? `<span class="result-source">${escapeHtml(item.source)}</span>` : ''}
        </li>
      `).join('');
    } else if (lexiconMatches.length === 0) {
      // 既没有词条也没有网页结果
      resultList.innerHTML = '<li class="result-item"><div class="result-title">未找到结果</div><div class="result-snippet">试试其他关键词吧</div></li>';
    } else {
      // 有词条命中，只是网页结果为空 —— 不显示"未找到"，避免误导
      resultList.innerHTML = '';
    }

    // ---- 翻页 ----
    // 兼容 has_more / hasMore
    const hasMore = !!(data && (data.has_more !== undefined ? data.has_more : data.hasMore));
    if (hasMore || currentPage > 1) {
      pagination.classList.remove('hidden');
      pageInfo.textContent = `第 ${currentPage} 页`;
      pagePrev.disabled = currentPage <= 1;
      pageNext.disabled = !hasMore;
    } else {
      pagination.classList.add('hidden');
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
    // 重置词条展开状态
    lexiconExpanded = false;
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

  // URL 安全：只允许 http/https，防止 javascript: 等协议注入
  function escapeUrl(url) {
    if (!url) return '#';
    const s = String(url).trim();
    if (/^https?:\/\//i.test(s)) return escapeHtml(s);
    if (s.startsWith('/') || s.startsWith('./') || s.startsWith('../')) return escapeHtml(s);
    return '#';
  }

  // 分类图标
  const CATEGORY_ICONS = {
    '文化': '🏛️', '科技': '💡', '游戏': '🎮', '产品': '🚀', '互联网': '🌐',
    '工作室': '🏢', '社交': '💬', '娱乐': '🎬', '历史': '📜', '地理': '🗺️',
    '艺术': '🎨', '科学': '🔬', '人物': '👤', '影视': '🎬', '音乐': '🎵',
    '体育': '⚽', '教育': '📚', '商业': '💼', '生活': '🌱'
  };

  function categoryIcon(category) {
    return CATEGORY_ICONS[category] || '📄';
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
