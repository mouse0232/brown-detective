# Python SDK 集成示例
# 使用 FastAPI 框架

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware import Middleware
from fastapi.responses import JSONResponse
import httpx
import os
from typing import Optional, Dict, Any

app = FastAPI(title="布朗探长示例应用")

class BrownDetectiveClient:
    """布朗探长 API 客户端"""
    
    def __init__(self, api_key: str, api_url: str = "http://localhost:8000"):
        self.api_key = api_key
        self.api_url = api_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    async def detect(self, fingerprint: str, browser_data: Dict, ip: str) -> Dict[str, Any]:
        """检测浏览器风险"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.api_url}/api/v1/detect",
                    headers=self.headers,
                    json={
                        "fingerprint": fingerprint,
                        "browserData": browser_data,
                        "ip": ip,
                        "timestamp": int(__import__('time').time() * 1000)
                    },
                    timeout=5.0
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                print(f"布朗探长检测失败：{e}")
                # 失败时返回空报告
                return {
                    "success": False,
                    "data": {
                        "riskScore": 0,
                        "riskLevel": "unknown",
                        "recommendation": "allow"
                    }
                }

# 初始化客户端
brown_client = BrownDetectiveClient(
    api_key=os.getenv("BROWN_API_KEY", "demo_key"),
    api_url=os.getenv("BROWN_API_URL", "http://localhost:8000")
)

# 依赖注入：获取风险报告
async def get_risk_report(request: Request) -> Optional[Dict[str, Any]]:
    """从请求头获取并验证浏览器指纹"""
    fingerprint = request.headers.get("x-browser-fingerprint")
    if not fingerprint:
        return None
    
    try:
        import base64
        import json
        
        # 解码指纹数据
        decoded = base64.b64decode(fingerprint).decode('utf-8')
        fingerprint_data = json.loads(decoded)
        
        # 获取 IP
        ip = request.client.host
        
        # 调用检测 API
        report = await brown_client.detect(
            fingerprint=fingerprint_data.get("fingerprint"),
            browser_data=fingerprint_data.get("browserData", {}),
            ip=ip
        )
        
        return report.get("data")
    except Exception as e:
        print(f"指纹解析失败：{e}")
        return None

# 中间件：高风险拦截
@app.middleware("http")
async def brown_detective_middleware(request: Request, call_next):
    # 排除健康检查
    if request.url.path in ["/health", "/api/public"]:
        return await call_next(request)
    
    # 获取风险报告
    report = await get_risk_report(request)
    
    if report and report.get("riskScore", 0) > 80:
        # 高风险：直接拒绝
        return JSONResponse(
            status_code=403,
            content={
                "error": "Access denied",
                "reason": "High risk browser detected",
                "riskScore": report.get("riskScore")
            }
        )
    
    # 继续处理请求
    response = await call_next(request)
    return response

# 路由示例
@app.get("/")
async def root(report: Optional[Dict] = Depends(get_risk_report)):
    """根路径"""
    return {
        "message": "Welcome!",
        "riskReport": report,
        "timestamp": __import__('datetime').datetime.now().isoformat()
    }

@app.get("/health")
async def health():
    """健康检查"""
    return {"status": "ok"}

@app.post("/api/login")
async def login(
    username: str,
    password: str,
    report: Optional[Dict] = Depends(get_risk_report)
):
    """登录接口"""
    # 验证用户（示例）
    if username == "admin" and password == "password":
        # 检查风险
        if report and report.get("riskScore", 0) > 50:
            return {
                "requireVerification": True,
                "reason": "Suspicious browser detected",
                "riskScore": report.get("riskScore")
            }
        
        return {"success": True, "token": "fake_token_123"}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

# 手动调用示例
async def manual_check():
    """手动检测浏览器风险"""
    fingerprint_data = {
        "fingerprint": "test_fp_123",
        "browserData": {
            "navigator": {
                "userAgent": "Mozilla/5.0",
                "webdriver": False
            }
        },
        "ip": "202.107.67.27"
    }
    
    report = await brown_client.detect(
        fingerprint=fingerprint_data["fingerprint"],
        browser_data=fingerprint_data["browserData"],
        ip=fingerprint_data["ip"]
    )
    
    print(f"风险评分：{report['data']['riskScore']}")
    print(f"风险等级：{report['data']['riskLevel']}")
    print(f"建议操作：{report['data']['recommendation']}")
    
    return report

# 运行服务器
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
