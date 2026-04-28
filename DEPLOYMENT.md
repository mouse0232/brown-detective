# CreepJS 反爬虫指纹识别系统 - 完整部署文档

> 基于 CreepJS 的浏览器指纹采集与风险分析系统，专为反爬虫场景设计

---

## 📋 目录

1. [项目概述](#项目概述)
2. [系统架构](#系统架构)
3. [快速开始](#快速开始)
4. [API 文档](#api-文档)
5. [前端集成](#前端集成)
6. [后端部署](#后端部署)
7. [风险规则配置](#风险规则配置)
8. [生产环境部署](#生产环境部署)
9. [故障排查](#故障排查)
10. [常见问题](#常见问题)

---

## 项目概述

### 功能特性

- ✅ **浏览器指纹采集** - 50+ 维度检测（Canvas、WebGL、字体、Audio 等）
- ✅ **自动化工具检测** - 识别 Puppeteer、Selenium、Playwright
- ✅ **无头浏览器检测** - Headless Chrome/Firefox 识别
- ✅ **反指纹浏览器检测** - Tor、Brave、指纹篡改识别
- ✅ **智能缓存机制** - localStorage 缓存，避免重复采集
- ✅ **API 自动上报** - 采集完成自动发送到后端
- ✅ **风险分析引擎** - 基于规则的风险评分和决策

### 双版本支持

| 版本 | 文件大小 | 采集时间 | 检测维度 | 使用场景 |
|------|---------|---------|---------|---------|
| **轻量版** (creep-lite.js) | ~224KB | ~200ms | 12 个 | 普通页面访问、快速筛查 |
| **完整版** (creep.js) | ~550KB | ~1000ms | 50+ 个 | 登录、支付、敏感操作 |

### FP ID 说明

- **FP ID** 与官方 CreepJS 完全一致
- 基于稳定的核心特征计算（排除 Worker、WebRTC 等易变字段）
- 固定时间戳 `forceRenew: 1737085481442` 确保稳定性

---

## 系统架构

```
用户浏览器
    ↓
加载 creep-lite.js
    ↓
采集指纹 (12 个核心维度)
    ↓
POST /api/fingerprint
    ↓
风险分析引擎
    ↓
返回决策 (ALLOW/MONITOR/CHALLENGE/BLOCK)
    ↓
前端采取行动
```

### 核心组件

1. **前端采集** - `creep-lite.js`
2. **API 服务** - `api-server.js`
3. **数据存储** - `fingerprints.json` (可替换为数据库)

---

## 快速开始

### 1. 安装依赖

```bash
cd /workspace
pnpm install
```

### 2. 构建轻量版

```bash
pnpm build:lite
```

### 3. 启动服务

```bash
# 启动 API + 静态文件服务
node server.js
```

服务启动在 **http://localhost:8000**

### 4. 测试

访问测试页面：
- http://localhost:8000/examples/demo.html
- http://localhost:8000/examples/stability-test.html

---

## API 文档

### 基础信息

- **基础路径**: `/api`
- **数据格式**: JSON
- **编码**: UTF-8

---

### 1. 提交指纹分析 ⭐

**端点**: `POST /api/fingerprint`

**请求**:
```json
{
  "fingerprint": {
    // CreepJS 采集的指纹对象
    "fingerprintId": "efa0e17daa9c530ec1edeae9d1556dc5...",
    "version": "lite",
    "timestamp": 1234567890,
    "collectionTime": 156.30,
    ...
  }
}
```

**响应**:
```json
{
  "success": true,
  "fingerprintId": "efa0e17daa9c530ec1edeae9d1556dc5846deef7c60b6a30be086cc09bea5a16",
  "analysis": {
    "riskScore": 0,
    "level": "minimal",
    "decision": "ALLOW",
    "risks": []
  },
  "timestamp": 1234567890
}
```

**风险等级说明**:

| level | riskScore | decision | 说明 |
|-------|-----------|----------|------|
| minimal | 0-9 | ALLOW | 完全可信 |
| low | 10-29 | ALLOW | 正常用户 |
| medium | 30-49 | MONITOR | 需要关注 |
| high | 50-69 | CHALLENGE | 需要验证 |
| critical | 70-100 | BLOCK | 直接拦截 |

**前端示例**:
```javascript
const fp = await window.CreepLite({
  apiEndpoint: '/api/fingerprint',
  cacheEnabled: true,
})

const response = await fetch('/api/fingerprint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fingerprint: fp })
})

const result = await response.json()

// 根据决策采取行动
switch (result.analysis.decision) {
  case 'ALLOW':
    console.log('✅ 允许访问')
    break
  case 'CHALLENGE':
    showCaptcha() // 显示验证码
    break
  case 'BLOCK':
    blockAccess() // 拦截访问
    break
}
```

---

### 2. 查询指纹历史记录

**端点**: `GET /api/fingerprint/:fingerprintId`

**响应**:
```json
{
  "success": true,
  "fingerprintId": "efa0e17...",
  "record": {
    "firstSeen": 1234567890,
    "lastSeen": 1234567890,
    "visitCount": 5,
    "fingerprint": { ... },
    "riskHistory": [
      {
        "timestamp": 1234567890,
        "riskScore": 15,
        "level": "low",
        "decision": "ALLOW"
      }
    ]
  }
}
```

**示例**:
```javascript
const fpId = 'efa0e17daa9c530ec1edeae9d1556dc5...'
const res = await fetch(`/api/fingerprint/${fpId}`)
const data = await res.json()

console.log('访问次数:', data.record.visitCount)
console.log('首次访问:', new Date(data.record.firstSeen))
```

---

### 3. 加入黑名单

**端点**: `POST /api/fingerprint/:fingerprintId/blacklist`

**请求**:
```json
{
  "reason": "刷接口攻击"
}
```

**响应**:
```json
{
  "success": true,
  "message": "已加入黑名单"
}
```

**示例**:
```javascript
await fetch(`/api/fingerprint/${fpId}/blacklist`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ reason: '爬虫行为' })
})
```

---

### 4. 加入白名单

**端点**: `POST /api/fingerprint/:fingerprintId/whitelist`

**响应**:
```json
{
  "success": true,
  "message": "已加入白名单"
}
```

**示例**:
```javascript
await fetch(`/api/fingerprint/${fpId}/whitelist`, {
  method: 'POST'
})
```

---

### 5. 查看统计数据

**端点**: `GET /api/stats`

**响应**:
```json
{
  "success": true,
  "stats": {
    "totalFingerprints": 1234,
    "blacklisted": 56,
    "whitelisted": 12,
    "riskDistribution": {
      "critical": 10,
      "high": 23,
      "medium": 45,
      "low": 567,
      "minimal": 579
    }
  }
}
```

---

### 6. 健康检查

**端点**: `GET /api/health`

**响应**:
```json
{
  "success": true,
  "status": "ok",
  "timestamp": 1234567890
}
```

---

## 前端集成

### 方案 1: 直接引用 CDN

```html
<!DOCTYPE html>
<html>
<head>
  <title>你的网站</title>
</head>
<body>
  <!-- 引入指纹库 -->
  <script src="https://your-cdn.com/creep-lite.js"></script>
  
  <script>
    // 页面加载时自动采集
    window.CreepLite({
      apiEndpoint: 'https://your-api.com/api/fingerprint',
      cacheEnabled: true,
      cacheTTL: 1800000  // 30 分钟
    }).then(fp => {
      console.log('指纹 ID:', fp.fingerprintId)
      
      // 根据风险等级显示不同内容
      if (fp.analysis?.decision === 'BLOCK') {
        document.body.innerHTML = '<h1>🚫 访问被拒绝</h1>'
      }
    })
  </script>
</body>
</html>
```

### 方案 2: React 集成

```jsx
import { useEffect, useState } from 'react'

function App() {
  const [fingerprintId, setFingerprintId] = useState(null)
  const [riskLevel, setRiskLevel] = useState(null)

  useEffect(() => {
    // 加载指纹脚本
    const script = document.createElement('script')
    script.src = '/docs/creep-lite.js'
    script.async = true
    document.body.appendChild(script)
    
    script.onload = async () => {
      try {
        const fp = await window.CreepLite({
          apiEndpoint: '/api/fingerprint',
          cacheEnabled: true,
        })
        
        setFingerprintId(fp.fingerprintId)
        setRiskLevel(fp.analysis?.level)
      } catch (err) {
        console.error('指纹采集失败:', err)
      }
    }
  }, [])

  return (
    <div>
      <h1>欢迎</h1>
      {fingerprintId && <p>指纹 ID: {fingerprintId.substring(0, 16)}...</p>}
      {riskLevel === 'critical' && <p>高风险访问!</p>}
    </div>
  )
}

export default App
```

### 方案 3: Vue 集成

```vue
<template>
  <div>
    <h1>欢迎</h1>
    <p v-if="fingerprintId">指纹 ID: {{ fingerprintId.substring(0, 16) }}...</p>
    <p v-if="riskLevel === 'critical'">高风险访问!</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      fingerprintId: null,
      riskLevel: null
    }
  },
  mounted() {
    const script = document.createElement('script')
    script.src = '/docs/creep-lite.js'
    script.async = true
    document.body.appendChild(script)
    
    script.onload = async () => {
      try {
        const fp = await window.CreepLite({
          apiEndpoint: '/api/fingerprint',
          cacheEnabled: true,
        })
        
        this.fingerprintId = fp.fingerprintId
        this.riskLevel = fp.analysis?.level
      } catch (err) {
        console.error('指纹采集失败:', err)
      }
    }
  }
}
</script>
```

### 方案 4: 登录页面防护

```javascript
async function handleLogin(username, password) {
  // 1. 采集指纹
  const fp = await window.CreepLite({ 
    cacheEnabled: true,
    apiEndpoint: '/api/fingerprint'
  })
  
  // 2. 检查风险
  if (fp.analysis?.decision === 'BLOCK') {
    alert('检测到异常访问，请稍后再试')
    return
  }
  
  if (fp.analysis?.decision === 'CHALLENGE') {
    // 显示验证码
    const captcha = await showCaptcha()
    if (!captcha.valid) return
  }
  
  // 3. 正常登录
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Fingerprint-ID': fp.fingerprintId
    },
    body: JSON.stringify({ username, password })
  })
  
  return response.json()
}
```

---

## 后端部署

### 1. 独立 API 服务

```bash
# 复制文件
cp /workspace/api-server.js /your/server/

# 安装依赖
cd /your/server
npm install express crypto

# 启动服务
node api-server.js
```

服务启动在 **http://localhost:3001**

### 2. 使用 PM2 管理

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start api-server.js --name antibot-api

# 开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs antibot-api

# 重启
pm2 restart antibot-api
```

### 3. Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    location / {
        root /var/www/antibot;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 静态资源（指纹库）
    location /docs/ {
        alias /var/www/antibot/docs/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4. Docker 部署

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY api-server.js ./
COPY docs/ ./docs/

EXPOSE 3001

CMD ["node", "api-server.js"]
```

```bash
# 构建镜像
docker build -t antibot-api .

# 运行容器
docker run -d -p 3001:3001 \
  -v /data/fingerprints:/app/fingerprints.json \
  --name antibot \
  antibot-api
```

---

## 风险规则配置

### 默认规则 (api-server.js)

```javascript
function analyzeRisk(fingerprint, fingerprintId) {
  const risks = []
  let riskScore = 0
  
  // 1. 无头浏览器检测 (+40 分)
  if (headless?.riskLevel === 'high' || headless?.headless === true) {
    risks.push({
      type: 'HEADLESS_BROWSER',
      level: 'high',
      score: 40,
      message: '检测到无头浏览器特征'
    })
    riskScore += 40
  }

  // 2. 自动化工具检测 (+50 分)
  if (navigator?.webdriver === true) {
    risks.push({
      type: 'AUTOMATION_TOOL',
      level: 'high',
      score: 50,
      message: '检测到 WebDriver 特征'
    })
    riskScore += 50
  }

  // 3. 指纹谎言检测 (>5 个 +35 分)
  if (lies?.liesDetected?.length > 5) {
    risks.push({
      type: 'FINGERPRINT_LIES',
      level: 'high',
      score: 35,
      message: `检测到 ${lies.liesDetected.length} 个指纹谎言`
    })
    riskScore += 35
  }

  // 4. 黑名单检查 (直接 100 分)
  if (historicalData.blacklist.includes(fingerprintId)) {
    riskScore = 100
    risks.push({
      type: 'BLACKLISTED',
      level: 'critical',
      score: 100,
      message: '指纹在黑名单中'
    })
  }

  // 风险等级判定
  let level, decision
  if (riskScore >= 70) {
    level = 'critical'
    decision = 'BLOCK'
  } else if (riskScore >= 50) {
    level = 'high'
    decision = 'CHALLENGE'
  } else if (riskScore >= 30) {
    level = 'medium'
    decision = 'MONITOR'
  } else if (riskScore >= 10) {
    level = 'low'
    decision = 'ALLOW'
  } else {
    level = 'minimal'
    decision = 'ALLOW'
  }

  return { riskScore, level, decision, risks }
}
```

### 自定义规则示例

```javascript
// 添加新的检测规则

// 1. 高频访问检测
const historicalRecord = historicalData.fingerprints[fingerprintId]
if (historicalRecord) {
  const timeSinceLastVisit = Date.now() - historicalRecord.lastSeen
  const requestFrequency = historicalRecord.visitCount || 1
  
  // 1 分钟内访问超过 10 次
  if (requestFrequency > 10 && timeSinceLastVisit < 60000) {
    risks.push({
      type: 'HIGH_FREQUENCY',
      level: 'high',
      score: 30,
      message: '短时间内大量请求'
    })
    riskScore += 30
  }
}

// 2. 特定时间段检测（如凌晨 2-5 点）
const hour = new Date().getHours()
if (hour >= 2 && hour <= 5) {
  riskScore += 10  // 夜间访问加分
}

// 3. 地理位置检测（需要 IP 库支持）
const country = getCountryFromIP(req.ip)
if (['CN', 'US', 'RU'].includes(country)) {
  // 特定国家加分
  riskScore += 5
}
```

---

## 生产环境部署

### 1. 文件结构

```
/var/www/antibot/
├── docs/
│   ├── creep-lite.js        # 轻量版指纹库
│   ├── creep.js             # 完整版指纹库（可选）
│   ├── index.html           # 演示页面
│   └── style.min.css        # 样式文件
├── api-server.js            # API 服务
├── fingerprints.json        # 数据存储
├── package.json
└── nginx.conf               # Nginx 配置
```

### 2. 环境变量配置

创建 `.env` 文件：

```bash
# API 服务端口
PORT=3001

# 数据存储路径
DATA_FILE=/var/data/fingerprints.json

# 缓存配置
CACHE_TTL=1800000

# 日志级别
LOG_LEVEL=info

# 跨域配置
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

### 3. 安全配置

```javascript
// 添加 CORS 中间件
app.use((req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',')
  const origin = req.headers.origin
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  
  next()
})

// 添加请求限流
const rateLimit = require('express-rate-limit')

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 最多 100 次请求
  message: '请求过于频繁，请稍后再试'
})

app.use('/api/', limiter)
```

### 4. 监控告警

```javascript
// 添加监控端点
app.get('/api/monitor', (req, res) => {
  const stats = {
    totalFingerprints: Object.keys(historicalData.fingerprints).length,
    blacklisted: historicalData.blacklist.length,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
  }
  
  // 检查异常
  if (stats.totalFingerprints > 100000) {
    sendAlert('指纹数据过多，请清理')
  }
  
  res.json(stats)
})

function sendAlert(message) {
  // 发送邮件/短信/钉钉通知
  console.error('⚠️ ALERT:', message)
}
```

### 5. 数据备份

```bash
#!/bin/bash
# backup.sh - 每日备份脚本

DATE=$(date +%Y%m%d)
BACKUP_DIR="/backup/fingerprints"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据
cp /var/www/antibot/fingerprints.json $BACKUP_DIR/fingerprints_$DATE.json

# 压缩备份
gzip $BACKUP_DIR/fingerprints_$DATE.json

# 删除 30 天前的备份
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "备份完成：fingerprints_$DATE.json.gz"
```

```bash
# 添加定时任务
crontab -e

# 每天凌晨 3 点备份
0 3 * * * /var/www/antibot/backup.sh
```

---

## 故障排查

### 问题 1: FP ID 与官方不一致

**原因**:
- Worker 脚本路径不对
- 使用了自定义构建版本
- hashify 算法差异

**解决**:
```bash
# 使用官方 creep.js
curl https://abrahamjuliot.github.io/creepjs/creep.js > docs/creep.js

# 确保 Worker 脚本存在
ls -lh docs/creep.js  # 应该 ~550KB
```

### 问题 2: API 调用失败

**检查步骤**:
```bash
# 1. 检查 API 服务是否运行
curl http://localhost:3001/api/health

# 2. 检查网络连接
ping your-api.com

# 3. 检查 CORS 配置
curl -I http://localhost:3001/api/fingerprint

# 4. 查看日志
tail -f api.log
```

### 问题 3: 指纹采集超时

**优化方案**:
```javascript
// 1. 启用缓存
window.CreepLite({
  cacheEnabled: true,
  cacheTTL: 1800000  // 30 分钟
})

// 2. 减少采集维度（自定义版本）
// 修改 creep-lite.ts 只采集核心特征

// 3. 使用 CDN 加速
<script src="https://cdn.your-domain.com/creep-lite.js"></script>
```

### 问题 4: 数据存储过大

**清理方案**:
```javascript
// 添加清理端点
app.post('/api/cleanup', (req, res) => {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
  
  let deleted = 0
  for (const [id, record] of Object.entries(historicalData.fingerprints)) {
    if (record.lastSeen < thirtyDaysAgo) {
      delete historicalData.fingerprints[id]
      deleted++
    }
  }
  
  saveData()
  res.json({ message: `已清理 ${deleted} 条记录` })
})
```

---

## 常见问题

### Q1: 指纹多久变化一次？

**A**: 正常情况下，同一浏览器的指纹应该保持稳定。但如果发生以下情况，指纹可能变化：
- 浏览器升级
- 系统字体变化
- GPU 驱动更新
- 隐私设置调整
- 清除浏览器数据

建议缓存时间设置为 **30 分钟 - 1 小时**。

### Q2: 如何防止误拦截？

**A**: 
1. 设置合理的风险阈值（默认 70 分拦截）
2. 添加白名单机制
3. 提供申诉渠道
4. 使用 `MONITOR` 模式先观察一段时间

### Q3: 可以检测手机吗？

**A**: 可以。CreepJS 支持移动端浏览器，但部分检测维度在移动端不可用（如 WebGL 某些参数）。

### Q4: 性能影响大吗？

**A**: 
- 轻量版：~200ms，对用户体验影响很小
- 完整版：~1000ms，建议在关键操作前使用
- 启用缓存后，后续访问几乎无影响

### Q5: 隐私合规吗？

**A**: 
- 指纹采集不存储个人隐私信息
- 建议在隐私政策中说明
- 提供用户选择退出的选项
- 遵守 GDPR、CCPA 等法规

---

## 附录

### 文件清单

```
/workspace/
├── src/
│   ├── creep-lite.ts          # 轻量版源码
│   └── creep.ts               # 完整版源码
├── public/
│   ├── creep-lite.js          # 轻量版构建
│   ├── creep.js               # 官方版（复制）
│   └── index.html             # 主页
├── docs/
│   ├── creep-lite.js          # 轻量版（CDN）
│   ├── creep.js               # 完整版（CDN）
│   ├── style.min.css          # 样式
│   └── index.html             # 演示页
├── examples/
│   ├── demo.html              # 测试页面
│   ├── stability-test.html    # 稳定性测试
│   └── api-test.html          # API 测试
├── api-server.js              # API 服务
├── server.js                  # 静态文件服务
├── package.json
├── rollup.config.js           # 构建配置
├── ANTI_BOT_GUIDE.md          # 反爬虫指南
├── QUICK_START.md             # 快速开始
└── DEPLOYMENT.md              # 本文档
```

### 命令速查

```bash
# 安装依赖
pnpm install

# 构建轻量版
pnpm build:lite

# 构建完整版
pnpm build:full

# 构建所有版本
pnpm build:dev

# 启动服务
pnpm start

# 启动 API 服务
node api-server.js

# 清理旧数据
curl -X POST http://localhost:3001/api/cleanup
```

### 相关链接

- 官方 CreepJS: https://abrahamjuliot.github.io/creepjs/
- GitHub 仓库：https://github.com/abrahamjuliot/CreepJS
- 本文档项目：/workspace

---

## 更新日志

### v1.0.0 (2026-04-28)
- ✅ 初始版本发布
- ✅ 轻量版指纹采集
- ✅ API 风险分析服务
- ✅ 完整文档

---

**文档版本**: v1.0.0  
**最后更新**: 2026-04-28  
**维护者**: Your Team
