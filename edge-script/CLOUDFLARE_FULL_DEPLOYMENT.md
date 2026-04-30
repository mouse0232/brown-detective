# Cloudflare Workers + Pages 完整部署方案

## 架构说明

```
┌─────────────────────────────────────┐
│  Cloudflare Pages                   │
│  (托管静态文件)                     │
│  - interpreter.html                 │
│  - interpreter-data.js              │
│  - interpreter-logic.js             │
│  - creep-full.js                    │
└──────────────┬──────────────────────┘
               │
               │ API 调用
               ↓
┌─────────────────────────────────────┐
│  Cloudflare Workers                 │
│  (处理 API)                         │
│  - /api/ip-info                     │
│  - /api/fingerprint                 │
│  - /api/stats                       │
└─────────────────────────────────────┘
```

---

## 部署步骤

### 第一步：部署前端到 Pages

```bash
# 1. 进入项目目录
cd /workspace

# 2. 登录 Cloudflare
wrangler login

# 3. 创建 Pages 项目
wrangler pages project create creepjs-frontend

# 4. 部署 public 目录
wrangler pages deploy public/ --project-name=creepjs-frontend

# 输出示例：
# ✨ Deployment complete!
# Your deployed project URL: https://creepjs-frontend.<随机>.pages.dev
```

**或手动部署（推荐新手）**：

1. 访问 https://pages.cloudflare.com
2. 点击 "Create a project" → "Direct Upload"
3. 输入项目名称 `creepjs-frontend`
4. 点击 "Upload folder" → 选择 `/workspace/public` 目录
5. 点击 "Deploy"

---

### 第二步：部署 Worker API

创建文件 `wrangler.toml`：

```toml
name = "creepjs-api"
main = "edge-script/worker-api-only.js"
compatibility_date = "2024-01-01"

# 可选：KV 存储配置
# [[kv_namespaces]]
# binding = "FINGERPRINT_DB"
# id = "你的 KV namespace ID"
```

部署：

```bash
wrangler deploy
```

---

### 第三步：配置前端 API 地址

修改 `public/interpreter.html`:

```javascript
// 第 286 行左右，collectIP 函数
const API_BASE = 'https://creepjs-api.<你的子域名>.workers.dev';

(async function collectIP() {
  const res = await fetch(`${API_BASE}/api/ip-info`);
  // ...
})();
```

修改指纹发送地址（在 `creep-full.js` 或调用处）：

```javascript
window.CreepLite({
  apiEndpoint: 'https://creepjs-api.<你的子域名>.workers.dev/api/fingerprint',
  cacheEnabled: true
});
```

---

### 第四步：绑定自定义域名（可选）

**Pages 绑定域名**：
1. Pages 控制台 → Settings → Custom domains
2. 添加域名 `指纹解读。你的域名.com`

**Worker 绑定域名**：
1. Worker 控制台 → Triggers → Custom domains
2. 添加域名 `api.你的域名.com`

---

## 简化版 Worker 代码（仅 API）

新建文件 `edge-script/worker-api-only.js`：

```javascript
/**
 * Cloudflare Workers - 仅 API（配合 Pages 使用）
 * wrangler deploy
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 允许跨域
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }
    
    // IP 信息
    if (url.pathname === '/api/ip-info') {
      return handleIPInfo(request);
    }
    
    // 指纹分析
    if (url.pathname === '/api/fingerprint' && request.method === 'POST') {
      return handleFingerprint(request, env);
    }
    
    // 健康检查
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 404
    return new Response('Not Found', { status: 404 });
  }
};

function handleIPInfo(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const cf = request.cf || {};
  
  return new Response(JSON.stringify({
    success: true,
    ip,
    country: cf.country,
    region: cf.region,
    city: cf.city,
    isp: cf.isp,
    timezone: cf.timezone,
    latitude: cf.latitude,
    longitude: cf.longitude,
    asn: cf.asn
  }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

async function handleFingerprint(request, env) {
  const { fingerprint } = await request.json();
  const ip = request.headers.get('CF-Connecting-IP');
  const cf = request.cf || {};
  
  let riskScore = 0;
  
  if (fingerprint.headless?.headless) riskScore += 50;
  if (fingerprint.navigator?.webdriver) riskScore += 50;
  
  const cloudProviders = ['amazon', 'google', 'microsoft', 'aws', 'azure'];
  if (cloudProviders.some(p => (cf.isp || '').toLowerCase().includes(p))) {
    riskScore += 20;
  }
  
  let decision = 'ALLOW';
  if (riskScore >= 70) decision = 'BLOCK';
  else if (riskScore >= 50) decision = 'CHALLENGE';
  
  const fingerprintId = await generateHash(JSON.stringify(fingerprint));
  
  return new Response(JSON.stringify({
    success: true,
    fingerprintId,
    decision,
    riskScore,
    ip,
    geo: {
      country: cf.country,
      city: cf.city,
      isp: cf.isp
    }
  }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Set-Cookie': `device_token=${decision}:${riskScore}:${Date.now()}; HttpOnly; Path=/; Max-Age=1800`
    }
  });
}

async function generateHash(data) {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

---

## 前端代码修改

### 修改 `public/interpreter.html`

在文件顶部添加配置（第 285 行左右）：

```javascript
// ============ 配置区 ============
const CONFIG = {
  // 替换成你的 Worker URL
  API_BASE: 'https://creepjs-api.<你的子域名>.workers.dev',
  
  // 是否启用 IP 采集
  ENABLE_IP_COLLECTION: true
};
// ================================

// IP 信息采集脚本
window.IPInfo = null;
window.IPInfoReady = false;

(async function collectIP() {
  if (!CONFIG.ENABLE_IP_COLLECTION) {
    window.IPInfoReady = true;
    return;
  }
  
  try {
    console.log('[IP] 开始采集（Cloudflare Workers）');
    
    // 调用 Workers API
    const res = await fetch(`${CONFIG.API_BASE}/api/ip-info`);
    if (res.ok) {
      const data = await res.json();
      window.IPInfo = data;
      window.IPInfoReady = true;
      
      console.log('[IP] 采集成功', data);
      
      // 重新渲染
      if (typeof renderCategories === 'function' && fingerprintData) {
        renderCategories();
      }
    }
  } catch (e) {
    console.error('[IP] 采集失败:', e);
    window.IPInfoReady = true;
  }
})();
```

修改指纹发送地址（在 `creep-full.js` 或相应位置）：

```javascript
fetch(`${CONFIG.API_BASE}/api/fingerprint`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fingerprint: creepData })
});
```

---

## 测试验证

### 1. 测试 Worker API

```bash
# IP 信息
curl https://creepjs-api.<你的子域名>.workers.dev/api/ip-info

# 健康检查
curl https://creepjs-api.<你的子域名>.workers.dev/api/health
```

### 2. 测试 Pages 前端

访问：`https://creepjs-frontend.<你的子域名>.pages.dev/examples/interpreter.html`

### 3. 打开控制台

应该看到：
```
[IP] 开始采集 (Cloudflare Workers)
[IP] 采集成功 {ip: "xxx", country: "xx", ...}
```

---

## 费用说明

### Cloudflare Pages（免费）
- ✅ 无限请求
- ✅ 100GB 带宽/月
- ✅ 500 次构建/月

### Cloudflare Workers（免费）
- ✅ 100,000 次请求/天
- ✅ 10ms CPU 时间/次
- ✅ 免费 KV 存储（1000 次读/天）

**个人项目完全免费！**

---

## 优势

| 功能 | 传统方案 | Cloudflare 方案 |
|------|----------|----------------|
| 部署 | 服务器 + Nginx | `wrangler deploy` |
| IP 获取 | 需要反向代理 | `CF-Connecting-IP` |
| 地理位置 | 查询第三方 API | `request.cf` 自带 |
| HTTPS | 自己配置证书 | 自动免费 |
| CDN | 额外配置 | 全球 275+ 节点 |
| DDoS 防护 | 额外服务 | 自带 |
| 成本 | $5-20/月 | 免费 |

---

## 下一步

1. **部署 Pages**（5 分钟）
2. **部署 Worker**（3 分钟）
3. **修改前端配置**（1 分钟）
4. **测试验证**（2 分钟）

有问题随时问我！
