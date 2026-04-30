    <!-- IP 信息采集脚本 -->
    <script>
        // Pages Functions 集成 - API 和前端同域名
        window.IPInfo = null;
        window.IPInfoReady = false;
        
        (async function collectIP() {
            try {
                console.log('[IP] 开始采集（Cloudflare Pages Functions）');
                
                // 直接调用同源 API（无需配置完整 URL）
                const res = await fetch('/api/ip-info');
                if (res.ok) {
                    const data = await res.json();
                    window.IPInfo = data;
                    window.IPInfoReady = true;
                    
                    console.log('[IP] ✅ 采集成功', data);
                    console.log('[IP] 你的 IP:', data.ip);
                    console.log('[IP] 位置:', data.countryName, data.region, data.city);
                    console.log('[IP] ISP:', data.isp);
                    
                    // 重新渲染网络分类
                    if (typeof renderCategories === 'function' && fingerprintData) {
                        console.log('[IP] 重新渲染网络分类...');
                        renderCategories();
                    }
                }
            } catch (e) {
                console.error('[IP] ❌ 采集失败:', e);
                window.IPInfoReady = true;
            }
        })();
    </script>
