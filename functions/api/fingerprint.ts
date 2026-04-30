/**
 * POST /api/fingerprint
 * 指纹风险分析
 * Cloudflare Pages Function
 */

export async function onRequestPost(context) {
  const { request } = context;
  
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
    let riskScore = 0;
    const risks = [];
    
    // 1. 无头浏览器检测 (+50)
    if (fingerprint.headless?.headless === true || 
        fingerprint.headless?.riskLevel === 'high') {
      risks.push({ type: 'HEADLESS', score: 50 });
      riskScore += 50;
    }
    
    // 2. WebDriver 检测 (+50)
    if (fingerprint.navigator?.webdriver === true) {
      risks.push({ type: 'WEBDRIVER', score: 50 });
      riskScore += 50;
    }
    
    // 3. 云服务 IP 检测 (+20)
    const cloudProviders = ['amazon', 'google', 'microsoft', 'azure', 'aws', 'digitalocean', 'linode'];
    const isp = (cf.isp || '').toLowerCase();
    if (cloudProviders.some(p => isp.includes(p))) {
      risks.push({ type: 'CLOUD_IP', score: 20 });
      riskScore += 20;
    }
    
    // 4. Canvas 指纹 (+10)
    if (fingerprint.canvas?.dataURL) {
      risks.push({ type: 'CANVAS_FINGERPRINT', score: 10 });
      riskScore += 10;
    }
    
    // 判定等级
    let decision = 'ALLOW';
    let level = 'low';
    
    if (riskScore >= 70) {
      decision = 'BLOCK';
      level = 'critical';
    } else if (riskScore >= 50) {
      decision = 'CHALLENGE';
      level = 'high';
    } else if (riskScore >= 30) {
      decision = 'MONITOR';
      level = 'medium';
    }
    
    // 生成指纹 ID
    const fingerprintId = await generateHash(JSON.stringify(fingerprint));
    
    // 设置 Cookie
    const cookieValue = `${decision}:${riskScore}:${Date.now()}`;
    
    return new Response(JSON.stringify({
      success: true,
      fingerprintId: fingerprintId,
      decision: decision,
      riskScore: riskScore,
      level: level,
      risks: risks,
      clientIP: ip,
      geo: {
        country: cf.country,
        region: cf.region,
        city: cf.city,
        isp: cf.isp
      },
      timestamp: Date.now()
    }, null, 2), {
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

// GET 请求处理
export async function onRequest(context) {
  return new Response('Use POST to analyze fingerprint', { 
    status: 405,
    headers: { 'Content-Type': 'text/plain' }
  });
}

async function generateHash(data) {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
