// 解读器逻辑
let fingerprintData = null;

function showLoading(text = '正在分析指纹数据...') {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('results').classList.remove('hidden');
}

function analyzeData(data = null) {
    // 支持直接传入数据
    if (data) {
        fingerprintData = data;
        showResults();
        return;
    }

    const fpId = document.getElementById('fingerprintIdInput').value.trim();
    const jsonStr = document.getElementById('jsonInput').value.trim();

    if (jsonStr) {
        try {
            fingerprintData = JSON.parse(jsonStr);
            showResults();
        } catch (e) {
            alert('JSON 格式错误，请检查后重试\n\n错误：' + e.message);
        }
    } else if (fpId) {
        fingerprintData = { fingerprintId: fpId, version: 'manual', timestamp: Date.now() };
        showResults();
    } else {
        alert('请填写 FP ID 或粘贴完整 JSON 数据');
    }
}

function loadFromStorage() {
    showLoading('正在从本地存储加载...');
    setTimeout(() => {
        const stored = localStorage.getItem('creepjs_data');
        if (stored) {
            try {
                fingerprintData = JSON.parse(stored);
                showResults();
            } catch (e) {
                const possibleKeys = ['creepjs_fingerprint', 'creep_fingerprint', 'fingerprint_data', 'fp_data'];
                for (const key of possibleKeys) {
                    const data = localStorage.getItem(key);
                    if (data) {
                        fingerprintData = JSON.parse(data);
                        showResults();
                        return;
                    }
                }
                alert('未能从本地存储找到指纹数据');
                hideLoading();
            }
        } else {
            alert('本地存储中没有指纹数据\n请先访问官方 CreepJS 页面完成采集');
            hideLoading();
        }
    }, 500);
}

function generateDemoData() {
    showLoading('正在生成测试数据...');
    setTimeout(() => {
        fingerprintData = {
            fingerprintId: 'demo_' + Math.random().toString(36).substring(2, 18),
            version: 'lite',
            timestamp: Date.now(),
            collectionTime: 150 + Math.random() * 100,
            navigator: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                webdriver: navigator.webdriver || false,
                hardwareConcurrency: navigator.hardwareConcurrency || 4,
                deviceMemory: navigator.deviceMemory || 8,
                maxTouchPoints: navigator.maxTouchPoints || 0
            },
            screen: {
                width: screen.width,
                height: screen.height,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight,
                colorDepth: screen.colorDepth,
                pixelRatio: window.devicePixelRatio,
                orientation: screen.orientation?.type || 'landscape-primary'
            },
            timezone: {
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                offset: -new Date().getTimezoneOffset() / 60,
                language: Intl.DateTimeFormat().resolvedOptions().locale
            },
            webgl: {
                vendor: 'Intel Inc.',
                renderer: 'Intel Iris OpenGL Engine',
                version: 'WebGL 1.0 (OpenGL ES 2.0)'
            },
            headless: { headless: false, riskLevel: 'low', selenium: false }
        };
        showResults();
    }, 300);
}

function clearData() {
    if (confirm('确定要清除当前的指纹数据吗？')) {
        fingerprintData = null;
        document.getElementById('fingerprintIdInput').value = '';
        document.getElementById('jsonInput').value = '';
        document.getElementById('results').classList.add('hidden');
        alert('数据已清除');
    }
}

function showResults() {
    hideLoading();
    const fpId = fingerprintData?.fingerprintId || 'N/A';
    document.getElementById('fpIdDisplay').textContent = fpId;
    document.getElementById('fpVersion').textContent = fingerprintData?.version || '-';
    
    const timestamp = fingerprintData?.timestamp;
    if (timestamp) {
        const date = new Date(timestamp);
        document.getElementById('fpTimestamp').textContent = date.toLocaleString('zh-CN');
    }

    const duration = fingerprintData?.collectionTime;
    if (duration) {
        document.getElementById('fpDuration').textContent = Math.round(duration) + 'ms';
        document.getElementById('collectionTime').textContent = Math.round(duration) + 'ms';
    }

    calculatePrivacyScore();
    renderCategories();
    renderAdvancedAnalysis();
    
    // 注册 Turnstile 验证回调，验证成功后重新计算评分
    window.onTurnstileVerified = function(result) {
        calculatePrivacyScore();
        renderCategories();
        updateMonitorStatus();
    };
    
    // 如果 Turnstile 已经完成验证，立即重新计算一次
    if (window.TurnstileResult?.success) {
        calculatePrivacyScore();
        renderCategories();
    }
    
    // 更新 fp-monitor 安全监控面板
    updateMonitorStatus();
    
    // 等待 IP 采集完成后再次渲染
    if (!window.IPInfoReady) {
        const waitForIP = setInterval(() => {
            if (window.IPInfoReady) {
                clearInterval(waitForIP);
                renderCategories();
            }
        }, 500);
    }
}

function getRiskClass(score) {
    if (score >= 40) return 'high';
    if (score >= 20) return 'medium';
    return 'low';
}

function getRiskText(level) {
    const map = { 'low': '低', 'medium': '中', 'high': '高', 'critical': '严重' };
    return map[level] || level;
}

/**
 * 更新 fp-monitor 安全监控面板状态
 */
function updateMonitorStatus() {
    const monitorStatus = document.getElementById('monitorStatus');
    if (!monitorStatus) return;
    
    // 检查 fp-monitor 是否可用
    const checkStatus = window.FpMonitor?.getCheckStatus?.();
    if (!checkStatus) {
        monitorStatus.innerHTML = '<div style="color:#999;font-size:14px;">⚠️ fp-monitor 未加载</div>';
        return;
    }
    
    // 调用代理检测 API
    checkProxyRisk();
    
    // 统计检测结果
    const checks = [
        { id: 'check-readonly', name: '只读属性', status: checkStatus.readonly },
        { id: 'check-apihook', name: 'API Hook', status: checkStatus.apihook },
        { id: 'check-fingerprint-browser', name: '指纹浏览器', status: checkStatus.fingerprintBrowser },
        { id: 'check-ua', name: 'UA 逻辑', status: checkStatus.ua },
        { id: 'check-webgl', name: 'WebGL', status: checkStatus.webgl },
        { id: 'check-prototype', name: '原型链', status: checkStatus.prototype },
        { id: 'check-canvas', name: 'Canvas 一致性', status: checkStatus.canvas },
        { id: 'check-proxy', name: '代理头', status: window.ProxyRiskScore !== undefined ? (window.ProxyRiskScore > 0 ? { status: 'bad', reasons: [`风险分：${window.ProxyRiskScore}`] } : { status: 'ok', reasons: [] }) : { status: 'checking', reasons: [] } },
    ];
    
    // 更新每个检测项的状态
    for (const check of checks) {
        const el = document.getElementById(check.id);
        if (!el) continue;
        
        if (check.status.status === 'ok') {
            el.innerHTML = '✅ 正常';
        } else if (check.status.status === 'bad') {
            const reasons = check.status.reasons.join('、');
            el.innerHTML = `❌ 异常 <span style="color:#999;font-size:12px;">(${reasons}${typeof reasons === 'string' && reasons.length > 30 ? '...' : ''})</span>`;
        } else {
            el.innerHTML = '🔄 检测中';
        }
    }
    
    // 汇总状态
    const badChecks = checks.filter(c => c.status.status === 'bad');
    if (badChecks.length > 0) {
        monitorStatus.innerHTML = `<div style="color:#dc3545;font-size:14px;">⚠️ 检测到 ${badChecks.length} 项异常</div>`;
    } else {
        monitorStatus.innerHTML = '<div style="color:#28a745;font-size:14px;">✅ 所有检测通过</div>';
    }
}

/**
 * 调用后端代理风险检测 API
 */
async function checkProxyRisk() {
    if (window.ProxyRiskScore !== undefined) return; // 避免重复调用
    
    try {
        const res = await fetch('/api/risk-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await res.json();
        window.ProxyRiskScore = result.riskScore || 0;
        
        // 更新检测结果
        const checkEl = document.getElementById('check-proxy');
        if (checkEl) {
            if (window.ProxyRiskScore > 0) {
                checkEl.innerHTML = `❌ 异常 <span style="color:#999;font-size:12px;">(风险分：${window.ProxyRiskScore})</span>`;
            } else {
                checkEl.innerHTML = '✅ 正常';
            }
        }
        
        // 更新监控总状态
        updateMonitorStatus();
        
    } catch (e) {
        console.error('[Proxy] 检测失败:', e);
        window.ProxyRiskScore = 0;
    }
}

function getRiskText(level) {
    const map = { 'low': '低', 'medium': '中', 'high': '高', 'critical': '严重' };
    return map[level] || level;
}

function getDynamicRiskLevel(categoryKey, data, defaultLevel) {
    // 根据实际检测结果动态调整风险等级
    if (categoryKey === 'headless') {
        const isHeadless = data?.headless?.hasHeadlessUA || data?.headless?.webDriverIsOn || data?.headlessRating > 50;
        return isHeadless ? 'critical' : 'low';
    }
    // 字体列表：根据字体数量动态调整
    if (categoryKey === 'fonts') {
        const fontCount = (data?.fontFaceLoadFonts || data?.list || []).length;
        // Windows 默认 10-20 种，Mac 200-300 种
        if (fontCount < 50) return 'low';  // 正常范围
        if (fontCount < 100) return 'medium';  // 较多
        return 'high';  // 非常多，独特性高
    }
    // 屏幕特征：根据分辨率常见程度动态调整
    if (categoryKey === 'screen') {
        const width = data?.width;
        const height = data?.height;
        // 1920x1080 是最常见的分辨率（约 20% 用户）
        const isCommonResolution = (width === 1920 && height === 1080) || 
                                    (width === 1366 && height === 768) ||
                                    (width === 2560 && height === 1440);
        // 可用尺寸与总尺寸差异小，说明是全屏或任务栏自动隐藏
        const isFullscreen = Math.abs((data?.availWidth || 0) - (width || 0)) < 10 &&
                            Math.abs((data?.availHeight || 0) - (height || 0)) < 10;
        // 常见分辨率 + 全屏 = 低风险
        if (isCommonResolution || isFullscreen) {
            return 'low';
        }
        // 非标准分辨率 = 中等风险
        return 'medium';
    }
    // IP 网络信息：根据 IP 类型和一致性动态调整
    if (categoryKey === 'network') {
        const network = data || window.IPInfo;
        if (!network) return defaultLevel;
        
        // 检测 IP 不一致（WebRTC vs Cloudflare）- 强代理特征 → 高风险
        if (window.IPInfoDual?.mismatch) return 'high';
        
        // 检测云服务商（常见爬虫 IP 段）
        const cloudProviders = ['amazon', 'google', 'microsoft', 'azure', 'aws', 'digitalocean', 'linode', 'vultr', 'ovh'];
        const isp = (network.isp || '').toLowerCase();
        const isCloudIP = cloudProviders.some(provider => isp.includes(provider));
        
        // 云服务 IP → 中风险
        if (isCloudIP) return 'medium';
        
        // 检测时区一致性
        const ipTimezone = network.timezone || '';
        const browserTimezone = fingerprintData?.timezone?.timezone || '';
        const timezoneMismatch = ipTimezone && browserTimezone && 
                                 !ipTimezone.toLowerCase().includes(browserTimezone.split('/')[0].toLowerCase());
        
        // 时区不匹配 → 中风险
        if (timezoneMismatch) return 'medium';
        
        return 'low';
    }
    return defaultLevel;
}

function getDynamicRiskText(categoryKey, data, defaultLevel) {
    const level = getDynamicRiskLevel(categoryKey, data, defaultLevel);
    return getRiskText(level);
}



function getUniqueBadge(value, key = '', categoryRiskLevel = 'low') {
    if (typeof value === 'boolean') return value ? 'badge-warning' : 'badge-common';
    // User Agent 虽然长，但同一浏览器版本的所有用户都相同，不算高独特性
    if (key === 'userAgent') return 'badge-common';
    
    // 特殊处理 IP 相关字段：根据整体网络风险等级决定 badge
    if (key === 'ip' || key === 'ipWebrtc' || key === 'ipDual' || 
        key === 'country' || key === 'region' || key === 'city' || key === 'isp' || key === 'timezone') {
        if (categoryRiskLevel === 'high') return 'badge-warning';
        if (categoryRiskLevel === 'medium') return 'badge-warning';
        return 'badge-common';
    }
    
    if (typeof value === 'string' && value.length > 30) return 'badge-unique';
    return 'badge-common';
}

function getUniqueLabel(value, key = '', categoryRiskLevel = 'low') {
    if (typeof value === 'boolean') return value ? '⚠️ 异常' : '✅ 正常';
    
    // 特殊处理 IP 相关字段：根据整体风险等级决定标签
    if (key === 'ip' || key === 'ipWebrtc' || key === 'ipDual' || 
        key === 'country' || key === 'region' || key === 'city' || key === 'isp' || key === 'timezone') {
        if (categoryRiskLevel === 'high') return '⚠️ 高风险';
        if (categoryRiskLevel === 'medium') return '⚠️ 中风险';
        return '📋 常见';
    }
    
    if (typeof value === 'string' && value.length > 30) return '🔍 高独特性';
    return '📋 常见';
}

function getValueAtPath(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

function calculatePrivacyScore() {
    let totalScore = 0;
    let detailScores = { browser: 0, hardware: 0, system: 0, behavior: 0, automation: 0 };
    const tips = [];


    // creep-full.js headless 检测
    if (fingerprintData?.headless) {
        const isHeadless = fingerprintData.headless.headless?.hasHeadlessUA || 
                          fingerprintData.headless.headless?.webDriverIsOn ||
                          (fingerprintData.headlessRating && fingerprintData.headlessRating > 50);
        if (isHeadless) {
            detailScores.automation += 50;
            tips.push({ icon: '🚨', title: '无头浏览器', desc: '你正在使用无头模式，这会被所有网站识别为爬虫。' });
        }
    }

        if (fingerprintData?.navigator?.webdriver === true) {
        detailScores.automation += 40;
        tips.push({ icon: '🤖', title: 'WebDriver 特征暴露', desc: 'navigator.webdriver 为 true，这是自动化工具的铁证。' });
    }

    if (fingerprintData?.webgl?.renderer) {
        detailScores.hardware += 25;
        const renderer = fingerprintData.webgl.renderer;
        if (/GeForce|Radeon/.test(renderer)) {
            tips.push({ icon: '🎮', title: '独立显卡暴露', desc: '你的 GPU 型号是非常独特的识别特征。建议：使用浏览器扩展模糊 WebGL 信息。' });
        }
    }

    if (fingerprintData?.canvas?.dataURL) {
        detailScores.hardware += 30;
        tips.push({ icon: '🎨', title: 'Canvas 指纹已采集', desc: 'Canvas 指纹是最稳定的生物特征之一。建议：使用 CanvasBlocker 等扩展添加随机噪声。' });
    }

    const fontList = fingerprintData?.fonts?.fontFaceLoadFonts || fingerprintData?.fonts?.list || [];
    if (fontList.length > 50) {
        detailScores.system += 20;
        tips.push({ icon: '🔤', title: '字体列表过长', desc: '你安装了 ' + fontList.length + ' 种字体，这会让你更独特。建议：减少不必要的字体。' });
    }

    // IP 网络信息检测
    const network = window.IPInfo;
    if (network) {
        // 检测云服务商 IP
        const cloudProviders = ['amazon', 'google', 'microsoft', 'azure', 'aws', 'digitalocean', 'linode', 'vultr', 'ovh'];
        const isp = (network.isp || '').toLowerCase();
        const isCloudIP = cloudProviders.some(provider => isp.includes(provider));
        
        if (isCloudIP) {
            detailScores.automation += 30;
            tips.push({ icon: '☁️', title: '云服务 IP', desc: '你的 IP 属于云服务商（' + network.isp + '），这通常用于爬虫或自动化脚本。建议使用家庭宽带或移动网络。' });
        }
        
        // 检测时区一致性
        const ipTimezone = network.timezone || '';
        const browserTimezone = fingerprintData?.timezone?.timezone || '';
        if (ipTimezone && browserTimezone && !ipTimezone.toLowerCase().includes(browserTimezone.split('/')[0].toLowerCase())) {
            detailScores.behavior += 15;
            tips.push({ icon: '🕐', title: '时区不一致', desc: '你的 IP 时区（' + ipTimezone + '）与浏览器时区（' + browserTimezone + '）不匹配，可能被识别为使用代理。建议：关闭代理或调整浏览器时区。' });
        }
        
        // 检测 IP 不一致（WebRTC vs Cloudflare）- 强代理特征
        if (window.IPInfoDual?.mismatch) {
            detailScores.behavior += 35;
            tips.push({ icon: '🔀', title: 'IP 地址不一致（强代理特征）', desc: 'WebRTC 获取的真实 IP（' + window.IPInfoDual.webrtc + '）与 Cloudflare 看到的 IP（' + window.IPInfoDual.http + '）不一致，这是使用代理/VPN 的强特征。建议：关闭代理或使用支持 WebRTC 控制的代理。' });
        }
    }

    // ========== 集成 Turnstile 人机验证 ==========
    const turnstileResult = window.TurnstileResult;
    if (turnstileResult && turnstileResult.success) {
        detailScores.behavior = Math.max(0, detailScores.behavior - 5);
    }

    totalScore = Math.min(100, Object.values(detailScores).reduce((a, b) => a + b, 0));

    document.getElementById('privacyScore').textContent = totalScore;
    document.getElementById('browserRisk').textContent = detailScores.browser;
    document.getElementById('browserRisk').className = 'breakdown-value ' + getRiskClass(detailScores.browser);
    document.getElementById('hardwareRisk').textContent = detailScores.hardware;
    document.getElementById('hardwareRisk').className = 'breakdown-value ' + getRiskClass(detailScores.hardware);
    document.getElementById('systemRisk').textContent = detailScores.system;
    document.getElementById('systemRisk').className = 'breakdown-value ' + getRiskClass(detailScores.system);
    document.getElementById('behaviorRisk').textContent = detailScores.behavior;
    document.getElementById('behaviorRisk').className = 'breakdown-value ' + getRiskClass(detailScores.behavior);
    document.getElementById('automationRisk').textContent = detailScores.automation;
    document.getElementById('automationRisk').className = 'breakdown-value ' + getRiskClass(detailScores.automation);

    const scoreDeg = (totalScore / 100) * 360;
    document.querySelector('.score-circle').style.setProperty('--score-deg', scoreDeg + 'deg');

    let level = '低暴露';
    if (totalScore >= 70) level = '高风险 - 非常容易被追踪';
    else if (totalScore >= 50) level = '较高暴露 - 容易被识别';
    else if (totalScore >= 30) level = '中等暴露 - 需要注意';
    else level = '低伪装 - 真实浏览器';
    document.getElementById('scoreLevel').textContent = level;

    document.getElementById('uniquenessScore').textContent = totalScore >= 50 ? '高 (>95%)' : totalScore >= 30 ? '中 (50-95%)' : '低 (<50%)';
    document.getElementById('stabilityScore').textContent = fingerprintData?.canvas ? '高 (Canvas 特征稳定)' : '中 (可能随时间变化)';

    if (tips.length === 0) {
        tips.push({ icon: '✅', title: '探长认证', desc: '未检测到明显风险。这是真实浏览器！' });
        tips.push({ icon: '💡', title: '继续保持', desc: '你的浏览器特征很自然，不需要特别调整。' });
        
        // 显示成功诊断
        if (typeof window.showDetectiveVerdict === 'function') {
            window.showDetectiveVerdict(true);
        }
    } else {
        tips.push({ icon: '🛡️', title: '探长的建议', desc: '使用 CanvasBlocker、Chameleon、Trace 等扩展可以干扰指纹采集。' });
        
        // 显示失败诊断
        if (typeof window.showDetectiveVerdict === 'function') {
            const fpBrowserResult = window.FpMonitor?.getLastResult();
            const detectedBrowsers = fpBrowserResult?.details?.fingerprintBrowser?.reasons || [];
            const allReasons = tips.map(t => `${t.icon} ${t.title}: ${t.desc}`);
            
            window.showDetectiveVerdict(false, detectedBrowsers, allReasons.slice(0, 5));
        }
    }

    const tipsHtml = tips.map(tip => `
        <div class="tip-item">
            <div class="tip-icon">${tip.icon}</div>
            <div class="tip-content">
                <div class="tip-title">${tip.title}</div>
                <div class="tip-desc">${tip.desc}</div>
            </div>
        </div>
    `).join('');
    document.getElementById('tipsGrid').innerHTML = tipsHtml;

    renderRiskChart(detailScores);
}

function renderRiskChart(scores) {
    const items = [
        { label: '浏览器', value: scores.browser, max: 25 },
        { label: '硬件', value: scores.hardware, max: 55 },
        { label: '系统', value: scores.system, max: 20 },
        { label: '行为', value: scores.behavior, max: 0 },
        { label: '自动化', value: scores.automation, max: 100 }
    ];

    const html = items.map(item => {
        const max = item.max || 100;
        const percent = Math.min(100, (item.value / max) * 100);
        let riskLevel = 'low';
        if (percent >= 75) riskLevel = 'critical';
        else if (percent >= 50) riskLevel = 'high';
        else if (percent >= 25) riskLevel = 'medium';

        return `
            <div class="bar-item">
                <div class="bar-label">${item.label}</div>
                <div class="bar-track">
                    <div class="bar-fill ${riskLevel}" style="width: ${percent}%"></div>
                </div>
                <div class="bar-value">${item.value}</div>
            </div>
        `;
    }).join('');

    document.getElementById('riskChart').innerHTML = html;
}

function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    let html = '';

    for (const [key, config] of Object.entries(INTERPRETATIONS)) {
        let data = fingerprintData?.[key];
        // network 分类使用 window.IPInfo
        if (key === 'network') {
            data = window.IPInfo;
        }
        if (!data) continue;

        html += `
            <div class="category-section">
                <div class="category-header">
                    <div class="category-title">
                        <span class="category-icon">${config.icon}</span>
                        <span class="category-name">${config.name}</span>
                    </div>
                    <span class="category-risk risk-${getDynamicRiskLevel(key, data, config.riskLevel)}">风险等级：${getDynamicRiskText(key, data, config.riskLevel)}</span>
                </div>
                <div class="metrics-grid">
        `;

        for (const [metricKey, metricConfig] of Object.entries(config.metrics)) {
            // network 分类特殊处理 ipWebrtc 和 ipDual
            let value = getValueAtPath(data, metricKey);
            if (key === 'network') {
                if (metricKey === 'ipWebrtc') {
                    value = window.IPInfoDual?.webrtc || null;
                } else if (metricKey === 'ipDual') {
                    value = window.IPInfoDual;
                }
            }
            if (value === undefined || value === null) continue;

            // 获取动态风险等级用于 badge 显示
            const dynamicRiskLevel = getDynamicRiskLevel(key, data, config.riskLevel);

            html += `
                <div class="metric-card">
                    <div class="metric-header">
                        <div class="metric-name">${metricConfig.name}</div>
                        <span class="metric-badge ${getUniqueBadge(value, metricKey, dynamicRiskLevel)}">${getUniqueLabel(value, metricKey, dynamicRiskLevel)}</span>
                    </div>
                    <div class="metric-value-display">${formatValue(value, metricKey)}</div>
                    <div class="metric-explanation">
                        <div class="explanation-section">
                            <div class="explanation-title">💡 这意味着什么？</div>
                            ${metricConfig.explanation}
                        </div>
                        <div class="explanation-section">
                            <div class="explanation-title">🔬 深度解析</div>
                            ${metricConfig.deepDive}
                        </div>
                        <div class="explanation-section">
                            <div class="explanation-title">🔒 隐私影响</div>
                            ${metricConfig.privacyImpact}
                        </div>
                        <div class="explanation-section">
                            <div class="explanation-title">🎯 检测普遍性</div>
                            ${metricConfig.detection}
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div></div>';
    }

    container.innerHTML = html;
}

function formatValue(value, key = '') {
    // 特殊处理 offset（UTC 偏移），转换成分数格式
    if (key === 'offset' && typeof value === 'number') {
        const hours = Math.abs(Math.floor(value / 60));
        const minutes = Math.abs(value % 60);
        const sign = value <= 0 ? '+' : '-';
        return `UTC${sign}${hours}${minutes > 0 ? ':' + String(minutes).padStart(2, '0') : ''}`;
    }
    // 特殊处理 headless.headless 对象
    if (key === 'headless' && typeof value === 'object' && value !== null) {
        const hasHeadless = value.hasHeadlessUA || value.webDriverIsOn;
        return hasHeadless ? '⚠️ 检测到无头模式' : '✅ 正常浏览器';
    }
    // 特殊处理 IP 地址（隐藏后 8 位）
    if ((key === 'ip' || key === 'ipWebrtc') && typeof value === 'string') {
        const parts = value.split('.');
        if (parts.length === 4) {
            parts[2] = '*';
            parts[3] = '*';
            return parts.join('.');
        }
        return value;
    }
    // 特殊处理 ipDual（显示 IP 对比 + 地理位置对比）
    if (key === 'ipDual') {
        if (!value || (!value.webrtc && !value.http)) return '-';
        
        let result = '';
        if (value.mismatch) {
            result = `⚠️ 不一致（可能使用代理/VPN）\n`;
            result += `\n🔴 WebRTC 真实 IP: ${value.webrtc || '-'}`;
            if (value.webrtcGeo) {
                result += `\n   位置：${value.webrtcGeo.country} ${value.webrtcGeo.region} ${value.webrtcGeo.city}`;
            }
            result += `\n\n🔵 HTTP 出口 IP: ${value.http || '-'}`;
            if (value.httpGeo) {
                result += `\n   位置：${value.httpGeo.country} ${value.httpGeo.region} ${value.httpGeo.city}`;
            }
        } else {
            const ip = value.webrtc || value.http;
            result = `✅ 一致\nIP: ${ip}`;
            if (value.httpGeo) {
                result += `\n位置：${value.httpGeo.country} ${value.httpGeo.region} ${value.httpGeo.city}`;
            }
        }
        return result;
    }
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string' && value.length > 100) return value.substring(0, 97) + '...';
    if (Array.isArray(value)) return '共 ' + value.length + ' 项 | ' + value.slice(0, 3).join(', ') + (value.length > 3 ? '...' : '');
    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
    return String(value);
}

function renderAdvancedAnalysis() {
    // 指纹分析
    const analysisHtml = `
        <div class="timeline-item">
            <div class="timeline-time">采集完成</div>
            <div class="timeline-content">
                <strong>指纹 ID 已生成</strong><br>
                基于 ${Object.keys(fingerprintData || {}).length} 个维度特征计算得出
            </div>
        </div>
        <div class="timeline-item">
            <div class="timeline-time">特征评估</div>
            <div class="timeline-content">
                <strong>唯一性评估完成</strong><br>
                你的指纹在全球用户中的独特程度：${document.getElementById('uniquenessScore').textContent}
            </div>
        </div>
        <div class="timeline-item">
            <div class="timeline-time">风险评估</div>
            <div class="timeline-content">
                <strong>综合风险评分</strong><br>
                ${document.getElementById('privacyScore').textContent} / 100 - ${document.getElementById('scoreLevel').textContent}
            </div>
        </div>
    `;
    document.getElementById('fingerprintAnalysis').innerHTML = analysisHtml;

    // 检测机制
    const detectionHtml = `
        <div style="background: #f8f9ff; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <strong style="color: #e53e3e;">🚨 高风险检测点</strong>
            <ul style="margin-top: 10px; color: #666; line-height: 1.8;">
                <li><strong>WebDriver 检测</strong> - navigator.webdriver 属性，为 true 则 100% 被识别</li>
                <li><strong>无头浏览器检测</strong> - Headless Chrome 特征，直接封禁</li>
                <li><strong>Selenium 痕迹</strong> -__selenium、callSeleniumFunction 等对象</li>
                <li><strong>Canvas 指纹</strong> - 最稳定的识别特征，难以伪造</li>
            </ul>
        </div>
        <div style="background: #ebf8ff; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <strong style="color: #3182ce;">⚠️ 中风险检测点</strong>
            <ul style="margin-top: 10px; color: #666; line-height: 1.8;">
                <li><strong>WebGL 渲染器</strong>-GPU 型号，高度独特</li>
                <li><strong>字体列表</strong> - 安装的字体组合，较独特</li>
                <li><strong>屏幕分辨率</strong> - 组合后的独特性中等</li>
                <li><strong>时区与 IP</strong> - 不匹配时会被怀疑</li>
                <li><strong>云服务 IP</strong> - AWS/Google Cloud 等云厂商 IP 段</li>
            </ul>
        </div>
        <div style="background: #c6f6d5; padding: 15px; border-radius: 8px;">
            <strong style="color: #276749;">✅ 低风险检测点</strong>
            <ul style="margin-top: 10px; color: #666; line-height: 1.8;">
                <li><strong>User Agent</strong> - 基础信息，容易伪造</li>
                <li><strong>语言设置</strong> - 常见语言不独特</li>
                <li><strong>CPU 核心数</strong> - 常见值不独特</li>
            </ul>
        </div>
    `;
    document.getElementById('detectionPoints').innerHTML = detectionHtml;

    // 技术细节
    if (fingerprintData) {
        document.getElementById('technicalDetails').textContent = JSON.stringify(fingerprintData, null, 2);
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById('tab-' + tabName).classList.add('active');
}

function compareFingerprints() {
    const compareStr = document.getElementById('compareInput').value.trim();
    if (!compareStr) {
        alert('请粘贴第二个指纹 JSON');
        return;
    }

    try {
        const second = JSON.parse(compareStr);
        const first = fingerprintData;

        const changes = [];
        const comparePath = (path, obj1, obj2) => {
            const keys = path.split('.');
            const val1 = keys.reduce((o, k) => o?.[k], obj1);
            const val2 = keys.reduce((o, k) => o?.[k], obj2);
            if (val1 !== undefined && val2 !== undefined && val1 !== val2) {
                changes.push({ path, val1, val2 });
            }
        };

        // 对比主要字段
        ['navigator.userAgent', 'screen.width', 'screen.height', 'timezone.timezone', 'webgl.renderer'].forEach(path => {
            comparePath(path, first, second);
        });

        const resultHtml = `
            <div class="comparison-col">
                <h4>第一次采集</h4>
                <div style="font-size: 13px; color: #666;">FP ID: ${(first.fingerprintId || '').substring(0, 32)}...</div>
                <div style="margin-top: 10px; font-size: 13px;">
                    <strong>时间:</strong> ${first.timestamp ? new Date(first.timestamp).toLocaleString() : '-'}<br>
                    <strong>版本:</strong> ${first.version || '-'}
                </div>
            </div>
            <div class="comparison-col">
                <h4>第二次采集</h4>
                <div style="font-size: 13px; color: #666;">FP ID: ${(second.fingerprintId || '').substring(0, 32)}...</div>
                <div style="margin-top: 10px; font-size: 13px;">
                    <strong>时间:</strong> ${second.timestamp ? new Date(second.timestamp).toLocaleString() : '-'}<br>
                    <strong>版本:</strong> ${second.version || '-'}
                </div>
            </div>
        `;

        if (changes.length === 0) {
            resultHtml + `
                <div style="grid-column: 1 / -1; background: #c6f6d5; padding: 20px; border-radius: 12px; text-align: center;">
                    <strong style="color: #276749; font-size: 18px;">✅ 指纹完全一致</strong><br>
                    <span style="color: #666;">两次采集的特征没有变化，说明你的浏览器配置稳定</span>
                </div>
            `;
        } else {
            resultHtml + `
                <div style="grid-column: 1 / -1; background: #feebc8; padding: 20px; border-radius: 12px;">
                    <strong style="color: #c05621; font-size: 18px;">⚠️ 检测到 ${changes.length} 处差异</strong>
                    <div style="margin-top: 15px;">
            `;
            changes.forEach(change => {
                resultHtml += `
                    <div style="background: white; padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                        <strong>${change.path}</strong><br>
                        <span style="color: #e53e3e;">第一次：${formatValue(change.val1)}</span><br>
                        <span style="color: #38a169;">第二次：${formatValue(change.val2)}</span>
                    </div>
                `;
            });
            resultHtml += `</div></div>`;
        }

        const container = document.getElementById('comparisonResult');
        container.innerHTML = resultHtml;
        container.style.display = 'grid';
    } catch (e) {
        alert('JSON 格式错误：' + e.message);
    }
}

// 页面加载时尝试自动加载
window.addEventListener('load', () => {
    setTimeout(() => {
        const stored = localStorage.getItem('creepjs_data');
        if (stored) {
            try {
                fingerprintData = JSON.parse(stored);
                showResults();
            } catch (e) {
                console.log('自动加载失败，等待用户手动输入');
            }
        }
    }, 2000);
});
