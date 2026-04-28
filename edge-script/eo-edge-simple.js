/**
 * 腾讯 EO EdgeScript - 浏览器指纹风险分析（测试版）
 * 直接返回明文风险等级，方便调试
 */

addEventListener('fetch', event => {
  event.respondWith(handle(event.request))
})

// Cookie 过期时间：30 分钟
const TTL = 1800;

async function handle(request) {
  const url = new URL(request.url);
  
  // 只处理 /api/fingerprint POST 请求
  if (url.pathname !== "/api/fingerprint" || request.method !== "POST") {
    return new Response("404 Not Found", { status: 404 });
  }

  try {
    const data = await request.json();
    const fp = data.fingerprint;
    
    if (!fp) {
      return new Response("Missing fingerprint", { status: 400 });
    }

    // ========== 风险分析 ==========
    let riskScore = 0;
    const riskFactors = [];

    // 1. WebDriver 检测 (+50)
    if (fp.navigator?.webdriver === true) {
      riskScore += 50;
      riskFactors.push('WebDriver 检测通过');
    }

    // 2. 无头浏览器检测 (+50)
    if (fp.headless?.headless === true) {
      riskScore += 50;
      riskFactors.push('无头浏览器检测通过');
    }

    // 3. Selenium 检测 (+50)
    if (fp.headless?.selenium === true) {
      riskScore += 50;
      riskFactors.push('Selenium 检测通过');
    }

    // 4. 指纹谎言检测 (>5 个 +35)
    if (fp.lies?.liesDetected && fp.lies.liesDetected.length > 5) {
      riskScore += 35;
      riskFactors.push(`发现 ${fp.lies.liesDetected.length} 个指纹谎言`);
    }

    // 5. Canvas 检测 (如果有 canvas 数据，说明不是简单爬虫)
    if (fp.canvas?.dataURL) {
      riskScore -= 10;  // 有 canvas 指纹，减分
    }

    // 6. WebGL 检测
    if (fp.webgl?.renderer) {
      const renderer = fp.webgl.renderer;
      // 虚拟机 GPU (+20)
      if (/swiftshader|vmware|virtualbox/i.test(renderer)) {
        riskScore += 20;
        riskFactors.push('虚拟机 GPU');
      }
    }

    // 风险上限 100
    riskScore = Math.min(100, riskScore);

    // ========== 判定风险等级 ==========
    let riskLevel = 'allow';
    let decision = 'ALLOW';
    
    if (riskScore >= 70) {
      riskLevel = 'block';
      decision = 'BLOCK';
    } else if (riskScore >= 30) {
      riskLevel = 'challenge';
      decision = 'CHALLENGE';
    } else {
      riskLevel = 'allow';
      decision = 'ALLOW';
    }

    // ========== 设置 Cookie（明文） ==========
    const cookieValue = `${riskLevel}:${riskScore}:${Date.now()}`;
    
    return new Response(JSON.stringify({
      success: true,
      fingerprintId: fp.fingerprintId || 'N/A',
      riskScore: riskScore,
      riskLevel: riskLevel,
      decision: decision,
      riskFactors: riskFactors,
      cookieValue: cookieValue  // 返回 Cookie 值，方便调试
    }), {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `device_token=${cookieValue}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${TTL}`
      }
    });

  } catch (e) {
    return new Response("Error: " + e.message, { status: 500 });
  }
}
