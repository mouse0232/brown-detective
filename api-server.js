/**
 * CreepJS 反爬虫风险分析 API 服务
 * 
 * 功能：
 * 1. 接收前端采集的指纹数据
 * 2. 生成唯一指纹 ID
 * 3. 检测异常模式（无头浏览器、自动化框架等）
 * 4. 返回风险评分和决策建议
 * 
 * 使用方式：
 * node api-server.js
 */

const express = require('express')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = process.env.CREEP_API_PORT || 3001

// 中间件
app.use(express.json({ limit: '2mb' }))

// 数据持久化文件（生产环境请替换为数据库）
const DATA_FILE = path.join(__dirname, '/fingerprints.json')

// 内存缓存（生产环境请用 Redis）
const fingerprintCache = new Map()
const CACHE_TTL = 1800000 // 30 分钟

// 加载历史指纹数据
let historicalData = { fingerprints: {}, blacklist: [], whitelist: [] }
try {
  if (fs.existsSync(DATA_FILE)) {
    historicalData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
    console.log(`✓ 已加载 ${Object.keys(historicalData.fingerprints).length} 条历史指纹`)
  }
} catch (e) {
  console.error('加载历史数据失败:', e.message)
}

// 保存数据
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(historicalData, null, 2))
  } catch (e) {
    console.error('保存数据失败:', e.message)
  }
}

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

// 风险分析引擎
function analyzeRisk(fingerprint, fingerprintId) {
  const risks = []
  let riskScore = 0
  
  const {
    navigator,
    screen,
    canvas2d,
    canvasWebgl,
    headless,
    lies,
    consoleErrors,
    timezone,
  } = fingerprint

  // 1. 无头浏览器检测 (高权重)
  if (headless?.riskLevel === 'high' || headless?.headless === true) {
    risks.push({
      type: 'HEADLESS_BROWSER',
      level: 'high',
      score: 40,
      message: '检测到无头浏览器特征',
    })
    riskScore += 40
  }

  // 2. 自动化工具检测
  const automationSignals = []
  
  // WebDriver 特征
  if (navigator?.webdriver === true) {
    automationSignals.push('WebDriver 启用')
  }
  
  // Selenium 特征
  if (navigator?.plugins?.length === 0 && navigator?.languages?.length > 0) {
    automationSignals.push('Selenium 特征（无插件但有语言）')
  }
  
  // Puppeteer 特征
  if (navigator?.userAgent?.includes('Chrome') && headless?.chromeHeadless) {
    automationSignals.push('Puppeteer/Chrome Headless 特征')
  }

  if (automationSignals.length > 0) {
    risks.push({
      type: 'AUTOMATION_TOOL',
      level: 'high',
      score: 50,
      details: automationSignals,
      message: '检测到自动化工具特征',
    })
    riskScore += 50
  }

  // 3. 谎言检测（反指纹浏览器）
  if (lies?.liesDetected?.length > 0) {
    const lieCount = lies.liesDetected.length
    if (lieCount > 5) {
      risks.push({
        type: 'FINGERPRINT_LIES',
        level: 'high',
        score: 35,
        details: lies.liesDetected.slice(0, 10),
        message: `检测到 ${lieCount} 个指纹谎言，疑似反指纹浏览器`,
      })
      riskScore += 35
    } else if (lieCount > 0) {
      risks.push({
        type: 'FINGERPRINT_LIES',
        level: 'medium',
        score: 15,
        details: lies.liesDetected,
        message: `检测到 ${lieCount} 个不一致的指纹特征`,
      })
      riskScore += 15
    }
  }

  // 4. 控制台错误模式检测
  if (consoleErrors?.errors?.length > 0) {
    const errorPatterns = consoleErrors.errors.filter(e => 
      e?.includes?('webdriver') || 
      e?.includes?('selenium') || 
      e?.includes?('phantom')
    )
    if (errorPatterns.length > 0) {
      risks.push({
        type: 'CONSOLE_ERROR_PATTERNS',
        level: 'medium',
        score: 25,
        details: errorPatterns,
        message: '控制台错误中包含自动化框架关键词',
      })
      riskScore += 25
    }
  }

  // 5. 指纹矛盾检测
  const contradictions = []
  
  // 移动端/桌面端矛盾
  if (navigator?.platform?.includes?('Win') && screen?.maxTouchPoints > 5) {
    contradictions.push('Windows 系统但支持多点触控')
  }
  
  // 时区/IP 矛盾（需要结合 IP 地理位置，这里仅示例）
  if (timezone?.location && !timezone?.zone) {
    contradictions.push('有时区位置但无时区信息')
  }

  if (contradictions.length > 0) {
    risks.push({
      type: 'FINGERPRINT_CONTRADICTIONS',
      level: 'medium',
      score: 20,
      details: contradictions,
      message: '指纹特征存在矛盾',
    })
    riskScore += 20
  }

  // 6. 历史行为分析
  const historicalRecord = historicalData.fingerprints[fingerprintId]
  if (historicalRecord) {
    const timeSinceLastVisit = Date.now() - historicalRecord.lastSeen
    const requestFrequency = historicalRecord.visitCount || 1
    
    // 短时间内大量请求
    if (requestFrequency > 10 && timeSinceLastVisit < 60000) {
      risks.push({
        type: 'HIGH_FREQUENCY',
        level: 'high',
        score: 30,
        message: '短时间内大量请求',
      })
      riskScore += 30
    }

    // 首次访问
    if (requestFrequency === 1) {
      risks.push({
        type: 'FIRST_TIME_VISITOR',
        level: 'low',
        score: 5,
        message: '首次访问',
      })
      riskScore += 5
    }
  }

  // 7. 黑白名单检查
  if (historicalData.blacklist.includes(fingerprintId)) {
    risks.push({
      type: 'BLACKLISTED',
      level: 'critical',
      score: 100,
      message: '指纹在黑名单中',
    })
    riskScore = 100
  }

  if (historicalData.whitelist.includes(fingerprintId)) {
    return {
      riskScore: 0,
      level: 'trusted',
      decision: 'ALLOW',
      risks: [{ type: 'WHITELISTED', level: 'info', message: '指纹在白名单中' }],
    }
  }

  // 风险等级判定
  let level, decision
  if (riskScore >= 70) {
    level = 'critical'
    decision = 'BLOCK'
  } else if (riskScore >= 50) {
    level = 'high'
    decision = 'CHALLENGE'  // 需要验证码等二次验证
  } else if (riskScore >= 30) {
    level = 'medium'
    decision = 'MONITOR'    // 放行但记录日志
  } else if (riskScore >= 10) {
    level = 'low'
    decision = 'ALLOW'
  } else {
    level = 'minimal'
    decision = 'ALLOW'
  }

  return {
    riskScore,
    level,
    decision,
    risks,
    fingerprintId,
    timestamp: Date.now(),
  }
}

// 更新历史记录
function updateHistory(fingerprintId, fingerprint) {
  const now = Date.now()
  
  if (!historicalData.fingerprints[fingerprintId]) {
    // 新指纹
    historicalData.fingerprints[fingerprintId] = {
      firstSeen: now,
      lastSeen: now,
      visitCount: 1,
      fingerprint: {
        navigator: fingerprint.navigator,
        screen: fingerprint.screen,
        timezone: fingerprint.timezone,
      },
      riskHistory: [],
    }
  } else {
    // 更新已有记录
    const record = historicalData.fingerprints[fingerprintId]
    record.lastSeen = now
    record.visitCount++
    record.fingerprint = {
      navigator: fingerprint.navigator,
      screen: fingerprint.screen,
      timezone: fingerprint.timezone,
    }
  }

  // 限制历史记录大小
  const maxRecords = 10000
  const records = Object.keys(historicalData.fingerprints)
  if (records.length > maxRecords) {
    // 删除最旧的 20%
    const sorted = records.sort((a, b) => 
      historicalData.fingerprints[a].lastSeen - historicalData.fingerprints[b].lastSeen
    )
    const toDelete = sorted.slice(0, Math.floor(maxRecords * 0.2))
    toDelete.forEach(key => delete historicalData.fingerprints[key])
  }
}

// API 路由

/**
 * POST /api/fingerprint
 * 接收指纹数据并返回风险分析结果
 */
app.post('/api/fingerprint', async (req, res) => {
  try {
    const { fingerprint } = req.body

    if (!fingerprint) {
      return res.status(400).json({
        success: false,
        error: '缺少 fingerprint 数据',
      })
    }

    // 生成指纹 ID
    const fingerprintId = generateFingerprintId(fingerprint)

    // 风险分析
    const analysis = analyzeRisk(fingerprint, fingerprintId)

    // 更新历史记录
    updateHistory(fingerprintId, fingerprint)
    saveData()

    // 记录风险历史
    if (historicalData.fingerprints[fingerprintId]) {
      historicalData.fingerprints[fingerprintId].riskHistory.push({
        timestamp: Date.now(),
        riskScore: analysis.riskScore,
        level: analysis.level,
        decision: analysis.decision,
      })
      // 只保留最近 10 条
      historicalData.fingerprints[fingerprintId].riskHistory = 
        historicalData.fingerprints[fingerprintId].riskHistory.slice(-10)
    }

    res.json({
      success: true,
      fingerprintId,
      analysis: {
        riskScore: analysis.riskScore,
        level: analysis.level,
        decision: analysis.decision,
        risks: analysis.risks,
      },
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('指纹分析错误:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

/**
 * GET /api/fingerprint/:id
 * 查询指纹历史记录
 */
app.get('/api/fingerprint/:id', (req, res) => {
  const { id } = req.params
  const record = historicalData.fingerprints[id]

  if (!record) {
    return res.status(404).json({
      success: false,
      error: '指纹记录不存在',
    })
  }

  res.json({
    success: true,
    fingerprintId: id,
    record,
  })
})

/**
 * POST /api/fingerprint/:id/blacklist
 * 将指纹加入黑名单
 */
app.post('/api/fingerprint/:id/blacklist', (req, res) => {
  const { id } = req.params
  const { reason } = req.body || {}

  if (!historicalData.blacklist.includes(id)) {
    historicalData.blacklist.push(id)
    saveData()
  }

  res.json({
    success: true,
    message: '已加入黑名单',
    reason,
  })
})

/**
 * POST /api/fingerprint/:id/whitelist
 * 将指纹加入白名单
 */
app.post('/api/fingerprint/:id/whitelist', (req, res) => {
  const { id } = req.params
  const { reason } = req.body || {}

  // 从黑名单移除
  historicalData.blacklist = historicalData.blacklist.filter(x => x !== id)
  
  if (!historicalData.whitelist.includes(id)) {
    historicalData.whitelist.push(id)
    saveData()
  }

  res.json({
    success: true,
    message: '已加入白名单',
    reason,
  })
})

/**
 * GET /api/stats
 * 获取统计数据
 */
app.get('/api/stats', (req, res) => {
  const totalFingerprints = Object.keys(historicalData.fingerprints).length
  const blacklisted = historicalData.blacklist.length
  const whitelisted = historicalData.whitelist.length

  // 风险分布统计
  const riskDistribution = { critical: 0, high: 0, medium: 0, low: 0, minimal: 0 }
  Object.values(historicalData.fingerprints).forEach(record => {
    const latestRisk = record.riskHistory[record.riskHistory.length - 1]
    if (latestRisk) {
      riskDistribution[latestRisk.level]++
    }
  })

  res.json({
    success: true,
    stats: {
      totalFingerprints,
      blacklisted,
      whitelisted,
      riskDistribution,
    },
  })
})

/**
 * GET /api/health
 * 健康检查
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: Date.now(),
  })
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║     CreepJS Anti-Bot Analysis API Server     ║
╠═══════════════════════════════════════════════╣
║  Status: ✓ Running                            ║
║  Port: ${PORT}                                   ║
║  Endpoints:                                   ║
║    POST /api/fingerprint    - 指纹分析        ║
║    GET  /api/fingerprint/:id - 查询记录       ║
║    POST /api/fingerprint/:id/blacklist        ║
║    POST /api/fingerprint/:id/whitelist        ║
║    GET  /api/stats          - 统计数据        ║
╚═══════════════════════════════════════════════╝
  `)
})

module.exports = app
