from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from core.handler.ws_handler import WSHandler
from core.component.Components import Components
from core.auth.login import AuthManager
import uvicorn
import logging
import colorlog
import sys

# Windows 平台尝试初始化 colorama 以避免 OSError
if sys.platform == "win32":
    try:
        import colorama
        colorama.init()
    except ImportError:
        pass

# 日志配置
handler = colorlog.StreamHandler()
handler.setFormatter(colorlog.ColoredFormatter(
    '%(log_color)s%(asctime)s %(levelname)s [%(pathname)s] %(message)s',
    log_colors={'DEBUG': 'cyan', 'INFO': 'green', 'WARNING': 'yellow', 'ERROR': 'red', 'CRITICAL': 'red,bg_white'}
))
logging.basicConfig(level=logging.INFO, handlers=[handler])

app = FastAPI()

# 添加 CORS 中间件，允许前端跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境请修改为具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 暴露给前端的静态资源（Live2D 模型、背景图等）
app.mount("/public", StaticFiles(directory="public"), name="public")

# 实例化认证管理器
auth_manager = AuthManager()

# 请求体模型
class LoginRequest(BaseModel):
    username: str
    password: str

class VerifyRequest(BaseModel):
    token: str


@app.post("/api/login")
async def login(request: LoginRequest):
    """
    用户登录接口
    """
    if auth_manager.verify_user(request.username, request.password):
        token = auth_manager.pack_token(request.username)
        logging.info(f"用户 {request.username} 登录成功")
        return {
            "success": True,
            "token": token,
            "username": request.username
        }
    else:
        logging.warning(f"用户 {request.username} 登录失败")
        raise HTTPException(status_code=401, detail="用户名或密码错误")

@app.post("/api/verify")
async def verify_token(request: VerifyRequest):
    """
    验证 token 有效性接口
    """
    user_info = auth_manager.verify_token(request.token)
    if user_info:
        return {
            "valid": True,
            "username": user_info.get("username")
        }
    else:
        raise HTTPException(status_code=401, detail="Token 无效")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # 为每个连接创建一个独立的 Components 实例，确保用户隔离
    components = Components()
    # 为每个连接创建一个独立的 WSHandler 实例，存储连接相关的状态（如角色实例）
    handler = WSHandler()
    await handler.handle_ws(websocket, components)

if __name__ == "__main__":
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8080, 
        reload=False,
        ws_ping_interval=300,  # 设置心跳间隔为 300 秒
        ws_ping_timeout=300    # 设置心跳超时为 300 秒
    )
    # uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4