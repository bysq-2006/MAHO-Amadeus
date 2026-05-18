#### 使用 OpenAI 兼容 API
除了本地 Ollama，你也可以使用云端大模型服务：

1. **修改配置**：
   修改 `backend/config.yaml` 中的 `llm` 部分：
   ```yaml
   components:
     llm:
       select: openai_api
       openai_api:
         api_key: "你的API_KEY"
         base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1"
         model: "qwen-plus"
         timeout: 60
   ```

2. **推荐的服务商**：
   - **阿里云 DashScope**：稳定快速，适合国内用户
   - **DeepSeek**：性价比高，推理速度快
   - **智谱AI**：中文优化好
   - **OpenAI**：原版 GPT 系列（需代理）

3. **优势**：
   - 无需本地 GPU，降低硬件要求
   - 模型更新快，性能持续提升
   - 支持多种模型切换