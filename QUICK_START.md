# 🚀 快速开始指南

## 步骤 1: 安装依赖（如果还没安装）

```bash
pnpm install
```

## 步骤 2: 构建两个版本

```bash
# 构建两个版本（会生成 creep-lite.js 和 creep-full.js）
pnpm build:dev

# 或者分别构建
pnpm build:lite    # 轻量版 ~224KB
pnpm build:full    # 满血版 ~538KB
```

## 步骤 3: 启动 API 服务（新窗口）

```bash
node api-server.js
```

服务将运行在 `http://localhost:3001`

## 步骤 4: 启动 Web 服务器（新窗口）

```bash
pnpm start
```

服务将运行在 `http://localhost:8000`

## 步骤 5: 测试示例

访问以下页面查看效果：

- **轻量版示例**: http://localhost:8000/examples/lite-version.html
- **满血版示例**: http://localhost:8000/examples/full-version.html

## 集成到你的项目

### 方式 1: CDN 引入（推荐生产环境）

```html
<!-- 轻量版 -->
<script src="https://your-cdn.com/creep-lite.js"></script>

<!-- 满血版 -->
<script src="https://your-cdn.com/creep-full.js"></script>
```

### 方式 2: 本地部署

1. 将 `public/creep-lite.js` 或 `public/creep-full.js` 复制到你项目的静态资源目录
2. 在页面中引入：

```html
<script src="/static/creep-lite.js"></script>
```

### 方式 3: npm 包（TODO）

```bash
npm install creepjs-antibot
```

```javascript
import { CreepLite, CreepJS } from 'creepjs-antibot'
```

## 快速集成代码

```javascript
// 在你的网页中
const fingerprint = await window.CreepLite({
  apiEndpoint: 'https://your-api.com/api/fingerprint',
  cacheEnabled: true,
  cacheTTL: 1800000, // 30 分钟缓存
})

console.log('指纹 ID:', fingerprint.fingerprintId)
console.log('采集时间:', fingerprint.collectionTime, 'ms')
```

## 后端 API 集成

### Node.js 示例

```javascript
// 在你的后端服务中
app.post('/api/check-visitor', async (req, res) => {
  const { fingerprintId } = req.body
  
  // 发送到风险分析服务
  const analysis = await fetch('http://localhost:3001/api/fingerprint/' + fingerprintId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fingerprint }),
  }).then(r => r.json())
  
  // 根据决策采取行动
  switch (analysis.analysis.decision) {
    case 'ALLOW':
      res.json({ allowed: true })
      break
    case 'CHALLENGE':
      res.json({ allowed: false, action: 'captcha' })
      break
    case 'BLOCK':
      res.json({ allowed: false, action: 'deny' })
      break
  }
})
```

## 性能对比

| 版本 | 文件大小 | 采集时间 | 检测维度 | CPU 占用 |
|------|---------|---------|---------|---------|
| 轻量版 | ~224KB | ~200ms | 12 个 | 低 |
| 满血版 | ~538KB | ~1000ms | 50+ 个 | 中 |

## 推荐使用策略

### 新闻/博客网站

```javascript
// 只使用轻量版
const fp = await CreepLite({ apiEndpoint: '/api/fp' })
if (fp.analysis.riskScore > 60) {
  showCaptcha()
}
```

### 电商网站

```javascript
// 浏览：轻量版
// 购买：满血版
if (isCheckoutPage) {
  const fp = await CreepJS({ apiEndpoint: '/api/fp' })
  if (fp.analysis.decision !== 'ALLOW') {
    requireVerification()
  }
}
```

### 金融/支付平台

```javascript
// 所有操作都使用满血版 + 额外验证
const fp = await CreepJS({ apiEndpoint: '/api/fp' })
if (fp.analysis.riskScore > 30) {
  require2FA()
}
```

## 故障排查

### 问题：构建失败

确保使用正确的 Node.js 版本（16+）和 pnpm：

```bash
node -v  # 应该 >= 16
pnpm -v  # 应该 >= 8
```

### 问题：API 服务启动失败

检查端口是否被占用：

```bash
lsof -i :3001
# 或者更换端口
CREEP_API_PORT=3002 node api-server.js
```

### 问题：采集时间过长

- 检查浏览器是否启用了严格隐私保护（如 Tor、Brave Strict）
- 尝试关闭广告拦截器
- 在性能更好的设备上测试

## 下一步

- 📖 查看 [ANTI_BOT_GUIDE.md](./ANTI_BOT_GUIDE.md) 了解完整文档
- 🔧 根据业务需求调整风险检测规则
- 📊 添加数据可视化和统计仪表盘
- 🤖 训练机器学习模型提高检测精度
