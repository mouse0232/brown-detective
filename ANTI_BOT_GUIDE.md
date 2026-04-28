# CreepJS - 反爬虫指纹识别方案

> 基于 CreepJS 改造的双版本浏览器指纹采集系统，专为反爬虫场景设计

## 🎯 特性

### 双版本支持

| 版本 | 检测维度 | 采集时间 | 文件大小 | 适用场景 |
|------|---------|---------|---------|---------|
| **轻量版** | 12 个核心维度 | ~200ms | ~100KB | 普通页面访问、快速筛查 |
| **满血版** | 50+ 维度 | ~1000ms | ~550KB | 登录、支付、敏感操作 |

### 核心功能

- ✅ **浏览器指纹采集** - Canvas、WebGL、字体、Audio、CSS 等 50+ 维度
- ✅ **自动化工具检测** - Puppeteer、Selenium、Playwright 识别
- ✅ **无头浏览器检测** - Headless Chrome/Firefox 识别
- ✅ **反指纹浏览器检测** - Tor、Brave、指纹篡改识别
- ✅ **智能缓存机制** - localStorage 缓存，避免重复采集
- ✅ **API 自动上报** - 采集完成自动发送到后端
- ✅ **风险分析引擎** - 基于规则的风险评分和决策

## 📦 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 构建

```bash
# 构建两个版本
pnpm build:dev

# 只构建轻量版
pnpm build:lite

# 只构建满血版
pnpm build:full
```

### 3. 启动 API 服务

```bash
node api-server.js
```

### 4. 启动开发服务器

```bash
pnpm start
```

访问 `http://localhost:8000/examples/lite-version.html` 或 `http://localhost:8000/examples/full-version.html`

## 🔌 集成方式

### 前端集成

```html
<!-- 轻量版 -->
<script src="/docs/creep-lite.js"></script>
<script>
  const fingerprint = await window.CreepLite({
    apiEndpoint: 'https://your-api.com/api/fingerprint',
    cacheEnabled: true,
    cacheTTL: 1800000, // 30 分钟
  })
</script>

<!-- 满血版 -->
<script src="/docs/creep-full.js"></script>
<script>
  const fingerprint = await window.CreepJS({
    apiEndpoint: 'https://your-api.com/api/fingerprint',
    cacheEnabled: true,
    cacheTTL: 3600000, // 1 小时
  })
</script>
```

### 组合使用策略

```javascript
// 首次访问：轻量版
const lite = await window.CreepLite({
  apiEndpoint: '/api/fingerprint',
  cacheEnabled: true,
})

if (lite.analysis.decision === 'BLOCK') {
  // 直接拦截
  blockAccess()
} else if (lite.analysis.decision === 'CHALLENGE') {
  // 需要进一步验证：调用满血版
  const full = await window.CreepJS({
    apiEndpoint: '/api/fingerprint',
  })
  
  if (full.analysis.decision === 'BLOCK') {
    blockAccess()
  } else {
    showCaptcha() // 显示验证码
  }
} else {
  // 放行
  allowAccess()
}
```

## 🚀 后端 API

### 启动服务

```bash
node api-server.js
# 或指定端口
CREEP_API_PORT=3001 node api-server.js
```

### API 端点

#### POST /api/fingerprint
接收指纹数据并返回风险分析

```javascript
const response = await fetch('/api/fingerprint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fingerprint }),
})

const result = await response.json()
// {
//   success: true,
//   fingerprintId: "abc123...",
//   analysis: {
//     riskScore: 25,
//     level: "low",
//     decision: "ALLOW",
//     risks: []
//   }
// }
```

#### GET /api/fingerprint/:id
查询指纹历史记录

#### POST /api/fingerprint/:id/blacklist
加入黑名单

#### POST /api/fingerprint/:id/whitelist
加入白名单

#### GET /api/stats
获取统计数据

## 📊 风险检测规则

### 高风险因素（+40-50 分）

- 无头浏览器特征
- 自动化工具（WebDriver、Selenium、Puppeteer）
- 黑名单指纹

### 中风险因素（+15-35 分）

- 指纹谎言检测 > 5 个
- 控制台错误包含自动化关键词
- 指纹特征矛盾
- 高频请求

### 低风险因素（+5-10 分）

- 首次访问
- 采集速度异常快

### 决策规则

| 风险评分 | 等级 | 决策 | 建议操作 |
|---------|------|------|---------|
| 70-100 | critical | BLOCK | 直接拦截 |
| 50-69 | high | CHALLENGE | 验证码/二次验证 |
| 30-49 | medium | MONITOR | 放行但记录日志 |
| 10-29 | low | ALLOW | 正常放行 |
| 0-9 | minimal | ALLOW | 信任用户 |

## 🛠️ 配置选项

### 前端配置

```javascript
await window.CreepLite({
  apiEndpoint: 'string | null',     // API 地址，null 则不自动发送
  cacheEnabled: true,                // 启用缓存
  cacheTTL: 1800000,                 // 缓存时间（毫秒）
  sendToAPI: false,                  // 是否发送到 API（已过时，用 apiEndpoint 控制）
})
```

### 后端配置

环境变量：

- `CREEP_API_PORT` - API 服务端口（默认：3001）

## 📁 项目结构

```
creepjs/
├── src/
│   ├── creep.ts           # 满血版主入口
│   ├── creep-lite.ts      # 轻量版主入口
│   └── ...modules         # 检测模块
├── public/
│   ├── creep-full.js      # 满血版构建
│   └── creep-lite.js      # 轻量版构建
├── docs/
│   ├── creep-full.js
│   └── creep-lite.js
├── examples/
│   ├── lite-version.html  # 轻量版示例
│   └── full-version.html  # 满血版示例
├── api-server.js          # API 服务
└── server.js              # 静态文件服务
```

## 🔒 隐私与安全

### 数据存储

- 指纹数据存储在 `/fingerprints.json`（开发环境）
- 生产环境请改用数据库（PostgreSQL、MongoDB 等）
- 建议定期清理过期数据

### 合规建议

1. **用户告知** - 在隐私政策中说明指纹采集
2. **数据最小化** - 只采集必要的特征
3. **限期存储** - 定期删除过期指纹
4. **用户权利** - 提供数据删除接口

## 🎨 使用场景

### 场景 1: 普通内容网站

```javascript
// 只使用轻量版，快速筛查
const fp = await CreepLite({ apiEndpoint: '/api/fp' })
if (fp.analysis.riskScore > 50) {
  showCaptcha()
}
```

### 场景 2: 电商网站

```javascript
// 浏览商品：轻量版
// 加入购物车：轻量版 + 风险检查
// 结算支付：满血版 + 严格验证
```

### 场景 3: 金融/支付平台

```javascript
// 所有操作都使用满血版
// 登录、转账等关键操作增加额外验证
const fp = await CreepJS({ apiEndpoint: '/api/fp' })
if (fp.analysis.decision !== 'ALLOW') {
  require2FA()
}
```

## 📝 待办事项

- [ ] 添加更多风险检测规则（设备指纹、行为分析）
- [ ] 支持 Redis 存储
- [ ] 添加指纹聚类分析
- [ ] 可视化风险仪表盘
- [ ] 机器学习模型训练

## 📄 许可证

MIT License（基于原 CreepJS 项目）

## ⚠️ 重要提示

本工具仅供**反爬虫研究和防御用途**，请合法使用：

- 不要用于跟踪用户隐私
- 遵守当地法律法规
- 在隐私政策中明确告知用户
- 不要用于商业指纹销售
