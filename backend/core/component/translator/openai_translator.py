import asyncio
from core.component.llm.openai_api import Client as OpenAIClient

class Client:
    def __init__(self, api_key: str, base_url: str, model: str, **kwargs):
        self.openai_client = OpenAIClient(api_key=api_key, base_url=base_url, model=model)

    def translate(self, text: str, from_lang: str = "auto", to_lang: str = "ja") -> str:
        lang_map = {
            "ja": "日语",
            "zh": "中文",
            "en": "英语"
        }
        target_lang = lang_map.get(to_lang, to_lang)
        
        prompt = f"请将以下文本翻译成{target_lang}，直接输出翻译结果，不要包含任何解释：\n\n{text}"

        async def _translate_async():
            response = ""
            async for token in self.openai_client.generate(prompt, max_tokens=1024, temperature=0.3):
                response += token
            return response.strip()

        try:
            return asyncio.run(_translate_async())
        except RuntimeError:
            # 如果已经在事件循环中（例如在 Jupyter 或某些 async 框架中），
            # 这里需要特殊处理，但在当前架构下通常是在线程池中调用
            # 或者如果调用者是 async 的，应该修改 translate 为 async
            # 这里为了兼容性，如果报错则尝试直接返回（虽然这不可能，因为接口定义是 str）
            return "错误: 无法在当前上下文中运行异步翻译。"
        except Exception as e:
            return f"翻译错误: {str(e)}"
