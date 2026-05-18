# ASR 接口说明

## 简介

本项目支持通过讯飞开放平台提供的语音听写（流式版）接口实现语音转文字（ASR）功能。

## 讯飞 ASR 配置

### 1. 获取凭证

1. 登录 [讯飞开放平台](https://www.xfyun.cn/)。
2. 创建一个“语音听写”应用。
3. 在控制台获取以下信息：
   - **APPID**
   - **APIKey**
   - **APISecret**

### 2. 修改配置文件

在 `backend/config.yaml` 中，将 `asr` 部分的 `select` 设置为 `xfyun_asr`，并填入你的凭证：

```yaml
components:
  asr:
    select: xfyun_asr  # 设置为 xfyun_asr 启用讯飞语音识别
    xfyun_asr:
      app_id: "你的APPID"
      api_key: "你的APIKey"
      api_secret: "你的APISecret"
    none: {}
```

### 3. 禁用 ASR

如果你不需要语音输入功能，可以将 `select` 设置为 `none`：

```yaml
components:
  asr:
    select: none
    none: {}
```

## 技术细节

- **接口地址**: `wss://iat.cn-huabei-1.xf-yun.com/v1`
- **音频格式**: 采样率 16000Hz，单声道，16bit PCM (raw)。
- **实现文件**: [backend/core/component/asr/xfyun_asr.py](../backend/core/component/asr/xfyun_asr.py)
