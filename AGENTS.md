# AGENTS.md — AI 开发工作规范

本文件是本仓库 AI 协作的**流程权威**，只定义工作方式，不记录业务细节。

事实来源分工：

- 当前架构：`docs/ARCHITECTURE.md`
- 已确认决策：`docs/DECISIONS.md`
- 阶段计划：`docs/CURRENT_PLAN.md`
- 恢复状态：`docs/HANDOFF.md`
- 面向用户的部署教程：`README.md`
- 工具本地记忆：`.workbuddy-ai/memory/`（仅作线索，不覆盖仓库事实）

## 1. Session Start Protocol

每次新对话、新电脑或上下文恢复时，按序执行：

1. 读取本文件 `AGENTS.md`。
2. 读取 `docs/ARCHITECTURE.md`。
3. 读取 `docs/DECISIONS.md` 中与当前任务相关的 `Accepted` 决策。
4. 读取 `docs/CURRENT_PLAN.md`。
5. 读取 `docs/HANDOFF.md`。
6. 运行只读 Git 检查：`git status --short --branch`、`git rev-parse HEAD`、`git log -5 --oneline`、`git diff`、与 `origin/main` 的 ahead/behind 对比。
7. 对照源码、配置、测试与文档验证 Plan / Handoff；发现冲突先查明原因，不盲目覆盖文档或代码。
8. 状态一致且任务已确认时，从 `docs/HANDOFF.md` 的 **Exact Next Action** 继续。

## 2. 默认执行模式

对**已确认**的开发任务，采用：

`恢复状态 → 检查现状 → 实施修改 → 补充测试 → 执行验证 → 检查 Diff → 更新文档 → 汇报结果`

- 普通实现细节由 AI 自主处理，不重复询问已冻结的业务或架构决策。
- 新需求、重构、或任何可能改变 `Accepted` 决策的工作：**先输出完整方案与影响，等待用户明确确认后再写代码**（见 `docs/DECISIONS.md` D-005）。
- 仅在以下情况暂停：业务规则存在真实歧义；需要改变已确认架构决策；存在重大实现方案分歧；涉及破坏性或不可逆操作；关键环境或依赖缺失。

## 3. 代码修改与验收规范

- 保持轻量架构：单页原生前端 + Cloudflare Pages Functions + 单 KV 配置对象；不擅自引入框架、数据库、构建链或扩大产品范围。
- 修改业务代码后必须执行相应验证：语法/静态检查、可用测试、手动冒烟；无自动化测试时需明确说明。
- 未实际运行的验证不得标记为通过。
- 不安装无关依赖，不删除现有有效设计文档，不因发现技术债就启动大规模重构。
- `git diff --check` 应在每次提交前执行。

## 4. Git 与多电脑接力协议

Git 是代码同步的可靠依据；Handoff 不能替代 Git。

**电脑 A**：开发 → 验证 → 更新 `CURRENT_PLAN.md` / `HANDOFF.md` → Commit → Push。
**电脑 B**：Fetch / Pull → 检查 Git 状态 → 执行 Session Start → 恢复 Next Action。

- `DIRTY` 工作区不能作为已同步的跨电脑接力点。
- 不擅自丢弃、覆盖或清理未提交修改。
- 不自动执行 `reset --hard`、`clean`、force push、非显式 rebase 等危险操作。
- 每次 Handoff 必须明确：本地 HEAD、与远端的同步关系、未提交修改、未推送提交。
- 远端指向 `https://github.com/miozen/Navix.git`，别名以各机 `git remote -v` 为准（本机 `origin`，部分机器 `navix`）；`dev` 是开发分支，`main` 是稳定分支。
- 只有已修复漏洞并通过验证的 `main` 才允许部署到 Workers；旧 `main` 不得推送或作为回退目标（D-013、D-014）。
- 推送前先确认 `git status` 干净、`git diff --check` 通过、测试通过；推送后以远端 HEAD 作为跨电脑接力点。

## 5. Session Handoff Protocol

在实质性开发、阶段检查点、准备切换电脑或会话时执行：

1. 检查代码修改与 `git diff`。
2. 执行相关测试、构建和静态检查。
3. 按实际进度更新 `docs/CURRENT_PLAN.md`（阶段级）。
4. 更新 `docs/HANDOFF.md`（仅最小恢复状态）。
5. 准确记录完成项、未完成项、验证结果和精确下一动作。
6. 明确是否存在未提交修改和未同步提交。

普通讨论或无实质进度变化时，无需反复更新文档。不得将未提交、未验证或尚未同步的工作标记为完成。

## 6. 文档维护规则

- 五类核心文档职责固定，避免双重维护：
  - 架构事实只写 `ARCHITECTURE.md`；
  - 决策状态只写 `DECISIONS.md`；
  - 阶段计划只写 `CURRENT_PLAN.md`；
  - 恢复状态只写 `HANDOFF.md`；
  - 工作流程只写本文件。
- 需要详细部署步骤时引用 `README.md`，不复制其内容。
- 需要变更 `Accepted` 决策时，先在 `DECISIONS.md` 提出 `Superseded` 提案并获得用户确认。
- 文档更新后检查引用路径有效性与 `git diff --check`。
