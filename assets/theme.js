/**
 * 了了了搜 - 主题切换
 * 默认浅色，用户可切换深浅；选择保存在 localStorage
 *
 * 用法：
 *   1. 在每个页面 <head> 里尽早同步引入（避免闪烁）：
 *      <script src="assets/theme.js"></script>
 *   2. 页面里放一个按钮：<button class="theme-toggle" id="themeToggle"></button>
 *      图标由本脚本自动注入。
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'lll_theme';
  var LIGHT = 'light';
  var DARK = 'dark';

  // ===== 尽早执行：从 localStorage 读取并应用主题 =====
  function getSavedTheme() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === LIGHT || saved === DARK) return saved;
    } catch (e) {
      /* localStorage 不可用（隐私模式等），忽略 */
    }
    return null;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // 已保存的主题优先；否则默认浅色（不跟随系统，符合"初始强制浅色"）
  var savedTheme = getSavedTheme();
  var initialTheme = savedTheme || LIGHT;
  applyTheme(initialTheme);

  // ===== DOM 就绪后：注入按钮图标 + 绑定点击 =====
  var ICON_MOON =
    '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

  var ICON_SUN =
    '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="4"></circle>' +
    '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41' +
    'M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path></svg>';

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === DARK ? DARK : LIGHT;
  }

  function updateButton(btn) {
    var theme = currentTheme();
    var label = theme === DARK ? '切换到浅色模式' : '切换到深色模式';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  }

  function toggleTheme() {
    var next = currentTheme() === DARK ? LIGHT : DARK;
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      /* 忽略写入失败 */
    }
    // 更新所有按钮状态
    document.querySelectorAll('.theme-toggle').forEach(updateButton);
  }

  function initButtons() {
    var btns = document.querySelectorAll('.theme-toggle');
    if (!btns.length) return;

    btns.forEach(function (btn) {
      // 注入图标（仅一次）
      if (!btn.querySelector('svg')) {
        btn.innerHTML = ICON_MOON + ICON_SUN;
      }
      updateButton(btn);

      if (!btn.dataset.themeBound) {
        btn.dataset.themeBound = '1';
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          toggleTheme();
        });
      }
    });
  }

  function onReady() {
    initButtons();
    // 主题已应用，启用过渡动画
    requestAnimationFrame(function () {
      document.documentElement.classList.add('theme-ready');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  // 供其他脚本调用
  window.LLLTheme = {
    get: currentTheme,
    set: function (t) {
      applyTheme(t === DARK ? DARK : LIGHT);
      try { localStorage.setItem(STORAGE_KEY, t === DARK ? DARK : LIGHT); } catch (e) {}
      document.querySelectorAll('.theme-toggle').forEach(updateButton);
    },
    toggle: toggleTheme
  };
})();
