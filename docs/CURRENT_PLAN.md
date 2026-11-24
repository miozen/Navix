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
- 线上问题修复第二批 UI/交互（待提交）：① 设置浮标与面板统一左上角、面板紧贴按钮下方（title 改「打开设置面板」）；② 回顶按钮改用 IntersectionObserver 观察 #hero-header，标题滚出视口才显示（替代固定 300px，解决链接少看不到按钮）；③ 链接标题一行完整显示——去掉固定 pr-12，仅管理员悬停卡片时让位给编辑/删除按钮（分区链接+友链，title 兜底）；④ 修复编辑按钮第二次点击失效——根因为把选择器依赖的 data-i18n 从 btnSave 改成 btnSaveEdit 导致第二次 querySelector 找不到而抛错，改固定 id=modal-save-btn；⑤ 登录/退出提示合并——去掉登录成功 alert 与页脚退出成功 alert（页脚已 confirm），logoutAdmin 加 silent 参数。测试 41/41 + 冒烟 5/5 通过。

## In Progress

本轮 5 项 UI/交互改动已在 `dev` 工作区完成实现与本地测试（41/41 + 冒烟 5/5），待提交到 `dev` 并创建新的 `dev → main` PR 合并后由 Cloudflare 自动部署。合并方式必须走 GitHub PR，不直接推送 `main`（用户明确要求）。

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
- 未执行：真实 Cloudflare preview 部署与 KV 端到端验证；浏览器交互回归需在有环境的机器上执行；GitHub Actions 云端首次运行需 push 后验证。

## Blockers

- 无技术阻塞；P0 ～ P3、接力稳定、D-015 默认密码方案均已完成。
- Cloudflare Git 集成已配置、生产部署成功；首次登录行为已通过线上验证（默认密码登录 + 自动引导改密，符合预期，2026-11-24 09:40）。
- 待补验证：首次改密后新密码写入 KV 与默认密码失效的线上确认；`tests/regression.md` 浏览器交互回归；GitHub Actions 云端首次运行。
- 安全生产基线 `main` = `8f634f7`（PR #2 合并，含 D-016 + 第一批修复，不含旧版公开密码漏洞）；后续只允许来自 `dev` 的已验证合并（D-013、D-014）。
- `.workbuddy-ai/` 已在 `.gitignore` 中排除，不应提交或删除。
- 仓库根目录遗留旧版 `index.html` 含明文密码与旧 Token 逻辑（不在 `public/`、不被 Workers 发布）；是否删除待用户决定，已在 README 与 HANDOFF 标注为不得部署。

## Next Action

1. 提交本轮 5 项 UI/交互改动到 `dev` 并推送；由用户在 GitHub 手动创建新的 `dev → main` PR 合并（禁止直接推送 main）。
2. 合并后线上验证：设置面板左上角入口与面板同处、标题滚出后回顶按钮出现、链接标题一行完整且悬停出现编辑按钮、编辑按钮可连续多次使用、登录/退出仅一次提示。
3. 用新密码重新登录，验证配置可保存、默认密码 `navix666` 已失效（D-015）。
4. 按 `tests/regression.md` 完成浏览器交互回归（语言/主题/壁纸/分区/友链/后台）。
5. 如需清理仓库根目录旧版 `index.html`，先取得用户确认（破坏性操作）。

常规开发阶段已全部完成；除非用户提出新需求（如本轮线上问题），否则不再进入新的 Phase。
