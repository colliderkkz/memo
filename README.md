# my-memos

个人备忘录应用（本地单用户版），基于 SvelteKit 构建。

改造自 [Pleasurecruise/my-memos](https://github.com/Pleasurecruise/my-memos)（AGPL-3.0），
去掉了登录认证、AI 聊天和 MCP 接口，存储全部使用 wrangler 本地模拟（数据保存在
`apps/memos/.wrangler/state`），无需任何 Cloudflare 账号或环境变量。

## 功能

- **备忘录** — Markdown 时间线，标签、搜索、日期过滤、置顶、收藏、归档、公开/私密可见性
- **X 导入** — 粘贴推文链接导入为备忘录（需要能访问 api.fxtwitter.com）
- **OG 分享图** — 为公开备忘录动态生成分享卡片图（首次生成需联网拉取 Google Fonts，失败时降级为无字体渲染）
- **双布局** — 新版（Masthead）与旧版（Sidebar）界面可切换，深浅色主题

## 本地运行

要求：Node >= 24.21（自带 corepack）。

```bash
corepack enable
corepack pnpm install        # 安装依赖（自动执行 void prepare + svelte-kit sync）
corepack pnpm d1:migrate:local   # 初始化本地 D1 数据库
corepack pnpm dev            # 启动 → http://localhost:5173
```

所有请求都视为本人（Owner），可读写全部备忘录，包括私密内容。

## 日常使用（Windows 双击脚本）

装好依赖之后，日常只需要项目根目录下的两个脚本，**不需要 Docker、数据库或任何外部服务**：

| 脚本               | 作用                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `start-memos.bat`  | 双击启动服务，就绪后自动打开浏览器 http://localhost:5173；服务已在运行时只开浏览器。使用期间保持窗口开着，关窗口即停止                                 |
| `backup-memos.bat` | 双击把全部数据打包成 `backups\memos-backup-<时间戳>.zip`。备份前建议先关掉服务窗口；恢复 = 停服务后把 zip 内容解压覆盖回 `apps\memos\.wrangler\state\` |

数据只有 `apps/memos/.wrangler/state/` 一个文件夹（见「在另一台电脑上使用」），定期跑一下备份脚本即可。

## 常用命令

| 命令                                             | 说明                               |
| ------------------------------------------------ | ---------------------------------- |
| `corepack pnpm dev`                              | 启动开发服务器                     |
| `corepack pnpm test`                             | 运行测试                           |
| `corepack pnpm --filter @my-memos/app typecheck` | 类型检查                           |
| `corepack pnpm d1:migrate:local`                 | 应用数据库迁移到本地               |
| `corepack pnpm build`                            | 生产构建（Cloudflare Worker 产物） |

## 注意

- **无鉴权**：本应用没有任何登录和 API 鉴权，仅适合在 localhost 本机使用，不要暴露到局域网/公网。若要部署公网，需要先加回认证（可参考上游仓库的 Better Auth + Google OAuth 实现）。
- **数据位置**：备忘录索引在本地 D1（SQLite），正文在本地模拟的 R2，均位于 `apps/memos/.wrangler/state/`。备份该目录即可备份全部数据。
- **个性化**：站点名称在 `apps/memos/src/lib/site.ts`；界面文案在 `Masthead.svelte` / `Sidebar.svelte` / `AppShell.svelte`；图标为 `apps/memos/static/favicon.png`。

## 在另一台电脑上使用

1. 新电脑安装 **Node >= 24.21**（[nodejs.org](https://nodejs.org) 下载，自带 corepack）。
2. 拷贝整个项目文件夹到新电脑，**排除**以下可再生的目录（其余全部要拷，尤其是数据目录）：
   - `node_modules/`（根目录和 packages/ui、apps/memos 下的都要排除）
   - `.svelte-kit/`（apps/memos 下）
   - **必须包含** `apps/memos/.wrangler/state/` —— 这是全部备忘录数据（D1 数据库 + R2 正文）
3. 在新电脑的项目根目录打开终端：

   ```bash
   corepack enable
   corepack pnpm install    # 需要联网，几分钟
   corepack pnpm dev        # → http://localhost:5173，数据原样出现
   ```

   不需要重跑 `d1:migrate:local`（迁移记录随 state 一起拷过去了）；只有在**没拷** state、想在新电脑从零开始时才需要跑它。

### 两台电脑之间同步数据

数据就是 `apps/memos/.wrangler/state/` 这一个文件夹：

1. 两台电脑都**停止** dev server（Ctrl+C）
2. 用 U 盘/网盘把整个 `state` 文件夹从旧电脑复制到新电脑覆盖
3. 重新启动即可

注意：不要在 dev server 运行时复制（SQLite 写入中复制会得到损坏的快照）；覆盖是整库替换，不是合并——两边都写过数据时，只能保留其中一边。

## 技术栈

SvelteKit · Drizzle ORM · Tailwind CSS · vite-plus · pnpm workspace · adapter-cloudflare（本地 miniflare 模拟 D1/R2/KV）

## License

AGPL-3.0（继承自上游项目）
