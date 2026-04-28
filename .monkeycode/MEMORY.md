# 用户指令记忆

本文件记录了用户的指令、偏好和教导，用于在未来的交互中提供参考。

## 格式

### 用户指令条目
用户指令条目应遵循以下格式：

[用户指令摘要]
- Date: [YYYY-MM-DD]
- Context: [提及的场景或时间]
- Instructions:
  - [用户教导或指示的内容，逐行描述]

### 项目知识条目
Agent 在任务执行过程中发现的条目应遵循以下格式：

[项目知识摘要]
- Date: [YYYY-MM-DD]
- Context: Agent 在执行 [具体任务描述] 时发现
- Category: [代码结构 | 代码模式 | 代码生成 | 构建方法 | 测试方法 | 依赖关系 | 环境配置]
- Instructions:
  - [具体的知识点，逐行描述]

## 去重策略
- 添加新条目前，检查是否存在相似或相同的指令
- 若发现重复，跳过新条目或与已有条目合并
- 合并时，更新上下文或日期信息

## 条目

### CreepJS 反爬虫系统 - 腾讯 EO EdgeScript 集成方案
- Date: 2026-04-28
- Context: 用户要求将 CreepJS 指纹采集系统集成到腾讯 EO EdgeScript，实现边缘计算风险分析
- Category: 项目知识
- Instructions:
  - **项目目标**：将 CreepJS 改造为反爬虫系统，通过边缘脚本分析风险并写入 Cookie
  - **核心需求**：
    - 前端使用 creep-lite.js 采集指纹（12 个维度）
    - POST 发送到腾讯 EO EdgeScript
    - EdgeScript 分析风险并设置 Cookie（明文格式：riskLevel:riskScore:timestamp）
    - Cookie 有效期 30 分钟（TTL=1800）
    - 前端页面读取 Cookie 判断是否拦截
  - **架构方案**：无需后端服务器，完全依赖 EdgeScript 边缘计算
  - **指纹数据不加密**：方便调试，Cookie 值为 `allow:0:1234567890` 格式
  - **风险检测规则**：
    - WebDriver +50 分
    - 无头浏览器 +50 分
    - Selenium +50 分
    - 指纹谎言>5 个 +35 分
    - 平台矛盾 +30 分
    - 虚拟机 GPU +20 分
  - **决策规则**：
    - >= 70 分 → block（拦截）
    - >= 30 分 → challenge（验证码）
    - < 30 分 → allow（放行）
  - **核心文件**：
    - `/workspace/docs/creep-lite.js` - 轻量版指纹库（238KB）
    - `/workspace/edge-script/eo-edge-simple.js` - 腾讯 EO 边缘脚本
    - `/workspace/examples/eo-edge-test.html` - EdgeScript 直连测试页面
    - `/workspace/api-server.js` - 本地 API 服务（开发环境使用）
    - `/workspace/server.js` - 静态文件服务

### 项目文档整理要求
- Date: 2026-04-28
- Context: 项目完成后，用户要求整理完整的项目文档和记忆
- Instructions:
  - 必须创建 `README.md` 包含完整的使用指南
  - 必须包含腾讯 EO EdgeScript 集成步骤
  - 必须记录风险检测规则和决策逻辑
  - 必须提供前端集成代码示例
  - 必须记录 Cookie 格式说明（明文格式：riskLevel:riskScore:timestamp）
  - 必须在 `.monkeycode/MEMORY.md` 中记录项目架构和关键决策
  - README.md 应包含：
    - 项目概述和功能特性
    - 系统架构和工作流程
    - 快速开始指南
    - EdgeScript 部署步骤
    - 风险检测规则表
    - 多种前端集成方案
    - 测试示例
    - 常见问题解答

### 腾讯 EO EdgeScript 代码写法规范
- Date: 2026-04-28
- Context: 用户提供示例代码，纠正 Agent 对 EdgeScript 语法的理解
- Category: 代码模式
- Instructions:
  - EdgeScript 使用 `addEventListener('fetch', event => { ... })` 语法
  - 事件处理函数：`event.respondWith(handle(event.request))`
  - EdgeScript 语法不是腾讯云传统 EdgeScript（$http_request_body），而是 JavaScript 语法
  - 不要默认添加 HMAC 签名，用户要求明文 Cookie 方便调试
  - Cookie 设置格式：`Set-Cookie: device_token=value; HttpOnly; Path=/; SameSite=Strict; Max-Age=1800`
  - 响应使用 `new Response(body, {headers: {...}})` 语法
  - 解析 JSON：`const data = await request.json()`
  - 签名函数使用 Web Crypto API：`crypto.subtle.importKey()` 和 `crypto.subtle.sign()`

### 静态页面路径处理规范
- Date: 2026-04-28
- Context: 静态页面引用 creep-lite.js 时报错 `Unexpected token '<'`
- Category: 依赖关系
- Instructions:
  - creep-lite.js 位于 `/docs/creep-lite.js`（网站根目录的 docs 文件夹）
  - 静态页面中引用路径应为 `/docs/creep-lite.js`（绝对路径）
  - 错误 `Unexpected token '<'` 说明返回了 HTML（404 页面），不是 JavaScript
  - 解决方案：
    - 检查文件是否存在：`ls -lh /workspace/docs/creep-lite.js`
    - 检查服务器是否启动：`curl http://localhost:8000/docs/creep-lite.js`
    - 使用动态路径配置，允许用户指定 creep-lite.js 位置
  - 示例页面放在 `/workspace/examples/` 目录
  - 测试页面应该允许配置 creep-lite.js 的加载路径

### 指纹采集与 Cookie 联动机制
- Date: 2026-04-28
- Context: Agent 在设计前端集成方案时发现
- Category: 代码模式
- Instructions:
  - 完整的集成流程：
    1. 页面加载 creep-lite.js
    2. 调用 `window.CreepLite({apiEndpoint: '/api/fingerprint', ...})` 
    3. 采集指纹并发送到 EdgeScript
    4. EdgeScript 设置 Cookie
    5. 当前页面或其他页面读取 Cookie 判断风险
  - Cookie 读取方法：
    ```javascript
    const cookie = document.cookie.match(/device_token=([^;]+)/)?.[1];
    if (cookie?.startsWith('block')) { /* 拦截 */ }
    else if (cookie?.startsWith('challenge')) { /* 验证码 */ }
    else { /* 放行 */ }
    ```
  - 缓存策略：`cacheEnabled: true, cacheTTL: 1800000`（30 分钟）
  - 避免重复采集：同一用户在 30 分钟内只需采集一次
  - Cookie 过期后自动重新采集

### EdgeScript 测试最佳实践
- Date: 2026-04-28
- Context: Agent 在调试 EdgeScript 集成时发现
- Category: 测试方法
- Instructions:
  - 使用独立的测试页面 `/examples/eo-edge-test.html`
  - 测试页面应该：
    - 允许配置 EdgeScript 的 URL
    - 允许配置 creep-lite.js 的路径
    - 动态加载脚本（点击按钮后才加载）
    - 显示完整的响应 JSON
    - 显示 Cookie 值
  - 测试步骤：
    1. 输入 EdgeScript URL（本地或远程）
    2. 输入 creep-lite.js 路径（`/docs/creep-lite.js` 或 CDN URL）
    3. 点击"加载并测试"
    4. 查看指纹 ID、分析结果、Cookie 值
  - 成功标志：返回形如 `allow:0:1234567890` 的 Cookie 值

---

## 项目文件清单

### 核心文件
- `docs/creep-lite.js` - 轻量版指纹库（238KB, 12 维度）
- `docs/creep-full.js` - 完整版指纹库（538KB, 50+ 维度）
- `docs/creep.js` - 官方完整版
- `api-server.js` - 本地 API 服务（开发环境）
- `server.js` - 静态文件服务

### EdgeScript 脚本
- `edge-script/eo-edge-simple.js` - 腾讯 EO 边缘脚本（测试版，明文 Cookie）
- `edge-script/worker-risk-analysis.js` - Cloudflare Workers 完整版（HMAC 签名）

### 示例页面
- `examples/eo-edge-test.html` - EdgeScript 直连测试页（推荐）
- `examples/demo.html` - 基础测试页
- `examples/interpreter.html` - 指纹深度解读器
- `examples/interpreter-data.js` - 解读器配置数据
- `examples/interpreter-logic.js` - 解读器逻辑
- `examples/website-integration.html` - 网站集成示例
- `examples/tencent-eo-integration.html` - 腾讯 EO 集成示例（旧版）

### 文档
- `README.md` - 项目主文档
- `DEPLOYMENT.md` - 完整部署指南
- `SERVERLESS_DEPLOYMENT.md` - Serverless 部署指南
- `ANTI_BOT_GUIDE.md` - 反爬虫使用指南
- `QUICK_START.md` - 快速开始指南

---

## 部署检查清单

### 开发环境
- [ ] 安装依赖：`pnpm install`
- [ ] 启动服务：`node server.js`
- [ ] 访问测试页：http://localhost:8000/examples/eo-edge-test.html

### 生产环境（腾讯 EO）
- [ ] 上传 creep-lite.js 到 CDN
- [ ] 在 EO 控制台创建 EdgeScript
- [ ] 粘贴 `eo-edge-simple.js` 代码
- [ ] 配置路由：`/api/fingerprint` → EdgeScript
- [ ] 前端页面引用 creep-lite.js
- [ ] 设置 `apiEndpoint` 为 EdgeScript URL
- [ ] 测试 Cookie 设置
- [ ] 验证拦截逻辑

---

## 关键决策记录

1. **使用明文 Cookie**（用户决定）
   - 原因：方便调试
   - 格式：`riskLevel:riskScore:timestamp`
   - 生产环境可改为 HMAC 签名

2. **轻量版优先**
   - 原因：快速筛查，~200ms 采集时间
   - 完整版用于高风险操作（登录、支付）

3. **边缘计算架构**
   - 原因：零运维，自动扩展，成本极低
   - 相比传统后端服务器优势明显

4. **Cookie 缓存 30 分钟**
   - 平衡用户体验和安全性
   - 避免重复采集影响性能

---

**最后更新**: 2026-04-28  
**维护者**: Project Team
