/* eslint-disable @typescript-eslint/no-var-requires */
const express = require('express')
const path = require('path')
const crypto = require('crypto')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 8000

// 数据持久化文件
const DATA_FILE = path.join(__dirname, '/fingerprints.json')

// 历史数据
let historicalData = { fingerprints: {}, blacklist: [], whitelist: [] }
try {
  if (fs.existsSync(DATA_FILE)) {
    historicalData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
    console.log(`✓ 已加载 ${Object.keys(historicalData.fingerprints).length} 条历史指纹`)
  }
} catch (e) {
  console.error('加载历史数据失败:', e.message)
}

// 中间件
app.use(express.json({ limit: '2mb' }))

// 静态文件服务
app.use(express.static(path.join(__dirname, '/public')))
app.use('/docs', express.static(path.join(__dirname, '/docs')))
app.use('/examples', express.static(path.join(__dirname, '/examples')))

// redirect /tests/ to /docs/tests
app.use('/tests/*', (req, res) => {
  res.redirect(`/docs${req.path}`)
})

// 生成指纹 ID
function generateFingerprintId(fingerprint) {
  const keyComponents = [
    fingerprint.navigator?.$hash,
    fingerprint.screen?.$hash,
    fingerprint.canvas2d?.$hash,
    fingerprint.canvasWebgl?.$hash,
    fingerprint.timezone?.$hash,
    fingerprint.fonts?.$hash,
  ].filter(Boolean)
  
  return crypto.createHash('sha256').update(keyComponents.join('|')).digest('hex')
}

// 风险分析
function analyzeRisk(fingerprint, fingerprintId) {
  const risks = []
  let riskScore = 0
  
  const { headless, lies, navigator } = fingerprint

  // 无头浏览器检测
  if (headless?.riskLevel === 'high' || headless?.headless === true) {
    risks.push({ type: 'HEADLESS_BROWSER', level: 'high', score: 40, message: '检测到无头浏览器特征' })
    riskScore += 40
  }

  // 自动化工具检测
  if (navigator?.webdriver === true) {
    risks.push({ type: 'AUTOMATION_TOOL', level: 'high', score: 50, message: '检测到 WebDriver 特征' })
    riskScore += 50
  }

  // 谎言检测
  if (lies?.liesDetected?.length > 5) {
    risks.push({ type: 'FINGERPRINT_LIES', level: 'high', score: 35, message: `检测到 ${lies.liesDetected.length} 个指纹谎言` })
    riskScore += 35
  } else if (lies?.liesDetected?.length > 0) {
    risks.push({ type: 'FINGERPRINT_LIES', level: 'medium', score: 15, message: `检测到 ${lies.liesDetected.length} 个不一致特征` })
    riskScore += 15
  }

  // 黑名单检查
  if (historicalData.blacklist.includes(fingerprintId)) {
    riskScore = 100
    risks.push({ type: 'BLACKLISTED', level: 'critical', score: 100, message: '指纹在黑名单中' })
  }

  // 白名单检查
  if (historicalData.whitelist.includes(fingerprintId)) {
    return { riskScore: 0, level: 'trusted', decision: 'ALLOW', risks: [{ type: 'WHITELISTED', level: 'info', message: '指纹在白名单中' }] }
  }

  // 风险等级
  let level, decision
  if (riskScore >= 70) { level = 'critical'; decision = 'BLOCK' }
  else if (riskScore >= 50) { level = 'high'; decision = 'CHALLENGE' }
  else if (riskScore >= 30) { level = 'medium'; decision = 'MONITOR' }
  else if (riskScore >= 10) { level = 'low'; decision = 'ALLOW' }
  else { level = 'minimal'; decision = 'ALLOW' }

  return { riskScore, level, decision, risks, fingerprintId, timestamp: Date.now() }
}

// 更新历史记录
function updateHistory(fingerprintId, fingerprint) {
  const now = Date.now()
  if (!historicalData.fingerprints[fingerprintId]) {
    historicalData.fingerprints[fingerprintId] = {
      firstSeen: now,
      lastSeen: now,
      visitCount: 1,
      fingerprint: { navigator: fingerprint.navigator, screen: fingerprint.screen, timezone: fingerprint.timezone },
      riskHistory: [],
    }
  } else {
    const record = historicalData.fingerprints[fingerprintId]
    record.lastSeen = now
    record.visitCount++
  }
  
  // 限制记录数量
  const maxRecords = 10000
  const records = Object.keys(historicalData.fingerprints)
  if (records.length > maxRecords) {
    const sorted = records.sort((a, b) => historicalData.fingerprints[a].lastSeen - historicalData.fingerprints[b].lastSeen)
    sorted.slice(0, Math.floor(maxRecords * 0.2)).forEach(key => delete historicalData.fingerprints[key])
  }
}

function saveData() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(historicalData, null, 2)) } catch (e) {}
}

// API 路由

// 指纹分析
app.post('/api/fingerprint', async (req, res) => {
  try {
    const { fingerprint } = req.body
    if (!fingerprint) {
      return res.status(400).json({ success: false, error: '缺少 fingerprint 数据' })
    }

    const fingerprintId = generateFingerprintId(fingerprint)
    const analysis = analyzeRisk(fingerprint, fingerprintId)
    updateHistory(fingerprintId, fingerprint)
    saveData()

    if (historicalData.fingerprints[fingerprintId]) {
      historicalData.fingerprints[fingerprintId].riskHistory.push({
        timestamp: Date.now(),
        riskScore: analysis.riskScore,
        level: analysis.level,
        decision: analysis.decision,
      })
      historicalData.fingerprints[fingerprintId].riskHistory = 
        historicalData.fingerprints[fingerprintId].riskHistory.slice(-10)
    }

    res.json({ success: true, fingerprintId, analysis, timestamp: Date.now() })
  } catch (error) {
    console.error('指纹分析错误:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 查询指纹记录
app.get('/api/fingerprint/:id', (req, res) => {
  const record = historicalData.fingerprints[req.params.id]
  if (!record) {
    return res.status(404).json({ success: false, error: '指纹记录不存在' })
  }
  res.json({ success: true, fingerprintId: req.params.id, record })
})

// 加入黑名单
app.post('/api/fingerprint/:id/blacklist', (req, res) => {
  const { id } = req.params
  if (!historicalData.blacklist.includes(id)) {
    historicalData.blacklist.push(id)
    saveData()
  }
  res.json({ success: true, message: '已加入黑名单' })
})

// 加入白名单
app.post('/api/fingerprint/:id/whitelist', (req, res) => {
  const { id } = req.params
  historicalData.blacklist = historicalData.blacklist.filter(x => x !== id)
  if (!historicalData.whitelist.includes(id)) {
    historicalData.whitelist.push(id)
    saveData()
  }
  res.json({ success: true, message: '已加入白名单' })
})

// 统计数据
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      totalFingerprints: Object.keys(historicalData.fingerprints).length,
      blacklisted: historicalData.blacklist.length,
      whitelisted: historicalData.whitelist.length,
    },
  })
})

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: Date.now() })
})

// 首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/index.html'))
})

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║     CreepJS Anti-Bot Server                  ║
╠═══════════════════════════════════════════════╣
║  Status: ✓ Running                            ║
║  Port: ${PORT}                                   ║
║  Web: http://localhost:${PORT}                 ║
║  API: http://localhost:${PORT}/api/health      ║
║  Examples:                                    ║
║    - /examples/lite-version.html              ║
║    - /examples/full-version.html              ║
╚═══════════════════════════════════════════════╝
  `)
})
