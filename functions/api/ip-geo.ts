/**
 * GET /api/ip-geo
 * 查询指定 IP 的地理信息
 * Cloudflare Pages Function
 */

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const ip = url.searchParams.get('ip');
  
  if (!ip) {
    return new Response(JSON.stringify({
      success: false,
      error: '缺少 IP 参数'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: data.message || '查询失败'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
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
