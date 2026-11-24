# 开发接力状态

> 仅保存恢复开发所需的最小状态。架构见 [`ARCHITECTURE.md`](ARCHITECTURE.md)，决策见 [`DECISIONS.md`](DECISIONS.md)，阶段计划见 [`CURRENT_PLAN.md`](CURRENT_PLAN.md)。

- **Last Updated**：2026-11-24 08:20 GMT+8
- **Current Branch**：`dev`
- **Remote**：远端名以各机 `git remote -v` 为准；本机为 `origin`、部分机器为 `navix`，均指向 `https://github.com/miozen/Navix.git`。`dev` 已推送，`main` 未推送（旧版本含漏洞）
- **HEAD / Last Commit**：以 `git rev-parse HEAD` 为准；本轮 P3 + 部署配置提交后应为新的 feat 提交（原基线 `73c60fa`）
- **Local vs Remote**：本机远端为 `origin`；`dev` 与 `main` 均已推送，均可作接力点（`main` 为安全生产基线）
- **Working Tree**：提交并推送后应为 `CLEAN`
- **Current Phase**：Phase 5 — P3 工程化（实现完成，待提交）；P0 ～ P3 全部完成
- **Current Task**：无待写代码任务；下一步需提交本轮 P3 改动并推送 `dev`
- **Last Completed**：P3 工程化（33/33 测试、GitHub Actions CI、三环境边界注释、README 与五类核心文档同步）
- **Validation Performed**：
  - `node --test tests/*.test.mjs`：33/33 通过
  - 全部 `.mjs` 语法检查通过
  - 页面静态冒烟、模块导入路径、内联处理器挂载、公开目录边界检查通过
  - CI 四步骤本地逐条复现通过；明文凭据扫描清零
  - `git diff --check` 通过（提交前复核）
- **Validation Pending**：
  - 真实 Cloudflare preview 部署与 KV 端到端验证
  - 浏览器交互回归清单执行
  - GitHub Actions 云端首次运行（push 后验证）
  - 生产切换与回退演练
- **Known Issues / Blockers**：
  - `SESSION_SECRET` 需通过 Cloudflare 后台 Secret 配置；生产 KV ID 已写入 `wrangler.jsonc`（`e20a2207b12549a7abe68eb7ce272b24`）。
  - 管理员密码：内置默认 `navix666`，首次登录必须改密，改密后写入 KV `admin_auth`；旧密码 `admin888` 不得复用（D-015）。无需再跑 `generate-admin-auth.mjs`，该脚本仅作应急备用。
  - 版本检测仅为尽力而为提示；会话失效受 KV 最终一致性影响。
  - 旧 `main` 含公开密码漏洞，禁止推送或作为回退目标。
  - 仓库根目录旧版 `index.html`（非 `public/index.html`）仍含明文 `admin888` 与旧 Token 逻辑，不在公开目录、不影响 Workers 发布，但不得用于部署；是否删除待用户决定（删除属破坏性操作，未擅自执行）。
  - Git 集成部署需在 Cloudflare 后台一次性配置：连接仓库、`SESSION_SECRET` Secret；KV ID 已写入配置，管理员密码用默认值登录后在网站内改（详见 README、D-015）。
- **Exact Next Action**：在 Cloudflare 后台按 README 连接 Git 并配置 Secret；开 `dev → main` PR 拿 Preview URL，用 `navix666` 登录并首次改密做端到端验证，通过后合并 `main` 触发生产部署。
- **Cross-machine Ready**：`YES`（以 `origin/dev` 或 `origin/main` 为接力点）

## 稳定恢复清单

新电脑或新会话按以下顺序恢复：

```bash
# 远端名以 git remote -v 为准（本机 origin，部分机器 navix）
git fetch origin
git checkout dev
git pull --ff-only origin dev
git status --short --branch
git rev-parse HEAD
```

然后依次读取：`AGENTS.md` → `docs/ARCHITECTURE.md` → `docs/DECISIONS.md` → `docs/CURRENT_PLAN.md` → `docs/HANDOFF.md`，并以源码与 `git` 状态复核。不要依赖历史聊天记录恢复项目状态。
