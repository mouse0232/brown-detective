# CreepJS 更新同步指南

> 当官方 CreepJS 更新时，如何快速同步到本项目

---

## 📋 目录

1. [更新类型](#更新类型)
2. [快速同步](#快速同步)
3. [保留自定义功能](#保留自定义功能)
4. [自动化脚本](#自动化脚本)
5. [版本管理](#版本管理)

---

## 更新类型

### 类型 1: 官方 creep.js 更新

**影响范围**: 
- ✅ 指纹采集逻辑
- ✅ FP ID 计算
- ✅ 检测维度

**更新方式**: 直接替换文件

---

### 类型 2: 本项目自定义功能

**包括**:
- ❌ `creep-lite.js` - 轻量版采集
- ❌ `api-server.js` - API 服务
- ❌ `server.js` - 静态文件服务
- ❌ 示例页面

**更新方式**: 手动合并或保持不变

---

## 快速同步

### 方案 1: 完全使用官方版本（推荐）⭐

如果你**没有修改**官方 creep.js 的源码，只是引用：

```bash
# 更新官方文件
curl -s https://abrahamjuliot.github.io/creepjs/creep.js > /workspace/docs/creep.js
curl -s https://abrahamjuliot.github.io/creepjs/creep.js > /workspace/public/creep.js
curl -s https://abrahamjuliot.github.io/creepjs/ > /workspace/docs/index.html
curl -s https://abrahamjuliot.github.io/creepjs/style.min.css > /workspace/docs/style.min.css

echo "✅ 官方文件已更新"
```

**优势**:
- ✅ 始终是最新版本
- ✅ 无需合并代码
- ✅ FP ID 与官方完全一致

**劣势**:
- ⚠️ 无法自定义采集逻辑

---

### 方案 2: 基于源码修改

如果你**修改了**官方源码（如 creep-lite.ts）：

```bash
# 1. 查看官方更新日志
curl -s https://github.com/abrahamjuliot/CreepJS/releases/latest

# 2. 下载官方源码
git clone https://github.com/abrahamjuliot/CreepJS.git official-source

# 3. 对比差异
diff -r official-source/src /workspace/src

# 4. 手动合并修改
# 使用 VSCode、Meld 等工具对比合并

# 5. 重新构建
pnpm build:lite
pnpm build:full
```

---

## 保留自定义功能

### 需要保留的文件

```bash
# 这些文件不受官方更新影响
/workspace/
├── api-server.js              # ✅ API 服务（独立）
├── server.js                  # ✅ 静态文件服务（独立）
├── src/creep-lite.ts          # ⚠️ 轻量版（需要合并）
├── examples/                  # ✅ 示例页面（独立）
└── docs/creep-lite.js         # ⚠️ 轻量版构建（重新构建）
```

---

### 更新检查清单

```bash
#!/bin/bash
# check-update.sh

echo "🔍 检查官方更新..."

# 获取官方最新版本
OFFICIAL_HASH=$(curl -s https://abrahamjuliot.github.io/creepjs/creep.js | sha256sum | cut -d' ' -f1)

# 获取本地版本
LOCAL_HASH=$(sha256sum /workspace/docs/creep.js | cut -d' ' -f1)

echo "官方版本：$OFFICIAL_HASH"
echo "本地版本：$LOCAL_HASH"

if [ "$OFFICIAL_HASH" != "$LOCAL_HASH" ]; then
  echo "⚠️  发现新版本！"
  echo ""
  echo "执行以下命令更新:"
  echo "  ./update-official.sh"
else
  echo "✅ 已是最新版本"
fi
```

---

## 自动化脚本

### 脚本 1: 一键更新官方文件

```bash
#!/bin/bash
# update-official.sh

set -e

echo "🔄 开始更新官方文件..."

# 备份旧版本
BACKUP_DIR="/workspace/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
cp /workspace/docs/creep.js $BACKUP_DIR/
cp /workspace/docs/index.html $BACKUP_DIR/
cp /workspace/docs/style.min.css $BACKUP_DIR/
echo "💾 已备份到：$BACKUP_DIR"

# 下载新版本
echo "📥 下载官方文件..."
curl -s https://abrahamjuliot.github.io/creepjs/creep.js > /workspace/docs/creep.js
curl -s https://abrahamjuliot.github.io/creepjs/creep.js > /workspace/public/creep.js
curl -s https://abrahamjuliot.github.io/creepjs/ > /workspace/docs/index.html
curl -s https://abrahamjuliot.github.io/creepjs/style.min.css > /workspace/docs/style.min.css

# 验证文件
CREEP_SIZE=$(wc -c < /workspace/docs/creep.js)
if [ $CREEP_SIZE -lt 100000 ]; then
  echo "❌ 下载失败！文件大小异常：$CREEP_SIZE bytes"
  echo "🔄 恢复备份..."
  cp $BACKUP_DIR/creep.js /workspace/docs/creep.js
  exit 1
fi

echo "✅ 官方文件已更新"
echo "📊 文件大小：$CREEP_SIZE bytes"
echo ""
echo "下一步:"
echo "  1. 测试功能：node server.js"
echo "  2. 验证 FP ID 是否正常"
echo "  3. 检查 API 是否正常工作"
```

**使用方法**:
```bash
chmod +x update-official.sh
./update-official.sh
```

---

### 脚本 2: 合并源码修改

```bash
#!/bin/bash
# merge-source.sh

set -e

echo "🔀 开始合并源码..."

# 克隆官方源码（如果不存在）
if [ ! -d "official-source" ]; then
  git clone https://github.com/abrahamjuliot/CreepJS.git official-source
fi

# 更新官方源码
cd official-source
git pull origin main
cd ..

# 备份当前源码
BACKUP_DIR="/workspace/backups/src_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
cp -r /workspace/src $BACKUP_DIR/
echo "💾 已备份源码到：$BACKUP_DIR"

# 对比差异
echo "📊 对比差异..."
diff -r official-source/src /workspace/src > /tmp/diff-report.txt || true

if [ -s /tmp/diff-report.txt ]; then
  echo "⚠️  发现差异:"
  cat /tmp/diff-report.txt
  echo ""
  echo "🔧 使用以下工具手动合并:"
  echo "  - VSCode: 安装 'Partial Diff' 插件"
  echo "  - Meld: meld /workspace/src official-source/src"
  echo "  - P4Merge: p4merge /workspace/src official-source/src"
else
  echo "✅ 源码与官方一致，无需合并"
fi

# 询问是否重新构建
read -p "是否重新构建？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "🔨 开始构建..."
  pnpm build:lite
  pnpm build:full
  echo "✅ 构建完成"
fi
```

---

### 脚本 3: 定期自动检查

```javascript
// check-update.js
const https = require('https')
const fs = require('fs')
const crypto = require('crypto')

const OFFICIAL_URL = 'https://abrahamjuliot.github.io/creepjs/creep.js'
const LOCAL_FILE = '/workspace/docs/creep.js'

function hashFile(filepath) {
  const content = fs.readFileSync(filepath)
  return crypto.createHash('sha256').update(content).digest('hex')
}

function checkUpdate() {
  return new Promise((resolve, reject) => {
    https.get(OFFICIAL_URL, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        const officialHash = crypto.createHash('sha256').update(data).digest('hex')
        const localHash = hashFile(LOCAL_FILE)
        
        resolve({
          officialHash,
          localHash,
          isUpdated: officialHash === localHash,
          size: data.length
        })
      })
    }).on('error', reject)
  })
}

async function main() {
  console.log('🔍 检查官方更新...\n')
  
  const result = await checkUpdate()
  
  console.log(`官方版本：${result.officialHash.substring(0, 16)}...`)
  console.log(`本地版本：${result.localHash.substring(0, 16)}...`)
  console.log(`文件大小：${(result.size / 1024).toFixed(2)} KB\n`)
  
  if (result.isUpdated) {
    console.log('✅ 已是最新版本')
  } else {
    console.log('⚠️  发现新版本!')
    console.log('\n执行以下命令更新:')
    console.log('  ./update-official.sh')
  }
}

main().catch(console.error)
```

**添加到定时任务**:
```bash
# 每天早上 9 点检查
crontab -e

# 添加这行
0 9 * * * node /workspace/check-update.js >> /var/log/creepjs-update.log 2>&1
```

---

## 版本管理

### 记录更新历史

```bash
# CHANGELOG.md

# CreepJS 更新日志

## [2026-04-28] - v1.0.0
- 初始版本
- 基于官方 CreepJS 2026-04-28 版本
- 添加轻量版 creep-lite.js
- 添加 API 服务

## [2026-XX-XX] - v1.0.1
- 同步官方更新（日期）
- 官方变更：修复 WebGL 检测问题
- 保留功能：API 上报、轻量版采集
```

### Git 标签管理

```bash
# 初始化 Git（如果还没有）
git init

# 初始提交
git add .
git commit -m "Initial commit - CreepJS v1.0.0"
git tag -a v1.0.0 -m "Initial release"

# 每次更新后
git add .
git commit -m "Update: sync official CreepJS (2026-XX-XX)"
git tag -a v1.0.1 -m "Sync official update"

# 查看历史
git tag -l
git show v1.0.0
```

---

## 测试验证

### 更新后测试清单

```bash
#!/bin/bash
# test-after-update.sh

echo "🧪 开始测试更新后的功能...\n"

# 1. 检查文件完整性
echo "1️⃣ 检查文件完整性..."
if [ ! -f /workspace/docs/creep.js ]; then
  echo "❌ creep.js 缺失"
  exit 1
fi
CREEP_SIZE=$(wc -c < /workspace/docs/creep.js)
if [ $CREEP_SIZE -lt 100000 ]; then
  echo "❌ creep.js 文件大小异常"
  exit 1
fi
echo "✅ creep.js: $((CREEP_SIZE / 1024)) KB"

# 2. 检查轻量版
echo "2️⃣ 检查轻量版..."
if [ ! -f /workspace/docs/creep-lite.js ]; then
  echo "❌ creep-lite.js 缺失"
  exit 1
fi
echo "✅ creep-lite.js 存在"

# 3. 检查 API 服务
echo "3️⃣ 检查 API 服务..."
if [ ! -f /workspace/api-server.js ]; then
  echo "❌ api-server.js 缺失"
  exit 1
fi
echo "✅ api-server.js 存在"

# 4. 启动测试服务器
echo "4️⃣ 启动测试服务器..."
node /workspace/server.js &
SERVER_PID=$!
sleep 2

# 5. 测试 API
echo "5️⃣ 测试 API 端点..."
curl -s http://localhost:8000/api/health > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ API 健康检查通过"
else
  echo "❌ API 健康检查失败"
  kill $SERVER_PID
  exit 1
fi

# 6. 停止服务器
kill $SERVER_PID

echo "\n✅ 所有测试通过！"
```

---

## 回滚方案

### 如果更新后出现问题

```bash
#!/bin/bash
# rollback.sh

echo "🔄 开始回滚..."

# 查找最新备份
BACKUP_DIR=$(ls -td /workspace/backups/* | head -1)

if [ -z "$BACKUP_DIR" ]; then
  echo "❌ 未找到备份"
  exit 1
fi

echo "💾 使用备份：$BACKUP_DIR"

# 恢复文件
cp $BACKUP_DIR/creep.js /workspace/docs/creep.js
cp $BACKUP_DIR/index.html /workspace/docs/index.html
cp $BACKUP_DIR/style.min.css /workspace/docs/style.min.css

echo "✅ 回滚完成"
echo "请重启服务器并测试"
```

---

## GitHub Actions 自动化

### 自动检查更新

```yaml
# .github/workflows/check-update.yml

name: Check CreepJS Update

on:
  schedule:
    - cron: '0 9 * * *'  # 每天早上 9 点
  workflow_dispatch:      # 手动触发

jobs:
  check-update:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Check for updates
        run: |
          # 下载官方最新版本
          curl -s https://abrahamjuliot.github.io/creepjs/creep.js > official-latest.js
          
          # 对比 hash
          OFFICIAL_HASH=$(sha256sum official-latest.js | cut -d' ' -f1)
          LOCAL_HASH=$(sha256sum docs/creep.js | cut -d' ' -f1)
          
          echo "Official: $OFFICIAL_HASH"
          echo "Local: $LOCAL_HASH"
          
          if [ "$OFFICIAL_HASH" != "$LOCAL_HASH" ]; then
            echo "UPDATE_AVAILABLE=true" >> $GITHUB_ENV
            echo "⚠️ 发现新版本!"
          else
            echo "✅ 已是最新版本"
          fi
      
      - name: Create issue if update available
        if: env.UPDATE_AVAILABLE == 'true'
        uses: peter-evans/create-issue-from-file@v4
        with:
          title: '🔄 发现 CreepJS 官方更新'
          content-filepath: .github/UPDATE_TEMPLATE.md
          labels: update, automation
```

### 自动合并更新

```yaml
# .github/workflows/auto-update.yml

name: Auto Update CreepJS

on:
  workflow_dispatch:
    inputs:
      version:
        description: '更新版本号'
        required: false

jobs:
  update:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Download official files
        run: |
          curl -s https://abrahamjuliot.github.io/creepjs/creep.js > docs/creep.js
          curl -s https://abrahamjuliot.github.io/creepjs/creep.js > public/creep.js
          curl -s https://abrahamjuliot.github.io/creepjs/ > docs/index.html
          curl -s https://abrahamjuliot.github.io/creepjs/style.min.css > docs/style.min.css
      
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          commit-message: 'chore: update CreepJS official files'
          title: '🔄 Update CreepJS to latest version'
          body: |
            自动更新 CreepJS 官方文件
            
            - 更新 creep.js
            - 更新 index.html
            - 更新 style.min.css
            
            请测试后合并：
            - [ ] 测试 FP ID 正常
            - [ ] 测试 API 正常
            - [ ] 测试轻量版正常
          labels: update
          branch: auto-update-creepjs
```

---

## 最佳实践

### 1. 分离官方和自定义代码

```bash
# 推荐的目录结构
/workspace/
├── official/                  # 官方代码（只读）
│   ├── creep.js
│   └── index.html
├── custom/                    # 自定义代码
│   ├── creep-lite.ts
│   ├── api-server.js
│   └── examples/
└── build/                     # 构建输出
    ├── creep-full.js
    └── creep-lite.js
```

### 2. 使用 Git Submodule

```bash
# 添加官方为 submodule
git submodule add https://github.com/abrahamjuliot/CreepJS.git official
git submodule update --remote  # 更新 submodule
```

### 3. 版本锁定

```json
// package.json
{
  "config": {
    "creepjs-version": "2026-04-28",
    "creepjs-hash": "efa0e17daa9c530ec1edeae9d1556dc5..."
  }
}
```

### 4. 监控官方仓库

```javascript
// watch-official.js
const https = require('https')

function watchGitHub() {
  const options = {
    hostname: 'api.github.com',
    path: '/repos/abrahamjuliot/CreepJS/releases/latest',
    headers: { 'User-Agent': 'Node.js' }
  }
  
  https.get(options, (res) => {
    let data = ''
    res.on('data', chunk => data += chunk)
    res.on('end', () => {
      const release = JSON.parse(data)
      console.log(`最新release: ${release.tag_name}`)
      console.log(`发布日期：${release.published_at}`)
      console.log(`更新内容:\n${release.body}`)
    })
  })
}

watchGitHub()
```

---

## 总结

### 更新流程

```
1. 检查更新（自动/手动）
   ↓
2. 备份当前版本
   ↓
3. 下载官方文件
   ↓
4. 验证文件完整性
   ↓
5. 测试功能
   ↓
6. 如有问题，回滚备份
   ↓
7. 更新成功，记录日志
```

### 推荐策略

| 场景 | 推荐方案 |
|------|---------|
| **直接用官方** | 方案 1：直接替换 |
| **有自定义修改** | 方案 2：手动合并 |
| **企业环境** | GitHub Actions 自动化 |
| **频繁更新** | Git Submodule |

### 关键要点

1. ✅ **定期备份** - 更新前先备份
2. ✅ **测试验证** - 更新后全面测试
3. ✅ **保留功能** - 确保自定义功能不受影响
4. ✅ **记录日志** - 追踪更新历史
5. ✅ **快速回滚** - 准备好回滚方案

---

**文档版本**: v1.0.0  
**最后更新**: 2026-04-28  
**维护者**: Your Team
