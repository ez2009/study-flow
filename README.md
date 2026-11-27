# STUDY FLOW V2 · GitHub Pages 项目

这是 STUDY FLOW 的 GitHub Pages / PWA 起始项目。它以现有 V1 简洁界面和业务逻辑为基础，保留教辅资料、章节、待办、四象限、周末自动排程、手动调整、学习计时、学习复盘和 JSON 备份恢复。

## 当前包含

- `index.html`：主应用。保留 V1 学习功能，并增加简化主导航、AI 助手入口、主题和设置区域。
- `theme.js`：日间 / 夜间 / 跟随系统主题。
- `ai.js`：DeepSeek、OpenAI 和自定义 OpenAI 兼容接口的基础聊天接入。
- `manifest.webmanifest`：PWA 应用信息。
- `sw.js`：应用外壳缓存，支持离线打开已缓存页面。
- `icons/`：应用图标。
- `archive/`：V1 简洁版原始 HTML 备份。

## 发布到 GitHub Pages

1. 在 GitHub 新建仓库，建议命名为 `study-flow`。
2. 如果使用 GitHub Free，GitHub Pages 通常需要公开仓库。公开仓库意味着源代码可被任何人查看。
3. 解压项目压缩包，将里面的**全部文件和文件夹**上传到仓库根目录，确保 `index.html` 位于根目录，而不是再套一层文件夹。
4. 打开仓库的 **Settings → Pages**。
5. 在 **Build and deployment** 中，Source 选择 **Deploy from a branch**。
6. Branch 选择 `main`，目录选择 `/(root)`，点击 Save。
7. 等待部署完成，在 Pages 页面点击 Visit site。项目地址一般类似：`https://你的用户名.github.io/study-flow/`。
8. iPhone 使用 Safari 打开该网址，点击分享 → 添加到主屏幕；如果出现「作为网页 App 打开」，将其开启。

官方说明：
- GitHub Pages 快速入门：https://docs.github.com/en/pages/quickstart
- 配置发布来源：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 本地测试

PWA 的 Service Worker 需要 HTTPS 或 localhost。电脑安装 Python 后，在本文件夹打开终端，运行：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`。

## AI 配置

打开「设置与工具 → AI 配置」：

**DeepSeek 默认值**
- API Base URL：`https://api.deepseek.com`
- 模型 ID：`deepseek-flash`
- 官方平台：https://platform.deepseek.com/
- API 文档：https://api-docs.deepseek.com/zh-cn/

**OpenAI**
- API Base URL：`https://api.openai.com/v1`
- 模型 ID：请填写你的 API 账号当前可用的模型。
- API Key：https://platform.openai.com/api-keys

AI 助手目前是基础聊天入口，可附带当前任务、教辅和最近计划摘要。AI 只给建议，不会未经确认修改本地数据。

## API Key 安全

默认只在当前浏览器会话中保存 API Key。勾选「在本机记住 Key」后，会存入浏览器 localStorage。这只是方便使用的本地保存方式，不是安全密钥库：网页运行时的 JavaScript 仍然可以读取它。不要在公共设备上保存 Key，也不要把 Key 写进源代码、README、截图或 GitHub 仓库。

API Key 不会写入学习数据 JSON 备份，也不会由应用主动发送给 GitHub。

当前 AI 请求由浏览器直接访问服务商 API。如果服务商不允许浏览器跨域请求（CORS），浏览器会报跨域或网络错误。纯静态 GitHub Pages 无法绕过 CORS；届时可以评估 Cloudflare Worker 等轻量无状态代理，不需要租用常驻服务器。

## 本地数据和隐私

- 学习资料、任务、计划、计时和复盘记录保存在当前浏览器的 IndexedDB。
- 不同设备之间不会自动同步。
- 清理浏览器网站数据前，请先导出 JSON 备份。
- GitHub Pages 网站公开可访问；仓库中不要放个人学习备份、API Key 或私人文件。

## 当前测试边界

已完成 HTML 结构解析、重复 ID 检查、内嵌 JavaScript 及独立脚本语法检查。当前执行环境的 Chromium headless 启动超时，因此还没有完成完整的真实浏览器点击测试；尤其 AI 服务商连接和跨域行为需要在部署后的 Safari / Chrome 中验证。
