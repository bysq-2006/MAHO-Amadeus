from pathlib import Path
import asyncio
from core.util.config import load_yaml
from core.component.llm.LLMService import LLM
from core.component.tts.TTSService import TTS
from core.component.translator.TranslatorService import Translator
from core.component.asr.ASRService import ASR


class BaseAmadeus:
    """
        Amadeus核心类，负责初始化和管理核心功能
    """

    def __init__(self):
        config_path = Path("config.yaml")
        self.config = load_yaml(config_path)
        self.llm = LLM(self.config.get("llm", {}))
        self.tts = TTS(self.config.get("tts", {}))
        self.translator = Translator(self.config.get("translator", {}))
        self.asr = ASR(self.config.get("asr", {}))

        self.message_queue = asyncio.Queue()  # 使用 asyncio.Queue 以支持异步操作
        self.sentence_queue = asyncio.Queue()  # 句子队列，用于 TTS 处理
        self.user = {}  # 用户信息
        self.context_window = []  # 上下文窗口
        self.context_window_index = 0  # 上下文窗口索引，每次前端获取上下文窗口就更新这个索引
