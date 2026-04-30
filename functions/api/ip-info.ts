/**
 * GET /api/ip-info
 * 获取客户端 IP 和地理信息
 * Cloudflare Pages Function
 */

export async function onRequest(context) {
  const { request } = context;
  
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
    timezone: cf.timezone || '-',
    latitude: cf.latitude || 0,
    longitude: cf.longitude || 0,
    asn: cf.asn || '-',
    continent: cf.continent || '-',
    edgeColo: cf.colo || '-',
    httpProtocol: cf.httpProtocol || '-'
  };
  
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'max-age=60'
    }
  });
}

function getCountryName(code) {
  const names = {
    'CN': '中国', 'HK': '中国香港', 'TW': '中国台湾',
    'US': '美国', 'JP': '日本', 'KR': '韩国',
    'DE': '德国', 'GB': '英国', 'FR': '法国',
    'CA': '加拿大', 'AU': '澳大利亚', 'RU': '俄罗斯',
    'SG': '新加坡', 'IN': '印度', 'BR': '巴西'
  };
  return names[code] || code || '-';
}
