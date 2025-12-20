import requests
import logging


class Client:
    def __init__(self,
                 base_url: str = "http://127.0.0.1:9880",
                 refer_wav_path: str = "",
                 prompt_text: str = "",
                 prompt_language: str = "ja",
                 default_text_language: str = "ja",
                 speed: float = 1.0,
                 top_k: int = 20,
                 top_p: float = 0.7,
                 temperature: float = 0.7):
        self.base_url = base_url
        self.refer_wav_path = refer_wav_path
        self.prompt_text = prompt_text
        self.prompt_language = prompt_language
        self.default_text_language = default_text_language
        self.speed = speed
        self.top_k = top_k
        self.top_p = top_p
        self.temperature = temperature

    def generate_audio(self, text: str, text_language: str | None = None, **kwargs) -> bytes | None:
        """
        调用 GPT-SoVITS API 生成音频
        :param text: 要合成的文本
        :param text_language: 文本语言，默认为初始化时的配置
        :return: 音频二进制数据
        """
        if text_language is None:
            text_language = self.default_text_language

        data = {
            "refer_wav_path": self.refer_wav_path,
            "prompt_text": self.prompt_text,
            "prompt_language": self.prompt_language,
            "text": text,
            "text_language": text_language,
            "speed": kwargs.get("speed", self.speed),
            "top_k": kwargs.get("top_k", self.top_k),
            "top_p": kwargs.get("top_p", self.top_p),
            "temperature": kwargs.get("temperature", self.temperature),
            # "sample_steps": 40 # 可选
        }

        try:
            response = requests.post(self.base_url, json=data)
            if response.status_code == 200:
                return response.content
            else:
                logging.error(
                    f"TTS API 错误: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logging.error(f"TTS 请求失败: {e}")
            return None
