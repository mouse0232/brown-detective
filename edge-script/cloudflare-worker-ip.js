/**
 * Cloudflare Workers - IP 信息采集与反爬虫分析
 * 
 * 功能：
 * 1. 获取客户端真实 IP（无需 WebRTC）
 * 2. 提供详细地理位置信息（Cloudflare 自带）
 * 3. ASN/ISP 信息
 * 4. 可选：集成指纹风险分析
 * 
 * 部署方法：
 * 1. 登录 https://workers.cloudflare.com
 * 2. 创建新 Worker
 * 3. 粘贴此代码
 * 4. 部署并绑定域名
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // ============================================
    // API: 返回客户端 IP 和地理信息
    // ============================================
    if (url.pathname === '/api/ip-info') {
      return handleIPInfo(request);
    }
    
    // ============================================
    // API: IP 地理信息查询（指定 IP）
    // ============================================
    if (url.pathname === '/api/ip-geo') {
      const ip = url.searchParams.get('ip');
      if (!ip) {
        return new Response(JSON.stringify({ success: false, error: '缺少 IP 参数' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return handleIPGeo(ip);
    }
    
    // ============================================
    // API: 指纹风险分析（可选）
    // ============================================
    if (url.pathname === '/api/fingerprint' && request.method === 'POST') {
      return handleFingerprint(request);
    }
    
    // ============================================
    // 静态文件服务（可选 - 如果需要托管前端）
    // ============================================
    return handleStaticFiles(request, env);
  }
};

/**
 * 获取客户端 IP 和地理信息
 */
function handleIPInfo(request) {
  // Cloudflare 自动注入的 IP 头
  const ip = request.headers.get('CF-Connecting-IP') || 
             request.headers.get('X-Forwarded-For')?.split(',')[0] || 
             'unknown';
  
  // Cloudflare 提供的地理位置数据（无需额外查询）
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
    // 额外信息
    protocol: cf.httpProtocol || 'unknown',
    tlsVersion: cf.tlsVersion || '-',
    cipher: cf.tlsCipher || '-',
    edgeColo: cf.colo || '-',  // Cloudflare 数据中心代码
    continent: cf.continent || '-'
  };
  
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',  // 允许跨域
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'max-age=60'  // 缓存 1 分钟
    }
  });
}

/**
 * 查询指定 IP 的地理信息
 */
async function handleIPGeo(ip) {
  try {
    // 使用 ip-api.com（Workers 环境没有 CORS 限制）
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,isp,timezone,lat,lon,as,org`);
    const data = await response.json();
    
    if (data.status === 'success') {
      return new Response(JSON.stringify({
        success: true,
        ip: ip,
        country: data.country,
        region: data.regionName,
        city: data.city,
        isp: data.isp,
        org: data.org,
        timezone: data.timezone,
        latitude: data.lat,
        longitude: data.lon,
        as: data.as
      }, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: data.message || '查询失败'
      }, {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * 指纹风险分析（简化版）
 */
async function handleFingerprint(request) {
  try {
    const body = await request.json();
    const { fingerprint } = body;
    
    if (!fingerprint) {
      return new Response(JSON.stringify({
        success: false,
        error: '缺少 fingerprint 数据'
      }, {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    // 获取客户端 IP
    const ip = request.headers.get('CF-Connecting-IP');
    const cf = request.cf || {};
    
    // 风险分析
    const risks = [];
    let riskScore = 0;
    
    // 无头浏览器检测
    if (fingerprint.headless?.riskLevel === 'high' || fingerprint.headless?.headless === true) {
      risks.push({ type: 'HEADLESS_BROWSER', level: 'high', score: 40 });
      riskScore += 40;
    }
    
    // WebDriver 检测
    if (fingerprint.navigator?.webdriver === true) {
      risks.push({ type: 'AUTOMATION_TOOL', level: 'high', score: 50 });
      riskScore += 50;
    }
    
    // 云服务 IP 检测
    const cloudProviders = ['amazon', 'google', 'microsoft', 'azure', 'aws', 'digitalocean', 'linode'];
    const isp = (cf.isp || '').toLowerCase();
    const isCloudIP = cloudProviders.some(p => isp.includes(p));
    
    if (isCloudIP) {
      risks.push({ type: 'CLOUD_IP', level: 'medium', score: 20 });
      riskScore += 20;
    }
    
    // 风险等级判定
    let level = 'low';
    let decision = 'ALLOW';
    
    if (riskScore >= 70) {
      level = 'critical';
      decision = 'BLOCK';
    } else if (riskScore >= 50) {
      level = 'high';
      decision = 'CHALLENGE';
    } else if (riskScore >= 30) {
      level = 'medium';
      decision = 'MONITOR';
    }
    
    // 生成指纹 ID
    const fingerprintId = generateFingerprintId(fingerprint);
    
    return new Response(JSON.stringify({
      success: true,
      fingerprintId: fingerprintId,
      analysis: {
        riskScore,
        level,
        decision,
        risks
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
        'Set-Cookie': `device_token=${decision}:${riskScore}:${Date.now()}; HttpOnly; Path=/; Max-Age=1800`
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * 静态文件服务（可选）
 */
async function handleStaticFiles(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 如果你有绑定自定义域名并上传文件到 R2/KV，可以在这里服务
  // 这里简单处理：重定向到主域名
  
  // 示例：从 KV 读取文件
  // if (MY_ASSETS) {
  //   const asset = await MY_ASSETS.get(path.substring(1));
  //   if (asset) {
  //     return new Response(asset, {
  //       headers: {
  //         'Content-Type': getContentType(path)
  //       }
  //     });
  //   }
  // }
  
  // 默认：返回 404
  return new Response('Not Found', { status: 404 });
}

/**
 * 生成指纹 ID（简化 SHA-256）
 */
async function generateFingerprintId(fingerprint) {
  const keyComponents = [
    fingerprint.navigator?.userAgent || '',
    fingerprint.screen?.width || '',
    fingerprint.screen?.height || '',
    fingerprint.timezone?.timezone || '',
    fingerprint.canvas?.dataURL || '',
  ].filter(Boolean);
  
  const keyString = keyComponents.join('|');
  
  // 使用 Web Crypto API 生成哈希
  const encoder = new TextEncoder();
  const data = encoder.encode(keyString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * 国家代码转中文名（简化版）
 */
function getCountryName(code) {
  const names = {
    'CN': '中国',
    'US': '美国',
    'JP': '日本',
    'KR': '韩国',
    'DE': '德国',
    'GB': '英国',
    'FR': '法国',
    'CA': '加拿大',
    'AU': '澳大利亚',
    'RU': '俄罗斯'
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
    'jpg': 'image/jpeg',
    'svg': 'image/svg+xml'
  };
  return types[ext] || 'text/plain';
}
