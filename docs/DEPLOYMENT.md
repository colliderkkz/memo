# Deployment / 运行

本仓库是**本地单用户版**：不部署到 Cloudflare，存储全部使用 wrangler 的本地模拟
（miniflare），数据保存在 `apps/memos/.wrangler/state/`。

应用本体是 [apps/memos](../apps/memos) 下的 SvelteKit 项目，构建目标仍是 Cloudflare Worker
（`@sveltejs/adapter-cloudflare`），开发时由 vite + platformProxy 在本地 workerd 模拟环境中运行。

## 运行时形态

- 应用运行时：SvelteKit + @sveltejs/adapter-cloudflare + Void（vite-plus）
- 包管理器：pnpm（通过 corepack 启用，版本由根 package.json 的 `packageManager` 锁定）
- Worker 名称：`my-memos`（仅本地模拟使用）
- 数据库：D1 绑定 `DB`（本地 SQLite，`apps/memos/.wrangler/state/v3/d1`）
- 缓存：KV 绑定 `MEMOS_CACHE`（本地模拟，仅存 OG 图与字体缓存）
- 对象存储：R2 绑定 `MEMOS_BUCKET`（本地模拟，备忘录正文的权威存储）
- 静态资源绑定：`ASSETS`

绑定定义在 [apps/memos/wrangler.json](../apps/memos/wrangler.json)（已全部去掉 `remote: true`，
database_id / KV id 为占位值，本地模拟不使用真实 ID）。运行时类型声明在
[apps/memos/src/lib/server/types.ts](../apps/memos/src/lib/server/types.ts)（`AppEnv`），由
[apps/memos/src/app.d.ts](../apps/memos/src/app.d.ts) 合并进 `Cloudflare.Env`。服务端代码统一用
`import { env } from "cloudflare:workers"` 读取绑定；SvelteKit 3 + adapter-cloudflare 8 不再提供
`platform`。

## 环境变量

**不需要任何环境变量。** 登录认证已移除（`hooks.server.ts` 给每个请求赋合成 Owner 用户），
`apps/memos/.env` 为空。注意 Void 的约定：本地只读 `apps/memos/.env`，且存在 `.env.example`
或 `.env.local` 时会拒绝启动。

## 本地运行

```bash
corepack enable
corepack pnpm install            # 安装依赖，自动执行 void prepare + svelte-kit sync
corepack pnpm d1:migrate:local   # 初始化/更新本地 D1
corepack pnpm dev                # http://localhost:5173
```

- `pnpm dev` 用 `vp dev` 启动；platformProxy 已配置 `remoteBindings: false`，D1/KV/R2 全部走
  本地模拟，**不会**连接任何远程 Cloudflare 资源。
- `pnpm d1:migrate:local` 把 `apps/memos/migrations/` 下的编号 SQL 应用到
  `apps/memos/.wrangler/state`，与 dev server 使用同一份状态。
- 数据备份：备份 `apps/memos/.wrangler/state/` 目录即可。

## 数据库迁移

迁移文件（当前为 0001 建表、0003 加 favorite 列；0002 是上游的 auth 表，本 fork 已删除）：

```bash
# 在 apps/memos/migrations/ 新增编号 SQL 文件后
corepack pnpm d1:migrate:local   # 本地验证
```

修改 memo 表结构时，同步更新 Drizzle 镜像
[apps/memos/src/lib/server/db/schema.ts](../apps/memos/src/lib/server/db/schema.ts)。
不要在 Wrangler 迁移旁提交 Drizzle 生成的初始快照。

## 验证清单

启动后检查：

- `/` — 备忘录时间线渲染，可直接新建/编辑/删除（无登录）
- `/favorites`、`/archive` — 直接进入，不再重定向
- `/memo/[id]` — 公开与私密备忘录都可访问
- `/api/memos` — 无鉴权 GET 返回全部备忘录；POST 创建
- `/api/memos/[id]/og` — 生成 PNG 分享图（首次需联网拉 Google Fonts；网络不通时降级为无字体渲染）
- `/api/memos/import/x` — 需能访问 api.fxtwitter.com
- `/rss.xml`、`/sitemap.xml`、`/robots.txt`、`/llms.txt` — 站点发现文件，origin 为请求来源

## 运维注意

- R2 是备忘录正文的权威存储；D1 的 `excerpt` 字段是用于列表渲染和搜索的镜像。KV 只存可丢弃的
  生成物缓存（OG 图、字体），删除 KV 数据不会丢失源数据。
- X 导入依赖对 api.fxtwitter.com 的出站 HTTPS 访问，只发送数字帖子 ID；导入的照片保持外链，
  不代理、不复制到 R2。
- **本应用没有任何鉴权，只应在 localhost 使用。** vite dev 默认只绑定 localhost；不要用
  `--host` 暴露到局域网。若要部署到公网，必须先加回认证（上游仓库使用 Better Auth +
  Google OAuth + `ALLOWED_EMAIL` 单用户白名单，可作参考），并在自己的 Cloudflare 账号中创建
  D1/KV/R2 资源、把 wrangler.json 的占位 ID 换成真实值。
- `apps/memos/vite.config.ts` 的 SSR target 是 `webworker`，resolve conditions 为
  `["workerd", "node"]`；OG 图使用的 `@resvg/resvg-wasm` 在 dev（Node SSR）下通过读取字节
  编译加载，在生产 workerd 下走 `.wasm` ESM 导入（见 `lib/server/og/index.ts` 的 `ensureWasm`）。
