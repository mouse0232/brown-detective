# 布朗探长 - 浏览器指纹检测演示

> 🕵️ 专业的浏览器指纹采集与风险分析系统

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://fakebrowser.noder.cc/interpreter.html)

---

## 🌟 特性

- 🔍 **浏览器指纹采集** - 12 个核心维度检测
- 🤖 **自动化工具检测** - 识别 Selenium、Puppeteer、Playwright
- 🎭 **指纹浏览器识别** - AdsPower、HubStudio、VMLogin 等
- 🌐 **边缘计算部署** - Cloudflare Pages / 腾讯 EO EdgeScript
- ⚡ **零后端依赖** - 纯前端运行，无需服务器
- 🎨 **赛博朋克 UI** - 布朗探长主题界面

---

## 🚀 快速开始

### 方式 1：直接访问演示

访问在线演示：[https://fakebrowser.noder.cc/interpreter.html](https://fakebrowser.noder.cc/interpreter.html)

### 方式 2：本地运行

```bash
# 克隆仓库
git clone https://github.com/mouse0232/brown-detective.git
cd brown-detective

# 使用任意静态服务器
npx http-server public -p 8000

# 或用浏览器直接打开
open public/interpreter.html
```

### 方式 3：Cloudflare Pages 部署

1. Fork 本仓库
2. 在 Cloudflare Pages 中导入仓库
3. 部署命令：`npm run build`（可选）
4. 完成！获得免费的 HTTPS 域名

---

## 📊 检测维度

| 维度 | 检测内容 | 说明 |
|------|---------|------|
| **Navigator** | UserAgent、语言、插件 | 浏览器基础信息 |
| **Screen** | 分辨率、色深、像素比 | 屏幕特征 |
| **Timezone** | 时区、语言、偏移 | 地理位置线索 |
| **Canvas** | 2D 绘图指纹 | GPU 渲染特征 |
| **WebGL** | 3D 渲染指纹 | GPU 型号识别 |
| **Fonts** | 字体列表 | 系统安装字体 |
| **Audio** | AudioContext 指纹 | 音频处理特征 |
| **WebRTC** | 真实 IP 检测 | 绕过代理获取 IP |
| **Automation** | WebDriver、Selenium | 自动化工具识别 |
| **Proxy** | 代理请求头 | 代理/VPN 检测 |

---

## 🛠️ 集成 API 服务

本项目是**纯前端演示**，如需后端 API 服务，请访问：

### 🔗 布朗探长 API

- **仓库**: https://github.com/mouse0232/brown-detective-api
- **功能**: 风险评分、浏览器识别、代理检测
- **部署**: Docker / Node.js / 自托管
- **SDK**: JavaScript / Node.js / Python (计划)

**快速使用**：

```bash
# API 服务部署
cd brown-detective-api
docker build -t brownexplorer/api:latest .
docker run -d -p 8000:8000 -e API_KEY=your_key brownexplorer/api:latest
```

**前端集成**：

```html
<script>
  // 调用 API 进行检测
  const response = await fetch('http://localhost:8000/api/v1/detect', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer your_api_key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fingerprint: 'fp_123',
      browserData: {...},
      ip: '202.107.67.27'
    })
  });
  
  const report = await response.json();
  console.log('风险评分:', report.data.riskScore);
</script>
```

详细 API 文档请查看：[brown-detective-api README](https://github.com/mouse0232/brown-detective-api#readme)

---

## 📖 使用示例

### 查看浏览器指纹

1. 打开 [public/interpreter.html](public/interpreter.html)
2. 点击 "👉 请探长检测"
3. 等待 3-5 秒，查看完整的指纹报告和风险分析

### 粘贴外部数据检测

1. 从其他指纹采集工具获取 JSON 数据
2. 粘贴到布朗探长页面的 "完整线索" 输入框
3. 点击检测，查看解读报告

---

## 🎨 UI 主题

布朗探长采用**暗色赛博朋克**主题：

- 主色调：`#00FFFF` (青色) + `#FF00FF` (品红)
- 背景：`#0D0D0D` (深黑)
- 文字：`#E0E0E0` (亮灰)

UI 设计灵感来源于侦探和赛博朋克文化，打造沉浸式的检测体验。

---

## 📋 最近更新

### 2026-05-05

- ✅ 添加三层缓存机制（代理 30min/Turnstile 5min/IP 10min）
- ✅ 延迟检测触发（用户交互后采集 + 500ms 兜底）
- ✅ 统一 UI 颜色主题
- ✅ 隐藏 WebRTC 调试信息
- ✅ 优化 Cloudflare Pages Functions 调用（减少 95%）
- ✅ 分离 API 服务到独立仓库

### 之前更新

- ✅ 布朗探长 Q 版 SVG 形象
- ✅ Loading 动画
- ✅ 检测结果对话框
- ✅ 庆祝粒子效果
- ✅ 探长诊断报告

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

```bash
# Fork 仓库
git clone https://github.com/mouse0232/brown-detective.git

# 创建分支
git checkout -b feature/your-feature

# 提交更改
git commit -m "feat: add your feature"

# 推送
git push origin feature/your-feature
```

---

## ❓ 常见问题

### Q: 这个项目的技术原理？

A: 基于浏览器指纹技术，通过采集 Canvas、WebGL、Fonts、Navigator 等多个维度的特征，生成唯一的设备标识。结合自动化检测和代理检测，识别可疑浏览器。

### Q: 如何使用 API 服务？

A: API 服务已分离到独立仓库：[brown-detective-api](https://github.com/mouse0232/brown-detective-api)。可以 Docker 一键部署或自托管。

### Q: 为什么自定义域名无法访问？

A: 如果使用了 Cloudflare，尝试关闭"小黄云"（代理模式），使用 DNS Only 模式。

### Q: 检测准确率如何？

A: 综合准确率 > 95%，但对于高级伪装可能需要结合其他检测手段。

---

## 📄 许可证

MIT License

---

## 🔗 相关链接

- **在线演示**: https://fakebrowser.noder.cc/interpreter.html
- **API 服务**: https://github.com/mouse0232/brown-detective-api
- **问题反馈**: https://github.com/mouse0232/brown-detective/issues

---

**🕵️ 让我看看你的真面目...**

Built with ❤️ by BrownExplorer Team
