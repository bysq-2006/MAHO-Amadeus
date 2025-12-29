from core.auth.login import AuthManager
from core.chat import handle_chat, process_char_queue, process_sentence_queue
from starlette.websockets import WebSocketDisconnect
import logging
import asyncio
import json
import base64
from pathlib import Path
import sys

# 添加项目根路径
sys.path.append(str(Path(__file__).parent.parent.parent))


class WSHandler():
    """
    负责处理 WebSocket 连接，接收消息并通过 Amadeus 实例进行处理，
    每个websocket连接对应一个Amadeus实例，确保用户隔离。
    """

    def __init__(self):
        self.auth_manager = AuthManager()  # 用于验证 WebSocket 消息中的 token
        self.current_chat_task = None      # 记录当前正在运行的聊天任务

    async def interrupt_chat(self, websocket, Amadeus):
        """
        中断当前的聊天逻辑：取消 LLM 任务，清空队列，发送结束信号
        """
        # 断开/取消 LLM 任务
        if self.current_chat_task and not self.current_chat_task.done():
            self.current_chat_task.cancel()
            try:
                await self.current_chat_task
            except asyncio.CancelledError:
                logging.info("LLM 生成任务已成功取消")
            except Exception as e:
                logging.error(f"取消任务时出错: {e}")
            finally:
                self.current_chat_task = None

        # 清空两个队列
        # 清空消息队列 (字符流)
        while not Amadeus.message_queue.empty():
            try:
                Amadeus.message_queue.get_nowait()
                Amadeus.message_queue.task_done()
            except asyncio.QueueEmpty:
                break

        # 清空句子队列 (TTS)
        while not Amadeus.sentence_queue.empty():
            try:
                Amadeus.sentence_queue.get_nowait()
                Amadeus.sentence_queue.task_done()
            except asyncio.QueueEmpty:
                break

        # 发送结束标签
        await websocket.send_text(json.dumps({"type": "end"}))
        logging.info("已中断当前对话并清空队列")

    async def handle_ws(self, websocket, Amadeus):
        """
        这里主要是接收数据，发送消息是通过队列异步完成的，就是下面的两个任务
        1. process_char_queue 负责从 Amadeus.message_queue 读取字符流并发送给前端
        2. process_sentence_queue 负责从 Amadeus.sentence_queue 读取句子 TTS 并发送给前端
        """
        await websocket.accept()  # 必须先接受连接
        logging.info("WebSocket 连接已接受")

        # 启动两个处理任务：一个处理字符流，一个处理句子TTS
        char_task = asyncio.create_task(
            process_char_queue(Amadeus, websocket))
        sentence_task = asyncio.create_task(
            process_sentence_queue(Amadeus, websocket))

        # 定义 ASR 结果回调：直接触发聊天
        async def on_asr_result(text):
            logging.info(f"ASR 识别结果回调: {text}")
            self.current_chat_task = asyncio.create_task(
                handle_chat(websocket, Amadeus, text))

        # 初始化 ASR 连接
        await Amadeus.asr.start(on_asr_result)

        try:
            while True:
                data = await websocket.receive_text()
                msg = json.loads(data)

                if msg.get("type") == "chat":
                    token = msg.get("token")
                    if not token or not self.auth_manager.verify_token(token):
                        await websocket.send_text(json.dumps({"type": "error", "msg": "未授权，请先登录"}))
                        continue
                    
                    # 创建新的聊天任务，不阻塞主循环以接收后续消息（如打断信号）
                    self.current_chat_task = asyncio.create_task(
                        handle_chat(websocket, Amadeus, msg.get("data")))
                
                elif msg.get("type") == "interrupt":
                    # 显式接收到打断信号
                    await self.interrupt_chat(websocket, Amadeus)
                
                elif msg.get("type") == "audio":
                    # 接收音频数据
                    token = msg.get("token")
                    if not token or not self.auth_manager.verify_token(token):
                        await websocket.send_text(json.dumps({"type": "error", "msg": "未授权，请先登录"}))
                        continue
                    
                    audio_data = msg.get("data")
                    is_final = msg.get("is_final", False)
                    
                    if audio_data:
                        try:
                            # 解码并直接发送给 ASR
                            chunk = base64.b64decode(audio_data)
                            await Amadeus.asr.send_audio(chunk)
                        except Exception as e:
                            logging.error(f"音频处理失败: {e}")

                    if is_final:
                        await Amadeus.asr.finish_audio()
        except WebSocketDisconnect:
            logging.info("WebSocket 已断开")
        finally:
            # 取消处理任务
            char_task.cancel()
            sentence_task.cancel()
            try:
                await char_task
                await sentence_task
            except asyncio.CancelledError:
                pass
