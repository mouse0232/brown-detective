/**
 * fp-monitor.js - 反指纹浏览器定时检测
 * 用途：检测页面加载后的动态 API 篡改、指纹浏览器特征
 * 兼容：CreepJS，不冲突，叠加使用
 * 
 * @version 1.0.0
 */
(function() {
    'use strict';
    
    // ========== 配置 ==========
    const CONFIG = {
        CHECK_INTERVAL: 2000,      // 检测间隔（毫秒）
        DISPLAY_ELEMENT: 'monitorStatus', // UI 元素 ID
        DEBUG_MODE: false          // 调试模式（输出详细日志）
    };
    
    // 内部状态
    let violationCount = 0;
    let lastResult = { reasons: [], isBad: false };
    let detectionCount = 0;
    
    // ========== 核心检测函数 ==========
    
    /**
     * 检测只读属性是否被篡改
     */
    const checkReadOnly = (obj, key) => {
        if (!obj) return false;
        try {
            const desc = Object.getOwnPropertyDescriptor(obj, key);
            if (desc && desc.configurable === true) {
                return true;
            }
        } catch (e) {
            return true;
        }
        return false;
    };
    
    /**
     * 检测函数是否被 Proxy/Hook/重写
     */
    const isHookedFn = (fn) => {
        if (!fn || typeof fn !== 'function') return true;
        try {
            const str = fn.toString();
            // 检测明显的 Hook 标记
            if (str.toLowerCase().includes('proxy') || 
                str.toLowerCase().includes('hook') ||
                str.toLowerCase().includes('wrap')) {
                return true;
            }
            // 没有 [native code] 可能是篡改
            if (!str.includes('[native code]')) {
                // 但排除普通用户自定义函数
                const hasFunctionKeyword = str.includes('function');
                const hasArrowFunction = str.includes('=>');
                const hasAsync = str.includes('async');
                
                if (!hasFunctionKeyword && !hasArrowFunction && !hasAsync) {
                    return true;
                }
            }
        } catch (e) {
            return true;
        }
        return false;
    };
    
    /**
     * 检测指纹浏览器特征
     */
    const detectFingerprintBrowser = () => {
        const browsers = [];
        
        // AdsPower
        if (window.__adsPower || 
            window.adsPower || 
            localStorage.getItem('ads_power_id')) {
            browsers.push('AdsPower');
        }
        
        // 比特浏览器
        if (window.bitBrowser || 
            window.BitBrowser) {
            browsers.push('BitBrowser');
        }
        
        // Multilogin
        if (window.MULTILOGIN_IPC ||
            /Multilogin/i.test(navigator.userAgent)) {
            browsers.push('Multilogin');
        }
        
        // NestBrowser
        if (window.nestBrowser || 
            window.NestBrowser) {
            browsers.push('NestBrowser');
        }
        
        // HubStudio
        if (window.hubStudio ||
            window.HubStudio) {
            browsers.push('HubStudio');
        }
        
        // VMLogin
        if (window.vmlogin ||
            window.VMLogin) {
            browsers.push('VMLogin');
        }
        
        return browsers;
    };
    
    /**
     * 完整检测流程
     */
    function fullDetect() {
        const reasons = [];
        detectionCount++;
        
        // ========== 1. 只读属性巡检 ==========
        const readOnlyChecks = [
            [navigator, 'platform', '平台'],
            [navigator, 'vendor', '厂商'],
            [navigator, 'language', '语言'],
            [screen, 'pixelDepth', '色深'],
            [navigator, 'hardwareConcurrency', 'CPU 核心数'],
            [navigator, 'deviceMemory', '内存大小']
        ];
        
        for (const [obj, key, name] of readOnlyChecks) {
            if (checkReadOnly(obj, key)) {
                reasons.push(`${name}属性可篡改`);
            }
        }
        
        // ========== 2. 关键 API Hook 检测 ==========
        const apiChecks = [
            [HTMLCanvasElement?.prototype, 'getContext', 'Canvas 获取'],
            [CanvasRenderingContext2D?.prototype, 'fillText', 'Canvas 渲染'],
            [CanvasRenderingContext2D?.prototype, 'arc', 'Canvas 绘图'],
            [WebGLRenderingContext?.prototype, 'getParameter', 'WebGL 参数'],
            [WebGLRenderingContext?.prototype, 'getExtension', 'WebGL 扩展']
        ];
        
        for (const [proto, key, name] of apiChecks) {
            if (proto && proto[key] && isHookedFn(proto[key])) {
                reasons.push(`${name}API 被 Hook`);
            }
        }
        
        // ========== 3. Canvas 运行时校验 ==========
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                // 检测渲染是否被拦截
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, 1, 1);
                const pixel = ctx.getImageData(0, 0, 1, 1).data;
                
                if (pixel[3] === 0) {
                    reasons.push('Canvas 渲染被拦截');
                }
                
                // 检测 API 是否被劫持
                if (isHookedFn(ctx.fillText) || isHookedFn(ctx.arc)) {
                    reasons.push('Canvas API 被劫持');
                }
            }
        } catch (e) {
            reasons.push('Canvas 环境异常');
        }
        
        // ========== 4. WebGL 环境检测 ==========
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) {
                reasons.push('WebGL 环境缺失');
            } else {
                // 检测扩展列表（指纹浏览器常阉割扩展）
                const extensions = gl.getSupportedExtensions();
                if (!extensions || extensions.length < 10) {
                    reasons.push(`WebGL 扩展阉割（仅${extensions.length}个）`);
                }
                
                // 检测虚拟 GPU
                try {
                    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                    if (debugInfo) {
                        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                        if (/swiftshader|virtualbox|vmware|qemu|parallels/i.test(renderer)) {
                            reasons.push(`虚拟 GPU: ${renderer}`);
                        }
                    }
                } catch (e) {
                    // 忽略扩展检测错误
                }
            }
        } catch (e) {
            reasons.push('WebGL 检测异常');
        }
        
        // ========== 5. AudioContext 检测 ==========
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext && isHookedFn(AudioContext.prototype.createOscillator)) {
                reasons.push('Audio API 被 Hook');
            }
        } catch (e) {
            // 静默失败
        }
        
        // ========== 6. 窗口沙箱检测 ==========
        if (window.outerWidth === 0 || window.outerHeight === 0) {
            reasons.push('窗口尺寸异常（沙箱）');
        }
        
        // ========== 7. UA 与设备逻辑冲突 ==========
        const ua = navigator.userAgent.toLowerCase();
        const isMobileUA = /android|iphone|ipad|ipod/.test(ua);
        const isPcSize = screen.width >= 1200;
        
        if (isMobileUA && isPcSize) {
            reasons.push('移动端 UA + 电脑分辨率（矛盾）');
        }
        
        // Windows + Safari 矛盾
        if (/windows/.test(ua) && /safari/i.test(ua) && !/chrome/i.test(ua)) {
            reasons.push('Windows + Safari（矛盾）');
        }
        
        // ========== 8. Headless 检测 ==========
        if (/headless/i.test(ua)) {
            reasons.push('Headless 浏览器特征');
        }
        
        // Chrome UA 但没有 chrome 对象
        if (/chrome/i.test(ua) && !window.chrome) {
            reasons.push('Chrome UA 无 chrome 对象');
        }
        
        // ========== 9. 指纹浏览器特征检测 ==========
        const detectedBrowsers = detectFingerprintBrowser();
        if (detectedBrowsers.length > 0) {
            reasons.push(`指纹浏览器：${detectedBrowsers.join(', ')}`);
        }
        
        return reasons;
    }
    
    // ========== UI 更新 ==========
    
    function updateUI(reasons) {
        const el = document.getElementById(CONFIG.DISPLAY_ELEMENT);
        if (!el) return; // 页面没有这个元素
        
        if (reasons.length > 0) {
            el.innerHTML = `
                <div style="padding:15px;background:#fff3cd;border-radius:8px;border-left:4px solid #ffc107;">
                    <div style="color:#856404;font-weight:600;margin-bottom:8px;font-size:15px;">
                        ⚠️ 检测到 ${reasons.length} 项异常
                    </div>
                    <div style="font-size:13px;color:#856404;line-height:1.8;">
                        ${reasons.map(r => `• ${r}`).join('<br>')}
                    </div>
                    <div style="margin-top:10px;font-size:12px;color:#856404;">
                        违规次数：${violationCount + 1}
                    </div>
                </div>
            `;
            violationCount++;
            lastResult = { reasons, isBad: true };
        } else {
            el.innerHTML = `
                <div style="padding:15px;background:#d4edda;border-radius:8px;border-left:4px solid #28a745;">
                    <div style="color:#155724;font-weight:600;font-size:15px;">
                        ✅ 浏览器环境正常
                    </div>
                    <div style="font-size:12px;color:#155724;margin-top:5px;">
                        已持续监控 ${detectionCount} 次
                    </div>
                </div>
            `;
            lastResult = { reasons: [], isBad: false };
        }
        
        if (CONFIG.DEBUG_MODE) {
            console.log('[FP Monitor]', reasons.length ? '异常：' + reasons.join(', ') : '正常');
        }
    }
    
    // ========== 循环检测 ==========
    
    function loopCheck() {
        const violations = fullDetect();
        updateUI(violations);
        setTimeout(loopCheck, CONFIG.CHECK_INTERVAL);
    }
    
    // ========== 启动 ==========
    
    function start() {
        if (CONFIG.DEBUG_MODE) {
            console.log('[FP Monitor] 启动持续检测...');
        }
        
        // 延迟启动，等 CreepJS 完成初始检测
        setTimeout(() => {
            loopCheck();
        }, 3000);
    }
    
    // ========== 暴露全局 API（调试用） ==========
    
    window.__fpMonitor = {
        isBad: () => lastResult.isBad,
        getViolationCount: () => violationCount,
        getDetectionCount: () => detectionCount,
        detectNow: fullDetect,
        getLastResult: () => lastResult,
        getConfig: () => CONFIG
    };
    
    // ========== 自动启动 ==========
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
    
})();
