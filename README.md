#  MAHO-Amadeus

##  项目简介

MAHO-Amadeus 灵感来源于《命运石之门》。目标是打造一个可扩展的虚拟角色交互框架，前端展示人物界面，用户可以与角色进行自然语言聊天。
因为是全本地部署，所以对配置要求比较高，起码得有个4060显卡感觉吧，后面我会写网络接口，可以给配置比较低的电脑使用。
<br>
登录的用户和密码都是: a，
<br>
[视频教程](https://www.bilibili.com/video/BV1sx2rBzEzK)，
<br>
doc文档里有扩展相关信息，
<br>
进入聊天界面，点击左上角的视频聊天按钮，可以进行语音聊天。

## 选择角色：
- 默认角色 MAHO直接按照当前的说明配
- 椎名真由理（Shiina Mayuri）版本配置说明见 [真由理版本配置指南](doc/may相关/真由理版本配置指南.md)

本项目分为前端和后端和模型：
- **前端**：基于 Vue 3，负责角色形象展示、聊天界面交互。
- **后端**：基于 Python，负责对话逻辑、模型推理、数据处理等。
- **模型**: 一堆堆的模型服务，看个人喜好。

## ⚙️ 部署

### 🌐 前端部署 (Frontend)
1. **环境准备**：安装 Node.js (推荐 v18+)。
2. **安装依赖**：
   ```bash
   cd frontend
   npm install
   ```
3. **启动开发服务器**：
   ```bash
   npm run dev
   ```
这里我是习惯直接从发服务器启动，你喜欢的话也可以自己编译出来用，具体的话去看vue教程。

### 🐍 后端部署 (Backend)
1. **环境准备**：安装 Python 3.10+。
2. **安装依赖**：
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
3. **核心配置与扩展**：
   项目后端采用**组件化架构**，LLM、TTS、翻译等核心功能均可自由切换。修改 `backend/config.yaml` 即可灵活配置：
   核心代码位于backend\core\component\
   
   *   **模块化切换**：通过修改各板块的 `select` 字段（如 `ollama_api`, `gpt_sovits_api`）一键切换不同服务提供商。
   *   **LLM 配置**：默认支持 Ollama，可扩展接入 OpenAI 兼容 API（如阿里云 DashScope、通义千问、DeepSeek 等）。只需修改 `select` 为 `openai_api` 并配置相应参数即可。
   *   **TTS 配置**：支持 GPT-SoVITS，可配置参考音频、语速等。
   *   **翻译配置**：支持多源切换（Ollama 本地大模型、百度 API、Argos 离线翻译、OpenAI 兼容 API）。
   
4. **启动服务**：
   ```bash
   python main.py
   ```

### 🤖 LLM
[模型下载（基于qwen-14B微调）](https://www.modelscope.cn/models/bysq2006/maho-llm/files)
下载qwen3-14b.Q4_K_M.gguf 和 Modelfile
Modelfile 是用于配置和管理大语言模型（LLM）参数的文件，qwen3-14b.Q4_K_M.gguf是模型。下载后，你可以按照以下步骤使用：

1. 将 `Modelfile` 文件与 `qwen3-14b.Q4_K_M.gguf` 放在同一目录下。
2. 根据你的推理框架（如 Ollama、llama.cpp 等），在启动模型时指定 `Modelfile` 路径。例如，使用 Ollama 时可以运行：

  ```bash
  ollama create maho -f ./Modelfile
  ```
3. 打开一个终端输入 ollama serve

确保 `Modelfile` 中的参数与你的模型文件和硬件环境相匹配。具体配置说明可参考 [Ollama 官方文档](https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md) 或相关推理框架的文档。


### 🔊 TTS

#### 方法一（不推荐，太大了）
[模型和环境下载](https://www.modelscope.cn/models/bysq2006/maho-tts/files)
在里面下载GPT-SoVITS-v2pro-20250604.zip
然后解压到喜欢的位置，

这里面自带了运行时环境./runtime/python.exe
解压好之后直接

cd 你的解压路径\GPT-SoVITS-v2pro-20250604
./runtime/python.exe api.py -s SoVITS_weights_v2Pro/maho_e8_s528.pth -g GPT_weights_v2Pro/maho-e15.ckpt

即可启动本地TTS

然后后端配置文件里面
  gpt_sovits_api:
    base_url: "http://127.0.0.1:9880"
    refer_wav_path: "C:\\Users\\19045\\Desktop\\MAHO\\backend\\data\\TTS-audio\\激动.wav"
refer_wav_path记得改成你的本地路径

#### 方法二 (推荐，轻量化ONNX推理)
参考 [GENIETTS接口说明.md](doc/GENIETTS接口说明.md)

### 🌍 翻译 (Translator)
本项目支持多种翻译方式，推荐使用 **本地 LLM (Ollama)** 以获得最佳的上下文理解能力，同时也支持 Argos（离线轻量）和 百度翻译 API。

#### 方案 A：本地 LLM 翻译（推荐，需双 Ollama 实例）
这个翻译是因为TTS我是用的日文训练，所以回答必须先转成日文再进入TTS。
为了避免翻译模型与聊天模型抢占显存导致频繁加载，建议开启第二个 Ollama 服务专门用于翻译。

1. **下载翻译模型**：
   推荐使用 `qwen2.5:0.5b`，速度快且显存占用极低。
   ```bash
   ollama pull qwen2.5:0.5b
   ```

2. **启动独立翻译服务**：
   打开一个新的 PowerShell 窗口，运行以下命令在 **11435** 端口启动 Ollama：
   ```powershell
   $env:OLLAMA_HOST="127.0.0.1:11435"; ollama serve
   ```

3. **修改配置**：
   确保 `backend/config.yaml` 中的 `ollama_translator` 配置指向新端口：
   ```yaml
   translator:
     select: ollama_translator
     ollama_translator:
       model: "qwen2.5:0.5b"
       base_url: "http://localhost:11435"
   ```

其他翻译方法见 [翻译配置.md](doc/翻译配置.md)

---

🤝 欢迎 Star、Fork、提交 Issue 或 PR，一起完善 MAHO-Amadeus

---
