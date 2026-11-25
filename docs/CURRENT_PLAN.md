# 当前开发计划

> 本文件只保留**阶段级**进度与下一步，不记录临时会话细节。架构依据见 [`ARCHITECTURE.md`](ARCHITECTURE.md)，决策状态见 [`DECISIONS.md`](DECISIONS.md)，精确恢复点见 [`HANDOFF.md`](HANDOFF.md)。

## Current Phase

**Phase 5 — P3 工程化（Completed，2026-11-24）**

> 全部阶段任务已完成；生产切换仍待真实 preview 端到端验证。

## Goal

在最终架构 Cloudflare Workers + Static Assets + KV 上，先建立最小回归与安全测试基线，再分阶段完成安全止血、数据状态治理、前端模块化和工程化；全程保持免费计划、原生 JS、零构建，并保留安全可回退基线。

## Completed

- Phase 0：项目认知与接力机制建设完成。
- 用户已确认最终架构：Workers + Static Assets + KV（D-009）。
- 四项修正已登记为 Accepted：D-010（旧密码不复用、私有哈希）、D-011（版本仅提示）、D-012（sessionVersion 失效）、D-013（回退版本安全兼容）。
- D-007、D-008 已由 Proposed 转为 Accepted；D-004 由 D-010 替代。
- D-014 固化新仓库 `Navix.git`、`dev` 开发分支、`main` 稳定分支且仅 `main` 自动部署 Workers。
- P0 具体任务清单已获用户确认并完成实施。
- 已在 `dev` 分支建立 Workers 骨架（`wrangler.jsonc`、`public/`、`src/worker.mjs`）与安全 API（config/login/logout/password）。
- 已移除公开配置中的管理员凭据、旧 Token 与 `adminPwd` 前端依赖；凭据改为私有哈希存储。
- 已加入字段白名单、CSRF 同源校验、XSS 安全渲染基线，并关闭 `/api/links`。
- 已建立最小回归清单与 14 项安全/API 测试，全部通过。
- P1 已在 `dev` 分支完成：配置写入增加版本冲突提示（409 + 当前版本），明确不保证原子性（D-011）。
- 前端增加保存状态机（idle/saving/saved/failed/unknown）、8 秒超时、结果未知提示、重复提交防护与已保存状态展示。
- 新增版本冲突测试，测试总数达到 15/15 通过。
- P2 已在 `dev` 分支完成：`index.html` 的内联 CSS 与 JS 已拆分到 `public/assets/css/app.css` 与原生 ES Modules。
- 建立 `core/state`、`core/api`、`core/i18n`、`features/starfield`、`appearance`、`widgets`、`navigation`、`admin` 等模块入口，`main.js` 负责启动与内联事件兼容。
- 保留全部页面结构、视觉效果与交互处理器；回归清单增加模块化加载项。
- 接力稳定：新增 `.gitignore`，更新 `ARCHITECTURE.md` 与 `AGENTS.md` 的远端/分支规则，明确 Git 为接力依据。
- `dev` 分支已推送到远端（本机远端名为 `origin`，指向 `https://github.com/miozen/Navix.git`；部分机器名为 `navix`），可作为跨电脑开发接力点。
- P3 工程化已完成：测试扩充至 33/33 通过（新增页面静态冒烟与多项 API/边界用例）；新增 `.github/workflows/ci.yml` 零依赖 CI；`wrangler.jsonc` 增补三环境边界注释；README 已由 Pages 旧教程重写为 Workers 部署教程并移除明文密码。
- 生产 KV ID 已写入 `wrangler.jsonc`（`e20a2207b12549a7abe68eb7ce272b24`，Cloudflare 惯例，ID 非凭据）。
- D-015 已获用户确认并实施：内置默认密码 `navix666` + 首次强制改密，替代 D-010 中"禁止公开初始密码"一条；D-010 其余原则保留。测试增至 36/36 通过。
- D-016 已获用户确认并实施（站点的可视化设置）：站点标题、页脚文字、搜索引擎（名称/URL 模板 `{q}`/图标/默认引擎）纳入 `site_config` 并由右侧设置面板管理（仅管理员可见）；新增网址支持原地编辑（改为删除重建）；夜间模式链接标签/角标对比度修复；设置面板按「外观 / 站点 / 后台」归拢并可滚动。测试增至 40/40 通过。
- **D-016 已通过 GitHub PR #1 合并到 `main`**（`2fddd3a Merge pull request #1 from miozen/dev`），Cloudflare Git 集成自动部署。
- 线上问题修复第一批（已通过 PR #2 合并上线）：① 保存配置报「engines 格式无效」——前端未初始化时提交 `engines:null`，已做服务端容错（忽略 null 不覆盖）+ 前端 applySiteAppearance 写回有效数组 + 提交 body 过滤 null/undefined；② 根治「偶发保存/添加云端无响应、刷新才恢复」——`saveInProgress` 布尔锁改为串行 Promise 队列，并发保存依次执行且 body 构造移入 try、finally 必释放；③ 新增回到顶部按钮（初版滚动 >300px 显示）；④ 页脚改为单击统一入口（未登录登录 / 已登录确认后退出）。
- **PR #2 已合并**：`8f634f7 Merge pull request #2 from miozen/dev`，第一批修复上线。
- **PR #3 已合并**：`365d0a1 Merge pull request #3 from miozen/dev`，第二批 UI/交互修复上线（设置面板左上角、链接标题一行、编辑模态框 id、登录退出提示合并）。
- **PR #4 已合并**：`7efe37d Merge pull request #4 from miozen/dev`，10 项审查缺陷修复与稳定性加固上线。
- 本轮 6 项技术债务清理与交互加固（已在 `dev` 完成实施与本地验证）：
  1. 旧代码文件清理：`git rm index.html` 移除仓库根目录废弃旧版页面，消除旧明文凭据与误用隐患。
  2. 补齐网站图标：新增 `public/favicon.ico` 并在 `public/index.html` 声明，消除浏览器 404 回退请求。
  3. 加宽设置面板：桌面端左上角 `#theme-panel` 由 `w-64`（256px）加宽至 `w-[21.25rem]`（340px）并保留移动端自适应。
  4. 密码安全模态框：新增 `#auth-modal`（`type="password"` 遮罩输入、Enter 提交、Esc/空白取消），`updateAdminPwd` 与 `triggerAdminLogin` 均复用该模态框，彻底替换原生明文 `prompt()`。
  5. 首屏会话主动探活：后端新增只读 `GET /api/session`，前端仅在本地有登录标记时静默探活，会话失效时自动回归只读态，避免“伪登录”。
  6. 前端模块真实下沉：将 `public/assets/js/app.js` 1244 行实现下沉至 `core/utils.js`、`core/state.js`、`core/i18n.js`、`core/api.js` 与 `features/*`，`main.js` 通过生命周期回调解耦循环依赖，`app.js` 仅作兼容重导出。
  7. 友链图标与设置面板视口悬浮：抽出 `buildLinkIconHtml` 公共函数为友情链接补充站点图标，并为 `unavatar.io/duckduckgo` 加上 `?fallback=false` 以严格回退至首字符圆标；移除 `public/index.html` 中 `#settings-floating` 冲突的 `relative` 类，使设置按钮真正跟随视口左上角悬浮。测试 43/43 全部通过。

## In Progress

本轮 6 项债务任务已在 `dev` 完成实现与本地验证（43/43 全部通过），推送到 `origin/dev` 后待创建 `dev → main` PR 合并上线并做线上验证。合并方式必须走 GitHub PR，不直接推送 `main`（D-014）。

## Remaining

- **P0 — 最小回归/安全测试 + 安全止血（Completed，待阶段验收）**
  1. 建立现有功能回归清单与最小安全测试用例（先于任何业务代码改动）。
  2. 在独立 preview 环境搭建 Workers 骨架：`wrangler.jsonc`、`public/`、`src/worker.js`。
  3. 迁移 `/api/config`，GET/POST 路径与核心行为保持兼容。
  4. 重新设置管理员密码，私有存储只保存哈希；彻底废弃旧密码与旧 Token（D-010）。
  5. 实现 `/api/login`、`/api/logout`：短期签名 HttpOnly Cookie + `sessionVersion`（D-012）。
  6. 实现 `/api/password`：旧密码 + 新密码，变更后旧会话失效并说明 KV 延迟。
  7. `/api/config` POST 启用字段白名单、URL 与长度校验；拒绝凭据字段。
  8. CSRF 防护：SameSite=Strict + 写接口 Origin/Referer 同源校验。
  9. 修复动态文本 `innerHTML` 注入风险。
  10. 清理 `/api/links`（返回 410/404 并最终删除文件）。
  11. preview 完成静态资源、API、登录、配置保存、页面功能与安全测试全量验证。
- **P1 — 数据与状态管理（Completed，待阶段验收）**
  1. 明确 KV 只存公开站点配置，个人偏好留在浏览器本地。
  2. 增加 `version` / `updatedAt` 与尽力而为冲突提示，不承诺原子乐观锁（D-011）。
  3. 统一保存状态机：`idle / saving / saved / failed / unknown`，超时保留草稿。
  4. 防重复提交与静默覆盖。
- **P2 — 前端模块化（Completed，待阶段验收）**
  1. 渐进拆分 `index.html` 为 HTML、CSS 与原生 ES Modules。
  2. 按核心、导航、外观、组件、后台划分模块，避免过度拆分。
  3. 保持全部现有功能、视觉效果和交互行为。
- **P3 — 工程化（Completed，2026-11-24）**
  1. 建立单元测试、Worker API 测试与页面冒烟测试。
  2. GitHub Actions 静态检查；dev / preview / production 环境边界。
  3. 同步 README 与五类核心文档。

## Acceptance Criteria

- **P0**
  - 旧管理员密码与旧 Token 均不可再用于鉴权；私有存储不含明文密码（D-010）。
  - 任何公开响应不返回管理员凭据；直接写 `adminPwd` 字段被拒绝（D-007）。
  - 登录、退出、改密与 `sessionVersion` 失效行为可验证；KV 最终一致性导致的失效延迟有明确说明（D-012）。
  - 跨源写请求被拒绝；恶意标题/链接名不执行脚本。
  - `/api/links` 不再提供可写入口。
  - 生产回退目标仅指向已修复漏洞、兼容新数据结构与新鉴权方式的构建（D-013）。
  - 最小回归清单与全部安全测试在 preview 通过。
- **P1**
  - 冲突提示文案不宣称强一致性或原子防止覆盖（D-011）。
  - 保存结果未知时不丢失编辑内容。
- **P2**
  - 回归清单 100% 通过；无框架、无构建链。
- **P3**
  - CI 工作流已建立且本地逐条复现通过；三环境配置清晰；跨电脑 Pull 后可执行 Session Start。

## Validation

- 已检查五类核心文档存在性与引用路径。
- 已核对 Git 分支、HEAD、`origin/main` 同步关系与工作区状态。
- 已执行 `git diff --check`。
- 上一轮 Node 语法检查通过：`functions/api/config.js`、`functions/api/links.js`、`index.html` 内联脚本。
- P0 验证：`node --check` 覆盖全部 `.mjs` 模块与测试；`node --test` 14/14 通过；`public/index.html` 内联脚本语法通过；公开目录仅含 `index.html`、`ads.txt`、`assets/`；敏感字符串扫描通过。
- P1 验证：`node --test` 15/15 通过，新增过期版本返回 409 的测试；`public/index.html` 内联脚本语法通过；保存状态机已加入回归清单。
- P2 验证：HTML 已无内联 `<style>` / `<script>`；模块导入路径全部有效；55 个导出均有声明；16 个内联处理器均已挂载到 window（其中 `event` 为内联表达式保留字）；全部模块语法检查通过；15/15 测试通过。
- P3 验证：`node --test` 33/33 通过（15 → 33，新增 18 项覆盖库边界、API 分支与页面静态冒烟）；全部 `.mjs` 语法检查通过；CI 工作流四步骤本地逐条复现通过（语法/测试/冒烟/凭据扫描）；明文凭据扫描清零；README 已移除 `admin888` 与公开配置读密码的说明。
- D-016 验证：`node --check` 覆盖 `app.js`、`main.js`、`navigation.js`、`config.mjs`、`validation.mjs` 全部通过；`node --test` 40/40 通过（新增 4 项：站点标题/页脚/引擎合法配置、引擎缺 `{q}` 或非 http 被拒、重复/非法 id 与引擎数量边界、`normalizeUrl` 保留 `{q}`）；冒烟测试确认新增内联处理器已挂载到 window；初始化链路 `initCloudData → applySiteAppearance → renderEngineMenu` 已核对；站点设置改为一次原子写（patch 合并提交，避免三次请求与 version 三次递增）。
- 第一批修复验证：`node --check` 覆盖 app.js/main.js/widgets.js/admin.js 通过；`node --test` 41/41（新增 engines:null 容错用例）、冒烟 5/5 通过；`git diff --check` 通过。
- 第二批 UI/交互验证：`node --check` 覆盖 app.js/main.js/widgets.js 通过；`node --test` 41/41、冒烟 5/5 通过；`git diff --check` 通过；编辑按钮 bug 根因（data-i18n 选择器被改）已定位并修复。
- 6 项债务任务验证（2026-11-25，WSL Node v22.23.4）：`node --check` 覆盖全部 `.mjs` 与 `public/assets/js/**/*.js` 通过；`node --test tests/*.test.mjs` 43/43 通过（含新增 `GET /api/session` 集成用例与 6 项冒烟用例）；明文凭据扫描清零；`git diff --check` 通过。
- 未执行：合并到 `main` 后的线上浏览器端到端显示验证（需 PR 合并后执行）。

## Blockers

- 无技术阻塞；P0 ～ P3、接力稳定、D-015/D-016 及 6 项债务清理均已完成。
- Cloudflare Git 集成已配置、生产部署成功；首次登录及 PR #1～#4 线上验证均已通过。
- 待补验证：本轮 6 项改动合并 `main` 后的线上显示验证与 `tests/regression.md` 增量回归。
- 安全生产基线 `main` = `7efe37d`（PR #4 合并）；后续只允许来自 `dev` 的已验证合并（D-013、D-014）。
- `.workbuddy-ai/` 已在 `.gitignore` 中排除，不应提交或删除。

## Next Action

1. **创建并合并 `dev → main` PR（PR #5）**：
   - PR 创建链接：https://github.com/miozen/Navix/compare/main...dev?expand=1
   - 建议标题：`refactor: clean up legacy index, add favicon, auth modal, session probe and modularize js`
2. **合并后生产环境显示验证**：
   - 确认`/favicon.ico` 正常加载（无 404），友链与分区链接均正常展示图标并在无真实图标时回退首字符圆标。
   - 确认桌面端设置面板加宽至 ~340px，且页面滚动时左上角设置按钮始终悬浮在视口内、可正常展开面板。
   - 确认单击页脚登录与修改密码旧密码确认均弹出带遮罩的密码模态框，支持 Enter 提交与 Esc 取消。
   - 确认刷新页面时 `GET /api/session` 正确校验 Cookie 会话（失效时自动退出管理态）。
   - 确认前端各模块加载正常，所有页面交互（语言、主题、壁纸、分区、友链、拖拽、搜索）正常。

常规开发阶段已全部完成；除非用户提出新需求（如本轮线上问题），否则不再进入新的 Phase。
