# 腾讯 EO EdgeScript - 浏览器指纹风险分析脚本
# 用途：接收前端上传的指纹数据，分析风险等级，设置 Cookie

# ============================================
# 1. 风险检测规则配置
# ============================================

# 高风险行为（直接拦截）
$RISK_AUTOMATION_TOOL = 50      # WebDriver/Selenium 等
$RISK_HEADLESS = 50             # 无头浏览器
$RISK_BLACKLIST = 100           # 黑名单指纹

# 中风险行为（需要验证）
$RISK_LIES = 35                 # 指纹谎言 > 5 个
$RISK_CONTRADICTION = 30        # 特征矛盾
$RISK_HIGH_FREQUENCY = 30       # 高频访问

# 低风险行为（仅记录）
$RISK_FIRST_VISIT = 10          # 首次访问
$RISK_FAST_COLLECTION = 10      # 采集过快

# ============================================
# 2. 只处理 POST 请求
# ============================================

if ($request_method != 'POST') {
    $http_response_status = 405;
    $http_response_header = "Content-Type: application/json";
    echo json_encode({
        'success': false,
        'error': 'Method not allowed'
    });
    exit;
}

# ============================================
# 3. 解析请求体中的指纹数据
# ============================================

$body = $http_request_body;
$fp_data = json_decode($body);

# 检查是否有 fingerprint 字段
if (!isset($fp_data->fingerprint)) {
    $http_response_status = 400;
    $http_response_header = "Content-Type: application/json";
    echo json_encode({
        'success': false,
        'error': 'Missing fingerprint data'
    });
    exit;
}

$fp = $fp_data->fingerprint;

# ============================================
# 4. 计算风险评分
# ============================================

$risk_score = 0;
$risk_factors = [];

# 4.1 自动化工具检测（+50 分）
if (isset($fp->navigator) && $fp->navigator->webdriver == true) {
    $risk_score += $RISK_AUTOMATION_TOOL;
    array_push($risk_factors, {
        'type': 'AUTOMATION_TOOL',
        'level': 'high',
        'score': $RISK_AUTOMATION_TOOL,
        'message': '检测到 WebDriver 特征'
    });
}

# 4.2 无头浏览器检测（+50 分）
if (isset($fp->headless)) {
    if ($fp->headless->headless == true) {
        $risk_score += $RISK_HEADLESS;
        array_push($risk_factors, {
            'type': 'HEADLESS_BROWSER',
            'level': 'high',
            'score': $RISK_HEADLESS,
            'message': '检测到无头浏览器'
        });
    }
    
    if (isset($fp->headless->selenium) && $fp->headless->selenium == true) {
        $risk_score += $RISK_AUTOMATION_TOOL;
        array_push($risk_factors, {
            'type': 'SELENIUM_DETECTED',
            'level': 'high',
            'score': $RISK_AUTOMATION_TOOL,
            'message': '检测到 Selenium 特征'
        });
    }
}

# 4.3 指纹谎言检测（+35 分）
if (isset($fp->lies) && isset($fp->lies->liesDetected)) {
    $lies_count = count($fp->lies->liesDetected);
    if ($lies_count > 5) {
        $risk_score += $RISK_LIES;
        array_push($risk_factors, {
            'type': 'FINGERPRINT_LIES',
            'level': 'high',
            'score': $RISK_LIES,
            'message': '检测到 ' . $lies_count . ' 个指纹谎言'
        });
    }
}

# 4.4 平台矛盾检测（+30 分）
if (isset($fp->navigator) && isset($fp->navigator->userAgent) && isset($fp->navigator->platform)) {
    $ua = $fp->navigator->userAgent;
    $platform = $fp->navigator->platform;
    
    # UA 显示 Windows 但 platform 显示 Linux
    if (str_contains($ua, 'Windows') && str_contains($platform, 'Linux')) {
        $risk_score += $RISK_CONTRADICTION;
        array_push($risk_factors, {
            'type': 'PLATFORM_CONTRADICTION',
            'level': 'medium',
            'score': $RISK_CONTRADICTION,
            'message': 'UserAgent 与 Platform 不一致'
        });
    }
}

# 4.5 WebGL 异常检测（+20 分）
if (isset($fp->webgl)) {
    # 检查是否有异常的 GPU 信息
    if (isset($fp->webgl->renderer)) {
        $renderer = $fp->webgl->renderer;
        
        # Google SwiftShader 是软件渲染，常用于爬虫
        if (str_contains($renderer, 'SwiftShader') || str_contains($renderer, 'VMware')) {
            $risk_score += 20;
            array_push($risk_factors, {
                'type': 'VIRTUAL_GPU',
                'level': 'medium',
                'score': 20,
                'message': '检测到虚拟机/软件渲染 GPU'
            });
        }
    }
}

# ============================================
# 5. 判定风险等级和决策
# ============================================

$risk_level = 'allow';
$decision = 'ALLOW';

if ($risk_score >= 70) {
    $risk_level = 'block';
    $decision = 'BLOCK';
    $risk_level_text = 'critical';
} else if ($risk_score >= 50) {
    $risk_level = 'challenge';
    $decision = 'CHALLENGE';
    $risk_level_text = 'high';
} else if ($risk_score >= 30) {
    $risk_level = 'challenge';
    $decision = 'CHALLENGE';
    $risk_level_text = 'medium';
} else if ($risk_score >= 10) {
    $risk_level = 'monitor';
    $decision = 'ALLOW';
    $risk_level_text = 'low';
} else {
    $risk_level = 'allow';
    $decision = 'ALLOW';
    $risk_level_text = 'minimal';
}

# ============================================
# 6. 设置 Cookie（有效期 30 分钟）
# ============================================

$cookie_max_age = 1800;  # 30 分钟

# 风险等级 Cookie
$http_response_header = "Set-Cookie: risk_level=${risk_level}; Path=/; Max-Age=${cookie_max_age}; SameSite=Lax; Secure";

# 风险评分 Cookie（可选，用于调试）
$http_response_header .= ", Set-Cookie: risk_score=${risk_score}; Path=/; Max-Age=${cookie_max_age}; SameSite=Lax; Secure";

# 指纹 ID Cookie（可选，用于追踪）
if (isset($fp->fingerprintId)) {
    $http_response_header .= ", Set-Cookie: fingerprint_id=${fp->fingerprintId}; Path=/; Max-Age=${cookie_max_age}; SameSite=Lax; Secure";
}

# 设置响应类型为 JSON
$http_response_header .= ", Content-Type: application/json";

# ============================================
# 7. 返回分析结果
# ============================================

$response = {
    'success': true,
    'fingerprintId': isset($fp->fingerprintId) ? $fp->fingerprintId : '',
    'risk_level': $risk_level,
    'risk_score': $risk_score,
    'decision': $decision,
    'analysis': {
        'riskScore': $risk_score,
        'level': $risk_level_text,
        'decision': $decision,
        'risks': $risk_factors
    },
    'timestamp': time() * 1000
};

echo json_encode($response);

# ============================================
# 8. 日志记录（可选，用于调试和审计）
# ============================================

# 记录到 EdgeScript 日志
$log_data = {
    'time': now(),
    'ip': $remote_addr,
    'fingerprintId': isset($fp->fingerprintId) ? $fp->fingerprintId : 'unknown',
    'risk_score': $risk_score,
    'risk_level': $risk_level,
    'decision': $decision,
    'userAgent': $http_user_agent
};

# 输出日志（可以在腾讯云控制台查看）
echo_log('creepjs_analysis', json_encode($log_data));
