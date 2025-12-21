import logging
import asyncio
import re
import json
import base64

async def handle_chat(websocket, Amadeus, user_text):
    """
    聊天处理逻辑
    """
    # 发送开始标签
    await websocket.send_text(json.dumps({"type": "start"}))
    logging.info(f"成功收到: {user_text}")

    # 更新用户上下文
    Amadeus.context_window.append({"role": "user", "content": user_text})

    full_response = ""
    async for response in Amadeus.llm.generate(Amadeus.context_window):
        full_response += response
        await Amadeus.message_queue.put(response)

    # 更新助手上下文
    Amadeus.context_window.append(
        {"role": "assistant", "content": full_response})

    # 等待两个队列都处理完毕
    await Amadeus.message_queue.join()
    await Amadeus.sentence_queue.join()

    # 发送结束标签
    await websocket.send_text(json.dumps({"type": "end"}))

async def process_char_queue(Amadeus, websocket):
    """
    处理字符队列：发送字符流 -> 组合成句子 -> 放入句子队列
    """
    buffer = ""
    # 定义结束标点符号，用于断句
    sentence_endings = re.compile(r'[，,。！？.!?\n]+')

    while True:
        try:
            char = await Amadeus.message_queue.get()

            # 筛选掉没用的字符
            unwanted_chars = ["<think>", "</think>", "<thinking>", "</thinking>", "\n", "\t", " ", "\r"]
            if not char or char.strip() == "" or char in unwanted_chars:
                Amadeus.message_queue.task_done()
                continue

            # 发送字符流（带标签）
            await websocket.send_text(json.dumps({"type": "text", "data": char}))
            buffer += char

            # 检查是否形成完整句子
            if sentence_endings.search(char):
                sentence = buffer.strip()
                if sentence:
                    # 将完整句子放入句子队列，供 TTS 处理
                    await Amadeus.sentence_queue.put(sentence)
                buffer = ""  # 清空缓冲区

            Amadeus.message_queue.task_done()

        except asyncio.CancelledError:
            raise
        except Exception as e:
            logging.error(f"字符队列处理出错: {e!r}")

async def process_sentence_queue(Amadeus, websocket):
    """
    处理句子队列：翻译 -> TTS -> 发送音频流
    """
    while True:
        try:
            sentence = await Amadeus.sentence_queue.get()

            loop = asyncio.get_event_loop()
            # 翻译成日语
            ja_sentence = await loop.run_in_executor(None, Amadeus.translator.translate, sentence)
            logging.info(f"翻译结果: {ja_sentence}")

            # 调用 TTS 生成音频 (在线程池中运行以避免阻塞)
            audio_data = await loop.run_in_executor(None, Amadeus.tts.generate_audio, ja_sentence)
            if audio_data:
                # 分片发送音频，避免超过 WebSocket 消息大小限制
                CHUNK_SIZE = 30 * 1024  # 30KB, 是 3 的倍数
                total_len = len(audio_data)

                for i in range(0, total_len, CHUNK_SIZE):
                    chunk_data = audio_data[i:i + CHUNK_SIZE]
                    chunk_b64 = base64.b64encode(chunk_data).decode()
                    await websocket.send_text(json.dumps({
                        "type": "audio",
                        "data": chunk_b64,
                        "is_final": (i + CHUNK_SIZE >= total_len)
                    }))

                logging.info(f"已分片发送音频数据，总长度: {total_len}")
            else:
                logging.warning("TTS 生成失败")

            Amadeus.sentence_queue.task_done()

        except asyncio.CancelledError:
            raise
        except Exception as e:
            logging.error(f"句子队列处理出错: {e!r}")
