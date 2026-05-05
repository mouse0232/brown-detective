/**
 * Cloudflare Turnstile 集成
 * 用途：人机验证，补充行为指纹检测
 */
(function() {
    'use strict';
    
    // 配置
    const CONFIG = {
        SITE_KEY: '', // 需要在 HTML 中设置
        CONTAINER_ID: 'turnstile-container',
        CALLBACK_TIMEOUT: 10000 // 10 秒超时
    };
    
    // 状态
    let turnstileToken = null;
    let turnstileReady = false;
    let turnstileExpired = false;
    
    /**
     * 加载 Turnstile 脚本
     */
    function loadTurnstile(siteKey) {
        return new Promise((resolve, reject) => {
            // 检查是否已加载
            if (window.turnstile) {
                resolve();
                return;
            }
            
            // 创建 script 标签
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
                console.log('[Turnstile] 脚本加载完成');
                resolve();
            };
            
            script.onerror = () => {
                console.error('[Turnstile] 脚本加载失败');
                reject(new Error('Turnstile 脚本加载失败'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * 渲染 Turnstile widget
     */
    function renderWidget(siteKey) {
        return new Promise((resolve, reject) => {
            if (!window.turnstile) {
                reject(new Error('Turnstile 未加载'));
                return;
            }
            
            const container = document.getElementById(CONFIG.CONTAINER_ID);
            if (!container) {
                console.warn('[Turnstile] 容器不存在，自动创建');
                // 可选：自动创建隐藏容器
                // resolve(null);
                reject(new Error('Turnstile 容器不存在'));
                return;
            }
            
            try {
                const widgetId = window.turnstile.render(container, {
                    sitekey: siteKey,
                    callback: function(token) {
                        console.log('[Turnstile] 验证成功，token:', token.substring(0, 20) + '...');
                        turnstileToken = token;
                        turnstileReady = true;
                        turnstileExpired = false;
                        
                        // 验证 token
                        verifyToken(token).then(result => {
                            // 保存结果供后续使用
                            window.TurnstileResult = result;
                            
                            // 调用回调（如果已注册）
                            if (window.onTurnstileVerified) {
                                window.onTurnstileVerified(result);
                            }
                        });
                        
                        resolve({ widgetId, token });
                    },
                    'expired-callback': function() {
                        console.warn('[Turnstile] Token 过期');
                        turnstileExpired = true;
                        turnstileToken = null;
                        
                        if (window.onTurnstileExpired) {
                            window.onTurnstileExpired();
                        }
                    },
                    'error-callback': function(error) {
                        console.error('[Turnstile] 验证错误:', error);
                        reject(error);
                    },
                    theme: 'auto',
                    tabindex: '0'
                });
                
                console.log('[Turnstile] Widget 渲染完成，ID:', widgetId);
                
            } catch (e) {
                console.error('[Turnstile] 渲染失败:', e);
                reject(e);
            }
        });
    }
    
    /**
     * 验证 token（发送到后端）- 带 5 分钟缓存
     */
    async function verifyToken(token) {
        // 检查缓存（5 分钟）
        try {
            const cached = localStorage.getItem('turnstileCache');
            if (cached) {
                const { result, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < 300000) { // 5 分钟
                    console.log('[Turnstile] 使用缓存验证结果');
                    window.TurnstileResult = result;
                    return result;
                }
            }
        } catch (e) {
            console.warn('[Turnstile] 缓存读取失败:', e);
        }
        
        try {
            const res = await fetch('../api/verify-turnstile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            
            const result = await res.json();
            console.log('[Turnstile] 后端验证结果:', result);
            
            // 保存到全局
            window.TurnstileResult = result;
            
            // 写入缓存
            try {
                localStorage.setItem('turnstileCache', JSON.stringify({
                    result,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.warn('[Turnstile] 缓存写入失败:', e);
            }
            
            return result;
            
        } catch (e) {
            console.error('[Turnstile] 验证请求失败:', e);
            return {
                success: false,
                error: '验证请求失败',
                riskScore: 100,
                riskLevel: 'critical'
            };
        }
    }
    
    /**
     * 重置 Turnstile
     */
    function reset() {
        if (window.turnstile) {
            window.turnstile.reset();
        }
        turnstileToken = null;
        turnstileReady = false;
        turnstileExpired = true;
    }
    
    /**
     * 获取状态
     */
    function getStatus() {
        return {
            ready: turnstileReady,
            expired: turnstileExpired,
            token: turnstileToken,
            result: window.TurnstileResult
        };
    }
    
    /**
     * 初始化（自动）
     */
    async function init(siteKey) {
        if (!siteKey) {
            console.error('[Turnstile] 缺少 Site Key');
            return;
        }
        
        CONFIG.SITE_KEY = siteKey;
        
        try {
            // 1. 加载脚本
            await loadTurnstile(siteKey);
            
            // 2. 渲染 widget
            const result = await renderWidget(siteKey);
            
            console.log('[Turnstile] 初始化完成');
            return result;
            
        } catch (e) {
            console.error('[Turnstile] 初始化失败:', e);
            throw e;
        }
    }
    
    // 暴露全局 API
    window.Turnstile = {
        init,
        load: loadTurnstile,
        render: renderWidget,
        verify: verifyToken,
        reset,
        getStatus,
        isReady: () => turnstileReady,
        getToken: () => turnstileToken
    };
    
    // 自动初始化（如果 HTML 中配置了 sitekey）
    const autoSiteKey = document.querySelector('meta[name="turnstile-sitekey"]')?.content;
    if (autoSiteKey) {
        console.log('[Turnstile] 检测到自动配置，开始初始化...');
        init(autoSiteKey).catch(console.error);
    }
    
})();
