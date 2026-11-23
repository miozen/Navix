# 当前开发计划

> 本文件只保留**阶段级**进度与下一步，不记录临时会话细节。架构依据见 [`ARCHITECTURE.md`](ARCHITECTURE.md)，决策状态见 [`DECISIONS.md`](DECISIONS.md)，精确恢复点见 [`HANDOFF.md`](HANDOFF.md)。

## Current Phase

**Phase 3 — P2 前端模块化（Completed，待阶段验收，2026-11-23）**

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

## In Progress

无。P2 已在 `dev` 分支完成实现与本地验证，等待阶段验收；不推送、不切生产域名、不进入 P3。

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
- **P3 — 工程化（Planned）**
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
  - CI 通过；三环境配置清晰；跨电脑 Pull 后可执行 Session Start。

## Validation

- 已检查五类核心文档存在性与引用路径。
- 已核对 Git 分支、HEAD、`origin/main` 同步关系与工作区状态。
- 已执行 `git diff --check`。
- 上一轮 Node 语法检查通过：`functions/api/config.js`、`functions/api/links.js`、`index.html` 内联脚本。
- P0 验证：`node --check` 覆盖全部 `.mjs` 模块与测试；`node --test` 14/14 通过；`public/index.html` 内联脚本语法通过；公开目录仅含 `index.html`、`ads.txt`、`assets/`；敏感字符串扫描通过。
- P1 验证：`node --test` 15/15 通过，新增过期版本返回 409 的测试；`public/index.html` 内联脚本语法通过；保存状态机已加入回归清单。
- P2 验证：HTML 已无内联 `<style>` / `<script>`；模块导入路径全部有效；55 个导出均有声明；16 个内联处理器均已挂载到 window（其中 `event` 为内联表达式保留字）；全部模块语法检查通过；15/15 测试通过。
- 未执行：真实 Cloudflare preview 部署与 KV 端到端验证；浏览器交互回归需在有环境的机器上执行；GitHub Actions 尚未建立（P3）。

## Blockers

- 无技术阻塞；P2 已完成，等待阶段验收。
- 真实 Cloudflare preview 部署与 KV 端到端验证尚未执行；需要配置 KV ID 与 `SESSION_SECRET` 后完成。本地环境无 Wrangler，未安装新依赖。
- 新远端 `Navix.git` 在迁移完成并验证后再配置，当前不推送（D-014）。
- `.workbuddy-ai/` 为本地工具记忆，不应提交或删除。

## Next Action

提交 P2 阶段报告（变更清单、测试结果、遗留风险）；等待用户确认后再进入 P3。在此之前不推送、不配置生产域名、不进入 P3。
