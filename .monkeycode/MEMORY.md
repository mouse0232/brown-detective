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

**最后更新**: 2026-04-29  
**维护者**: Project Team

---

## [2026-04-29] 指纹解读器完善 - 关键决策

### 项目知识摘要
- Date: 2026-04-29
- Context: Agent 在实现指纹解读器自动采集功能时发现
- Category: 代码结构

#### 1. creep-full.js 导出结构
- 官方版本不保证导出 `window.Creep`（依赖特定 DOM 元素存在）
- 导出字段是 `fp`（fingerprint）而非 `creep`
- `creepHash` 在采集流程后期计算，需要手动添加到导出对象
- **解决方案**：在 public/creep-full.js 中添加导出逻辑（docs/ 保持原版）

#### 2. 字段名映射关系
- 字体列表：`fonts.fontFaceLoadFonts`（不是 `fonts.list`）
- 无头检测：`headless.headless.hasHeadlessUA` 和 `webDriverIsOn`（不是布尔值）
- FP ID：`creepHash`（需要手动添加到导出对象）

#### 3. 动态风险等级设计
- 风险等级应该根据实际检测结果动态显示，而非固定配置
- 已实现的动态判断：
  - 无头浏览器：检测 hasHeadlessUA || webDriverIsOn || headlessRating > 50
  - 屏幕特征：1920×1080/1366×768/2560×1440 → 低风险
  - 字体列表：<50 种 → 低，50-100 → 中，>100 → 高

#### 4. 风险评分合理阈值
- 字体数量：>50 种才标记风险（Windows 默认 10-20 种）
- 时区信息：低风险（时区本身无害，只有与 IP/语言不一致时才有风险）
- 浏览器信息：低风险（UA 不算高独特性，同一版本数亿用户相同）
- 屏幕分辨率：1920×1080 最常见（约 20% 用户），不应该标记高风险

#### 5. 脚本加载顺序
- 内联自动采集脚本必须在 interpreter-logic.js 之后执行
- 否则会出现 `analyzeData is not defined` 错误
- 解决方案：将内联 script 移到两个外部 JS 文件引用之后

#### 6. 文件隔离策略
- `docs/` 目录：官方原始文件（不修改）
- `public/` 目录：可直接部署的修改版
- 这样保持官方文件纯净，同时满足功能需求

#### 7. 缓存问题处理
- JS 文件添加版本号参数（如 `?v=20260429-0201`）
- 每次修改后更新版本号，避免浏览器缓存旧文件

---

## [2026-04-29] 解读器显示优化 - 用户体验改进

### 项目知识摘要
- Date: 2026-04-29
- Context: Agent 在优化解读器显示格式时发现
- Category: 代码模式

#### 1. 数值格式化
- UTC 偏移：`-480`（分钟）→ `UTC+8`（更易读）
- 计算方法：`hours = Math.abs(value / 60)`, `sign = value <= 0 ? '+' : '-'`

#### 2. 对象值处理
- `headless.headless` 是对象而非布尔值
- 需要特殊判断：`value.hasHeadlessUA || value.webDriverIsOn`
- 显示文本："✅ 正常浏览器"或"⚠️ 检测到无头模式"

#### 3. 唯一性标签逻辑
- User Agent 虽然长（>30 字符），但同一浏览器版本所有用户相同
- 不应该标记为"🔍 高独特性"
- 解决方案：在 formatValue 函数中对 userAgent 特殊处理，返回'badge-common'

#### 4. 描述文案准确性
- 字体数量说明：Windows 默认约 10-20 种（不是 180 种）
- 隐私影响描述：中等 - 字体数量正常，但组合仍有一定独特性（不是"很独特"）
- 时区描述：中国是 UTC+8（北京时间）（不是"-480"）

---

## [2026-04-29] IP 信息采集与网络风险检测 - 新增功能

### 项目知识摘要
- Date: 2026-04-29
- Context: Agent 在实现 IP 指纹集成时发现
- Category: 代码模式

#### 1. IP 信息采集方法
- 使用多个 API 提高可靠性：ip.sb, ipapi.co, ipwho.is
- 采集字段：ip, country, region, city, isp, timezone, latitude, longitude, as
- 采集脚本放在 interpreter.html 的内联 script 中（页面加载时自动执行）
- 采集结果存储在 `window.IPInfo` 全局变量

#### 2. IP 地址显示隐私保护
- 显示时隐藏后 8 位（最后两个字节）
- 格式：`123.45.67.*`（不是显示完整 IP）
- 实现：在 `formatValue()`函数中对`ip` 键特殊处理

#### 3. 网络风险检测逻辑
- **云服务 IP 检测**：
  - 检测 ISP 是否为云服务商（Amazon, Google, Microsoft, Azure, AWS, DigitalOcean, Linode, Vultr, OVH）
  - 云服务 IP → 中风险（常见于爬虫和自动化脚本）
  - 提示用户："你的 IP 属于云服务商，这通常用于爬虫或自动化脚本。建议使用家庭宽带或移动网络。"
  
- **时区一致性检测**：
  - 对比 IP 时区（`network.timezone`）与浏览器时区（`fingerprintData.timezone.timezone`）
  - 时区不匹配 → 中风险
  - 提示用户："你的 IP 时区与浏览器时区不匹配，可能被识别为使用代理。建议：关闭代理或调整浏览器时区。"

#### 4. 网络分类配置
- 在 `interpreter-data.js`中添加`network` 分类
- 配置项：ip, country, region, city, isp, timezone
- 基础风险等级：medium（中等）
- 基础风险分数：25

#### 5. 动态风险等级判断
- 在 `getDynamicRiskLevel()`函数中添加`network` 分类处理
- 根据 ISP 类型和时区一致性动态调整：
  - 云服务 IP → medium
  - 时区不匹配 → medium
  - 其他 → low

#### 6. 分类渲染集成
- 在 `renderCategories()`函数中，network 分类使用 `window.IPInfo` 而非`fingerprintData.network`
- 网络分类在 IP 采集完成后自动显示

#### 7. API 可靠性处理
- 多个 API 备用（第一个失败时尝试第二个）
- 5 秒超时限制
- 采集失败时不阻断主流程（仅网络分类不显示）

