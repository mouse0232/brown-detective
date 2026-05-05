# 布朗探长 - 反指纹浏览器检测系统

> 🕵️ 开源反指纹浏览器检测解决方案 - 轻量级、高精度、易集成

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-latest-blue.svg)](https://hub.docker.com/r/brownexplorer/api)

---

## 🌟 特性

- 🔍 **高精度检测** - 识别 10+ 种指纹浏览器和自动化工具
- 🚀 **轻量级** - SDK < 50KB，不影响页面性能
- 🛠️ **易集成** - 3 行代码接入，10 分钟部署
- 🔒 **可自托管** - 完整开源，数据完全私有
- 📦 **多语言 SDK** - JavaScript/Node.js/Python/Go
- 🌐 **双模式部署** - 前端演示页面 + 后端 API 服务

---

## 📋 目录结构

```
brown-detective/
├── public/                    # 前端演示页面（布朗探长 UI）
│   ├── interpreter.html       # 主页面
│   ├── creep-full.js         # 指纹采集库
│   ├── fp-monitor.js         # 浏览器检测
│   ├── interpreter-logic.js  # 解读器逻辑
│   └── turnstile-widget.js   # Turnstile 集成
│
├── api/                       # 后端 API 服务
│   ├── src/
│   │   ├── server.js         # API 服务器
│   │   ├── routes/           # API 路由
│   │   ├── engines/          # 检测引擎
│   │   ├── sdk/              # JavaScript/Node.js SDK
│   │   └── middleware/       # 中间件
│   ├── examples/             # SDK 示例代码
│   ├── Dockerfile            # Docker 镜像
│   └── package.json          # Node.js 依赖
│
├── docs/                      # 文档
└── README.md                  # 本文件
```

---

## 🚀 快速开始

### 方式 1：前端演示页面（无后端）

直接打开 `public/interpreter.html` 即可使用完整的布朗探长检测界面。

```bash
# 使用任意静态服务器
npx http-server public -p 8000

# 或直接用浏览器打开
open public/interpreter.html
```

### 方式 2：自托管 API 服务

#### Docker 部署（推荐）

```bash
cd api

# 构建镜像
docker build -t brownexplorer/api:latest .

# 启动服务
docker run -d \
  -p 8000:8000 \
  -e API_KEY=your_secret_key \
  --name brown-detective \
  brownexplorer/api:latest
```

#### Node.js 部署

```bash
cd api

# 安装依赖
npm install

# 启动服务
npm start

# 开发模式
npm run dev
```

### 验证部署

```bash
# 健康检查
curl http://localhost:8000/api/health

# 预期输出
# {"status":"ok","version":"1.0.0","uptime":123}
```

---

## 📦 SDK 使用

### 浏览器集成

**方式 1: CDN**

```html
<script src="https://cdn.jsdelivr.net/npm/@brown-explorer/browser-sdk"></script>
<script>
  BrownDetective.init({
    apiUrl: 'http://localhost:8000/api/v1/detect',
    apiKey: 'your_api_key',
    onResult: (report) => {
      console.log('风险报告:', report);
      
      if (report.riskScore > 70) {
        // 高风险：拦截
        window.location.href = '/blocked.html';
      } else if (report.riskScore > 40) {
        // 中风险：验证码
        showCaptcha();
      }
      // 低风险：正常放行
    }
  });
</script>
```

**方式 2: npm**

```bash
npm install @brown-explorer/browser-sdk
```

```javascript
import BrownDetective from '@brown-explorer/browser-sdk';

BrownDetective.init({
  apiUrl: 'http://localhost:8000/api/v1/detect',
  apiKey: 'your_api_key',
  autoCheck: true
});
```

### Node.js 集成

```bash
npm install @brown-explorer/node-sdk
```

```javascript
const { BrownDetectiveClient } = require('@brown-explorer/node-sdk');

const client = new BrownDetectiveClient({
  apiKey: 'your_api_key',
  apiUrl: 'http://localhost:8000'
});

// 在 Express 中间件中使用
app.use(async (req, res, next) => {
  const report = await client.detect({
    fingerprint: req.headers['x-browser-fingerprint'],
    ip: req.ip
  });
  
  req.riskReport = report;
  
  if (report.riskScore > 80) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
});
```

---

## 📚 API 文档

### 基础信息

- **Base URL**: `http://localhost:8000/api`
- **认证**: Bearer Token (Header: `Authorization: Bearer YOUR_API_KEY`)
- **格式**: JSON

### 主要端点

#### 1. 浏览器检测

```bash
POST /api/v1/detect
Content-Type: application/json
Authorization: Bearer your_api_key

{
  "fingerprint": "fp_123",
  "browserData": {
    "navigator": {
      "userAgent": "Mozilla/5.0...",
      "webdriver": false
    },
    "screen": {
      "width": 1920,
      "height": 1080
    },
    "webgl": {
      "vendor": "Google Inc.",
      "renderer": "ANGLE (NVIDIA..."
    }
  },
  "ip": "202.107.67.27"
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
    "deviceId": "afa0e17daa9c530e...",
    "details": {
      "browser": { "score": 10, "level": "low" },
      "hardware": { "score": 25, "level": "low" },
      "automation": { "score": 0, "level": "low" }
    },
    "recommendation": "allow",
    "timestamp": 1715000000000
  },
  "requestId": "req_abc123"
}
```

#### 2. IP 风险检测

```bash
POST /api/v1/ip-check

{
  "ip": "202.107.67.27",
  "ipWebrtc": "202.107.67.27"
}
```

#### 3. 设备指纹验证

```bash
POST /api/v1/verify-device

{
  "deviceId": "afa0e17daa9c530e...",
  "fingerprint": "fp_123"
}
```

#### 4. 健康检查

```bash
GET /api/health
```

---

## ⚙️ 配置

### 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `PORT` | 否 | 8000 | 服务端口 |
| `API_KEY` | 是 | - | API 密钥（支持多个，逗号分隔） |
| `NODE_ENV` | 否 | development | 运行环境 |
| `LOG_LEVEL` | 否 | info | 日志级别 |
| `DATABASE_URL` | 否 | sqlite:///data/brown.db | 数据库路径 |
| `RATE_LIMIT` | 否 | 1000 | 每分钟请求限制 |
| `CACHE_TTL` | 否 | 300 | 缓存有效期（秒） |

### 示例 `.env` 文件

```bash
NODE_ENV=production
PORT=8000
API_KEY=your_secret_key_123456
LOG_LEVEL=info
DATABASE_URL=sqlite:///data/brown.db
RATE_LIMIT=1000
CACHE_TTL=300
```

---

## 📊 风险评分说明

### 评分等级

| 分数范围 | 等级 | 建议操作 |
|---------|------|---------|
| 0-20 | 🟢 低风险 | 放行 |
| 21-50 | 🟡 中风险 | 监控 |
| 51-75 | 🟠 高风险 | 验证码 |
| 76-100 | 🔴 严重风险 | 拦截 |

### 评分维度

- **浏览器特征** (0-25 分) - UserAgent、语言、插件等
- **硬件特征** (0-30 分) - Canvas、WebGL、GPU 等
- **系统特征** (0-20 分) - 字体、时区、屏幕等
- **行为特征** (0-15 分) - 鼠标轨迹、按键节奏（预留）
- **自动化工具** (0-40 分) - WebDriver、Selenium、Puppeteer
- **网络特征** (0-30 分) - 代理、VPN、数据中心 IP

### 检测的指纹浏览器

- ✅ AdsPower
- ✅ HubStudio
- ✅ VMLogin
- ✅ BitBrowser（比特浏览器）
- ✅ Incogniton
- ✅ Multilogin
- ✅ Linken Sphere
- ✅ Ghost Browser

### 检测的自动化工具

- ✅ Selenium
- ✅ Puppeteer
- ✅ Playwright
- ✅ WebDriver
- ✅ Headless Chrome

---

## 🛠️ 开发

### 本地开发

```bash
# 前端演示页面
npx http-server public -p 3000

# 后端 API 服务（新终端）
cd api
npm run dev
```

### 运行测试

```bash
cd api
npm test
```

### 代码规范

```bash
cd api
npm run lint
```

---

## 🐳 Docker 部署

### 构建镜像

```bash
cd api
docker build -t brownexplorer/api:latest .
```

### 运行容器

```bash
docker run -d \
  -p 8000:8000 \
  -e API_KEY=your_secret_key \
  -e NODE_ENV=production \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  --name brown-detective \
  brownexplorer/api:latest
```

### 查看日志

```bash
docker logs -f brown-detective
```

### 停止服务

```bash
docker stop brown-detective
docker rm brown-detective
```

---

## 📖 更多文档

- [API 详细文档](api/README.md)
- [SDK 使用指南](docs/sdk.md)
- [部署指南](docs/deployment.md)
- [检测原理](docs/how-it-works.md)
- [贡献指南](CONTRIBUTING.md)

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

详见 [贡献指南](CONTRIBUTING.md)。

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 📞 支持

- 📧 Email: support@brownexplorer.com
- 💬 Discord: 待创建
- 📚 文档：https://docs.brownexplorer.com
- 🐛  issues: https://github.com/mouse0232/brown-detective/issues

---

## 🎯 Roadmap

### v1.0.0 (当前版本)

- ✅ 浏览器指纹采集
- ✅ 基础风险评分
- ✅ 指纹浏览器识别（8 种）
- ✅ 自动化工具检测
- ✅ 代理/VPN 检测
- ✅ JavaScript/Node.js SDK
- ✅ 自托管 API
- ✅ Docker 部署

### v2.0.0 (计划中)

- [ ] Python SDK
- [ ] Go SDK
- [ ] 黑白名单库
- [ ] 设备指纹持久化
- [ ] 可视化数据面板
- [ ] 自定义规则引擎

### v3.0.0 (商业化)

- [ ] SaaS 云平台
- [ ] 按量计费系统
- [ ] 行为分析模块
- [ ] 企业级 SLA

---

**Built with ❤️ by BrownExplorer Team**

基于 [CreepJS](https://github.com/jhjj/creepjs) 修改，遵循 MIT 许可证。
