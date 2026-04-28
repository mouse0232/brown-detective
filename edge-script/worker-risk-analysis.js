/**
 * Cloudflare Workers / EdgeScript - 浏览器指纹风险分析
 * 基于 CreepJS 指纹数据的完整风险检测
 */

addEventListener('fetch', event => {
  event.respondWith(handle(event.request))
})

// 配置
const SECRET_KEY = "creepjs-secure-key-2024";  //  HMAC 签名密钥
const TTL = 1800;  // Cookie 过期时间（秒）= 30 分钟

// 风险评分配置
const RISK_SCORES = {
  WEBDRIVER: 50,           // 自动化工具
  HEADLESS: 50,            // 无头浏览器
  SELENIUM: 50,            // Selenium 痕迹
  LIES_DETECTED: 35,       // 指纹谎言 > 5 个
  PLATFORM_MISMATCH: 30,   // 平台矛盾
  VIRTUAL_GPU: 20,         // 虚拟机 GPU
  BRAVE_STRICT: 15,        // Brave 严格模式
  TOR_LIKE: 40,            // Tor 特征
};

async function handle(request) {
  const url = new URL(request.url);
  
  // 只处理 /api/fingerprint POST 请求
  if (url.pathname !== "/api/fingerprint" || request.method !== "POST") {
    return new Response(JSON.stringify({
      success: false,
      error: "Not found"
    }), { 
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const data = await request.json();
    const fp = data.fingerprint;
    
    if (!fp) {
      return new Response(JSON.stringify({
        success: false,
        error: "Missing fingerprint data"
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // ========== 风险分析 ==========
    let riskScore = 0;
    const riskFactors = [];
    const reqUA = request.headers.get("user-agent") || "";

    // 1. WebDriver 检测 (+50)
    if (fp.navigator?.webdriver === true) {
      riskScore += RISK_SCORES.WEBDRIVER;
      riskFactors.push({
        type: 'AUTOMATION_TOOL',
        level: 'high',
        score: RISK_SCORES.WEBDRIVER,
        message: '检测到 WebDriver 特征'
      });
    }

    // 2. 无头浏览器检测 (+50)
    if (fp.headless?.headless === true) {
      riskScore += RISK_SCORES.HEADLESS;
      riskFactors.push({
        type: 'HEADLESS_BROWSER',
        level: 'high',
        score: RISK_SCORES.HEADLESS,
        message: '检测到无头浏览器'
      });
    }

    // 3. Selenium 检测 (+50)
    if (fp.headless?.selenium === true) {
      riskScore += RISK_SCORES.SELENIUM;
      riskFactors.push({
        type: 'SELENIUM_DETECTED',
        level: 'high',
        score: RISK_SCORES.SELENIUM,
        message: '检测到 Selenium 特征'
      });
    }

    // 4. 指纹谎言检测 (>5 个 +35)
    if (fp.lies?.liesDetected?.length > 5) {
      riskScore += RISK_SCORES.LIES_DETECTED;
      riskFactors.push({
        type: 'FINGERPRINT_LIES',
        level: 'high',
        score: RISK_SCORES.LIES_DETECTED,
        message: `检测到 ${fp.lies.liesDetected.length} 个指纹谎言`
      });
    }

    // 5. 平台矛盾检测 (+30)
    if (fp.navigator?.userAgent && fp.navigator?.platform) {
      const ua = fp.navigator.userAgent;
      const platform = fp.navigator.platform;
      
      const uaHasWin = /win/i.test(ua);
      const uaHasMac = /mac/i.test(ua);
      const uaHasLin = /linux/i.test(ua);
      
      const platIsWin = /win/i.test(platform);
      const platIsMac = /mac/i.test(platform);
      const platIsLin = /lin/i.test(platform);
      
      if ((uaHasWin && !platIsWin) || (uaHasMac && !platIsMac) || (uaHasLin && !platIsLin)) {
        riskScore += RISK_SCORES.PLATFORM_MISMATCH;
        riskFactors.push({
          type: 'PLATFORM_MISMATCH',
          level: 'medium',
          score: RISK_SCORES.PLATFORM_MISMATCH,
          message: 'UserAgent 与 Platform 不一致'
        });
      }
    }

    // 6. 虚拟机 GPU 检测 (+20)
    if (fp.webgl?.renderer) {
      const renderer = fp.webgl.renderer;
      if (/swiftshader|vmware|virtualbox|qemu/i.test(renderer)) {
        riskScore += RISK_SCORES.VIRTUAL_GPU;
        riskFactors.push({
          type: 'VIRTUAL_GPU',
          level: 'medium',
          score: RISK_SCORES.VIRTUAL_GPU,
          message: '检测到虚拟机/软件渲染 GPU'
        });
      }
    }

    // 7. Brave 严格模式检测 (+15)
    if (fp.headless?.braveMode?.strict) {
      riskScore += RISK_SCORES.BRAVE_STRICT;
      riskFactors.push({
        type: 'BRAVE_STRICT',
        level: 'low',
        score: RISK_SCORES.BRAVE_STRICT,
        message: 'Brave 浏览器严格模式'
      });
    }

    // 8. UA 比对（前端 UA 与请求头 UA 不一致 +30）
    if (fp.navigator?.userAgent && reqUA && fp.navigator.userAgent !== reqUA) {
      riskScore += 30;
      riskFactors.push({
        type: 'UA_MISMATCH',
        level: 'medium',
        score: 30,
        message: '前端 UA 与请求头 UA 不一致'
      });
    }

    // ========== 判定风险等级 ==========
    let level, decision;
    
    if (riskScore >= 70) {
      level = 'critical';
      decision = 'BLOCK';
    } else if (riskScore >= 50) {
      level = 'high';
      decision = 'CHALLENGE';
    } else if (riskScore >= 30) {
      level = 'medium';
      decision = 'CHALLENGE';
    } else if (riskScore >= 10) {
      level = 'low';
      decision = 'ALLOW';
    } else {
      level = 'minimal';
      decision = 'ALLOW';
    }

    // ========== 生成 Token ==========
    const ts = Math.floor(Date.now() / 1000);
    const payload = `${ts}.${riskScore}.${decision}`;
    const signStr = await hmacSign(payload + (fp.fingerprintId || '') + reqUA, SECRET_KEY);
    const token = `${payload}.${signStr}`;

    // ========== 设置 Cookie ==========
    const cookieOptions = [
      `device_token=${token}`,
      'HttpOnly',
      'Path=/',
      'SameSite=Strict',
      `Max-Age=${TTL}`
    ];

    // HTTPS 环境下添加 Secure
    if (url.protocol === 'https:') {
      cookieOptions.push('Secure');
    }

    // ========== 返回结果 ==========
    return new Response(JSON.stringify({
      success: true,
      fingerprintId: fp.fingerprintId || '',
      riskScore: riskScore,
      level: level,
      decision: decision,
      risks: riskFactors,
      analysis: {
        riskScore: riskScore,
        level: level,
        decision: decision,
        risks: riskFactors
      },
      timestamp: Date.now()
    }), {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookieOptions.join('; ')
      }
    });

  } catch (e) {
    console.error('EdgeScript Error:', e);
    return new Response(JSON.stringify({
      success: false,
      error: e.message
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// HMAC-SHA256 签名
async function hmacSign(data, key) {
  const enc = new TextEncoder();
  const kBuf = enc.encode(key);
  const dBuf = enc.encode(data);
  
  const ck = await crypto.subtle.importKey(
    "raw", 
    kBuf, 
    { name: "HMAC", hash: "SHA-256" }, 
    false, 
    ["sign"]
  );
  
  const res = await crypto.subtle.sign("HMAC", ck, dBuf);
  
  return Array.from(new Uint8Array(res))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
