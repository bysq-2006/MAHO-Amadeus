from openai import AsyncOpenAI
import os
from httpx import Timeout

class Client:
    def __init__(self, api_key: str, base_url: str, model: str, timeout: int = 60):
        # 如果 api_key 为空字符串，尝试从环境变量获取，或者允许为空（某些本地服务不需要key）
        if not api_key:
            api_key = os.getenv("OPENAI_API_KEY", "EMPTY")
            
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
            timeout=Timeout(timeout)
        )
        self.model = model

    async def generate(self, prompt: str | list, max_tokens: int = 512, temperature: float = 0.7):
        messages = []
        if isinstance(prompt, str):
            messages = [{"role": "user", "content": prompt}]
        else:
            messages = prompt

        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            yield f"错误: {str(e)}"
