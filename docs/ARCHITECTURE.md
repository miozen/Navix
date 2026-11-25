# 当前架构

> 本文件记录**当前有效架构**，以仓库源码与配置为依据。用户部署教程见 [`../README.md`](../README.md)（P3 已更新为 Workers 流程）；已确认决策见 [`DECISIONS.md`](DECISIONS.md)；阶段计划见 [`CURRENT_PLAN.md`](CURRENT_PLAN.md)。

## 1. 项目定位与技术栈

- **定位**：静态优先的单页网址导航站，通过 Cloudflare Workers + Static Assets + KV 提供云端配置同步。
- **前端**：原生 HTML / CSS / ES Modules，无框架、无构建。页面壳在 `public/index.html`，样式在 `public/assets/css/app.css`，逻辑在 `public/assets/js/`。
- **后端**：Cloudflare Worker 入口 `src/worker.mjs`，只处理 `/api/*`；其余请求由 Static Assets 提供。
- **存储**：Cloudflare KV，绑定变量 `NAV_DB`；公开配置键 `site_config`，私有管理员凭据键 `admin_auth`。
- **第三方服务**：`ipapi.co`（定位）、`open-meteo`（天气）、`icons.duckduckgo.com`（图标二级兜底，优先直连目标站点 `/favicon.ico`），以及 Tailwind / Font Awesome CDN。
- **状态说明**：`dev` 分支已是 Workers 架构；现网生产仍为 Pages 旧架构，切换生产前必须完成 preview 验证（D-013、D-014）。

## 2. 模块与职责

| 模块 | 路径 | 职责 | 主要依赖 |
| --- | --- | --- | --- |
| 静态页面 | `public/index.html`、`public/assets/**` | UI、i18n、主题、壁纸、分区/友链、天气、后台交互 | 原生 ES Modules、CDN |
| Worker 入口 | `src/worker.mjs` | `/api/*` 路由分发、CSRF 同源校验、方法限制 | 路由模块 |
| 配置路由 | `src/routes/config.mjs` | GET 公开配置；POST 白名单写入与版本冲突提示 | `NAV_DB`、校验模块 |
| 鉴权路由 | `src/routes/auth.mjs` | 登录、退出、改密、会话探活、会话版本失效 | Web Crypto、`NAV_DB` |
| 辅助库 | `src/lib/` | 密码哈希、会话签名、配置读写、字段校验、HTTP 工具 | Web Crypto |
| 配置清单 | `wrangler.jsonc` | Worker 入口、`public/` 静态目录、KV 绑定、preview/production 环境 | Wrangler |
| 测试 | `tests/` | 安全测试、Worker API 测试、回归清单 | Node 内置 test runner |

前端模块入口：`core/utils.js`、`core/state.js`、`core/api.js`、`core/i18n.js`，以及 `features/starfield.js`、`appearance.js`、`widgets.js`、`navigation.js`、`admin.js`；`main.js` 负责启动、跨模块回调注册与内联事件兼容，`app.js` 仅作向后兼容聚合重导出。

## 3. 核心业务流程

### 3.1 页面初始化

`main.js` 挂载内联处理器 → `checkAdminSession()` → `verifyAdminSession()`（仅在本地已有登录标记时静默请求 `GET /api/session` 探活）→ `applyLanguage()` → 时钟/天气 → `initCloudData()` → 渲染分区与友链。`initCloudData()` 先读浏览器本地缓存，再 GET `/api/config` 覆盖公开配置字段；网络失败时保留本地缓存继续渲染。

### 3.2 登录与配置写入

- 登录：单击页脚 → 弹出带遮罩的密码模态框 → `POST /api/login` → 服务端校验 `admin_auth` 哈希 → 返回短期签名 HttpOnly Cookie。
- 写入：前端携带 Cookie 与 `version` POST `/api/config`；服务端校验同源、白名单与版本；成功后递增版本。
- 版本不一致返回 409 与当前配置，仅作尽力而为提示，不保证原子性（D-011）。
- 保存状态机：`idle / saving / saved / failed / unknown`；超时保留草稿并提示刷新确认。

### 3.3 密码与会话

`POST /api/password` 要求旧密码 + 新密码，更新私有哈希并递增 `sessionVersion`，旧 Cookie 失效；受 KV 最终一致性影响，失效可能存在短暂延迟（D-012）。

### 3.4 公开边界

只有 `public/` 被 Static Assets 发布（含 `index.html`、`favicon.ico`、`ads.txt`、`assets/`）；`src/`、`docs/`、`tests/`、`wrangler.jsonc` 不公开。`GET /api/config` 不返回任何凭据。`/api/links` 已关闭。

## 4. 持久化与数据流

```
浏览器本地缓存 ──本地偏好──> public/assets/js/*
        ^                         |
        └────覆盖回写──────────────┘
                                  | GET/POST /api/config
                                  v
                       src/worker.mjs → src/routes/config.mjs
                                  |
                                  v
                  KV NAV_DB["site_config"]（公开配置）
                  KV NAV_DB["admin_auth"]（私有哈希）
```

- 个人浏览偏好只留浏览器本地，不写入 KV。
- `site_config` 保留单一公开配置对象；凭据独立存储在 `admin_auth`。
- 无数据库 schema 与迁移脚本；字段兼容由服务端白名单和前端默认值处理。

## 5. 关键架构约束

- Workers + Static Assets + KV，免费计划内运行；零构建、无框架、无传统数据库（D-001、D-009）。
- KV 绑定变量为 `NAV_DB`；`SESSION_SECRET` 通过 Wrangler secret 注入，不写仓库。
- 管理员凭据：KV 无 `admin_auth` 时使用内置默认密码并强制首次改密（D-015）；改密后只保存哈希，不复用已暴露旧密码（D-010 保留原则）。
- KV 写入非原子；版本检测仅提示，不宣称强一致性（D-011）。
- 生产回退目标必须是已修复漏洞的构建，不得回退到 Pages 旧版（D-013）。
- `main` 受保护，仅 `main` 自动部署 Workers；`dev` 不自动部署（D-014）。

## 6. 构建、运行与部署

- **构建**：无构建命令、无 `package.json`、无输出目录。
- **本地/预览**：使用 Wrangler（尚未安装）；`SESSION_SECRET` 通过 secret 或本地开发变量注入。
- **部署**：`main` 由 Workers Git 集成自动部署；`dev` 仅用于开发和 preview 验证。
- 部署步骤见 `README.md`（P3 已更新为 Workers + Static Assets + KV 流程）。
