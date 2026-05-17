<script setup lang="ts">
import type { ConfigForm } from "../types/config";

defineProps<{ form: ConfigForm }>();
</script>

<template>
  <section class="settings-page">
    <div class="page-heading">
      <span class="section-icon">A</span>
      <div>
        <h1>ASR</h1>
        <p>语音识别开关与 provider 参数</p>
      </div>
    </div>

    <div class="section-stack">
      <article class="settings-section">
        <div class="section-title">
          <h2>识别服务</h2>
          <select v-model="form.asrSelect">
            <option value="none">不启用</option>
            <option value="xfyun_asr">讯飞 ASR</option>
          </select>
        </div>
      </article>

      <article v-if="form.asrSelect === 'xfyun_asr'" class="settings-section">
        <div class="section-title">
          <h2>讯飞 ASR 参数</h2>
        </div>
        <div class="field-grid">
          <label>
            <span>App ID</span>
            <input v-model="form.xfyunAppId" />
          </label>
          <label>
            <span>API Key</span>
            <input v-model="form.xfyunApiKey" type="password" />
          </label>
          <label>
            <span>API Secret</span>
            <input v-model="form.xfyunApiSecret" type="password" />
          </label>
        </div>
      </article>

      <article v-else class="help-card">
        <h2>未启用 ASR</h2>
        <p>选择讯飞 ASR 后会显示需要填写的接口参数。</p>
      </article>
    </div>
  </section>
</template>
