# CreepJS Serverless 部署指南

> 将 CreepJS 反爬虫系统部署到无服务器架构，实现零运维、自动扩展、按需付费

---

## 📋 目录

1. [概述](#概述)
2. [架构对比](#架构对比)
3. [方案选择](#方案选择)
4. [Vercel 部署](#vercel-部署)
5. [Cloudflare Workers 部署](#cloudflare-workers-部署)
6. [AWS Lambda 部署](#aws-lambda-部署)
7. [Supabase Edge Functions 部署](#supabase-edge-functions-部署)
8. [数据库方案](#数据库方案)
9. [成本分析](#成本分析)
10. [迁移指南](#迁移指南)

---

## 概述

### 什么是 Serverless？

Serverless（无服务器）是一种云计算执行模型：
- ✅ **无需管理服务器** - 云厂商自动处理基础设施
- ✅ **自动扩展** - 根据流量自动调整资源
- ✅ **按需付费** - 只为实际使用的资源付费
- ✅ **高可用** - 内置容错和备份机制

### CreepJS Serverless 架构

```
用户浏览器
    ↓
CDN (静态资源)
    ├── creep-lite.js
    ├── creep.js
    └── index.html
    ↓
Serverless Function (API)
    ↓
Serverless Database (存储)
```

### 优势 vs 传统部署

| 维度 | 传统服务器 | Serverless |
|------|-----------|-----------|
| **运维成本** | 高（需要运维团队） | 低（零运维） |
| **扩展性** | 手动扩容 | 自动扩展 |
| **成本** | 固定成本（$5-50/月） | 按量付费（$0.5-20/月） |
| **启动时间** | 分钟级 | 秒级 |
| **适合场景** | 稳定流量 | 波动流量 ⭐ |

---

## 架构对比

### 传统架构

```
┌─────────────────┐
│   EC2 / VPS     │
│  - Node.js      │
│  - Express      │
│  - fs (JSON)    │
└─────────────────┘
       │
       ▼
   本地文件存储
   fingerprints.json
```

**问题**:
- ❌ 单点故障
- ❌ 手动扩容
- ❌ 文件锁竞争
- ❌ 备份麻烦

---

### Serverless 架构

```
┌─────────────────┐
│     CDN         │  静态资源
│  (边缘节点)     │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Serverless     │  API 逻辑
│  Function       │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ Serverless DB   │  数据存储
│ (Redis/SQL/NoSQL)│
└─────────────────┘
```

**优势**:
- ✅ 全球分布
- ✅ 自动扩展
- ✅ 高可用
- ✅ 按量付费

---

## 方案选择

### 快速决策树

```
需要数据库吗？
├─ 是 → 需要关系型数据库吗？
│      ├─ 是 → Supabase Edge Functions ⭐
│      └─ 否 → Cloudflare Workers + KV
│
└─ 否 → 流量大吗？
       ├─ 是 → Cloudflare Workers (最便宜)
       └─ 否 → Vercel (最简单)
```

---

### 方案对比表

| 方案 | 难度 | 成本 | 性能 | 适合场景 |
|------|------|------|------|---------|
| **Vercel** | ⭐ | $$ | ⭐⭐⭐ | 快速上线、小规模 |
| **Cloudflare** | ⭐⭐ | $ | ⭐⭐⭐⭐ | 大规模、全球分布 ⭐ |
| **AWS Lambda** | ⭐⭐⭐ | $$ | ⭐⭐⭐⭐ | 企业级、已有 AWS |
| **Supabase** | ⭐ | $$ | ⭐⭐⭐ | 需要数据库、快速开发 ⭐ |

---

## Vercel 部署

### 特点

- ✅ **最简单** - 一键部署
- ✅ **自动 HTTPS** - 无需配置证书
- ✅ **全球 CDN** - 100+ 节点
- ✅ **内置分析** - 免费流量统计
- ⚠️ **免费额度** - 10 万次请求/月

---

### 步骤 1: 项目准备

```bash
# 创建项目目录
mkdir antibot-vercel
cd antibot-vercel

# 复制前端文件
cp /workspace/docs/creep-lite.js ./
cp /workspace/docs/creep.js ./
cp /workspace/docs/index.html ./
cp /workspace/docs/style.min.css ./

# 创建 API 目录
mkdir -p api
```

---

### 步骤 2: 创建 API 函数

```javascript
// api/fingerprint.js
const crypto = require('crypto')

// Vercel KV（需要 Pro 计划）
// 或使用 Upstash Redis（免费）
let kv = null
try {
  const { kv } = require('@vercel/kv')
} catch (e) {
  // KV 不可用时使用内存存储（仅用于测试）
  console.log('KV not available, using memory storage')
}

const memoryStore = new Map()

export const config = {
  api: {
    bodyParser: true,
  },
}

export default async function handler(req, res) {
  // CORS 配置
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { fingerprint } = req.body

    // 生成指纹 ID
    const fingerprintId = crypto
      .createHash('sha256')
      .update(JSON.stringify(fingerprint))
      .digest('hex')

    // 存储指纹
    const record = {
      timestamp: Date.now(),
      fingerprint: {
        navigator: fingerprint.navigator,
        screen: fingerprint.screen,
        timezone: fingerprint.timezone,
      },
      riskHistory: [],
    }

    if (kv) {
      // 使用 Vercel KV
      await kv.set(`fp:${fingerprintId}`, JSON.stringify(record))
      await kv.expire(`fp:${fingerprintId}`, 2592000) // 30 天
    } else {
      // 内存存储（仅测试用）
      memoryStore.set(`fp:${fingerprintId}`, record)
    }

    // 风险分析
    const analysis = analyzeRisk(fingerprint, fingerprintId)

    // 记录风险历史
    if (kv) {
      const history = await kv.get(`fp:${fingerprintId}`)
      if (history) {
        history.riskHistory = history.riskHistory || []
        history.riskHistory.push({
          timestamp: Date.now(),
          ...analysis,
        })
        history.riskHistory = history.riskHistory.slice(-10) // 保留最近 10 条
        await kv.set(`fp:${fingerprintId}`, JSON.stringify(history))
      }
    }

    res.status(200).json({
      success: true,
      fingerprintId,
      analysis,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

function analyzeRisk(fp, fingerprintId) {
  const risks = []
  let riskScore = 0

  // 1. 无头浏览器检测
  if (fp.headless?.riskLevel === 'high' || fp.headless?.headless === true) {
    risks.push({
      type: 'HEADLESS_BROWSER',
      level: 'high',
      score: 40,
      message: '检测到无头浏览器特征',
    })
    riskScore += 40
  }

  // 2. 自动化工具检测
  if (fp.navigator?.webdriver === true) {
    risks.push({
      type: 'AUTOMATION_TOOL',
      level: 'high',
      score: 50,
      message: '检测到 WebDriver 特征',
    })
    riskScore += 50
  }

  // 3. 指纹谎言检测
  if (fp.lies?.liesDetected?.length > 5) {
    risks.push({
      type: 'FINGERPRINT_LIES',
      level: 'high',
      score: 35,
      message: `检测到 ${fp.lies.liesDetected.length} 个指纹谎言`,
    })
    riskScore += 35
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

---

### 步骤 3: 创建配置文件

```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "api/*.js",
      "use": "@vercel/node"
    },
    {
      "src": "*.{html,js,css}",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "KV_URL": "@kv-url"
  }
}
```

---

### 步骤 4: 安装依赖

```bash
# 创建 package.json
cat > package.json << 'EOF'
{
  "name": "antibot-vercel",
  "version": "1.0.0",
  "dependencies": {
    "@vercel/kv": "^1.0.0"
  }
}
EOF
```

---

### 步骤 5: 部署

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 开发环境测试
vercel dev

# 生产环境部署
vercel --prod
```

**部署成功输出**:
```
🔍  Inspect: https://vercel.com/your-project/xxx
✅  Production: https://your-project.vercel.app
```

---

### 步骤 6: 配置 Redis（可选）

Vercel KV 需要 Pro 计划（$20/月），可以使用 **Upstash Redis**（免费）：

```bash
# 创建 Upstash Redis
# 访问 https://upstash.com 创建免费实例

# 设置环境变量
vercel env add KV_URL
vercel env add KV_REST_API_TOKEN
```

---

### 测试

```bash
# 访问你的应用
curl https://your-project.vercel.app/api/health

# 测试指纹提交
curl -X POST https://your-project.vercel.app/api/fingerprint \
  -H "Content-Type: application/json" \
  -d '{"fingerprint": {...}}'
```

---

## Cloudflare Workers 部署

### 特点

- ✅ **最便宜** - $0.5/百万次请求
- ✅ **最快** - 边缘计算，全球 275+ 节点
- ✅ **免费额度大** - 10 万次请求/天
- ⚠️ **配置稍复杂** - 需要配置 Wrangler

---

### 步骤 1: 项目初始化

```bash
# 创建项目
mkdir antibot-workers
cd antibot-workers

# 初始化 wrangler
npm init -y
npm install -g wrangler
wrangler login
```

---

### 步骤 2: 创建 Worker

```javascript
// src/index.js
import { hash } from 'crypto-hash'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    // CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // 健康检查
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        success: true,
        status: 'ok',
        timestamp: Date.now()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 指纹分析
    if (url.pathname === '/api/fingerprint' && request.method === 'POST') {
      try {
        const { fingerprint } = await request.json()
        
        // 生成指纹 ID
        const fingerprintId = await hash(
          JSON.stringify(fingerprint),
          { algorithm: 'SHA-256' }
        )

        // 存储到 KV
        const record = {
          timestamp: Date.now(),
          fingerprint: {
            navigator: fingerprint.navigator,
            screen: fingerprint.screen,
            timezone: fingerprint.timezone,
          },
        }

        if (env.FINGERPRINTS) {
          await env.FINGERPRINTS.put(
            `fp:${fingerprintId}`,
            JSON.stringify(record),
            { expirationTtl: 2592000 } // 30 天
          )
        }

        // 风险分析
        const analysis = analyzeRisk(fingerprint)

        return new Response(JSON.stringify({
          success: true,
          fingerprintId,
          analysis,
          timestamp: Date.now()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        })
      }
    }

    // 静态文件服务
    if (request.method === 'GET') {
      const path = url.pathname
      let filePath = path === '/' ? '/index.html' : path

      try {
        const asset = await env.ASSETS.fetch(new Request(`.${filePath}`))
        if (asset.ok) {
          return asset
        }
      } catch (e) {
        // 文件不存在
      }

      return new Response('Not found', { status: 404 })
    }

    return new Response('Not found', { status: 404 })
  },
}

function analyzeRisk(fp) {
  const risks = []
  let riskScore = 0

  if (fp.headless?.riskLevel === 'high') {
    riskScore += 40
    risks.push({ type: 'HEADLESS', level: 'high' })
  }

  if (fp.navigator?.webdriver) {
    riskScore += 50
    risks.push({ type: 'AUTOMATION', level: 'high' })
  }

  if (fp.lies?.liesDetected?.length > 5) {
    riskScore += 35
    risks.push({ type: 'LIES', level: 'high' })
  }

  const level = riskScore >= 70 ? 'critical' :
                riskScore >= 50 ? 'high' :
                riskScore >= 30 ? 'medium' :
                riskScore >= 10 ? 'low' : 'minimal'

  const decision = riskScore >= 70 ? 'BLOCK' :
                   riskScore >= 50 ? 'CHALLENGE' : 'ALLOW'

  return { riskScore, level, decision, risks }
}
```

---

### 步骤 3: 配置_wrangler.toml_

```toml
name = "antibot-api"
main = "src/index.js"
compatibility_date = "2024-01-01"

# 静态资源
[site]
bucket = "./public"

# KV 命名空间
[[kv_namespaces]]
binding = "FINGERPRINTS"
id = "your-kv-namespace-id"

# 生产环境
[env.production]
route = "api.your-domain.com/*"
```

---

### 步骤 4: 创建 KV 命名空间

```bash
# 创建 KV
wrangler kv:namespace create FINGERPRINTS

# 输出类似:
# ✨ Success! Created namespace "antibot-api-FINGERPRINTS" with id "xxx"
# 将 id 复制到 wrangler.toml
```

---

### 步骤 5: 复制静态文件

```bash
mkdir -p public
cp /workspace/docs/creep-lite.js ./public/
cp /workspace/docs/creep.js ./public/
cp /workspace/docs/index.html ./public/
cp /workspace/docs/style.min.css ./public/
```

---

### 步骤 6: 部署

```bash
# 开发环境测试
wrangler dev

# 生产环境部署
wrangler deploy
```

**部署成功输出**:
```
Total Upload: 550.45 KB / gzip: 150.23 KB
Deployed: https://antibot-api.your-subdomain.workers.dev
```

---

### 成本计算

**免费额度**:
- 10 万次请求/天
- 10ms CPU 时间/请求
- 1GB 存储

**付费价格**:
- $0.5 / 百万次请求
- $5 / GB 存储/月

**示例**: 每天 100 万次请求
- 请求费用：(100 万 × 30 天 - 300 万免费) × $0.5/百万 = $1.5/月
- 存储费用：约 $2/月
- **总计**: ~$3.5/月

---

## AWS Lambda 部署

### 特点

- ✅ **企业级** - 适合大型项目
- ✅ **生态完善** - 与 AWS 服务深度集成
- ✅ **性能强** - 支持长时间运行
- ⚠️ **配置复杂** - 需要 AWS 知识

---

### 步骤 1: 项目结构

```
antibot-lambda/
├── lambda/
│   └── fingerprint/
│       ├── index.js
│       └── package.json
├── public/
│   ├── creep-lite.js
│   └── index.html
├── serverless.yml
└── package.json
```

---

### 步骤 2: Lambda 函数

```javascript
// lambda/fingerprint/index.js
const crypto = require('crypto')
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb')

const client = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(client)
const TABLE_NAME = process.env.TABLE_NAME || 'fingerprints'

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const { fingerprint } = JSON.parse(event.body)

    // 生成指纹 ID
    const fingerprintId = crypto
      .createHash('sha256')
      .update(JSON.stringify(fingerprint))
      .digest('hex')

    // 存储到 DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          fingerprintId,
          timestamp: Date.now(),
          fingerprint: {
            navigator: fingerprint.navigator,
            screen: fingerprint.screen,
            timezone: fingerprint.timezone,
          },
          ttl: Math.floor(Date.now() / 1000) + 2592000, // 30 天后过期
        },
      })
    )

    // 风险分析
    const analysis = analyzeRisk(fingerprint, fingerprintId)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        fingerprintId,
        analysis,
        timestamp: Date.now(),
      }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    }
  }
}

function analyzeRisk(fp, fingerprintId) {
  const risks = []
  let riskScore = 0

  if (fp.headless?.riskLevel === 'high') {
    riskScore += 40
    risks.push({ type: 'HEADLESS', level: 'high' })
  }

  if (fp.navigator?.webdriver) {
    riskScore += 50
    risks.push({ type: 'AUTOMATION', level: 'high' })
  }

  if (fp.lies?.liesDetected?.length > 5) {
    riskScore += 35
    risks.push({ type: 'LIES', level: 'high' })
  }

  const level = riskScore >= 70 ? 'critical' :
                riskScore >= 50 ? 'high' :
                riskScore >= 30 ? 'medium' :
                riskScore >= 10 ? 'low' : 'minimal'

  const decision = riskScore >= 70 ? 'BLOCK' :
                   riskScore >= 50 ? 'CHALLENGE' : 'ALLOW'

  return { riskScore, level, decision, risks }
}
```

---

### 步骤 3: Serverless Framework 配置

```yaml
# serverless.yml
service: antibot-api

provider:
  name: aws
  runtime: nodejs18.x
  region: ap-northeast-1
  memorySize: 256
  timeout: 10
  environment:
    TABLE_NAME: ${self:service}-fingerprints-${sls:stage}
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:PutItem
            - dynamodb:GetItem
            - dynamodb:Query
          Resource:
            - !GetAtt FingerprintsTable.Arn
  cors:
    origin: '*'
    methods:
      - POST
      - GET
      - OPTIONS

resources:
  Resources:
    FingerprintsTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:service}-fingerprints-${sls:stage}
        AttributeDefinitions:
          - AttributeName: fingerprintId
            AttributeType: S
          - AttributeName: ttl
            AttributeType: N
        KeySchema:
          - AttributeName: fingerprintId
            KeyType: HASH
        GlobalSecondaryIndexes:
          - IndexName: ttl-index
            KeySchema:
              - AttributeName: ttl
                KeyType: RANGE
            Projection:
              ProjectionType: ALL
        TimeToLiveSpecification:
          AttributeName: ttl
          Enabled: true
        BillingMode: PAY_PER_REQUEST
        Tags:
          - Key: Environment
            Value: ${sls:stage}

functions:
  fingerprint:
    handler: lambda/fingerprint/index.handler
    events:
      - http:
          path: api/fingerprint
          method: post
          cors: true
      - http:
          path: api/health
          method: get
          cors: true

plugins:
  - serverless-offline

custom:
  serverless-offline:
    httpPort: 3001
```

---

### 步骤 4: 部署

```bash
# 安装依赖
npm install -g serverless
npm install

# AWS 配置
aws configure

# 本地测试
serverless offline

# 部署到 AWS
serverless deploy
```

**部署成功输出**:
```
Service Information
service: antibot-api
stage: dev
region: ap-northeast-1
stack: antibot-api-dev
resources: 15
api keys:
  None
endpoints:
  POST - https://xxx.execute-api.ap-northeast-1.amazonaws.com/dev/api/fingerprint
  GET - https://xxx.execute-api.ap-northeast-1.amazonaws.com/dev/api/health
```

---

### 成本计算

**免费额度**:
- 100 万次请求/月
- 320 万 GB-秒计算时间/月

**付费价格**:
- $0.2 / 百万次请求
- $0.0000166667 / GB-秒
- DynamoDB: $1.25 / GB-月

**示例**: 每天 100 万次请求
- Lambda 费用：(3000 万 - 100 万免费) × $0.2/百万 = $5.8/月
- DynamoDB 费用：约 $3/月
- **总计**: ~$8.8/月

---

## Supabase Edge Functions 部署

### 特点

- ✅ **内置数据库** - 无需额外配置
- ✅ **开发简单** - 基于 Deno
- ✅ **免费额度大** - 500MB 数据库 + 5GB 带宽
- ⭐ **最推荐** - 性价比最高

---

### 步骤 1: 创建 Supabase 项目

```bash
# 访问 https://supabase.com 创建项目
# 记录 SUPABASE_URL 和 SUPABASE_ANON_KEY
```

---

### 步骤 2: 创建数据库表

```sql
-- 在 Supabase SQL Editor 中执行

CREATE TABLE fingerprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fingerprint_id TEXT UNIQUE NOT NULL,
  fingerprint JSONB NOT NULL,
  risk_score INTEGER DEFAULT 0,
  risk_level TEXT,
  decision TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_fingerprint_id ON fingerprints(fingerprint_id);
CREATE INDEX idx_created_at ON fingerprints(created_at);

-- 设置 RLS（行级安全）
ALTER TABLE fingerprints ENABLE ROW LEVEL SECURITY;

-- 允许匿名插入（API 调用）
CREATE POLICY "Allow insert" ON fingerprints
  FOR INSERT
  WITH CHECK (true);

-- 允许匿名查询
CREATE POLICY "Allow select" ON fingerprints
  FOR SELECT
  USING (true);
```

---

### 步骤 3: 创建 Edge Function

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 链接项目
supabase link --project-ref your-project-ref
```

---

### 步骤 4: 编写函数

```typescript
// supabase/functions/fingerprint/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )

  // CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { fingerprint } = await req.json()

    // 生成指纹 ID
    const encoder = new TextEncoder()
    const data = encoder.encode(JSON.stringify(fingerprint))
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const fingerprintId = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    // 风险分析
    const analysis = analyzeRisk(fingerprint)

    // 存储到数据库
    const { error } = await supabase.from('fingerprints').insert({
      fingerprint_id: fingerprintId,
      fingerprint: {
        navigator: fingerprint.navigator,
        screen: fingerprint.screen,
        timezone: fingerprint.timezone,
      },
      risk_score: analysis.riskScore,
      risk_level: analysis.level,
      decision: analysis.decision,
    })

    if (error) throw error

    return new Response(
      JSON.stringify({
        success: true,
        fingerprintId,
        analysis,
        timestamp: Date.now(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

function analyzeRisk(fp: any) {
  let riskScore = 0
  const risks = []

  if (fp.headless?.riskLevel === 'high') {
    riskScore += 40
    risks.push({ type: 'HEADLESS', level: 'high' })
  }

  if (fp.navigator?.webdriver) {
    riskScore += 50
    risks.push({ type: 'AUTOMATION', level: 'high' })
  }

  if (fp.lies?.liesDetected?.length > 5) {
    riskScore += 35
    risks.push({ type: 'LIES', level: 'high' })
  }

  const level = riskScore >= 70 ? 'critical' :
                riskScore >= 50 ? 'high' :
                riskScore >= 30 ? 'medium' :
                riskScore >= 10 ? 'low' : 'minimal'

  const decision = riskScore >= 70 ? 'BLOCK' :
                   riskScore >= 50 ? 'CHALLENGE' : 'ALLOW'

  return { riskScore, level, decision, risks }
}
```

---

### 步骤 5: 部署

```bash
# 部署函数
supabase functions deploy fingerprint

# 输出:
# Deploying fingerprint (https://xxx.supabase.co/functions/v1/fingerprint)
```

---

### 步骤 6: 前端集成

```html
<script src="https://xxx.supabase.co/functions/v1/fingerprint" defer></script>
<script>
  window.CreepLite({
    apiEndpoint: 'https://xxx.supabase.co/functions/v1/fingerprint',
    cacheEnabled: true,
  }).then(fp => {
    console.log('指纹分析完成:', fp.analysis)
  })
</script>
```

---

### 成本计算

**免费额度**:
- 500MB 数据库
- 5GB 带宽/月
- 5 万 Edge Function 调用/月

**付费计划**: $25/月（Pro 计划）
- 8GB 数据库
- 250GB 带宽
- 50 万 Edge Function 调用

**示例**: 每天 10 万次调用
- 每月 300 万次调用
- 免费额度：5 万
- 超出：295 万次
- Pro 计划：$25/月（包含 50 万）
- 额外费用：(295 万 - 50 万) / 100 万 × $10 = $24.5
- **总计**: ~$50/月

---

## 数据库方案

### 选择对比

| 方案 | 免费额度 | 成本 | 性能 | 适合场景 |
|------|---------|------|------|---------|
| **Vercel KV** | 1 万/月 | $20/月 (Pro) | ⭐⭐⭐ | 快速开发 |
| **Upstash Redis** | 1 万/天 | $1/GB | ⭐⭐⭐⭐ | Serverless ⭐ |
| **Cloudflare KV** | 10 万/天 | $5/GB | ⭐⭐⭐ | Workers 配套 |
| **DynamoDB** | 25GB 存储 | $1.25/GB | ⭐⭐⭐⭐ | AWS 生态 |
| **Supabase** | 500MB | $25/月 | ⭐⭐⭐ | 快速开发 ⭐ |
| **PlanetScale** | 5GB | $29/月 | ⭐⭐⭐⭐ | MySQL 兼容 |

---

### Upstash Redis 配置

```bash
# 创建账户 https://upstash.com
# 创建 Redis 实例
# 获取连接信息
```

```javascript
// api/fingerprint.js
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  const { fingerprint } = req.body
  const fingerprintId = await hash(fingerprint)
  
  await redis.setex(
    `fp:${fingerprintId}`,
    2592000, // 30 天过期
    JSON.stringify({
      timestamp: Date.now(),
      fingerprint,
    })
  )
  
  // ... 风险分析
}
```

---

## 成本分析

### 场景 1: 小规模（10 万请求/月）

| 方案 | 月成本 | 推荐度 |
|------|--------|--------|
| Vercel + Upstash | $0 | ⭐⭐⭐⭐⭐ |
| Cloudflare Workers | $0 | ⭐⭐⭐⭐⭐ |
| AWS Lambda | $0 | ⭐⭐⭐⭐ |
| Supabase | $0 | ⭐⭐⭐⭐⭐ |

**结论**: 所有方案都在免费额度内，推荐 **Cloudflare** 或 **Supabase**

---

### 场景 2: 中等规模（100 万请求/月）

| 方案 | 月成本 | 推荐度 |
|------|--------|--------|
| Vercel + Upstash | $23 | ⭐⭐⭐ |
| Cloudflare Workers | $5.5 | ⭐⭐⭐⭐⭐ |
| AWS Lambda | $8.8 | ⭐⭐⭐⭐ |
| Supabase | $25 | ⭐⭐⭐⭐ |

**结论**: **Cloudflare Workers** 最具性价比

---

### 场景 3: 大规模（1000 万请求/月）

| 方案 | 月成本 | 推荐度 |
|------|--------|--------|
| Vercel + Upstash | $200+ | ⭐⭐ |
| Cloudflare Workers | $50 | ⭐⭐⭐⭐⭐ |
| AWS Lambda | $80 | ⭐⭐⭐⭐ |
| Supabase | $100+ | ⭐⭐⭐ |

**结论**: **Cloudflare Workers** 成本优势明显

---

## 迁移指南

### 从传统服务器迁移

```bash
# 1. 导出原有数据
node -e "
const data = require('./fingerprints.json');
console.log(JSON.stringify(data));
" > backup.json

# 2. 导入到新数据库
# (根据目标数据库执行相应导入脚本)

# 3. 部署 Serverless 函数
vercel --prod  # 或其他平台

# 4. 更新前端 API 端点
# 修改 creep-lite.js 中的 apiEndpoint

# 5. 测试验证
curl https://your-new-api.com/api/health
```

---

### 数据迁移脚本

```javascript
// migrate.js
const { Redis } = require('@upstash/redis')
const fs = require('fs')

async function migrate() {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  const data = JSON.parse(fs.readFileSync('fingerprints.json', 'utf-8'))

  let count = 0
  for (const [id, record] of Object.entries(data.fingerprints || {})) {
    await redis.setex(
      `fp:${id}`,
      2592000,
      JSON.stringify(record)
    )
    count++
  }

  console.log(`迁移完成：${count} 条记录`)
}

migrate().catch(console.error)
```

---

## 监控与告警

### Vercel 监控

```bash
# 查看分析
vercel analytics

# 查看日志
vercel logs
```

### Cloudflare 监控

```javascript
// 添加监控指标
export default {
  async fetch(request, env, ctx) {
    const startTime = Date.now()
    
    // ... 处理请求
    
    const duration = Date.now() - startTime
    
    // 上报指标
    env.MY_ANALYTICS.writeDataPoint({
      blobs: [request.url],
      doubles: [duration],
    })
  },
}
```

### 告警配置

```javascript
// 添加告警逻辑
if (riskScore >= 70) {
  // 发送告警通知
  await fetch('https://api.telegram.org/botXXX/sendMessage', {
    method: 'POST',
    body: JSON.stringify({
      chat_id: 'your-chat-id',
      text: `🚨 高风险访问检测\nFP: ${fingerprintId}\nScore: ${riskScore}`,
    }),
  })
}
```

---

## 最佳实践

### 1. 缓存策略

```javascript
// 前端缓存
window.CreepLite({
  cacheEnabled: true,
  cacheTTL: 1800000, // 30 分钟
})

// CDN 缓存
// vercel.json
{
  "headers": [
    {
      "source": "/docs/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 2. 限流配置

```javascript
// Cloudflare Workers Ratelimit
import { Ratelimit } from "@upstash/ratelimit"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 次/10 秒
})

export default async function handler(req) {
  const { success } = await ratelimit.limit("ratelimit_" + req.ip)
  
  if (!success) {
    return new Response('Too many requests', { status: 429 })
  }
  
  // ... 正常处理
}
```

### 3. 错误处理

```javascript
// 添加重试逻辑
async function callAPIWithRetry(url, data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
      })
      
      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}
```

---

## 常见问题

### Q1: Serverless 冷启动问题？

**A**: 
- Vercel/Cloudflare: ~100ms
- AWS Lambda: ~500ms
- Supabase: ~200ms

**优化方案**:
- 使用 Provisioned Concurrency（AWS）
- 保持定期调用（每 5 分钟）
- 选择 Cloudflare Workers（无冷启动）

### Q2: 如何调试？

```bash
# Vercel
vercel logs --follow

# Cloudflare
wrangler tail

# AWS
serverless logs -f fingerprint --tail

# Supabase
supabase functions logs fingerprint --tail
```

### Q3: 数据库连接数限制？

**A**: Serverless 函数是无状态的，每次调用都可能新建连接。

**解决方案**:
- 使用 connection pooling
- 使用 Serverless 友好的数据库（Upstash、PlanetScale）
- 复用连接（Deno）

---

## 总结

### 推荐方案

| 规模 | 推荐方案 | 月成本 |
|------|---------|--------|
| **小规模** (< 10 万/月) | Cloudflare Workers | $0 |
| **中等规模** (10-100 万/月) | Cloudflare Workers | $5-50 |
| **大规模** (> 100 万/月) | Cloudflare Workers | $50+ |
| **需要数据库** | Supabase | $0-50 |
| **快速上线** | Vercel | $0-20 |

### 部署检查清单

- [ ] 选择 Serverless 平台
- [ ] 配置数据库
- [ ] 修改 API 代码
- [ ] 部署静态资源
- [ ] 配置环境变量
- [ ] 测试 API 端点
- [ ] 更新前端配置
- [ ] 配置监控告警
- [ ] 设置自动备份

### 下一步

1. 选择合适的部署方案
2. 按照对应章节的指南部署
3. 测试验证功能
4. 监控运行状态
5. 根据流量调整配置

---

**文档版本**: v1.0.0  
**最后更新**: 2026-04-28  
**维护者**: Your Team
