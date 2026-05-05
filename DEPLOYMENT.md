# 布朗探长 - 快速部署指南

> 5 分钟部署你自己的反指纹浏览器检测 API

---

## 🚀 方式对比

| 方式 | 难度 | 时间 | 适合场景 |
|------|------|------|---------|
| Docker | ⭐⭐ | 5 分钟 | 生产环境 |
| Docker Compose | ⭐ | 3 分钟 | 快速测试 |
| Node.js 源码 | ⭐⭐⭐ | 10 分钟 | 开发调试 |
| Vercel | ⭐ | 5 分钟 | 免费托管 |

---

## 方式 1：Docker Compose（推荐）

### 步骤 1：创建目录

```bash
mkdir brown-detective
cd brown-detective
```

### 步骤 2：创建 docker-compose.yml

```yaml
version: '3.8'

services:
  brown-detective:
    image: brownexplorer/api:latest
    container_name: brown-detective
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - API_KEY=my_secret_key_123456
      - LOG_LEVEL=info
    restart: unless-stopped
```

### 步骤 3：启动服务

```bash
docker-compose up -d
```

### 步骤 4：验证

```bash
curl http://localhost:8000/api/health
```

看到 `{"status":"ok"}` 即成功！

---

## 方式 2：纯 Docker

### 一行命令启动

```bash
docker run -d \
  -p 8000:8000 \
  -e API_KEY=my_secret_key \
  --name brown-detective \
  brownexplorer/api:latest
```

### 查看日志

```bash
docker logs -f brown-detective
```

---

## 方式 3：Node.js 源码部署

### 环境要求

- Node.js 18+
- npm 或 pnpm

### 步骤 1：克隆代码

```bash
git clone https://github.com/brown-explorer/api.git
cd api
```

### 步骤 2：安装依赖

```bash
npm install
# 或
pnpm install
```

### 步骤 3：配置环境变量

创建 `.env` 文件：

```bash
NODE_ENV=production
PORT=8000
API_KEY=my_secret_key_123456
LOG_LEVEL=info
```

### 步骤 4：启动服务

```bash
# 开发模式（带热重载）
npm run dev

# 生产模式
npm run build
npm start
```

---

## 方式 4：Vercel 免费部署

### 步骤 1：安装 Vercel CLI

```bash
npm i -g vercel
```

### 步骤 2：登录

```bash
vercel login
```

### 步骤 3：部署

```bash
vercel --prod
```

### 步骤 4：设置环境变量

在 Vercel 控制台添加：
- `API_KEY`: 你的密钥
- `LOG_LEVEL`: info

---

## 🔧 配置反向代理

### Nginx 配置

```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Caddy 配置

```caddyfile
api.your-domain.com {
    reverse_proxy localhost:8000
}
```

---

## 🧪 测试 API

### 1. 健康检查

```bash
curl http://localhost:8000/api/health
```

### 2. 浏览器检测

```bash
curl -X POST http://localhost:8000/api/v1/detect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer my_secret_key" \
  -d '{
    "fingerprint": "test_fp_123",
    "browserData": {
      "navigator": {
        "userAgent": "Mozilla/5.0",
        "webdriver": true
      }
    },
    "ip": "202.107.67.27"
  }'
```

---

## 🔐 安全建议

### 1. 使用强 API Key

```bash
# 生成随机密钥
openssl rand -hex 32
```

### 2. 启用 HTTPS

**生产环境必须使用 HTTPS！**

### 3. 限制访问 IP

```nginx
location / {
    allow 192.168.1.0/24;
    allow 10.0.0.0/8;
    deny all;
    
    proxy_pass http://localhost:8000;
}
```

### 4. 配置防火墙

```bash
# 仅允许内网访问
ufw allow from 192.168.1.0/24 to any port 8000
```

---

## 📊 监控与日志

### 查看 Docker 日志

```bash
docker logs -f brown-detective
```

### 查看实时日志

```bash
tail -f logs/app.log
```

### 监控服务状态

```bash
# 检查进程
docker ps | grep brown-detective

# 检查端口
ss -tlnp | grep 8000

# 内存使用
docker stats brown-detective
```

---

## 🆘 故障排查

### 问题 1：容器无法启动

```bash
# 查看错误
docker logs brown-detective

# 检查端口占用
lsof -i:8000
```

### 问题 2：API Key 无效

检查环境变量是否正确设置：

```bash
docker exec brown-detective env | grep API_KEY
```

### 问题 3：请求超时

增加超时时间：

```bash
# 修改 NODE_ENV=production
# 检查服务器资源
free -h
df -h
```

---

## 📈 升级指南

### Docker 升级

```bash
docker pull brownexplorer/api:latest
docker-compose down
docker-compose up -d
```

### 源码升级

```bash
git pull
npm install
npm run build
pm2 restart brown-detective
```

---

## 🎯 下一步

部署成功后：

1. ✅ 测试 API 功能
2. ✅ 集成到你的网站/App
3. ✅ 配置监控告警
4. ✅ 设置备份策略

---

**需要帮助？** 
- 📚 查看完整文档：[API_SDK_README.md](API_SDK_README.md)
- 💬 加入 Discord 社区
- 📧 联系支持：support@brownexplorer.com
