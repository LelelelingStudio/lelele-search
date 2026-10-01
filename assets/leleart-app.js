/**
 * 了了了搜 - 词条详情页逻辑
 * 功能：加载词条 JSON → 渲染标题/infobox/content（paragraph/subtitle/image）
 */

(function () {
  'use strict';

  // ===== DOM 引用 =====
  const articleTitle = document.getElementById('articleTitle');
  const articleMeta = document.getElementById('articleMeta');
  const infobox = document.getElementById('infobox');
  const articleBody = document.getElementById('articleBody');
  const sourceList = document.getElementById('sourceList');
  const relatedList = document.getElementById('relatedList');
  const articleLoading = document.getElementById('articleLoading');
  const articleError = document.getElementById('articleError');
  const headerSearchInput = document.getElementById('headerSearchInput');

  // ===== 状态 =====
  let currentId = null;
  let articleData = null;

  // ===== 初始化 =====
  function init() {
    const params = new URLSearchParams(window.location.search);
    currentId = params.get('id');

    if (!currentId) {
      showError('缺少词条 ID');
      return;
    }

    // 搜索框回车
    if (headerSearchInput) {
      headerSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const q = headerSearchInput.value.trim();
          if (q) {
            window.location.href = `search.html?q=${encodeURIComponent(q)}`;
          }
        }
      });
    }

    loadArticle();
  }

  // ===== 加载词条 JSON =====
  async function loadArticle() {
    showLoading(true);
    hideError();

    try {
      const res = await fetch(`searchart/artindexa1/art${currentId}.json`);
      if (!res.ok) {
        throw new Error(`词条不存在（ID: ${currentId}）`);
      }

      articleData = await res.json();
      renderArticle();

    } catch (err) {
      showError(err.message);
    } finally {
      showLoading(false);
    }
  }

  // ===== 渲染词条 =====
  function renderArticle() {
    if (!articleData) return;

    // ---- 标题 ----
    if (articleTitle) {
      articleTitle.textContent = articleData.title || '无标题';
      document.title = `${articleData.title} - 了了了搜`;
    }

    // ---- 顶部元信息（aliases + category + tags）----
    if (articleMeta) {
      let metaHtml = '';

      if (articleData.category) {
        metaHtml += `<span class="meta-category">${escapeHtml(articleData.category)}</span>`;
      }

      if (articleData.tags && articleData.tags.length > 0) {
        metaHtml += articleData.tags.map(t => `<span class="meta-tag">${escapeHtml(t)}</span>`).join('');
      }

      if (articleData.aliases && articleData.aliases.length > 0) {
        metaHtml += `<span class="meta-aliases">别名：${articleData.aliases.map(a => escapeHtml(a)).join('、')}</span>`;
      }

      articleMeta.innerHTML = metaHtml;
    }

    // ---- Infobox ----
    if (infobox) {
      if (articleData.infobox && Object.keys(articleData.infobox).length > 0) {
        let ibHtml = '<table class="infobox-table"><tbody>';
        ibHtml += '<tr><th colspan="2" class="infobox-header">概览</th></tr>';
        for (const [key, value] of Object.entries(articleData.infobox)) {
          ibHtml += `<tr><td class="infobox-key">${escapeHtml(key)}</td><td class="infobox-value">${escapeHtml(value)}</td></tr>`;
        }
        ibHtml += '</tbody></table>';
        infobox.innerHTML = ibHtml;
        infobox.classList.remove('hidden');
      } else {
        infobox.classList.add('hidden');
      }
    }

    // ---- 正文内容（content 数组，按 type 渲染）----
    if (articleBody) {
      if (articleData.content && articleData.content.length > 0) {
        articleBody.innerHTML = articleData.content.map(item => {
          switch (item.type) {
            case 'paragraph':
              return `<p>${escapeHtml(item.text || '')}</p>`;

            case 'subtitle':
              return `<h3 class="article-subtitle">${escapeHtml(item.text || '')}</h3>`;

            case 'image':
              return `<figure class="article-figure">
                <img src="${escapeHtml(item.src || item.url || '')}" alt="${escapeHtml(item.caption || item.alt || '')}" loading="lazy" onerror="this.parentElement.style.display='none'">
                ${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}
              </figure>`;

            default:
              // 未知类型，尝试当纯文本渲染
              return `<p>${escapeHtml(item.text || JSON.stringify(item))}</p>`;
          }
        }).join('');
      } else if (articleData.abstract) {
        // 没有 content 但有 abstract，兜底显示摘要
        articleBody.innerHTML = `<p class="article-abstract-fallback">${escapeHtml(articleData.abstract)}</p>`;
      } else {
        articleBody.innerHTML = '<p class="article-empty">暂无详细内容</p>';
      }
    }

    // ---- 来源链接 ----
    if (sourceList) {
      if (articleData.sources && articleData.sources.length > 0) {
        sourceList.innerHTML = articleData.sources.map(s => `
          <li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.name || s.url)}</a></li>
        `).join('');
        sourceList.parentElement.classList.remove('hidden');
      } else if (articleData.source_url) {
        sourceList.innerHTML = `<li><a href="${escapeHtml(articleData.source_url)}" target="_blank" rel="noopener">${escapeHtml(articleData.source_url)}</a></li>`;
        sourceList.parentElement.classList.remove('hidden');
      } else {
        sourceList.parentElement.classList.add('hidden');
      }
    }

    // ---- 相关词条（从索引匹配同 category）----
    if (relatedList) {
      loadRelated();
    }
  }

  // ===== 加载相关词条 =====
  async function loadRelated() {
    if (!articleData || !articleData.category) {
      relatedList.parentElement.classList.add('hidden');
      return;
    }

    try {
      const res = await fetch('searchart/artindexa1.json');
      if (!res.ok) return;
      const indexData = await res.json();

      const related = (indexData.items || [])
        .filter(item => item.id != currentId && item.category === articleData.category)
        .slice(0, 5);

      if (related.length > 0) {
        relatedList.innerHTML = related.map(item => `
          <li><a href="leleart.html?id=${item.id}">${escapeHtml(item.title)}</a></li>
        `).join('');
        relatedList.parentElement.classList.remove('hidden');
      } else {
        relatedList.parentElement.classList.add('hidden');
      }
    } catch (e) {
      relatedList.parentElement.classList.add('hidden');
    }
  }

  // ===== 工具函数 =====
  function showLoading(show) {
    if (articleLoading) {
      if (show) articleLoading.classList.remove('hidden');
      else articleLoading.classList.add('hidden');
    }
  }

  function showError(msg) {
    if (articleError) {
      articleError.classList.remove('hidden');
      articleError.textContent = msg;
    }
  }

  function hideError() {
    if (articleError) {
      articleError.classList.add('hidden');
    }
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
