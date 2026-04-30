/**
 * CreepJS 反爬虫指纹系统 - Cloudflare Workers 完整版
 * 
 * 功能：
 * 1. 托管完整前端页面（interpreter.html 等）
 * 2. IP 信息采集 API
 * 3. 指纹风险分析 API
 * 4. Cookie 持久化
 * 5. KV 存储历史记录（可选）
 * 
 * 部署方法：
 * 1. wrangler init creepjs-ant-bot
 * 2. 粘贴此代码到 src/index.js
 * 3. wrangler deploy
 * 4. 访问 https://<你的域名>/examples/interpreter.html
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // ============================================
    // API 路由
    // ============================================
    
    // 1. IP 信息采集
    if (url.pathname === '/api/ip-info') {
      return handleIPInfo(request);
    }
    
    // 2. 指纹风险分析
    if (url.pathname === '/api/fingerprint' && request.method === 'POST') {
      return handleFingerprint(request, env);
    }
    
    // 3. 统计数据
    if (url.pathname === '/api/stats') {
      return handleStats(env);
    }
    
    // ============================================
    // 静态文件服务
    // ============================================
    
    // 映射路径到文件
    const fileMap = {
      '/': '/public/index.html',
      '/examples/interpreter.html': '/public/interpreter.html',
      '/examples/interpreter-data.js': '/public/interpreter-data.js',
      '/examples/interpreter-logic.js': '/public/interpreter-logic.js',
      '/public/creep-full.js': '/public/creep-full.js',
      '/docs/creep-lite.js': '/docs/creep-lite.js',
    };
    
    const filePath = fileMap[url.pathname] || null;
    
    if (filePath && env.ASSETS) {
      const asset = await env.ASSETS.get(filePath.substring(1));
      if (asset) {
        return new Response(asset, {
          headers: {
            'Content-Type': getContentType(filePath)
          }
        });
      }
    }
    
    // 如果没有 KV 存储，返回简单 HTML
    if (url.pathname === '/') {
      return new Response(getHomeHTML(url.hostname), {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // 404
    return new Response('Not Found', { status: 404 });
  }
};

/**
 * 获取客户端 IP 和地理信息
 */
function handleIPInfo(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 
             request.headers.get('X-Forwarded-For')?.split(',')[0] || 
             'unknown';
  
  const cf = request.cf || {};
  
  const data = {
    success: true,
    ip: ip,
    country: cf.country || '-',
    countryName: getCountryName(cf.country),
    region: cf.region || '-',
    city: cf.city || '-',
    isp: cf.isp || '-',
    org: cf.isp || '-',
    timezone: cf.timezone || '-',
    latitude: cf.latitude || 0,
    longitude: cf.longitude || 0,
    asn: cf.asn || '-',
    asOrganization: cf.asOrganization || '-',
    protocol: cf.httpProtocol || 'unknown',
    tlsVersion: cf.tlsVersion || '-',
    edgeColo: cf.colo || '-',
    continent: cf.continent || '-'
  };
  
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'max-age=60'
    }
  });
}

/**
 * 指纹风险分析
 */
async function handleFingerprint(request, env) {
  try {
    const body = await request.json();
    const { fingerprint } = body;
    
    if (!fingerprint) {
      return new Response(JSON.stringify({
        success: false,
        error: '缺少 fingerprint 数据'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const ip = request.headers.get('CF-Connecting-IP');
    const cf = request.cf || {};
    const riskComponents = [];
    let riskScore = 0;
    
    // 1. 无头浏览器检测 (+50)
    if (fingerprint.headless?.headless === true || 
        fingerprint.headless?.riskLevel === 'high') {
      riskComponents.push({ type: 'HEADLESS', score: 50 });
      riskScore += 50;
    }
    
    // 2. WebDriver 检测 (+50)
    if (fingerprint.navigator?.webdriver === true) {
      riskComponents.push({ type: 'WEBDRIVER', score: 50 });
      riskScore += 50;
    }
    
    // 3. 云服务 IP 检测 (+20)
    const cloudProviders = ['amazon', 'google', 'microsoft', 'azure', 'aws', 'digitalocean', 'linode'];
    const isp = (cf.isp || '').toLowerCase();
    if (cloudProviders.some(p => isp.includes(p))) {
      riskComponents.push({ type: 'CLOUD_IP', score: 20 });
      riskScore += 20;
    }
    
    // 4. Canvas 指纹采集成功 (+10，表示有反指纹能力)
    if (fingerprint.canvas?.dataURL) {
      riskComponents.push({ type: 'CANVAS_FINGERPRINT', score: 10 });
      riskScore += 10;
    }
    
    // 判定等级
    let level = 'low';
    let decision = 'ALLOW';
    
    if (riskScore >= 70) {
      level = 'critical';
      decision = 'BLOCK';
      riskScore = Math.min(100, riskScore);
    } else if (riskScore >= 50) {
      level = 'high';
      decision = 'CHALLENGE';
    } else if (riskScore >= 30) {
      level = 'medium';
      decision = 'MONITOR';
    }
    
    // 生成指纹 ID
    const fingerprintId = await generateFingerprintId(fingerprint);
    
    // 保存到 KV（如果有）
    if (env.FINGERPRINT_DB) {
      const record = {
        fingerprintId,
        ip,
        geo: {
          country: cf.country,
          region: cf.region,
          city: cf.city,
          isp: cf.isp
        },
        riskScore,
        level,
        decision,
        riskComponents,
        firstSeen: Date.now(),
        lastSeen: Date.now()
      };
      await env.FINGERPRINT_DB.put(fingerprintId, JSON.stringify(record));
    }
    
    // 设置 Cookie
    const cookieValue = `${decision}:${riskScore}:${Date.now()}`;
    
    return new Response(JSON.stringify({
      success: true,
      fingerprintId,
      analysis: {
        riskScore,
        level,
        decision,
        riskComponents
      },
      clientIP: ip,
      geo: {
        country: cf.country,
        region: cf.region,
        city: cf.city,
        isp: cf.isp
      },
      timestamp: Date.now()
    }, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Set-Cookie': `device_token=${cookieValue}; HttpOnly; Path=/; Max-Age=1800; SameSite=Lax`
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 统计数据
 */
async function handleStats(env) {
  try {
    if (!env.FINGERPRINT_DB) {
      return new Response(JSON.stringify({
        success: true,
        stats: {
          totalFingerprints: 0,
          note: 'KV 存储未配置'
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // KV 没有 count 方法，需要自己实现
    return new Response(JSON.stringify({
      success: true,
      stats: {
        totalFingerprints: '使用 KV 后显示',
        note: '需要实现计数器'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 生成指纹 ID
 */
async function generateFingerprintId(fingerprint) {
  const keyComponents = [
    fingerprint.navigator?.userAgent || '',
    fingerprint.screen?.width || '',
    fingerprint.screen?.height || '',
    fingerprint.timezone?.timezone || '',
    fingerprint.canvas?.dataURL || '',
    fingerprint.webgl?.renderer || ''
  ].filter(Boolean);
  
  const keyString = keyComponents.join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(keyString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 国家代码转中文名
 */
function getCountryName(code) {
  const names = {
    'CN': '中国', 'HK': '中国香港', 'TW': '中国台湾',
    'US': '美国', 'JP': '日本', 'KR': '韩国',
    'DE': '德国', 'GB': '英国', 'FR': '法国',
    'CA': '加拿大', 'AU': '澳大利亚', 'RU': '俄罗斯',
    'SG': '新加坡', 'IN': '印度', 'BR': '巴西'
  };
  return names[code] || code;
}

/**
 * 获取文件内容类型
 */
function getContentType(path) {
  const ext = path.split('.').pop().toLowerCase();
  const types = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg'
  };
  return types[ext] || 'text/plain';
}

/**
 * 首页 HTML
 */
function getHomeHTML(hostname) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CreepJS 反爬虫系统 - Cloudflare Workers</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
    h1 { color: #667eea; }
    .card { background: #f8f9ff; padding: 20px; border-radius: 12px; margin: 20px 0; }
    .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; margin: 10px 10px 10px 0; }
    .btn:hover { background: #5568d3; }
    code { background: #edf2f7; padding: 2px 8px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>🚀 CreepJS 反爬虫指纹系统</h1>
  <p>基于 Cloudflare Workers 的边缘计算反爬虫解决方案</p>
  
  <div class="card">
    <h2>📊 功能特性</h2>
    <ul>
      <li>✅ 浏览器指纹采集（50+ 维度）</li>
      <li>✅ 自动化工具检测（WebDriver/无头浏览器）</li>
      <li>✅ IP 地理位置信息（Cloudflare 提供）</li>
      <li>✅ 风险评分与决策（ALLOW/CHALLENGE/BLOCK）</li>
      <li>✅ Cookie 持久化（30 分钟）</li>
      <li>✅ KV 存储历史记录（可选）</li>
    </ul>
  </div>
  
  <div class="card">
    <h2>🔧 API 端点</h2>
    <p><code>GET /api/ip-info</code> - 获取客户端 IP 和地理信息</p>
    <p><code>POST /api/fingerprint</code> - 指纹风险分析</p>
    <p><code>GET /api/stats</code> - 统计数据</p>
  </div>
  
  <div class="card">
    <h2>🌐 测试页面</h2>
    <p><a href="/examples/interpreter.html" class="btn">指纹深度解读器</a></p>
    <p style="color: #666; font-size: 14px;">自动采集指纹并分析风险，包含详细的 IP 信息和风险评估</p>
  </div>
  
  <div class="card">
    <h2>📖 使用说明</h2>
    <ol>
      <li>访问 <a href="/examples/interpreter.html">/examples/interpreter.html</a> 测试指纹采集</li>
      <li>页面会自动采集指纹并发送到 <code>/api/fingerprint</code></li>
      <li>返回风险评分和决策结果</li>
      <li>设置 Cookie 用于后续页面访问控制</li>
    </ol>
  </div>
  
  <div class="card">
    <h2>💡 集成到现有网站</h2>
    <pre style="background: #1a202c; color: #e2e8f0; padding: 15px; border-radius: 8px; overflow-x: auto;"><code>&lt;script src="https://${hostname}/docs/creep-lite.js"&gt;&lt;/script&gt;
&lt;script&gt;
  window.CreepLite({
    apiEndpoint: 'https://${hostname}/api/fingerprint',
    cacheEnabled: true
  }).then(fp =&gt; {
    console.log('指纹 ID:', fp.fingerprintId);
  });
&lt;/script&gt;</code></pre>
  </div>
</body>
</html>
  `;
}
