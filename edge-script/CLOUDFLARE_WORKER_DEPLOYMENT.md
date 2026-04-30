# Cloudflare Workers 部署指南

## 快速部署

### 方法 1: 在线部署（推荐）

1. **访问 Cloudflare Workers**
   - 打开 https://workers.cloudflare.com
   - 登录/注册 Cloudflare 账号（免费）

2. **创建 Worker**
   - 点击 "Create a Worker"
   - 输入 Worker 名称（如 `creepjs-ip-api`）
   - 点击 "Deploy"

3. **粘贴代码**
   - 点击 "Edit Code"
   - 删除默认代码
   - 粘贴 `cloudflare-worker-ip.js` 的全部内容
   - 点击 "Save and Deploy"

4. **访问 API**
   - Worker URL: `https://creepjs-ip-api.<你的子域名>.workers.dev`
   - 测试：`https://<你的 URL>/api/ip-info`

### 方法 2: 命令行部署

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 初始化项目
wrangler init creepjs-ip-api
cd creepjs-ip-api

# 替换 wrangler.toml 内容
cat > wrangler.toml << 'EOF'
name = "creepjs-ip-api"
main = "src/index.js"
compatibility_date = "2024-01-01"

[vars]
# 可以在这里添加配置变量
EOF

# 粘贴代码到 src/index.js
# cp cloudflare-worker-ip.js src/index.js

# 部署
wrangler deploy
```

---

## API 端点

### 1. 获取客户端 IP 和地理信息

**请求**
```http
GET /api/ip-info
Host: your-worker.workers.dev
```

**响应**
```json
{
  "success": true,
  "ip": "43.199.202.106",
  "country": "HK",
  "countryName": "中国",
  "region": "Central and Western District",
  "city": "Hong Kong",
  "isp": "Amazon.com, Inc.",
  "org": "Amazon.com, Inc.",
  "timezone": "Asia/Hong_Kong",
  "latitude": 22.2798,
  "longitude": 114.163,
  "asn": "AS16509",
  "asOrganization": "Amazon.com, Inc.",
  "protocol": "HTTP/2",
  "tlsVersion": "TLSv1.3",
  "cipher": "AEAD-AES128-GCM-SHA256",
  "edgeColo": "HKG",
  "continent": "AS"
}
```

### 2. 查询指定 IP 的地理信息

**请求**
```http
GET /api/ip-geo?ip=8.8.8.8
Host: your-worker.workers.dev
```

**响应**
```json
{
  "success": true,
  "ip": "8.8.8.8",
  "country": "United States",
  "region": "Virginia",
  "city": "Ashburn",
  "isp": "Google LLC",
  "org": "Google Public DNS",
  "timezone": "America/New_York",
  "latitude": 39.03,
  "longitude": -77.5,
  "as": "AS15169 Google LLC"
}
```

### 3. 指纹风险分析（集成 IP+ 指纹）

**请求**
```http
POST /api/fingerprint
Host: your-worker.workers.dev
Content-Type: application/json

{
  "fingerprint": {
    "navigator": { "userAgent": "...", "webdriver": false },
    "screen": { "width": 1920, "height": 1080 },
    "headless": { "headless": false },
    "canvas": { "dataURL": "..." }
  }
}
```

**响应**
```json
{
  "success": true,
  "fingerprintId": "abc123...",
  "analysis": {
    "riskScore": 20,
    "level": "low",
    "decision": "ALLOW",
    "risks": [
      { "type": "CLOUD_IP", "level": "medium", "score": 20 }
    ]
  },
  "clientIP": "43.199.202.106",
  "geo": {
    "country": "HK",
    "region": "Central and Western District",
    "city": "Hong Kong",
    "isp": "Amazon.com, Inc."
  },
  "timestamp": 1777520201599
}
```

---

## 前端集成

### 1. 修改 interpreter.html

找到 `collectIP()` 函数，替换为：

```javascript
(async function collectIP() {
  try {
    console.log('[IP] 开始采集（Cloudflare Workers）');
    
    // 直接调用 Workers API
    const res = await fetch('https://your-worker.workers.dev/api/ip-info');
    if (res.ok) {
      const data = await res.json();
      
      window.IPInfo = data;
      window.IPInfoReady = true;
      
      console.log('[IP] 采集成功', data);
      console.log('[IP] 请在控制台执行 window.IPInfo 查看详细数据');
      
      // 重新渲染网络分类
      if (typeof renderCategories === 'function' && fingerprintData) {
        console.log('[IP] 重新渲染网络分类...');
        renderCategories();
      }
    }
  } catch (e) {
    console.error('[IP] 采集失败:', e);
    window.IPInfo = {
      ip: '无法获取',
      country: '-', region: '-', city: '-', isp: '-', timezone: '-',
      mismatch: false
    };
    window.IPInfoReady = true;
  }
})();
```

**注意**：不需要 WebRTC 了！Workers 获取的 IP 是真实的出口 IP。

### 2. 简化版（移除 WebRTC）

由于 Workers 已经提供了准确的 IP，可以移除复杂的 WebRTC 采集代码：

```javascript
// 不再需要 WebRTC
// 不再需要双 IP 对比
// 直接相信 Workers 提供的 IP
```

---

## 优势对比

| 功能 | 本地部署 | Cloudflare Workers |
|------|----------|-------------------|
| 获取 IP 方式 | WebRTC + HTTP API | `CF-Connecting-IP` Header |
| 地理位置 | 后端代理 ip-api.com | `request.cf` 自带 |
| ASN/ISP | 需要查询 API | `request.cf.asn` |
| CORs | 需要配置 | 无限制 |
| 响应速度 | ~500ms-2s | ~50ms |
| 成本 | 服务器费用 | 免费（10 万次/天） |
| 维护 | 自己运维 | Serverless 自动扩展 |

---

## 免费额度

- **每日请求**：100,000 次
- **每次执行时间**：最长 10 秒
- **CPU 时间**：10ms（通常够用）
- **带宽**：包含在 Cloudflare 免费计划中

对于大多数个人项目和小企业，免费额度完全够用。

---

## 高级功能

### 1. 绑定自定义域名

1. 在 Workers 控制台添加自定义域名
2. CNAME 记录指向 `your-worker.workers.dev`
3. 自动 HTTPS 证书

### 2. 添加 KV 存储（记录历史）

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "FINGERPRINT_DB"
id = "your-kv-namespace-id"
```

```javascript
// 代码中使用
async function handleFingerprint(request, env) {
  const record = await env.FINGERPRINT_DB.get(fingerprintId);
  // ...
}
```

### 3. 添加 DDoS 防护

```javascript
// 在开头添加速率限制
const ip = request.headers.get('CF-Connecting-IP');
const key = `rate_limit:${ip}`;
const count = await env.RATE_LIMIT_KV.get(key) || 0;

if (count > 100) {
  return new Response('Too Many Requests', { status: 429 });
}

await env.RATE_LIMIT_KV.put(key, count + 1, { expirationTtl: 60 });
```

### 4. 日志记录

```javascript
// 使用 Cloudflare Logpush
console.log(JSON.stringify({
  type: 'fingerprint_analysis',
  ip: ip,
  riskScore: riskScore,
  decision: decision,
  timestamp: Date.now()
}));
```

---

## 故障排查

### 问题 1: API 返回 `unknown` IP

**原因**: 请求没有经过 Cloudflare

**解决**: 
- 确保域名已添加到 Cloudflare
- 确保开启了 "Proxy" 模式（橙色云朵）
- 测试时使用 `curl -H "CF-Connecting-IP: 1.2.3.4"` 模拟

### 问题 2: CORS 错误

**解决**: 已经在响应头添加了 `Access-Control-Allow-Origin: *`

### 问题 3: 地理位置数据为空

**原因**: 某些请求可能没有 `request.cf` 对象

**解决**: 已在代码中添加兜底逻辑，返回 `-` 而不是报错

---

## 下一步

1. **部署 Worker** - 5 分钟
2. **测试 API** - 确认数据正确
3. **修改前端** - 替换 IP 采集逻辑
4. **上线测试** - 实际环境验证

需要帮助随时问我！
