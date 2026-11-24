# Navix — 智能多功能响应式网址导航

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=flat&logo=cloudflare&logoColor=white)

一款静态优先、零构建的多功能网址导航：原生 HTML / CSS / ES Modules 单页前端，配合 Cloudflare Workers + Static Assets + KV 提供云端配置同步。保持免费计划、无框架、无构建链，可回退、可扩展。

> 本仓库为目标架构（Workers）源码。旧版 Cloudflare Pages 部署的现网仍含已公开的管理员密码漏洞，不得回退或复用其密码。安全约束与决策见 [`docs/DECISIONS.md`](docs/DECISIONS.md)，架构现状见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。
>
> 注意：仓库根目录的 `index.html` 是迁移前的 Pages 旧版遗留文件，仍含明文默认密码与旧 Token 逻辑。它不在 `public/` 内、不会被 Workers 发布，但不得用于任何部署。唯一有效的页面入口是 `public/index.html`。

## 核心特性

- 云端全站同步：壁纸、分区、友链等公开配置保存在 KV，多设备共享；接口不可用时自动降级为浏览器本地缓存。
- 安全后台：双击页脚进入，签名 HttpOnly Cookie 会话 + `sessionVersion` 失效机制；公开响应不含任何凭据。
- 中英双语、主题切换、动态星空、时区天气、多搜索引擎、拖拽排序。
- 零构建部署：仅 `/api/*` 进入 Worker，其余由 Static Assets 提供；`src/`、`docs/`、`tests/` 等不对外公开。

## 目录结构

```
public/                 静态站点（唯一公开目录）
  index.html            页面结构
  assets/css/app.css    样式
  assets/js/            原生 ES Modules（core/ + features/）
src/
  worker.mjs            Worker 入口，负责 /api/* 路由与同源校验
  routes/               config / auth 路由
  lib/                  加密、配置读写、校验、HTTP 工具
scripts/
  generate-admin-auth.mjs  生成管理员密码哈希
tests/                   Node 内置测试与回归清单
wrangler.jsonc           Worker、静态目录、KV 绑定与三环境配置
```

## 部署教程（Cloudflare Workers · Git 集成，零本地配置）

推荐用 Workers 的 GitHub Git 集成部署：**本地不安装 Wrangler、不填 KV ID、不配密钥**，全部在 Cloudflare 网页后台完成。推送代码即自动构建部署。

### 1. 连接 GitHub 仓库

在 Cloudflare 后台进入 **Workers & Pages → Create → Workers → Connect to Git**，授权 GitHub 并选择本仓库。构建配置：

- Framework preset：`None`
- Build command / Deploy command：**留空**（本项目零构建）
- Root directory：留空（仓库根目录）

生产分支设为 `main`：日常在 `dev` 开发，验证通过后合并到 `main` 触发生产部署。`dev` 不自动部署生产。

### 2. 创建 KV 并填入 ID

在 **Workers & Pages → KV → Create a namespace** 创建一个 KV（本仓库配置名为 `Navix`）。把它的 ID 填入 `wrangler.jsonc` 顶层 `kv_namespaces` 的 `id` 字段。

KV namespace ID 不是访问凭据（访问 KV 仍需 API token / Worker binding 权限），按 Cloudflare 惯例写在仓库里即可。`env.preview` 命名环境未写 ID，部署时会由平台自动创建独立 namespace（仅供 CLI 演练；Git 集成的 PR Preview 走顶层生产配置）。

### 3. 配置会话密钥（Secret）

在 Worker 的 **Settings → Variables & Secrets → Add** 添加 Secret：

- 名称：`SESSION_SECRET`
- 值：一个足够长的随机字符串（仅存后台，不进仓库）

`SESSION_SECRET` 用于签名会话 Cookie。变更它会使所有现有会话失效。

### 4. 登录并改密（内置默认密码）

全新部署的 KV 里没有密码，站点内置一个**初始默认密码 `navix666`**。无需生成哈希或手动写 KV：

1. 双击页面页脚，输入 `navix666` 登录。
2. **首次登录会被要求立即改密**：登录后自动展开设置面板并聚焦密码框。在"新密码"框填入你自己的密码（至少 8 位），弹窗输入旧密码 `navix666`，保存。
3. 系统自动把新密码的哈希写入 KV 键 `admin_auth`，默认密码随即失效。之后请用新密码重新登录。

在改密之前，配置保存会被拒绝（提示先改密），这是为了防止他人用公开初始密码改动你的站点（D-015）。

- **以后改密码**：双击页脚登录 → 设置面板填新密码 → 弹窗输入当前密码 → 保存。全程不需要脚本或后台操作。
- **忘记密码**：在 Cloudflare 后台删除 `Navix` KV 里的 `admin_auth` 键，默认密码 `navix666` 会重新生效，再按上面流程改密。
- 存储始终只保存哈希、不保存明文；旧会话在改密后失效（D-012）。绝不复用曾泄露的旧密码 `admin888`。

### 5. 测试与生产切换

- **测试**：在 GitHub 开 `dev → main` 的 Pull Request，Cloudflare 会为该 PR 生成隔离的 Preview URL（在 PR 评论里）。在该地址执行 `tests/regression.md` 的浏览器回归与端到端验证，不影响生产。
- **生产**：验证通过后合并 PR 到 `main`，Git 集成自动部署生产。回退目标只能是已修复漏洞的安全构建，不得回退到 Pages 旧版（D-013、D-014）。

## 本地开发（可选）

本地不装 Wrangler 也能用上面的 Git 集成流程完成全部部署。若需本地调试：

```bash
npm exec wrangler dev
```

在本地 `.dev.vars`（已被 `.gitignore` 排除）写入 `SESSION_SECRET=本地开发用密钥`。本地 KV 使用 Wrangler 的本地模拟，首次需写入 `admin_auth` 键。

## 三环境边界

| 环境 | 用途 | 触发方式 | 部署 |
| --- | --- | --- | --- |
| dev | 日常开发与单元验证 | `git push origin dev` | 不自动部署生产 |
| preview（PR） | 端到端验证与生产切换前演练 | 开 `dev → main` 的 PR | Cloudflare 自动生成 Preview URL |
| production | 稳定生产 | 合并到 `main` | Git 集成自动部署 |

`wrangler.jsonc` 中的 `env.preview` 命名环境供 CLI 手动演练使用（`npm exec wrangler deploy --env preview`）；Git 集成的 PR Preview 由平台自动创建，无需 CLI。

分支策略：`dev` 为开发分支，`main` 为稳定分支，`main` 受保护只接受来自 `dev` 的已验证合并（D-014）。跨电脑接力以 Git 为可靠依据，远端名以各机 `git remote -v` 为准。

## 安全说明

- 公开配置 `site_config` 不含凭据；`GET /api/config` 只返回白名单字段。
- 写接口校验同源（Origin/Referer）、字段白名单与 URL 格式；跨源写请求返回 403。
- 会话为短期签名 HttpOnly Cookie（`SameSite=Strict`）；改密或吊销后 `sessionVersion` 递增使旧会话失效。受 KV 最终一致性影响，失效可能存在短暂延迟。
- 版本冲突（`version`）仅作尽力而为提示，不保证原子性，不宣称“防止覆盖”。
- 遗留 `/api/links` 已关闭（410）。

## 测试

```bash
node --test tests/*.test.mjs
```

覆盖库级单元、Worker API 与安全回归、页面静态冒烟。浏览器交互回归清单见 [`tests/regression.md`](tests/regression.md)，需在有浏览器与真实 preview 环境的机器上执行。CI 配置见 `.github/workflows/ci.yml`，在 push/PR 到 `dev`、`main` 时运行上述 Node 检查，不安装任何依赖。

## License

MIT
