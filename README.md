# STUDY FLOW

**STUDY FLOW** 是一个面向个人使用的轻量学习管理网页，采用简洁的工作台设计。它把学习资料、章节进度、待办任务、四象限、周末计划、专注计时和学习复盘放在同一个地方，并提供可选的 AI 辅助与 GitHub 加密云同步。

- 在线使用：<https://ez2009.github.io/study-flow/>
- GitHub 仓库：<https://github.com/ez2009/study-flow>

## 功能一览

### 学习管理
- **学习资料库**：按科目录入教辅资料、章节、页数和题目进度。
- **待办任务**：记录作业与独立任务，设置优先级、重要程度、紧急程度和截止日期。
- **任务四象限**：按重要 / 紧急划分任务，可手动调整，也可选择 AI 提出分类建议。
- **周末计划**：选择章节与待办任务，设置周六、周日可用时间、午休、固定活动和学习强度，自动生成可调整的时间表。
- **学习计时**：为任务或计划时间块计时，记录完成题数、页数和学习感受。
- **学习复盘**：查看专注时间、任务完成情况、各科投入和历史复盘。
- **JSON 备份**：导出或恢复本地学习数据。

### 可选 AI 辅助
在「设置与工具 → AI 配置」中接入 DeepSeek、OpenAI 或自定义 OpenAI 兼容接口。

- **周末计划 AI 辅助**：勾选后，AI 根据本次选择的任务、重要程度、薄弱情况、截止日期和可用时间建议排序与学习时长；系统仍负责时间安排和冲突检查。
- **四象限 AI 辅助**：勾选后，AI 根据待办任务内容提出重要性与紧急性建议；用户确认后才会写入任务。
- **AI 助手**：通过自然语言讨论学习安排、任务拆分和学习复盘；是否附带当前学习数据摘要由用户自行勾选。

AI 辅助默认关闭。启用对应功能时，相关任务信息会发送给你配置的 AI 服务商处理。请勿在任务备注中填写密码、Token 或其他敏感信息。AI 输出可能有误，应用会校验结构，最终决定权仍由用户掌握。

### GitHub 加密云同步
- 学习数据保存在浏览器 IndexedDB；云同步是可选功能。
- 云端数据在浏览器本机使用 **AES-256-GCM** 加密后，再上传到仓库的独立分支 `study-flow-data`。
- 密钥使用 PBKDF2-SHA256（310,000 次迭代）派生；加密密码由用户自行保管，不上传、不持久化保存。
- GitHub Token 仅保存在当前浏览器，用于访问指定仓库。
- 支持手动同步、下载云端数据、上传本机数据，以及本地更改自动检查和冲突保护。

**重要：** 仓库目前为公开仓库。不要把明文学习备份、API Key、GitHub Token、加密密码或私人文件提交到 Git。加密云数据文件应只存在于 `study-flow-data` 分支。

## 开始使用

### 在线使用
打开 <https://ez2009.github.io/study-flow/> 即可使用。首次打开后，建议先到「设置与工具」查看 AI 和云同步配置；两者都不是基础学习功能的必需项。

### 本地运行
项目是纯静态网页，不需要安装 Node.js 或构建工具。

1. 下载或克隆仓库。
2. 在项目根目录启动本地 HTTP 服务：

```bash
python -m http.server 8000
```

3. 浏览器打开 <http://localhost:8000>。

Service Worker / PWA 功能需要 HTTPS 或 localhost 环境。直接用 `file://` 打开可能无法使用离线缓存和部分浏览器 API。

### 部署到 GitHub Pages
本仓库已经按 GitHub Pages 项目站点配置，资源引用使用相对路径。

1. 将代码推送到 `main` 分支。
2. 在仓库进入 **Settings → Pages**。
3. Source 选择 **Deploy from a branch**。
4. Branch 选择 `main`，目录选择 `/(root)`，保存。
5. 等待 **Actions → pages build and deployment** 工作流成功。
6. 访问 <https://ez2009.github.io/study-flow/>。

每次更新 `main` 后，GitHub Pages 会触发新部署。若浏览器仍显示旧版本，可等待部署完成后强制刷新（Windows：`Ctrl + F5`）。应用 Service Worker 使用版本化缓存；若更新后仍异常，可在浏览器站点设置中清除该站点缓存后重新打开。

## AI 服务配置

进入 **设置与工具 → AI 配置**：

| 服务商 | API Base URL 示例 | 模型 ID |
|---|---|---|
| DeepSeek | `https://api.deepseek.com` | 默认配置为 `deepseek-flash`；如账号不可用，请改成服务商控制台提供的模型 ID |
| OpenAI | `https://api.openai.com/v1` | 填写 API 账号当前可用模型 |
| 自定义 | 服务商提供的 OpenAI 兼容地址 | 服务商提供的模型 ID |

1. 填写服务商、API Base URL、模型 ID 和 API Key。
2. 点击「保存配置」。
3. 点击「测试连接」确认接口可用。
4. 回到周末计划或任务页面，按需勾选 AI 辅助。

API Key 默认只保存在当前浏览器会话；勾选「在本机记住 Key」后会写入该浏览器的 localStorage。后者只是方便使用，不是安全密钥库：网页运行时的 JavaScript 可以读取它。不要在公共设备上记住 Key，也不要将 Key 写进源码。

AI 请求由浏览器直接发送到服务商 API。服务商必须允许当前网页来源跨域访问（CORS）；如果浏览器提示 CORS 错误，纯静态 GitHub Pages 无法绕过该限制，需要另行部署可信 API 代理。使用前请查看服务商的计费、隐私和数据处理政策。

## GitHub 云同步配置

云同步把**网站代码**和**学习数据**分开放置：

- 网站代码：`main` 分支。
- 加密学习数据：`study-flow-data` 分支的 `.study-flow/cloud-data.enc` 文件。

首次连接前，先在「设置与工具」导出一份 JSON 备份。

1. 打开 <https://github.com/settings/personal-access-tokens/new>，创建 **Fine-grained token**。
2. Repository access 选择 **Only select repositories**，只选择 `ez2009/study-flow`。
3. Repository permissions → **Contents** 设为 **Read and write**，其他权限不需要额外开放。
4. 在网页中粘贴 Token，设置至少 10 位的云同步加密密码，点击「保存 Token」。
5. 点击「立即同步」，根据首次连接提示确认上传本机数据。

在另一台设备上，重新填写该设备使用的 GitHub Token，并输入完全相同的加密密码，再按提示下载云端数据。

### 云同步安全与注意事项
- GitHub Token 是仓库访问授权；加密密码是你自行设置的解密密码，两者不是同一个东西。
- Token 保存在当前浏览器；加密密码不会保存在浏览器，刷新页面后需要重新输入。
- 云端文件只保存加密内容。GitHub 仓库是公开的，仍不要将任何明文备份或密钥提交到仓库。
- 忘记加密密码无法解密云端数据；请妥善保管密码。
- 检测到其他设备更新了云端版本时，自动同步会暂停以避免静默覆盖。先确认哪一份数据应保留，再选择下载云端或上传本机覆盖。
- 自动检查本地更改不等于后台持续同步；网页需要保持打开，刷新后需要重新输入加密密码。
- 清理浏览器网站数据前，建议先导出 JSON 备份并确认云端同步状态。

## 项目结构

```text
study-flow/
├── index.html              # 主应用与页面交互
├── ai.js                   # AI 服务配置、聊天与请求封装
├── cloud-sync.js           # GitHub 加密云同步
├── theme.js                # 日间 / 夜间 / 跟随系统主题
├── manifest.webmanifest    # PWA 应用清单
├── sw.js                   # Service Worker 与静态资源缓存
├── favicon.svg             # 浏览器标签页图标
├── icons/
│   ├── icon.svg            # 矢量应用图标
│   ├── icon-192.png        # PWA 图标
│   └── icon-512.png        # PWA 图标
└── archive/                # 旧版本归档
```

## 数据存储说明

- IndexedDB 数据仅属于当前浏览器 / 设备；不同设备不会自动共享本地数据库。
- AI 配置、聊天记录和 API Key 使用浏览器本地存储，与学习数据备份分开。
- GitHub 云同步需用户主动配置并启用；云端数据加密后保存。
- JSON 备份文件是明文数据，导出后请放在安全位置，不要上传到公开仓库。

## 常见问题

**网页更新后没有变化**
- 先确认 GitHub Pages 的部署工作流成功。
- 在网页按 `Ctrl + F5` 强制刷新。
- 如果仍旧加载旧版，清除该站点缓存或注销旧 Service Worker 后重新打开。

**浏览器标签页没有图标**
- 确认可以访问 `https://ez2009.github.io/study-flow/favicon.svg`。
- 强制刷新；浏览器可能会缓存旧 favicon 一段时间。

**AI 请求失败**
- 检查 API Key、Base URL 和模型 ID。
- 点击「测试连接」查看服务商返回的错误。
- 如果提示 CORS，需由服务商开放网页来源或部署可信代理；不要把 API Key 放进前端源码。

**云同步失败或出现冲突**
- 检查 Token 是否过期，以及是否只授予目标仓库的 Contents Read and write 权限。
- 所有设备必须使用同一加密密码。
- 出现冲突时不要连续尝试覆盖；先确认本机和云端哪一份数据是最新且完整的。

## 技术说明

- 原生 HTML、CSS、JavaScript，无前端框架和构建步骤。
- IndexedDB：本地学习数据。
- Web Crypto API：AES-GCM 加密与 PBKDF2 密钥派生。
- GitHub Contents API：读取和更新独立数据分支中的加密文件。
- GitHub Pages：静态网站托管。
- PWA：Web App Manifest 与 Service Worker。
