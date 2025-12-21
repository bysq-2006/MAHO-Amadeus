import asyncio
import base64
import hashlib
import hmac
import json
import logging
from datetime import datetime
from time import mktime
from urllib.parse import urlencode
from wsgiref.handlers import format_date_time
import websockets

class Client:
    def __init__(self, app_id, api_key, api_secret):
        self.app_id = app_id
        self.api_key = api_key
        self.api_secret = api_secret
        self.ws = None
        self.on_result = None
        self.status = 0 # 0: first, 1: continue, 2: last

    def create_url(self):
        url = 'wss://iat.cn-huabei-1.xf-yun.com/v1'
        now = datetime.now()
        date = format_date_time(mktime(now.timetuple()))
        signature_origin = "host: " + "iat.cn-huabei-1.xf-yun.com" + "\n"
        signature_origin += "date: " + date + "\n"
        signature_origin += "GET " + "/v1 " + "HTTP/1.1"
        signature_sha = hmac.new(self.api_secret.encode('utf-8'), signature_origin.encode('utf-8'),
                                 digestmod=hashlib.sha256).digest()
        signature_sha = base64.b64encode(signature_sha).decode(encoding='utf-8')
        authorization_origin = "api_key=\"%s\", algorithm=\"%s\", headers=\"%s\", signature=\"%s\"" % (
            self.api_key, "hmac-sha256", "host date request-line", signature_sha)
        authorization = base64.b64encode(authorization_origin.encode('utf-8')).decode(encoding='utf-8')
        v = {
            "authorization": authorization,
            "date": date,
            "host": "iat.cn-huabei-1.xf-yun.com"
        }
        return url + '?' + urlencode(v)

    async def start(self, on_result_callback):
        """启动 ASR 连接"""
        if self.ws:
            return
        self.on_result = on_result_callback
        ws_url = self.create_url()
        try:
            self.ws = await websockets.connect(ws_url)
            self.status = 0
            asyncio.create_task(self._listen())
            logging.info("ASR (Xfyun) 连接已建立")
        except Exception as e:
            logging.error(f"ASR 连接失败: {e}")
            self.ws = None

    async def _listen(self):
        """监听 ASR 返回结果"""
        full_text = ""
        try:
            async for message in self.ws:
                data = json.loads(message)
                code = data["header"]["code"]
                if code != 0:
                    logging.error(f"ASR Error: {code}")
                    break
                
                payload = data.get("payload")
                if payload:
                    result_text = payload["result"]["text"]
                    result_json = json.loads(base64.b64decode(result_text).decode('utf-8'))
                    
                    # 解析结果并累加
                    partial_text = ""
                    for i in result_json['ws']:
                        for j in i["cw"]:
                            partial_text += j["w"]
                    
                    if partial_text:
                        full_text += partial_text
                        logging.info(f"ASR 收到部分结果: {partial_text}")
                
                if data["header"]["status"] == 2:
                    logging.info(f"ASR 识别完成, 最终文本: {full_text}")
                    if full_text and self.on_result:
                        if asyncio.iscoroutinefunction(self.on_result):
                            await self.on_result(full_text)
                        else:
                            self.on_result(full_text)
                    break
        except Exception as e:
            logging.error(f"ASR Listen Error: {e}")
        finally:
            if self.ws:
                await self.ws.close()
                self.ws = None
            self.status = 0

    async def send_audio(self, chunk):
        """发送音频分片"""
        if not self.ws:
            # 如果连接断开了，尝试重新连接
            if self.on_result:
                await self.start(self.on_result)
            else:
                return
        
        if not self.ws: return

        audio_b64 = base64.b64encode(chunk).decode('utf-8')
        
        try:
            if self.status == 0:
                # 第一帧
                data = {
                    "header": {"status": 0, "app_id": self.app_id},
                    "parameter": {
                        "iat": {
                            "domain": "slm", "language": "mul_cn", "accent": "mandarin",
                            "result": {"encoding": "utf8", "compress": "raw", "format": "json"}
                        }
                    },
                    "payload": {"audio": {"audio": audio_b64, "sample_rate": 16000, "encoding": "raw"}}
                }
                self.status = 1
            else:
                # 中间帧
                data = {
                    "header": {"status": 1, "app_id": self.app_id},
                    "payload": {"audio": {"audio": audio_b64, "sample_rate": 16000, "encoding": "raw"}}
                }
            
            await self.ws.send(json.dumps(data))
        except Exception as e:
            logging.error(f"ASR 发送音频失败: {e}")
            self.ws = None

    async def finish_audio(self):
        """发送结束帧"""
        if not self.ws:
            return
        try:
            data = {
                "header": {"status": 2, "app_id": self.app_id},
                "payload": {"audio": {"audio": "", "sample_rate": 16000, "encoding": "raw"}}
            }
            await self.ws.send(json.dumps(data))
        except Exception as e:
            logging.error(f"ASR 发送结束帧失败: {e}")
        finally:
            # 注意：讯飞收到 status=2 后会处理完最后的结果并关闭连接
            # 我们的 _listen 任务会处理后续关闭
            pass
