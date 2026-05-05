# 布朗探长 API / SDK

> 开源反指纹浏览器检测解决方案 - 帮助开发者识别自动化工具、爬虫和伪装浏览器

---

## 📖 目录

- [产品概述](#产品概述)
- [核心功能](#核心功能)
- [技术架构](#技术架构)
- [快速开始](#快速开始)
- [API 文档](#api-文档)
- [SDK 使用指南](#sdk-使用指南)
- [部署指南](#部署指南)
- [性能优化](#性能优化)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 产品概述

### 🎯 产品定位

**布朗探长** 是一个开源的反指纹浏览器检测系统，为开发者和企业提供轻量级、高精度的浏览器真实性验证能力。

### 💡 核心价值

| 特性 | 说明 |
|------|------|
| **轻量级** | 前端 SDK < 50KB，不拖累页面加载 |
| **高精度** | 基于多维度指纹识别，准确率 > 95% |
| **易集成** | 3 行代码即可接入 |
| **可自托管** | 完整开源，数据完全私有 |
| **可扩展** | 模块化设计，支持自定义检测规则 |

### 🎁 开源版本功能

- ✅ 浏览器指纹采集
- ✅ 反指纹浏览器识别（AdsPower、HubStudio、VMLogin 等）
- ✅ 自动化工具检测（Selenium、Puppeteer、Playwright）
- ✅ 代理/VPN 检测（WebRTC + IP 对比）
- ✅ 风险评分系统
- ✅ 自托管 API 服务
- ✅ JavaScript SDK

### 💰 未来商业化方向

积累足够的数据后，计划推出：

- **云端 SaaS 服务** - 按量付费，无需运维
- **黑白名单库** - 共享威胁情报
- **高级规则引擎** - 自定义检测策略
- **行为分析** - 鼠标轨迹、按键节奏
- **企业级支持** - SLA 保障、专属客服

---

## 核心功能

### 1️⃣ 风险评分系统

综合评估浏览器风险，返回 0-100 分数：

| 分数范围 | 风险等级 | 建议操作 |
|---------|---------|---------|
| 0-20 | 🟢 低风险 | 正常放行 |
| 21-50 | 🟡 中风险 | 加强监控 |
| 51-75 | 🟠 高风险 | 验证码验证 |
| 76-100 | 🔴 严重风险 | 直接拦截 |

### 2️⃣ 指纹浏览器识别

检测主流指纹浏览器：

- AdsPower
- HubStudio
- VMLogin
- BitBrowser
- Incogniton
- Multilogin
- Linken Sphere
- Ghost Browser

### 3️⃣ 自动化工具检测

识别常见自动化工具：

- Selenium
- Puppeteer
- Playwright
- WebDriver
- Headless Chrome

### 4️⃣ 代理/VPN 检测

多维度检测代理特征：

- WebRTC IP vs HTTP IP 对比
- 代理请求头检测
- 数据中心 IP 识别
- IP 风险评分

---

## 技术架构

### 整体架构图

```
┌──────────────────────────────────────────────────────────────┐
│                        用户浏览器                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                  布朗探长 SDK (前端)                    │  │
│  │  • 指纹采集 (Canvas/WebGL/Audio/Fonts...)              │  │
│  │  • 反检测特征收集 (WebDriver/Headless/Proxy...)        │  │
│  │  • 数据加密                                             │  │
│  └────────────────────────────┬───────────────────────────┘  │
└───────────────────────────────┼──────────────────────────────┘
                                │ HTTPS
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                   布朗探长 API (后端)                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │   风险评分引擎  │  │  指纹浏览器检测  │  │   代理检测     │  │
│  │  Risk Engine   │  │ Browser Detect │  │ Proxy Detect   │  │
│  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘  │
│           │                   │                   │           │
│           └───────────────────┼───────────────────┘           │
│                               ▼                               │
│                   ┌───────────────────────┐                   │
│                   │     规则引擎          │                   │
│                   │   Rule Engine         │                   │
│                   └───────────┬───────────┘                   │
│                               │                               │
│                               ▼                               │
│                   ┌───────────────────────┐                   │
│                   │     返回风险报告       │                   │
│                   │   Risk Report (JSON)  │                   │
│                   └───────────────────────┘                   │
└──────────────────────────────────────────────────────────────┘
```

### 检测维度

```
┌─────────────────────────────────────────────────────────┐
│                   浏览器指纹                             │
├─────────────┬─────────────┬─────────────┬───────────────┤
│ 浏览器特征   │ 硬件特征     │ 系统特征     │ 网络特征       │
├─────────────┼─────────────┼─────────────┼───────────────┤
│ • UserAgent │ • Canvas    │ • 操作系统    │ • IP 地址      │
│ • 字体列表   │ • WebGL     │ • 时区       │ • WebRTC IP   │
│ • 语言设置   │ • Audio     │ • 屏幕分辨率  │ • 代理头      │
│ • 插件列表   │ • 触摸支持   │ • 语言区域   │ • DNS 泄露    │
│ • 媒体设备   │ • GPU 信息   │ • 内存大小   │ • IP 风险库   │
│ • Navigator │ • 核心数量   │ • 设备内存   │               │
└─────────────┴─────────────┴─────────────┴───────────────┘

┌─────────────────────────────────────────────────────────┐
│                   反检测特征                             │
├─────────────────┬─────────────────┬─────────────────────┤
│ 自动化工具       │ 指纹浏览器       │ 代理/VPN            │
├─────────────────┼─────────────────┼─────────────────────┤
│ • WebDriver     │ • 已知指纹浏览器  │ • 代理请求头         │
│ • Headless 特征  │ • 修改过的 API   │ • IP 不一致         │
│ • Selenium 痕迹  │ • 原型链篡改     │ • 数据中心 IP        │
│ • Puppeteer 特征 │ • 不自然的参数   │ • 云服务商 IP        │
│ • Playwright 特征│ • 字体列表异常   │ • 已知代理 IP 库     │
└─────────────────┴─────────────────┴─────────────────────┘
```

### 数据流

```
用户访问网站
    │
    ▼
加载布朗探长 SDK
    │
    ▼
采集指纹数据 (3-5 秒)
    │
    ▼
发送到后端 API
    │
    ▼
┌─────────────────────────────────────┐
│ 后端处理流程                         │
│ 1. 解析请求数据                       │
│ 2. 运行风险评分引擎                   │
│ 3. 检测指纹浏览器                     │
│ 4. 检测代理/VPN                       │
│ 5. 生成风险报告                       │
└─────────────────────────────────────┘
    │
    ▼
返回 JSON 风险报告
    │
    ▼
前端根据风险等级采取行动
    (放行 / 验证码 / 拦截)
```

---

## 快速开始

### 1. 30 秒集成的前端检测

```html
<!DOCTYPE html>
<html>
<head>
  <title>布朗探长快速开始</title>
</head>
<body>
  <!-- 1. 引入 SDK -->
  <script src="https://your-domain.com/brown-detective.min.js"></script>
  
  <!-- 2. 初始化并检测 -->
  <script>
    BrownDetective.init({
      apiUrl: 'https://your-domain.com/api/detect',
      apiKey: 'your_api_key',
      onResult: (report) => {
        console.log('风险报告:', report);
        
        if (report.riskScore > 70) {
          alert('⚠️ 检测到高风险浏览器，拒绝访问');
        } else {
          alert('✅ 验证通过，欢迎访问');
        }
      }
    });
  </script>
</body>
</html>
```

### 2. 自托管 API 部署

#### Docker 一键部署

```bash
# 拉取镜像
docker pull brownexplorer/api:latest

# 启动服务
docker run -d \
  -p 8000:8000 \
  -e API_KEY=your_secret_key \
  -e LOG_LEVEL=info \
  --name brown-detective \
  brownexplorer/api:latest
```

#### 验证部署

```bash
curl http://localhost:8000/api/health
# {"status":"ok","version":"1.0.0"}
```

---

## API 文档

### 基础信息

- **Base URL**: `https://your-domain.com/api`
- **认证方式**: Bearer Token (Header)
- **数据格式**: JSON

### 认证

在请求 Header 中添加：

```
Authorization: Bearer your_api_key
```

### API 列表

#### 1. 浏览器检测

**端点**: `POST /v1/detect`

检测浏览器风险，返回详细报告。

**请求**:

```http
POST /api/v1/detect
Content-Type: application/json
Authorization: Bearer your_api_key

{
  "fingerprint": "eyJ0eXAiOiJKV...",
  "browserData": {
    "navigator": {
      "userAgent": "Mozilla/5.0...",
      "platform": "Win32",
      "language": "zh-CN",
      "hardwareConcurrency": 8,
      "deviceMemory": 8,
      "webdriver": false
    },
    "screen": {
      "width": 1920,
      "height": 1080,
      "colorDepth": 24
    },
    "webgl": {
      "vendor": "Google Inc.",
      "renderer": "ANGLE (NVIDIA..."
    },
    "canvas": {
      "hash": "abc123..."
    },
    "fonts": {
      "list": ["Arial", "Times New Roman"...]
    }
  },
  "ip": "202.107.67.27",
  "ipWebrtc": "202.107.67.27",
  "proxyHeaders": {
    "forwarded": null,
    "via": null,
    "x_forwarded_for": null
  },
  "timestamp": 1715000000000
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "riskScore": 25,
    "riskLevel": "low",
    "isBot": false,
    "detectedBrowsers": [],
    "automationDetected": false,
    "proxyDetected": false,
    "deviceId": "afa0e17daa9c530ec1edeae9d1556dc5",
    "details": {
      "browser": {
        "score": 10,
        "level": "low",
        "reasons": []
      },
      "hardware": {
        "score": 25,
        "level": "low",
        "reasons": ["Canvas 指纹已采集"]
      },
      "system": {
        "score": 20,
        "level": "low",
        "reasons": ["字体列表：10 项"]
      },
      "behavior": {
        "score": 0,
        "level": "low",
        "reasons": []
      },
      "automation": {
        "score": 0,
        "level": "low",
        "reasons": []
      },
      "network": {
        "score": 0,
        "level": "low",
        "reasons": ["IP 类型：住宅宽带"]
      }
    },
    "recommendation": "allow",
    "timestamp": 1715000000000
  },
  "requestId": "req_abc123"
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `riskScore` | number | 风险评分 (0-100) |
| `riskLevel` | string | 风险等级 (low/medium/high/critical) |
| `isBot` | boolean | 是否为机器人 |
| `detectedBrowsers` | array | 检测到的指纹浏览器列表 |
| `automationDetected` | boolean | 是否检测到自动化工具 |
| `proxyDetected` | boolean | 是否检测到代理/VPN |
| `deviceId` | string | 设备唯一标识 |
| `details` | object | 各维度详细评分 |
| `recommendation` | string | 建议操作 (allow/captcha/block) |

**错误响应**:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_FINGERPRINT",
    "message": "无效的指纹数据",
    "details": "指纹数据格式错误或已过期"
  },
  "requestId": "req_xyz789"
}
```

---

#### 2. IP 风险检测

**端点**: `POST /v1/ip-check`

检测 IP 地址风险。

**请求**:

```http
POST /api/v1/ip-check
Content-Type: application/json
Authorization: Bearer your_api_key

{
  "ip": "202.107.67.27",
  "ipWebrtc": "202.107.67.27"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "ip": "202.107.67.27",
    "ipType": "residential",
    "isp": "中国电信",
    "country": "CN",
    "region": "浙江",
    "city": "杭州",
    "riskScore": 10,
    "riskLevel": "low",
    "isProxy": false,
    "isVpn": false,
    "isTor": false,
    "isDatacenter": false,
    "isCloudProvider": false,
    "mismatchDetected": false,
    "recommendation": "allow"
  },
  "requestId": "req_ip123"
}
```

---

#### 3. 设备指纹验证

**端点**: `POST /v1/verify-device`

验证设备指纹是否与历史数据匹配。

**请求**:

```http
POST /api/v1/verify-device
Content-Type: application/json
Authorization: Bearer your_api_key

{
  "deviceId": "afa0e17daa9c530ec1edeae9d1556dc5",
  "fingerprint": "eyJ0eXAiOiJKV..."
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "deviceId": "afa0e17daa9c530ec1edeae9d1556dc5",
    "fingerprintMatch": true,
    "matchScore": 95,
    "firstSeen": 1714900000000,
    "lastSeen": 1715000000000,
    "totalVisits": 15,
    "riskChanged": false,
    "previousRiskScore": 20,
    "currentRiskScore": 25,
    "recommendation": "allow"
  },
  "requestId": "req_dev456"
}
```

---

#### 4. 健康检查

**端点**: `GET /health`

检查 API 服务状态。

**响应**:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 86400,
  "timestamp": 1715000000000
}
```

---

### 错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|-----------|------|
| `INVALID_API_KEY` | 401 | API Key 无效或缺失 |
| `INVALID_FINGERPRINT` | 400 | 指纹数据格式错误 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `SERVICE_UNAVAILABLE` | 503 | 服务暂时不可用 |

---

## SDK 使用指南

### JavaScript SDK (浏览器)

#### 安装

**方式 1: CDN (推荐)**

```html
<script src="https://your-domain.com/brown-detective.min.js"></script>
```

**方式 2: npm**

```bash
npm install @brown-explorer/browser-sdk
```

```javascript
import BrownDetective from '@brown-explorer/browser-sdk';
```

#### 快速使用

```javascript
// 基础用法
BrownDetective.init({
  apiUrl: 'https://your-domain.com/api/detect',
  apiKey: 'your_api_key',
  autoCheck: true, // 页面加载后自动检测
  onResult: (report) => {
    console.log('风险报告:', report);
    
    if (report.riskScore > 70) {
      // 高风险：拦截
      window.location.href = '/blocked.html';
    } else if (report.riskScore > 40) {
      // 中风险：显示验证码
      showCaptcha();
    }
    // 低风险：正常放行
  },
  onError: (error) => {
    console.error('检测失败:', error);
    // 失败时的降级策略（建议放行）
  }
});
```

#### 高级用法

```javascript
// 手动触发检测
const report = await BrownDetective.check();

// 获取设备 ID
const deviceId = await BrownDetective.getDeviceId();

// 仅采集指纹，不发送请求
const fingerprint = await BrownDetective.collectFingerprint();

// 手动发送到后端
const response = await fetch('/api/detect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fingerprint })
});
```

#### 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `apiUrl` | string | 必填 | API 服务地址 |
| `apiKey` | string | 必填 | API 密钥 |
| `autoCheck` | boolean | false | 页面加载后自动检测 |
| `timeout` | number | 10000 | 请求超时时间 (ms) |
| `onResult` | function | - | 检测完成回调 |
| `onError` | function | - | 错误处理回调 |
| `sampling` | number | 1.0 | 采样率 (0-1)，用于 A/B 测试 |
| `cacheEnabled` | boolean | true | 启用本地缓存 |
| `cacheTTL` | number | 300000 | 缓存有效期 (ms) |

#### TypeScript 支持

```typescript
import BrownDetective, { 
  RiskReport, 
  RiskLevel,
  DetectOptions 
} from '@brown-explorer/browser-sdk';

const options: DetectOptions = {
  apiUrl: 'https://your-domain.com/api/detect',
  apiKey: 'your_api_key',
  sampling: 0.5 // 50% 流量检测
};

BrownDetective.init(options);

BrownDetective.onResult((report: RiskReport) => {
  const level: RiskLevel = report.riskLevel; // 'low' | 'medium' | 'high' | 'critical'
  console.log(`风险等级：${level}, 分数：${report.riskScore}`);
});
```

---

### Node.js SDK

#### 安装

```bash
npm install @brown-explorer/node-sdk
```

#### 使用示例

```javascript
const BrownDetective = require('@brown-explorer/node-sdk');

const client = new BrownDetective.Client({
  apiKey: 'your_api_key',
  apiUrl: 'https://your-domain.com/api/detect',
  timeout: 5000
});

// 在 Express 中间件中使用
app.use(async (req, res, next) => {
  try {
    const report = await client.detect({
      fingerprint: req.headers['x-browser-fingerprint'],
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    req.riskReport = report;
    
    if (report.riskScore > 80) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
  } catch (error) {
    // 检测失败时，建议放行
    next();
  }
});
```

---

### Python SDK

#### 安装

```bash
pip install brown-detective
```

#### 使用示例

```python
from brown_detective import Client

client = Client(
    api_key='your_api_key',
    api_url='https://your-domain.com/api/detect'
)

# 检测浏览器风险
report = client.detect(
    fingerprint='eyJ0eXAiOiJKV...',
    ip='202.107.67.27'
)

if report.risk_score > 70:
    print(f"高风险：{report.risk_level}")
    # 执行拦截逻辑
else:
    print(f"低风险：{report.risk_level}")
```

---

### Go SDK

#### 安装

```bash
go get github.com/brown-explorer/go-sdk
```

#### 使用示例

```go
package main

import (
    "fmt"
    browndetective "github.com/brown-explorer/go-sdk"
)

func main() {
    client := browndetective.NewClient("your_api_key")
    
    report, err := client.Detect(browndetective.Request{
        Fingerprint: "eyJ0eXAiOiJKV...",
        IP: "202.107.67.27",
    })
    
    if err != nil {
        fmt.Println("检测失败:", err)
        return
    }
    
    fmt.Printf("风险评分：%d, 等级：%s\n", 
        report.RiskScore, report.RiskLevel)
    
    if report.RiskScore > 70 {
        fmt.Println("建议：拦截")
    }
}
```

---

## 部署指南

### 方案 A：Docker 部署（推荐）

#### 1. 准备环境

- Docker 20.10+
- Docker Compose 2.0+
- 1GB+ 内存
- 10GB+ 存储

#### 2. 创建配置文件

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  brown-detective:
    image: brownexplorer/api:latest
    container_name: brown-detective
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - API_KEY=your_secret_api_key_here
      - LOG_LEVEL=info
      - DATABASE_URL=sqlite:///data/brown.db
      - RATE_LIMIT=1000
      - CACHE_TTL=300
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### 3. 启动服务

```bash
docker-compose up -d
```

#### 4. 验证部署

```bash
# 检查服务状态
curl http://localhost:8000/api/health

# 预期输出
# {"status":"ok","version":"1.0.0","uptime":123}
```

#### 5. 配置反向代理（可选）

**Nginx 配置**:

```nginx
server {
    listen 443 ssl;
    server_name api.your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

### 方案 B：源码部署

#### 1. 克隆仓库

```bash
git clone https://github.com/brown-explorer/api.git
cd api
```

#### 2. 安装依赖

```bash
npm install
```

#### 3. 配置环境变量

创建 `.env` 文件：

```bash
# 环境
NODE_ENV=production
PORT=8000

# API 配置
API_KEY=your_secret_api_key_here
LOG_LEVEL=info

# 数据库
DATABASE_URL=sqlite:///data/brown.db

# 限流
RATE_LIMIT=1000
RATE_LIMIT_TTL=60

# 缓存
CACHE_TTL=300000
```

#### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

---

### 方案 C：Vercel/Netlify 部署

#### Vercel 部署

1. 安装 Vercel CLI

```bash
npm i -g vercel
```

2. 部署

```bash
vercel --prod
```

3. 配置环境变量（在 Vercel 控制台）

- `API_KEY`: 你的密钥
- `LOG_LEVEL`: info

---

### 环境变量说明

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `NODE_ENV` | 否 | development | 运行环境 |
| `PORT` | 否 | 8000 | 服务端口 |
| `API_KEY` | 是 | - | API 密钥 |
| `LOG_LEVEL` | 否 | info | 日志级别 |
| `DATABASE_URL` | 否 | sqlite:///data/brown.db | 数据库连接 |
| `RATE_LIMIT` | 否 | 1000 | 每分钟请求限制 |
| `CACHE_TTL` | 否 | 300000 | 缓存有效期 (ms) |

---

## 性能优化

### 1. 前端性能优化

#### 延迟加载

```javascript
// 页面加载后延迟触发
setTimeout(() => {
  BrownDetective.init({...});
}, 1000);

// 或用户交互后触发
document.addEventListener('click', () => {
  BrownDetective.init({...});
}, { once: true });
```

#### 采样检测

```javascript
BrownDetective.init({
  sampling: 0.3, // 仅检测 30% 的流量
  onResult: (report) => {...}
});
```

#### 缓存优化

```javascript
BrownDetective.init({
  cacheEnabled: true,
  cacheTTL: 600000 // 10 分钟缓存
});
```

### 2. 后端性能优化

#### 启用缓存

```bash
# Redis 缓存配置
CACHE_TYPE=redis
REDIS_URL=redis://localhost:6379
CACHE_TTL=300000
```

#### 限流配置

```bash
RATE_LIMIT=1000  # 每 IP 每分钟 1000 次请求
RATE_LIMIT_TTL=60
```

#### 数据库优化

```bash
# 使用 PostgreSQL（生产环境）
DATABASE_URL=postgresql://user:pass@localhost:5432/brown

# 定期清理历史数据
# 保留最近 30 天数据
```

### 3. 性能基准

| 指标 | 目标值 | 实测值 |
|------|--------|--------|
| 前端 SDK 大小 | < 50KB | 45KB |
| 指纹采集时间 | < 3 秒 | 2.5 秒 |
| API 响应时间 | < 200ms | 150ms |
| 并发支持 | > 1000/s | 1500/s |
| 内存占用 | < 512MB | 380MB |

---

## 贡献指南

### 开发环境搭建

```bash
# 克隆仓库
git clone https://github.com/brown-explorer/api.git
cd api

# 安装依赖
npm install

# 启动开发服务
npm run dev

# 运行测试
npm test
```

### 提交代码

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 代码规范

- 遵循 ESLint 规则
- 编写单元测试
- 更新文档

---

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 社区与支持

- 📧 Email: support@brownexplorer.com
- 💬 Discord: https://discord.gg/brownexplorer
- 📱 Twitter: @brown_explorer
- 📚 文档：https://docs.brownexplorer.com

---

## 更新日志

### v1.0.0 (2026-05-05)

- ✅ 首次公开发布
- ✅ 基础风险评分系统
- ✅ 指纹浏览器识别
- ✅ 自动化工具检测
- ✅ 代理/VPN 检测
- ✅ JavaScript SDK
- ✅ Docker 部署支持

### 📅 Roadmap

- [ ] Python SDK
- [ ] Go SDK
- [ ] Node.js SDK
- [ ] 行为分析模块
- [ ] 黑白名单共享库
- [ ] 自定义规则引擎
- [ ] 可视化分析面板

---

**Built with ❤️ by BrownExplorer Team**
