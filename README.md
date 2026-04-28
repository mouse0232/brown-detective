# CreepJS 反爬虫指纹识别系统

> 基于 CreepJS 的浏览器指纹采集与风险分析系统，支持腾讯 EO EdgeScript 边缘计算部署

## 📋 目录

- [项目概述](#项目概述)
- [系统架构](#系统架构)
- [快速开始](#快速开始)
- [腾讯 EO EdgeScript 集成](#腾讯-eo-edgeScript-集成)
- [风险检测规则](#风险检测规则)
- [前端集成方案](#前端集成方案)
- [测试示例](#测试示例)
- [常见问题](#常见问题)

---

## 项目概述

### 功能特性

- ✅ **浏览器指纹采集** - 12 个核心维度检测（轻量版）
- ✅ **自动化工具检测** - 识别 Puppeteer、Selenium、Playwright
- ✅ **无头浏览器检测** - Headless Chrome/Firefox 识别
- ✅ **边缘计算部署** - 支持腾讯 EO EdgeScript、Cloudflare Workers
- ✅ **Cookie 持久化** - 风险等级缓存 30 分钟
- ✅ **零后端服务** - 完全使用边缘脚本，无需服务器

### 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 指纹采集 | CreepJS (轻量版) | 238KB，~200ms 采集时间 |
| 边缘脚本 | JavaScript (EdgeScript) | 腾讯 EO/Cloudflare Workers 兼容 |
| 数据存储 | Cookie | HttpOnly，30 分钟过期 |
| 签名算法 | HMAC-SHA256 | 可选，生产环境建议使用 |

---

## 系统架构

### 工作流程

```
用户浏览器
    ↓
加载 creep-lite.js
    ↓
采集指纹（12 个维度）
    ↓
POST 发送到 EdgeScript
    ↓
EdgeScript 分析风险 → 设置 Cookie
    ↓
前端读取 Cookie → 决定拦截/放行
```

### 目录结构

```
/workspace/
├── docs/
│   ├── creep-lite.js          # 轻量版指纹库（238KB）
│   ├── creep-full.js          # 完整版指纹库（538KB）
│   └── creep.js               # 官方完整版
├── edge-script/
│   ├── eo-edge-simple.js      # 腾讯 EO 边缘脚本（测试版）
│   └── worker-risk-analysis.js # Cloudflare Workers 完整版
├── examples/
│   ├── eo-edge-test.html      # EdgeScript 直连测试页
│   ├── demo.html              # 基础测试页
│   ├── interpreter.html       # 指纹深度解读器
│   └── website-integration.html # 网站集成示例
├── api-server.js              # 本地 API 服务
├── server.js                  # 静态文件服务
└── README.md                  # 本文档
```

---

## 快速开始

### 1. 安装依赖

```bash
cd /workspace
pnpm install
```

### 2. 启动服务

```bash
node server.js
```

服务启动在 **http://localhost:8000**

### 3. 测试示例

访问测试页面：
- **EdgeScript 测试**: http://localhost:8000/examples/eo-edge-test.html
- **基础测试**: http://localhost:8000/examples/demo.html
- **指纹解读**: http://localhost:8000/examples/interpreter.html

---

## 腾讯 EO EdgeScript 集成

### 步骤 1: 部署边缘脚本

1. 登录 [腾讯云 EO 控制台](https://console.cloud.tencent.com/eo)
2. 进入 EdgeScript 管理
3. 创建新脚本，粘贴 `edge-script/eo-edge-simple.js` 内容
4. 配置路由规则：`/api/fingerprint` → 执行该脚本

### 边缘脚本代码（简化版）

```javascript
// 文件大小：~3KB
// 功能：接收指纹数据，分析风险，设置 Cookie

addEventListener('fetch', event => {
  event.respondWith(handle(event.request))
})

const TTL = 1800; // Cookie 30 分钟过期

async function handle(request) {
  if (request.method !== 'POST') return new Response('404', {status: 404});
  
  const data = await request.json();
  const fp = data.fingerprint;
  
  let riskScore = 0;
  
  // 风险检测
  if (fp.navigator?.webdriver === true) riskScore += 50;
  if (fp.headless?.headless === true) riskScore += 50;
  if (fp.headless?.selenium === true) riskScore += 50;
  
  // 判定等级
  let riskLevel = 'allow';
  if (riskScore >= 70) riskLevel = 'block';
  else if (riskScore >= 30) riskLevel = 'challenge';
  
  // 设置 Cookie
  const cookieValue = `${riskLevel}:${riskScore}:${Date.now()}`;
  
  return new Response(JSON.stringify({
    success: true,
    riskLevel: riskLevel,
    riskScore: riskScore
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `device_token=${cookieValue}; HttpOnly; Path=/; Max-Age=${TTL}`
    }
  });
}
```

### 步骤 2: 前端集成

```html
<!DOCTYPE html>
<html>
<head>
  <title>你的网站</title>
</head>
<body>
  <div id="content">正常内容</div>
  
  <script src="https://your-cdn.com/creep-lite.js"></script>
  <script>
    // 页面加载时自动采集并上报
    window.CreepLite({
      apiEndpoint: 'https://your-domain.edge-app.tencent.com/api/fingerprint',
      cacheEnabled: true,
      cacheTTL: 1800000  // 30 分钟
    }).then(fp => {
      console.log('指纹采集完成:', fp.fingerprintId);
    });
    
    // 检查 Cookie 决定显示内容
    const cookie = document.cookie.match(/device_token=([^;]+)/)?.[1];
    if (cookie?.startsWith('block')) {
      document.body.innerHTML = '<h1>🚫 访问被拒绝</h1>';
    } else if (cookie?.startsWith('challenge')) {
      // 显示验证码
      showCaptcha();
    }
  </script>
</body>
</html>
```

---

## 风险检测规则

### 风险评分表

| 检测项 | 加分 | 说明 |
|--------|------|------|
| WebDriver 检测 | +50 | 自动化工具铁证 |
| 无头浏览器 | +50 | Headless Chrome/Firefox |
| Selenium 痕迹 | +50 | Selenium 特征 |
| 指纹谎言 > 5 | +35 | 浏览器撒谎 |
| 平台矛盾 | +30 | UA 与 Platform 不符 |
| 虚拟机 GPU | +20 | SwiftShader/VMware |
| 首次访问 | +10 | 无历史记录 |

### 决策规则

```
riskScore >= 70 → block（拦截）
riskScore >= 30 → challenge（验证码）
riskScore < 30  → allow（放行）
```

### Cookie 格式

```
device_token=allow:0:1777355277240
            │   │     └─ 时间戳
            │   └─────── 风险评分
            └─────────── 风险等级
```

---

## 前端集成方案

### 方案 1: 直接引用 CDN

```html
<script src="https://your-cdn.com/creep-lite.js"></script>
<script>
  window.CreepLite({
    apiEndpoint: 'https://your-api.com/api/fingerprint',
    cacheEnabled: true,
    cacheTTL: 1800000
  }).then(fp => {
    if (fp.analysis?.decision === 'BLOCK') {
      // 拦截
    }
  });
</script>
```

### 方案 2: EdgeScript + Cookie

```html
<script src="https://your-cdn.com/creep-lite.js"></script>
<script>
  // 自动上报到 EdgeScript 并设置 Cookie
  window.CreepLite({
    apiEndpoint: 'https://your-domain.edge-app.tencent.com/api/fingerprint',
    cacheEnabled: true
  });
  
  // 后续页面读取 Cookie 判断
  const risk = document.cookie.match(/device_token=([^;]+)/)?.[1];
  if (risk?.startsWith('block')) {
    // 显示拦截页面
  }
</script>
```

### 方案 3: 手动采集 + 发送

```javascript
const fp = await window.CreepLite({
  apiEndpoint: null,  // 不自动发送
  cacheEnabled: true
});

// 手动发送到自定义端点
const response = await fetch('/api/check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fingerprint: fp })
});

const result = await response.json();
```

---

## 测试示例

### 1. EdgeScript 直连测试

访问：**http://localhost:8000/examples/eo-edge-test.html**

- 输入 EdgeScript URL
- 输入 creep-lite.js 路径
- 点击"加载并测试"
- 查看返回结果

### 2. 本地 API 测试

访问：**http://localhost:8000/examples/demo.html**

- 自动采集指纹
- 发送到本地 `/api/fingerprint`
- 显示分析结果

### 3. 指纹深度解读

访问：**http://localhost:8000/examples/interpreter.html**

- 从官方页面复制 FP ID 或 JSON
- 查看详细的指纹解读
- 了解各维度的风险

---

## 常见问题

### Q1: Cookie 不生效？

**A**: 检查：
- EdgeScript 是否正确设置 `Set-Cookie` 响应头
- 浏览器是否允许第三方 Cookie
- 域名是否匹配（Cookie 的 Path 和 Domain）

### Q2: 采集时间过长？

**A**: 
- 启用缓存：`cacheEnabled: true`
- 使用轻量版（creep-lite.js）而非完整版
- 减少检测维度（自定义版本）

### Q3: 如何防止误拦截？

**A**:
- 调整风险阈值（默认 70 分拦截）
- 先使用 `challenge` 模式（验证码）而非直接 `block`
- 添加白名单机制
- 监控日志，分析误判原因

### Q4: EdgeScript 日志在哪里查看？

**A**:
- 登录腾讯云 EO 控制台
- 进入边缘脚本 → 日志查询
- 筛选 `/api/fingerprint` 路径

### Q5: 如何集成到现有项目？

**A**:
1. 在项目根目录添加 `<script src="/docs/creep-lite.js">`
2. 在入口页面调用 `window.CreepLite()`
3. 在路由守卫/中间件中检查 Cookie
4. 根据风险等级显示不同内容

---

## 生产环境建议

### 1. 使用 HMAC 签名

```javascript
// 在 EdgeScript 中添加签名
const SECRET_KEY = 'your-secret-key';
const payload = `${ts}.${riskScore}`;
const sign = await hmacSign(payload, SECRET_KEY);
const token = `${payload}.${sign}`;
```

### 2. HTTPS 强制

```javascript
// 仅允许 HTTPS
if (url.protocol !== 'https:') {
  return new Response('HTTPS required', {status: 403});
}
```

### 3. 日志审计

```javascript
// 记录所有请求
console.log(JSON.stringify({
  time: Date.now(),
  ip: request.headers.get('CF-Connecting-IP'),
  riskScore: riskScore,
  decision: decision
}));
```

### 4. 频率限制

```javascript
// 限制单个 IP 的请求频率
const ip = request.headers.get('X-Real-IP');
const key = `rate_limit:${ip}`;
const count = await redis.get(key);
if (count > 10) return new Response('Too many requests', {status: 429});
```

---

## 许可证

MIT License

## 相关链接

- 官方 CreepJS: https://abrahamjuliot.github.io/creepjs/
- 腾讯 EO 文档：https://cloud.tencent.com/document/product/eo
- 项目仓库：/workspace

---

**文档版本**: v1.0.0  
**最后更新**: 2026-04-28
