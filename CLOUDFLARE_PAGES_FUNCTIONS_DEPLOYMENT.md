# Cloudflare Pages Functions 完整部署指南

## 架构说明（整合版）

```
┌─────────────────────────────────────┐
│  Cloudflare Pages                   │
│  https://creepjs.xxx.pages.dev      │
│                                     │
│  /examples/interpreter.html  ← 前端 │
│  /creep-full.js              ← JS   │
│                                     │
│  /functions/api/            ← API   │
│    ├── ip-info.ts                   │
│    ├── fingerprint.ts               │
│    └── health.ts                    │
└─────────────────────────────────────┘
```

**优势**：
- ✅ 一个项目搞定所有（前端 + API）
- ✅ 同域名，无 CORS 问题
- ✅ 无需配置 API 地址
- ✅ GitHub 自动部署
- ✅ 完全免费（10 万次/天）

---

## 第一步：准备 GitHub 仓库

### 1.1 创建仓库

1. 访问 https://github.com/new
2. 仓库名：`creepjs-antibot`
3. Public 或 Private 都可以
4. 点击 **"Create repository"**

### 1.2 上传代码

**方法 A：网页上传（推荐）**

1. 点击 **"uploading an existing file"**
2. 拖拽上传：
   ```
   public/
   functions/
   README.md
   ```
3. 点击 **"Commit changes"**

**方法 B：Git 推送**

```bash
cd /workspace

git init
git add .
git commit -m "Initial commit - CreepJS with Pages Functions"

git branch -M main
git remote add origin https://github.com/你的用户名/creepjs-antibot.git
git push -u origin main
```

---

## 第二步：部署到 Cloudflare Pages

### 2.1 创建 Pages 项目

1. 访问 https://pages.cloudflare.com/
2. 点击 **"Create a project"**
3. 选择 **"Connect to Git"**
4. 授权 Cloudflare 访问 GitHub（首次需要）
5. 选择仓库 `creepjs-antibot`
6. 点击 **"Begin setup"**

### 2.2 配置构建设置

```
Project name: creepjs-antibot
Production branch: main

Build Settings:
  Framework preset: None
  Build command: （留空！）
  Build output directory: public
```

**⚠️ 重要**：
- **Build command** 必须留空（因为 `public/` 已经是编译好的）
- **Build output directory** 填 `public`

### 2.3 保存并部署

1. 点击 **"Save and Deploy"**
2. 等待 2-3 分钟
3. 部署完成后显示：
   ```
   ✨ Deployment complete!
   https://creepjs-antibot.xxx.pages.dev
   ```

---

## 第三步：验证功能

### 3.1 测试 API

访问以下 URL（替换成你的域名）：

```bash
# 健康检查
https://creepjs-antibot.xxx.pages.dev/api/health

# IP 信息
https://creepjs-antibot.xxx.pages.dev/api/ip-info

# 应返回 JSON 数据
```

### 3.2 测试前端

访问：
```
https://creepjs-antibot.xxx.pages.dev/examples/interpreter.html
```

**打开控制台（F12）**，应该看到：

```
[IP] 开始采集（Cloudflare Pages Functions）
[IP] ✅ 采集成功 {ip: "xxx", country: "xx", ...}
[IP] 你的 IP: xxx.xxx.xxx.xxx
[IP] 位置：中国 上海市 上海
[IP] ISP: xxx
[IP] ASN: xxx
[IP] 重新渲染网络分类...
```

右侧显示 **"网络与 IP 信息"** 分类，包含完整地理数据。

---

## 第四步：后续自动部署

### 每次修改代码后：

```bash
# 1. 本地修改
# 2. 提交推送
git add .
git commit -m "修改了 XXX"
git push

# 3. Cloudflare 自动部署（无需手动操作）
```

### 查看部署状态

访问：https://pages.cloudflare.com/ → 你的项目 → **Deployments**

可以看到：
- ✅ 部署历史
- 📊 部署日志
- 🔄 回滚版本

---

## 目录结构说明

```
creepjs-antibot/
├── public/                     # 前端静态文件
│   ├── index.html
│   ├── examples/
│   │   └── interpreter.html    # 指纹解读器
│   ├── interpreter-data.js     # 解读配置
│   ├── interpreter-logic.js    # 解读逻辑
│   └── creep-full.js           # 指纹采集库
│
├── functions/                  # Pages Functions（API）
│   └── api/
│       ├── ip-info.ts          # GET /api/ip-info
│       ├── fingerprint.ts      # POST /api/fingerprint
│       └── health.ts           # GET /api/health
│
├── README.md                   # 项目说明
└── .gitignore
```

---

## API 端点

### 1. GET /api/ip-info

获取客户端 IP 和地理信息。

**响应示例**：
```json
{
  "success": true,
  "ip": "43.199.202.106",
  "country": "HK",
  "countryName": "中国",
  "region": "Central and Western District",
  "city": "Hong Kong",
  "isp": "Amazon.com, Inc.",
  "timezone": "Asia/Hong_Kong",
  "latitude": 22.2798,
  "longitude": 114.163,
  "asn": "AS16509",
  "continent": "AS",
  "edgeColo": "HKG"
}
```

### 2. POST /api/fingerprint

指纹风险分析。

**请求**：
```json
{
  "fingerprint": {
    "navigator": { "webdriver": false },
    "headless": { "headless": false },
    "canvas": { "dataURL": "..." }
  }
}
```

**响应**：
```json
{
  "success": true,
  "fingerprintId": "abc123...",
  "decision": "ALLOW",
  "riskScore": 10,
  "level": "low",
  "clientIP": "43.199.202.106",
  "geo": {
    "country": "HK",
    "city": "Hong Kong",
    "isp": "Amazon.com, Inc."
  }
}
```

### 3. GET /api/health

健康检查。

**响应**：
```json
{
  "status": "ok",
  "service": "CreepJS Anti-Bot API",
  "timestamp": 1777520201599
}
```

---

## 前端集成示例

### 获取 IP 信息

```javascript
const res = await fetch('/api/ip-info');
const data = await res.json();
console.log('我的 IP:', data.ip);
console.log('位置:', data.country, data.city);
```

### 发送指纹分析

```javascript
const response = await fetch('/api/fingerprint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fingerprint: creepData
  })
});

const result = await response.json();
console.log('风险评分:', result.riskScore);
console.log('决策:', result.decision);
```

---

## 常见问题

### Q1: 部署后访问 API 返回 404

**检查**：
- `functions/` 目录是否在仓库根目录
- 文件命名是否正确（`ip-info.ts` 不是 `ip-info.js`）
- 等待 1-2 分钟（Functions 部署稍慢）

### Q2: IP 显示 "unknown"

**原因**：请求可能没经过 Cloudflare

**解决**：
- 确保访问的是 `pages.dev` 域名
- 如果用自定义域名，确保开启 Cloudflare 代理（橙色云朵）

### Q3: 前端调用 API 报 CORS 错误

**不应该发生**：Pages Functions 和前端是同域名

**检查**：
- 是否使用了完整的 URL（应该用相对路径 `/api/ip-info`）
- 是否在本地测试（本地会有 CORS，部署后正常）

### Q4: 部署一直卡在 "Building"

**解决**：
- 检查 Build command 是否留空
- 检查 Build output directory 是否为 `public`
- 查看部署日志具体错误

---

## 费用说明

### Cloudflare Pages（免费）

| 资源 | 免费额度 |
|------|----------|
| 网站流量 | 无限 |
| 带宽 | 100GB/月 |
| 构建次数 | 500 次/月 |
| Functions 请求 | 包含在 Workers 额度 |

### Cloudflare Workers（免费）

| 资源 | 免费额度 |
|------|----------|
| 请求数 | 100,000 次/天 |
| CPU 时间 | 10ms/次 |
| KV 存储 | 1000 次读/天 |

**个人项目完全免费！**

---

## 高级功能（可选）

### 1. 绑定自定义域名

1. Pages 控制台 → Settings → Custom domains
2. Add domain → `finger.yourdomain.com`
3. 按提示添加 CNAME 记录

### 2. 添加 KV 存储

```bash
# 创建 KV
wrangler kv:namespace create FINGERPRINT_DB

# 添加到 Pages 项目（控制台）
Settings → Functions → KV namespace bindings
```

### 3. 环境变量

1. Pages 控制台 → Settings → Environment variables
2. Add variable → 输入 key 和 value

---

## 对比传统方案

| 特性 | 传统方案 | Pages Functions |
|------|----------|-----------------|
| 前端托管 | 服务器/Nginx | Pages（自动 CDN） |
| API 服务 | Express/Koa | Pages Functions |
| CORS 配置 | 手动处理 | 无（同域名） |
| HTTPS | 自己配置证书 | 自动免费 |
| CI/CD | 自己搭建 | GitHub 自动部署 |
| DDoS 防护 | 额外服务 | 自带 |
| 成本 | $5-20/月 | 免费 |

---

## 总结

**部署流程**：
1. 创建 GitHub 仓库（2 分钟）
2. 上传代码（3 分钟）
3. 连接 Pages 部署（5 分钟）
4. 测试验证（2 分钟）

**总耗时**：10-15 分钟

**优势**：
- ✅ 零 CLI 操作
- ✅ 完整整合（前端 + API）
- ✅ GitHub 自动部署
- ✅ 无 CORS 问题
- ✅ 完全免费

开始部署吧！🚀
