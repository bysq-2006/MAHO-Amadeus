<script setup lang="ts">
import type { ConfigForm } from "../types/config";

defineProps<{ form: ConfigForm }>();
</script>

<template>
  <section class="settings-page">
    <div class="page-heading">
      <span class="section-icon">T</span>
      <div>
        <h1>TTS</h1>
        <p>语音合成服务与模型目录</p>
      </div>
    </div>

    <div class="section-stack">
      <article class="settings-section">
        <div class="section-title">
          <h2>语音服务</h2>
          <select v-model="form.ttsSelect">
            <option value="genie_tts_service">Genie TTS</option>
            <option value="gpt_sovits_api">GPT-SoVITS</option>
          </select>
        </div>

        <label class="switch-line">
          <input v-model="form.ttsUseResourceLock" type="checkbox" />
          <span>启用资源锁</span>
        </label>
      </article>

      <article v-if="form.ttsSelect === 'genie_tts_service'" class="settings-section">
        <div class="section-title">
          <h2>Genie TTS 参数</h2>
        </div>

        <div class="field-grid">
          <label>
            <span>ONNX 模型目录</span>
            <input v-model="form.genieOnnxModelDir" />
          </label>
          <label>
            <span>Genie 数据目录</span>
            <input v-model="form.genieDataDir" />
          </label>
          <label>
            <span>语言</span>
            <input v-model="form.genieLanguage" />
          </label>
          <label class="switch-line">
            <input v-model="form.genieAutoLoad" type="checkbox" />
            <span>启动时自动加载</span>
          </label>
        </div>
      </article>

      <article v-else class="help-card">
        <h2>GPT-SoVITS 参数</h2>
        <p>当前 config.yaml 里没有该服务的参数块，所以这里只保留服务选择。</p>
      </article>
    </div>
  </section>
</template>
