/**
 * 风险检测端点
 * GET /api/risk-check
 * 
 * 检测：
 * - 代理请求头（Via, X-Forwarded-For, Forwarded 等）
 * - IP 风险（从 Cloudflare 获取）
 * - 多层代理
 */

export async function onRequestGet(context) {
  const { request } = context;
  
  // 收集所有 IP 相关头
  const cfIP = request.headers.get('CF-Connecting-IP') || '';
  const xff = request.headers.get('X-Forwarded-For') || '';
  const via = request.headers.get('Via') || '';
  const forwarded = request.headers.get('Forwarded') || '';
  const xRealIP = request.headers.get('X-Real-IP') || '';
  const clientIP = request.headers.get('Client-IP') || '';
  
  const result = {
    ip: cfIP,
    proxy_detected: false,
    proxy_headers: [],
    risk_score: 0,
    risk_level: 'low',
    details: {
      cf_ip: cfIP,
      xff: xff,
      xff_count: xff ? xff.split(',').length : 0,
      via: via ? true : false,
      forwarded: forwarded ? true : false
    }
  };
  
  // 1. 检测 X-Forwarded-For（多层代理）
  if (xff) {
    const ips = xff.split(',').map(ip => ip.trim());
    if (ips.length >= 3) {
      result.proxy_detected = true;
      result.risk_score += 30;
      result.proxy_headers.push(`多层代理 (${ips.length}层)`);
    } else if (ips.length === 2) {
      result.risk_score += 10;
      result.proxy_headers.push('单层代理');
    }
  }
  
  // 2. 检测 Via 头（代理服务器标志）
  if (via) {
    result.proxy_detected = true;
    result.risk_score += 20;
    result.proxy_headers.push('Via 代理头');
  }
  
  // 3. 检测 Forwarded 头
  if (forwarded) {
    result.proxy_detected = true;
    result.risk_score += 15;
    result.proxy_headers.push('Forwarded 头');
  }
  
  // 4. 其他代理头
  if (xRealIP && xRealIP !== cfIP) {
    result.risk_score += 10;
    result.proxy_headers.push('X-Real-IP 与 CF-IP 不一致');
  }
  
  if (clientIP && clientIP !== cfIP) {
    result.risk_score += 10;
    result.proxy_headers.push('Client-IP 与 CF-IP 不一致');
  }
  
  // 5. 风险等级判定
  if (result.risk_score >= 50) {
    result.risk_level = 'high';
  } else if (result.risk_score >= 20) {
    result.risk_level = 'medium';
  }
  
  // 调试日志（在 Cloudflare Dashboard 查看）
  console.log('Risk Check:', JSON.stringify(result));
  
  return Response.json(result);
}
