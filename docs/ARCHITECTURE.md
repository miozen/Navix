# 当前架构

> 本文件记录**当前有效架构**，以仓库源码与配置为依据。部署操作教程见 [`../README.md`](../README.md)；已确认决策见 [`DECISIONS.md`](DECISIONS.md)；下一阶段工作见 [`CURRENT_PLAN.md`](CURRENT_PLAN.md)。

## 1. 项目定位与技术栈

- **定位**：静态优先的单页网址导航站，通过 Cloudflare Pages Functions + KV 提供云端配置同步。
- **前端**：原生 HTML / CSS / JavaScript，全部页面与业务编排集中在 `index.html`；Tailwind CSS、Font Awesome 通过 CDN 引入（`index.html:1-15`、`index.html:387-1155`）。
- **后端**：Cloudflare Pages Functions，仅两个 `onRequest` 入口（`functions/api/config.js`、`functions/api/links.js`）。
- **存储**：Cloudflare KV，绑定变量名 `NAV_DB`；主配置键为 `site_config`（`README.md:51-57`、`functions/api/config.js:16,36,56`）。
- **第三方服务**：`ipapi.co`（定位）、`open-meteo`（天气）、`unavatar.io`（站点图标），以及 CDN 静态资源。

## 2. 模块与职责

| 模块 | 路径 | 职责 | 主要依赖 |
| --- | --- | --- | --- |
| 单页应用 | `index.html` | UI 渲染、i18n、主题、壁纸、分区/友链管理、后台交互、云同步编排 | Tailwind CDN、Font Awesome、localStorage、`/api/config` |
| 配置接口 | `functions/api/config.js` | GET/POST `site_config`；POST 前做密码校验与 JSON 合法性校验 | `env.NAV_DB` |
| 遗留链接接口 | `functions/api/links.js` | GET/POST `custom_links`；使用 `ADMIN_TOKEN` 鉴权；当前前端未调用 | `env.NAV_DB`、`env.ADMIN_TOKEN` |
| 部署说明 | `README.md` | 面向用户的 Cloudflare Pages / KV 配置教程 | — |

`functions/api/links.js` 与当前数据模型 `site_config.friendLinks` 分叉，按 [`DECISIONS.md`](DECISIONS.md) D-002 / D-000 处理，不作为主链路扩展。

## 3. 核心业务流程

### 3.1 页面初始化

`checkAdminSession()` → `applyLanguage()` → 时钟/天气 → `initCloudData()` → 渲染分区与友链（`index.html:1149-1155`）。

`initCloudData()` 先读 localStorage 缓存，再 `GET /api/config`，用云端字段覆盖 `cloudConfig` 的 `wallpaper`、`dynamicSections`、`friendLinks`、`adminPwd`，并回写本地缓存（`index.html:620-686`）。网络失败时保留本地缓存继续渲染，实现优雅降级。

### 3.2 后台登录与鉴权

双击页脚触发登录；前端将输入密码与 `cloudConfig.adminPwd`（或默认 `admin888`）比较，成功后把 `nav_admin_auth` 与 `nav_admin_token` 写入 localStorage（`index.html:361-362,505-537`）。服务端 POST 时从 KV 读取当前 `adminPwd` 比对 Bearer Token（`functions/api/config.js:8-28,46-60`）。

> 当前实现的敏感信息暴露问题属于待修复项，详见 [`CURRENT_PLAN.md`](CURRENT_PLAN.md) Phase 1；本文件只描述现状。

### 3.3 配置写入

壁纸、管理员密码、动态分区增删改排序、友情链接增删，均先修改 `cloudConfig` 与 localStorage，再由 `updateCloudConfig()` 将**整个配置对象** POST 到 `/api/config`（`index.html:689-718,737-761,1062-1117`）。服务端仅做 `JSON.parse` 后整对象覆盖写 KV（`functions/api/config.js:52-57`）。

### 3.4 天气与定位

`fetchWeather()` 调用 `ipapi.co/json/` 获取经纬度，再请求 Open-Meteo；失败时显示默认文案（`index.html:945-993`）。该链路不影响导航主功能。

## 4. 持久化与数据流

```
localStorage  ──本地缓存/后台 Token──>  index.html
      ^                                   |
      |                                   | GET/POST /api/config
      └────────覆盖回写────────────────────┘
                                           v
                              functions/api/config.js
                                           |
                                           v
                             Cloudflare KV: NAV_DB["site_config"]
```

- 主配置字段：`wallpaper`、`dynamicSections`、`friendLinks`、`adminPwd`。
- 遗留键：`custom_links`（仅 `/api/links` 使用，前端未引用）。
- 无数据库 schema、无迁移脚本；字段兼容性由前端条件判断处理（例如 `if (configData.friendLinks)`）。

## 5. 关键架构约束

- 单页应用 + 薄 Function + 单 KV 配置对象；**无构建步骤、无服务端框架、无传统数据库**（`README.md:44-49`）。
- 根目录直接部署，`index.html` 与 `functions/` 必须位于仓库根（`README.md:29-49`）。
- KV 绑定变量名必须为 `NAV_DB`（`README.md:51-57`）。
- 本地可静态预览页面，但 API 行为依赖 Cloudflare Pages 环境与 KV 绑定。
- 多端写同一 `site_config` 时为整对象覆盖、最后写入者胜出；KV 具有最终一致性。
- 当前无自动化测试、无 CI、无 lint 配置；变更验证以语法检查与人工冒烟为主。

## 6. 构建、运行与部署

- **构建**：无构建命令、无 `package.json`、无输出目录配置。
- **本地运行**：可用任意静态文件服务打开 `index.html`；`/api/config` 仅在 Cloudflare Pages Functions 环境可用。
- **部署**：GitHub 仓库连接 Cloudflare Pages → 添加 `NAV_DB` KV 绑定 → 重试部署。完整步骤以 [`README.md`](../README.md) 第 25-64 行为准，本文件不复制。
