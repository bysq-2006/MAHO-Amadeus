<script setup lang="ts">
import type { ConfigForm } from "../types/config";

defineProps<{ form: ConfigForm }>();
</script>

<template>
  <section class="settings-page">
    <div class="page-heading">
      <span class="section-icon">R</span>
      <div>
        <h1>翻译</h1>
        <p>翻译服务选择和对应 provider 参数</p>
      </div>
    </div>

    <div class="section-stack">
      <article class="settings-section">
        <div class="section-title">
          <h2>翻译提供方</h2>
          <select v-model="form.translatorSelect">
            <option value="baidu_api">百度翻译</option>
            <option value="argos_api">Argos</option>
            <option value="ollama_translator">Ollama</option>
            <option value="openai_translator">OpenAI</option>
          </select>
        </div>
      </article>

      <article v-if="form.translatorSelect === 'baidu_api'" class="settings-section">
        <div class="section-title">
          <h2>百度翻译参数</h2>
        </div>
        <div class="field-grid">
          <label>
            <span>AppID</span>
            <input v-model="form.baiduAppid" />
          </label>
          <label>
            <span>AppKey</span>
            <input v-model="form.baiduAppkey" type="password" />
          </label>
        </div>
      </article>

      <article v-else-if="form.translatorSelect === 'argos_api'" class="settings-section">
        <div class="section-title">
          <h2>Argos 参数</h2>
        </div>
        <div class="field-grid">
          <label>
            <span>目标语言</span>
            <input v-model="form.argosToLang" />
          </label>
        </div>
      </article>

      <article v-else-if="form.translatorSelect === 'ollama_translator'" class="settings-section">
        <div class="section-title">
          <h2>Ollama 翻译参数</h2>
        </div>
        <div class="field-grid">
          <label>
            <span>模型</span>
            <input v-model="form.ollamaTranslatorModel" />
          </label>
          <label>
            <span>Base URL</span>
            <input v-model="form.ollamaTranslatorBaseUrl" />
          </label>
        </div>
      </article>

      <article v-else class="settings-section">
        <div class="section-title">
          <h2>OpenAI 翻译参数</h2>
        </div>
        <div class="field-grid">
          <label>
            <span>API Key</span>
            <input v-model="form.openaiTranslatorApiKey" type="password" />
          </label>
          <label>
            <span>Base URL</span>
            <input v-model="form.openaiTranslatorBaseUrl" />
          </label>
          <label>
            <span>模型</span>
            <input v-model="form.openaiTranslatorModel" />
          </label>
        </div>
      </article>
    </div>
  </section>
</template>
