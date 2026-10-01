# 了了了搜 · LeLeLeSearch

> 探索未至之境 · 一次搜索，多源结果

---

# 👤 面向用户

## 这是什么？

**了了了搜** 是了了了岭工作室旗下的 **跨引擎聚合搜索产品**。

不用再一个个打开百度、Google、Bing——**一次查询，同时拿到多个搜索引擎的结果**，帮你更快找到想要的答案。

### 核心功能

| 功能 | 说明 |
|------|------|
| 🔍 **聚合搜索** | 同时调用多个搜索引擎，结果一览无余 |
| 📚 **本地词条库** | 内置 38+ 条精选词条，搜索时优先匹配，精确/包含/模糊三级展示 |
| 🤖 **AI 总结** | 搜索结果最上方展示 AI 生成的摘要总结，快速获取要点 |
| 📖 **词条详情页** | 点击词条卡片跳转独立详情页，信息栏 + 正文段落完整呈现 |
| 🎯 **智能排序** | 去重 + 按相关度排列，减少翻页 |
| 🎨 **浅色 / 深色主题** | 默认浅色，右上角一键切换，选择自动记忆 |
| 💬 **每日语录** | 首页随机展示语录（内置 983 条），支持"换一条" |
| 📱 **移动端适配** | 响应式布局，横竖屏自动适配 |
| 🎨 **工作室配色** | 紫色强调色 + 圆角卡片，浅色/深色两套主题 |

### 访问地址

🌐 **[search.leleleling.site](https://search.leleleling.site)**

### 支持我们

了了了搜目前完全免费。

如果你觉得好用，欢迎：
- ⭐ 在 GitHub 上点个 Star
- ❤️ 通过站内「支持我们」按钮捐赠：[leleleling.site/support.html](https://leleleling.site/support.html)

你的支持能让我们走得更远。

---

# 🛠 面向开发者

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 纯 HTML + CSS + JavaScript（ES6+，零框架） |
| 搜索后端 | Cloudflare Worker（聚合多引擎） |
| 数据存储 | 静态 JSON 文件 |
| 部署 | GitHub Pages + Cloudflare 加速 |
| 样式方案 | CSS Variables + Flexbox + Grid |

## 目录结构


lelele-search/

├── index.html              # 首页（搜索入口 + 快捷入口 + 每日语录）

├── search.html             # 结果页（AI总结 + 词条卡片 + 搜索列表）

├── leleart.html            # 词条详情页

├── assets/

│   ├── common.css          # 全局公共样式（含浅色/深色主题变量）

│   ├── home.css            # 首页样式

│   ├── search.css          # 结果页样式

│   ├── leleart.css         # 词条详情页样式

│   ├── theme.js            # 主题切换（默认浅色，localStorage 记忆）

│   ├── app.js              # 首页逻辑

│   ├── search-app.js       # 结果页逻辑（Worker调用 + 词条匹配）

│   ├── leleart-app.js      # 词条详情页逻辑

│   └── quotes.json         # 语录数据（983 条，同源静态文件）

├── searchart/

│   ├── artindexa1.json     # 词条索引（id/title/aliases/category）

│   └── artindexa1/         # 完整词条目录

│       ├── art1.json

│       ├── art2.json

│       └── ...（art38.json）

└── README.md


## 快速开始

bash
克隆仓库

git clone https://github.com/LelelelingStudio/lelele-search.git
cd lelele-search

使用任意静态服务器

npx serve .
或

python -m http.server 8000


> ⚠️ 由于使用了 `fetch` 加载本地 JSON，需要通过 HTTP 服务器访问，不能直接 `file://` 打开。

## 配置项

| 配置 | 位置 | 说明 |
|------|------|------|
| `WORKER_URL` | `assets/search-app.js` | Cloudflare Worker 地址 |
| `WORKER_API_KEY` | `assets/search-app.js` | Worker 鉴权密钥（如不需要可删除 headers） |
| `INDEX_URL` | `assets/search-app.js` / `assets/app.js` | 词条索引文件路径 |
| `QUOTES_URL` | `assets/app.js` | 语录数据源（已本地化为 `assets/quotes.json`） |
| 主题 | `assets/theme.js` | 默认浅色，右上角切换；存储键 `lll_theme` |

> ⚠️ **安全提示**：前端代码里的 `WORKER_API_KEY` 会随公开仓库一起暴露，
> 任何人都能在浏览器里看到。它只能挡住随手盗用，真正的防护应依赖
> Worker 端的 **Origin / Referer 白名单 + 频率限制**，并定期轮换密钥。

## 词条 JSON 格式

### 索引文件（`searchart/artindexa1.json`）

json
{
  "version": "1.0",
  "items": [
    {
      "id": 1,
      "title": "词条标题",
      "aliases": ["别名1", "别名2"],
      "category": "分类"
    }
  ]
}


### 完整词条（`searchart/artindexa1/art1.json`）

json
{
  "id": 1,
  "title": "词条标题",
  "aliases": ["别名1", "别名2"],
  "category": "分类",
  "tags": ["标签1", "标签2"],
  "abstract": "词条摘要文本",
  "thumb": "https://example.com/image.png",
  "infobox": {
    "分类": "xxx",
    "创建时间": "2026-01-01",
    "作者": "Leleleling Studio"
  },
  "sections": [
    {
      "heading": "概述",
      "content": ["段落1", "段落2"]
    },
    {
      "heading": "详细内容",
      "subsections": [
        { "title": "子标题", "content": "子段落内容" }
      ],
      "list": ["列表项1", "列表项2"]
    }
  ],
  "source_url": "https://example.com/source",
  "updated": "2026-10-01"
}


## 扩展词条

1. 在 `searchart/artindexa1.json` 的 `items` 数组中添加新条目（id 递增）
2. 在 `searchart/artindexa1/` 目录下创建对应的 `art{n}.json`
3. 当单文件超过 1000 条时，新建 `artindexa2.json` 及对应目录

---

© 2026 了了了岭工作室
