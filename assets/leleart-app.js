/**
 * 了了了搜 - 词条详情页逻辑
 * 格式：content 数组 + type 字段（paragraph / subtitle / image）
 */

(function () {
  'use strict';

  // ===== DOM 引用 =====
  const artTitle = document.getElementById('artTitle');
  const artAliases = document.getElementById('artAliases');
  const artAbstract = document.getElementById('artAbstract');
  const artSections = document.getElementById('artSections');
  const artImage = document.getElementById('artImage');
  const artInfoTable = document.getElementById('artInfoTable');
  const artSourceLink = document.getElementById('artSourceLink');
  const backToSearch = document.getElementById('backToSearch');
  const leleartMain = document.getElementById('leleartMain');
  const leleartLoading = document.getElementById('leleartLoading');
  const leleartError = document.getElementById('leleartError');

  // ===== 初始化 =====
  function init() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
      showError('缺少词条 ID');
      return;
    }

    // 返回搜索按钮
    const q = params.get('q');
    if (backToSearch) {
      if (q) {
        backToSearch.href = `search.html?q=${encodeURIComponent(q)}`;
      } else {
        backToSearch.href = 'search.html';
      }
    }

    loadArticle(id, q);
  }

  // ===== 加载词条 =====
  async function loadArticle(id, query) {
    showLoading(true);

    try {
      const res = await fetch(`searchart/artindexa1/art${id}.json`);

      if (!res.ok) {
        throw new Error(`词条不存在 (${res.status})`);
      }

      const data = await res.json();
      renderArticle(data, query);

    } catch (err) {
      showError(`词条加载失败：${err.message}`);
    } finally {
      showLoading(false);
    }
  }

  // ===== 渲染词条 =====
  function renderArticle(data, query) {
    if (!data) return;

    // 页面标题
    document.title = `${data.title || '词条'} - 了了了搜`;

    // 标题
    if (artTitle) {
      artTitle.textContent = data.title || '无标题';
    }

    // 别名
    if (artAliases) {
      if (data.aliases && data.aliases.length > 0) {
        artAliases.textContent = `别名：${data.aliases.join('、')}`;
      } else {
        artAliases.textContent = '';
      }
    }

    // 摘要
    if (artAbstract) {
      if (data.abstract) {
        artAbstract.innerHTML = `<p>${escapeHtml(data.abstract)}</p>`;
      } else {
        artAbstract.style.display = 'none';
      }
    }

    // 信息栏 - 图片
    if (artImage) {
      if (data.thumb) {
        artImage.innerHTML = `<img src="${escapeHtml(data.thumb)}" alt="${escapeHtml(data.title)}" loading="lazy" onerror="this.parentElement.style.display='none'">`;
      } else {
        artImage.style.display = 'none';
      }
    }

    // 信息栏 - 表格
    if (artInfoTable) {
      const infobox = data.infobox;
      if (infobox && Object.keys(infobox).length > 0) {
        artInfoTable.innerHTML = Object.entries(infobox).map(([key, value]) => `
          <tr>
            <th>${escapeHtml(key)}</th>
            <td>${escapeHtml(value)}</td>
          </tr>
        `).join('');
      } else {
        if (data.category) {
          artInfoTable.innerHTML = `
            <tr><th>分类</th><td>${escapeHtml(data.category)}</td></tr>
            ${data.tags ? `<tr><th>标签</th><td>${data.tags.map(t => escapeHtml(t)).join('、')}</td></tr>` : ''}
            ${data.updated ? `<tr><th>更新</th><td>${escapeHtml(data.updated)}</td></tr>` : ''}
          `;
        } else {
          artInfoTable.parentElement.style.display = 'none';
        }
      }
    }

    // ===== 正文渲染（content 数组 + type 字段）=====
    if (artSections) {
      if (data.content && Array.isArray(data.content) && data.content.length > 0) {
        let html = '';
        data.content.forEach(item => {
          if (!item || !item.type) return;

          switch (item.type) {
            case 'paragraph':
              if (item.text) {
                html += `<p>${escapeHtml(item.text)}</p>`;
              }
              break;

            case 'subtitle':
              if (item.text) {
                html += `<h3 class="leleart-subtitle">${escapeHtml(item.text)}</h3>`;
              }
              break;

            case 'image':
              if (item.src) {
                html += `<figure class="leleart-figure">
                  <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.caption || item.text || data.title)}" loading="lazy" onerror="this.parentElement.style.display='none'">
                  ${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}
                </figure>`;
              }
              break;

            case 'heading':
              if (item.text) {
                html += `<h2 class="leleart-heading">${escapeHtml(item.text)}</h2>`;
              }
              break;

            case 'list':
              if (item.items && Array.isArray(item.items)) {
                html += `<ul class="leleart-list">${item.items.map(li => `<li>${escapeHtml(li)}</li>`).join('')}</ul>`;
              }
              break;

            case 'link':
              if (item.url && item.text) {
                html += `<p><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" class="leleart-link">${escapeHtml(item.text)}</a></p>`;
              }
              break;

            default:
              // 未知类型，尝试当纯文本处理
              if (item.text) {
                html += `<p>${escapeHtml(item.text)}</p>`;
              }
          }
        });

        artSections.innerHTML = html;
      } else {
        artSections.innerHTML = '';
      }
    }

    // 来源链接
    if (artSourceLink) {
      if (data.source_url) {
        artSourceLink.href = data.source_url;
        artSourceLink.textContent = `访问原始来源 →`;
      } else if (data.official_url) {
        artSourceLink.href = data.official_url;
        artSourceLink.textContent = `访问官方网站 →`;
      } else {
        artSourceLink.parentElement.style.display = 'none';
      }
    }

    // 显示内容
    leleartMain.classList.remove('hidden');
  }

  // ===== 工具函数 =====
  function showLoading(show) {
    if (show) {
      leleartLoading.classList.remove('hidden');
    } else {
      leleartLoading.classList.add('hidden');
    }
  }

  function showError(msg) {
    leleartError.classList.remove('hidden');
    leleartError.textContent = msg;
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
