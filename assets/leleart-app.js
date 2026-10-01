/**
 * 了了了搜 - 词条详情页逻辑
 * 读取 content 数组（paragraph/subtitle/image）
 * 适配 leleart.html 现有 DOM 结构
 */

(function () {
  'use strict';

  // ===== DOM 引用（对应 leleart.html 里的 id）=====
  const artTitle = document.getElementById('artTitle');
  const artAliases = document.getElementById('artAliases');
  const artAbstract = document.getElementById('artAbstract');
  const artSections = document.getElementById('artSections');
  const artSourceLink = document.getElementById('artSourceLink');
  const artInfobox = document.getElementById('artInfobox');
  const artImage = document.getElementById('artImage');
  const artInfoTable = document.getElementById('artInfoTable');
  const loadingEl = document.getElementById('leleartLoading');
  const errorEl = document.getElementById('leleartError');
  const mainEl = document.getElementById('leleartMain');

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

    loadArticle();
  }

  // ===== 加载词条 JSON =====
  async function loadArticle() {
    showLoading(true);
    hideError();

    try {
      const res = await fetch(`searchart/artindexa1/art${currentId}.json`);
      if (!res.ok) throw new Error(`词条不存在（ID: ${currentId}）`);
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
    if (artTitle) {
      artTitle.textContent = articleData.title || '无标题';
      document.title = `${articleData.title} - 了了了搜`;
    }

    // ---- 别名 ----
    if (artAliases) {
      if (articleData.aliases && articleData.aliases.length > 0) {
        artAliases.innerHTML = articleData.aliases.map(a => `<span class="alias-tag">${escapeHtml(a)}</span>`).join('');
      } else {
        artAliases.innerHTML = '';
      }
    }

    // ---- 摘要 ----
    if (artAbstract) {
      if (articleData.abstract) {
        artAbstract.innerHTML = `<p>${escapeHtml(articleData.abstract)}</p>`;
      } else {
        artAbstract.style.display = 'none';
      }
    }

    // ---- 正文（content 数组，按 type 渲染）----
    if (artSections) {
      if (articleData.content && articleData.content.length > 0) {
        artSections.innerHTML = articleData.content.map(item => {
          switch (item.type) {
            case 'paragraph':
              return `<p>${escapeHtml(item.text || '')}</p>`;
            case 'subtitle':
              return `<h3 class="leleart-subtitle">${escapeHtml(item.text || '')}</h3>`;
            case 'image':
              return `<figure class="leleart-figure">
                <img src="${escapeHtml(item.src || item.url || '')}" alt="${escapeHtml(item.caption || item.alt || '')}" loading="lazy" onerror="this.parentElement.style.display='none'">
                ${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}
              </figure>`;
            default:
              return `<p>${escapeHtml(item.text || JSON.stringify(item))}</p>`;
          }
        }).join('');
      } else if (articleData.abstract) {
        // 没有 content 但有 abstract，兜底
        artSections.innerHTML = `<p>${escapeHtml(articleData.abstract)}</p>`;
      } else {
        artSections.innerHTML = '<p style="color:var(--text-muted);">暂无详细内容</p>';
      }
    }

    // ---- 来源链接 ----
    if (artSourceLink) {
      if (articleData.source_url) {
        artSourceLink.href = articleData.source_url;
        artSourceLink.textContent = '访问原始来源 →';
      } else if (articleData.sources && articleData.sources.length > 0) {
        artSourceLink.href = articleData.sources[0].url;
        artSourceLink.textContent = articleData.sources[0].name || '访问来源 →';
      } else {
        // 没有来源，隐藏整个 source-item
        const sourceItem = artSourceLink.closest('.source-item');
        if (sourceItem) sourceItem.style.display = 'none';
      }
    }

    // ---- Infobox ----
    if (artInfobox) {
      let hasContent = false;

      // 图片
      if (artImage) {
        if (articleData.thumb) {
          artImage.innerHTML = `<img src="${escapeHtml(articleData.thumb)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`;
          hasContent = true;
        } else {
          artImage.style.display = 'none';
        }
      }

      // 表格
      if (artInfoTable) {
        if (articleData.infobox && Object.keys(articleData.infobox).length > 0) {
          let tableHtml = '';
          for (const [key, value] of Object.entries(articleData.infobox)) {
            tableHtml += `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`;
          }
          artInfoTable.innerHTML = tableHtml;
          hasContent = true;
        } else {
          artInfoTable.style.display = 'none';
        }
      }

      if (!hasContent) {
        artInfobox.style.display = 'none';
      }
    }

    // ---- 显示主内容 ----
    if (mainEl) mainEl.classList.remove('hidden');
  }

  // ===== 工具函数 =====
  function showLoading(show) {
    if (loadingEl) {
      if (show) loadingEl.classList.remove('hidden');
      else loadingEl.classList.add('hidden');
    }
  }

  function showError(msg) {
    if (errorEl) {
      errorEl.classList.remove('hidden');
      errorEl.textContent = msg;
    }
  }

  function hideError() {
    if (errorEl) errorEl.classList.add('hidden');
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
