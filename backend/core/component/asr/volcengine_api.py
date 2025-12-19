import json
import asyncio
import uuid
import httpx
import time

class Client:
    def __init__(self, api_key: str, model_name: str = "bigmodel", resource_id: str = "volc.seedasr.auc"):
        self.api_key = api_key
        self.model_name = model_name
        self.resource_id = resource_id
        self.submit_url = "https://openspeech-direct.zijieapi.com/api/v3/auc/bigmodel/submit"
        self.query_url = "https://openspeech-direct.zijieapi.com/api/v3/auc/bigmodel/query"

    async def transcribe(self, audio_url: str) -> str:
        """
        将音频 URL 转换为文本。
        """
        task_id = str(uuid.uuid4())
        headers = {
            "x-api-key": self.api_key,
            "X-Api-Resource-Id": self.resource_id,
            "X-Api-Request-Id": task_id,
            "X-Api-Sequence": "-1",
            "Content-Type": "application/json"
        }

        request_body = {
            "user": {
                "uid": "maho_user"
            },
            "audio": {
                "url": audio_url,
            },
            "request": {
                "model_name": self.model_name,
                "enable_channel_split": True,
                "enable_ddc": True,
                "enable_speaker_info": True,
                "enable_punc": True,
                "enable_itn": True,
                "corpus": {
                    "correct_table_name": "",
                    "context": ""
                }
            }
        }

        async with httpx.AsyncClient() as client:
            # 1. 提交任务
            response = await client.post(self.submit_url, json=request_body, headers=headers, timeout=30)
            
            if response.headers.get("X-Api-Status-Code") != "20000000":
                raise Exception(f"ASR Task Submission Failed: {response.text}")

            x_tt_logid = response.headers.get("X-Tt-Logid", "")
            
            # 2. 轮询结果
            query_headers = {
                "x-api-key": self.api_key,
                "X-Api-Resource-Id": self.resource_id,
                "X-Api-Request-Id": task_id,
                "X-Tt-Logid": x_tt_logid
            }

            while True:
                query_response = await client.post(self.query_url, json={}, headers=query_headers, timeout=30)
                code = query_response.headers.get('X-Api-Status-Code', "")
                
                if code == '20000000':  # 任务完成
                    result_json = query_response.json()
                    return result_json.get("result", {}).get("text", "")
                elif code in ['20000001', '20000002']:  # 任务运行中/排队中
                    await asyncio.sleep(2)
                else:
                    raise Exception(f"ASR Task Query Failed (Code: {code}): {query_response.text}")
