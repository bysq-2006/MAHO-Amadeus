# Genie TTS 组件使用说明

## 简介

Genie TTS 是一个轻量化的 TTS（文本转语音）推理服务，使用 ONNX 模型进行语音合成。相比传统方法，模型体积减小数十倍，推理速度更快。
<br>
感谢 [Genie-tts](https://github.com/High-Logic/Genie-TTS)。

## 文件部署
[首先点击我在这个链接下载好需要的文件](https://www.modelscope.cn/models/bysq2006/maho-tts2/files)
maho2-e15.ckpt
maho2_e8_s528.pth
这两个是训练用的模型文件
GenieData.zip
这个是项目依赖项，是一个目录。
TTS-maho.zip
这个是ONNX模型文件，是一个目录。

**两个目录要解压**

### 1. 复制模型文件

将以下目录复制到 `backend/models/` 下：

- `TTS-maho/` → `backend/models/TTS-maho/`
- `GenieData/` → `backend/models/GenieData/`

### 2. 安装依赖
如果你已经在后端执行过下载所有依赖的话，就不用。
```bash
pip install genie-tts
```

### 3. 更新配置

修改 `backend/config.yaml`，设置 `tts的select为genie_tts_service`

### 4. 启动服务

```bash
cd backend
python main.py
```

## 配置方法

在 `backend/config.yaml` 中添加或修改 TTS 组件配置：

```yaml
components:
  tts:
    select: genie_tts_service
    use_resource_lock: true    # 是否启用 TTS 资源锁（防止多角色并发冲突）
    # Genie TTS 全局配置（轻量化 ONNX 推理）
    genie_tts_service:
      genie_data_dir: "backend/models/GenieData"  # GenieData 依赖目录
      language: "ja"                                # 默认语言: ja/zh/en
      auto_load: true
      # 注意：角色专属的 onnx_model_dir、reference_audio_path 等配置
      # 已移到 characters 下的各角色的 tts_config 中
```

**注意**：从最新版本开始，`character_name`、`onnx_model_dir`、`reference_audio_path`、`reference_audio_text` 等角色专属配置已移到 `characters` 列表中各角色的 `tts_config` 下。详见 [角色配置指南](角色配置指南.md)。

## 配置说明

### 组件级别参数（components.tts.genie_tts_service）

#### 必需参数

- `genie_data_dir`: GenieData 依赖项目录

#### 可选参数

- `language`: 默认语言代码，默认 "ja"（日语）
  - `ja`: 日语
  - `zh`: 中文
  - `en`: 英语
- `auto_load`: 是否在初始化时自动加载模型，默认 `true`

### 角色级别参数（characters[].tts_config）

以下参数已移到各角色的 `tts_config` 中：

- `character_name`: 角色名称，用于 TTS 服务内部注册
- `onnx_model_dir`: ONNX 模型文件所在目录
- `reference_audio_path`: 参考音频文件路径，用于情感和语调克隆
- `reference_audio_text`: 参考音频对应的文本内容


## 优势

1. **轻量化**: ONNX 模型体积比原始模型小数十倍
2. **快速推理**: 优化的 ONNX 推理引擎，速度更快
3. **易于部署**: 不需要 GPU，CPU 即可高效运行
4. **兼容性强**: 与现有 TTS 服务架构完全兼容