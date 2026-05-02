/**
 * Cloudflare Turnstile 验证端点
 * POST /api/verify-turnstile
 * 
 * 验证 Turnstile token 并返回风险评分
 */

export async function onRequestPost(context) {
  const { request } = context;
  const env = context.env;
  
  try {
    const body = await request.json();
    const { token } = body;
    
    if (!token) {
      return Response.json({
        success: false,
        error: '缺少 token'
      }, { status: 400 });
    }
    
    // 从环境变量获取 Secret Key
    const secretKey = env.TURNSTILE_SECRET_KEY;
    
    // 调试日志（部署后删除）
    console.log('[Turnstile] Secret Key 是否存在:', !!secretKey);
    console.log('[Turnstile] Secret Key 前缀:', secretKey ? secretKey.substring(0, 10) + '...' : 'N/A');
    
    if (!secretKey) {
      console.error('[Turnstile] Secret Key 未配置');
      return Response.json({
        success: false,
        error: '服务器配置错误',
        debug: 'TURNSTILE_SECRET_KEY 未设置'
      }, { status: 500 });
    }
    
    // 获取客户端 IP
    const ip = request.headers.get('CF-Connecting-IP') || '';
    
    // 验证 token
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    formData.append('remoteip', ip);
    
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    });
    
    const result = await verifyRes.json();
    
    // Cloudflare 返回格式:
    // {
    //   "success": true/false,
    //   "challenge_ts": "timestamp",
    //   "hostname": "example.com",
    //   "error-codes": [...],
    //   "action": "optional",
    //   "cdata": "optional"
    // }
    
    if (!result.success) {
      console.warn('[Turnstile] 验证失败:', result['error-codes']);
      
      return Response.json({
        success: false,
        error: '验证失败',
        errorCodes: result['error-codes'] || [],
        riskScore: 100, // 验证失败 = 高风险
        riskLevel: 'critical'
      });
    }
    
    // 验证成功，计算风险评分
    let riskScore = 0;
    let riskLevel = 'low';
    const reasons = [];
    
    // 检查 hostname 是否匹配
    const expectedHostname = 'creepjs-antibot.pages.dev';
    if (result.hostname && result.hostname !== expectedHostname) {
      riskScore += 30;
      reasons.push(`Hostname 不匹配 (${result.hostname})`);
    }
    
    // 根据 action 和风险元数据调整评分
    if (result.action) {
      // 如果有自定义 action，可以根据 action 类型调整风险
      // 例如：'login' 比 'view' 风险更高
    }
    
    // 风险等级判定
    if (riskScore >= 50) {
      riskLevel = 'high';
    } else if (riskScore >= 20) {
      riskLevel = 'medium';
    }
    
    console.log('[Turnstile] 验证成功:', { riskScore, riskLevel, reasons });
    
    return Response.json({
      success: true,
      riskScore,
      riskLevel,
      reasons,
      timestamp: result.challenge_ts,
      action: result.action
    });
    
  } catch (e) {
    console.error('[Turnstile] 验证异常:', e);
    return Response.json({
      success: false,
      error: '验证异常',
      message: e.message,
      riskScore: 100,
      riskLevel: 'critical'
    }, { status: 500 });
  }
}
