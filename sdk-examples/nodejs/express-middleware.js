// Node.js SDK 集成示例
// 使用 Express 中间件自动检测浏览器风险

const express = require('express');
const axios = require('axios');

const app = express();

// 布朗探长客户端
class BrownDetectiveClient {
  constructor(apiKey, apiUrl) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.client = axios.create({
      baseURL: apiUrl,
      timeout: 5000,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }
  
  // 检测浏览器风险
  async detect(fingerprintData) {
    try {
      const response = await this.client.post('/v1/detect', {
        fingerprint: fingerprintData.fingerprint,
        browserData: fingerprintData.browserData,
        ip: fingerprintData.ip,
        timestamp: Date.now()
      });
      
      return response.data;
    } catch (error) {
      console.error('布朗探长检测失败:', error.message);
      // 失败时返回空报告，避免阻断正常请求
      return {
        success: false,
        data: {
          riskScore: 0,
          riskLevel: 'unknown',
          recommendation: 'allow'
        }
      };
    }
  }
}

// 初始化客户端
const brownClient = new BrownDetectiveClient(
  process.env.BROWN_API_KEY || 'demo_key',
  process.env.BROWN_API_URL || 'http://localhost:8000'
);

// Express 中间件
function brownDetectiveMiddleware(options = {}) {
  const {
    threshold = 70,        // 风险阈值
    action = 'block',      // 'block' | 'captcha' | 'log'
    excludePaths = []      // 排除的路径
  } = options;
  
  return async (req, res, next) => {
    // 排除的路径
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    // 从请求头获取指纹数据
    const fingerprint = req.headers['x-browser-fingerprint'];
    const ip = req.ip || req.headers['x-real-ip'];
    
    if (!fingerprint) {
      // 没有指纹数据，放行或记录日志
      console.log('⚠️  未检测到指纹数据');
      return next();
    }
    
    try {
      // 解析指纹数据
      const fingerprintData = JSON.parse(
        Buffer.from(fingerprint, 'base64').toString('utf-8')
      );
      
      // 发送检测请求
      const report = await brownClient.detect({
        ...fingerprintData,
        ip
      });
      
      // 附加到请求对象
      req.brownReport = report.data;
      
      // 根据风险等级采取行动
      if (report.data.riskScore > threshold) {
        console.log(`🚨 高风险检测到：${report.data.riskScore} - ${report.data.riskLevel}`);
        
        if (action === 'block') {
          return res.status(403).json({
            error: 'Access denied',
            reason: 'High risk browser detected',
            riskScore: report.data.riskScore
          });
        } else if (action === 'captcha') {
          // 重定向到验证码页面
          return res.redirect('/captcha?return=' + encodeURIComponent(req.path));
        }
      }
      
      next();
    } catch (error) {
      console.error('指纹解析失败:', error);
      next();
    }
  };
}

// 使用中间件
app.use(brownDetectiveMiddleware({
  threshold: 70,
  action: 'block',
  excludePaths: ['/health', '/api/public']
}));

// 路由示例
app.get('/', (req, res) => {
  // 访问风险报告
  const report = req.brownReport;
  
  res.json({
    message: 'Welcome!',
    riskReport: report,
    timestamp: new Date().toISOString()
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`🔍 布朗探长已启用`);
});

// ============================================
// 使用示例 2：在登录接口中使用
// ============================================

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  // 验证用户凭证
  const user = await validateUser(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // 检查浏览器风险
  const report = req.brownReport;
  if (report && report.riskScore > 50) {
    // 中高风险：需要二次验证
    return res.json({
      requireVerification: true,
      reason: 'Suspicious browser detected',
      riskScore: report.riskScore
    });
  }
  
  // 低风险：直接登录成功
  res.json({
    success: true,
    token: generateToken(user)
  });
});

// ============================================
// 使用示例 3：手动调用 API
// ============================================

async function manualCheck(fingerprintData) {
  const report = await brownClient.detect(fingerprintData);
  
  console.log('风险评分:', report.data.riskScore);
  console.log('风险等级:', report.data.riskLevel);
  console.log('建议操作:', report.data.recommendation);
  
  if (report.data.detectedBrowsers.length > 0) {
    console.log('检测到的指纹浏览器:', report.data.detectedBrowsers);
  }
  
  return report.data;
}

// 导出模块
module.exports = {
  BrownDetectiveClient,
  brownDetectiveMiddleware,
  manualCheck
};
