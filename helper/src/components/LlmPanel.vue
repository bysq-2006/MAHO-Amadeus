<script setup lang="ts">
import type { ConfigForm } from "../types/config";

defineProps<{ form: ConfigForm }>();
</script>

<template>
  <section class="settings-page">
    <div class="page-heading">
      <span class="section-icon">L</span>
      <div>
        <h1>LLM</h1>
        <p>模型提供方、接口地址和全局提示词</p>
      </div>
    </div>

    <div class="section-stack">
      <article class="settings-section">
        <div class="section-title">
          <h2>模型选择</h2>
          <select v-model="form.llmSelect">
            <option value="ollama_api">Ollama</option>
            <option value="openai_api">OpenAI 兼容</option>
          </select>
        </div>

        <label>
          <span>全局 System Prompt</span>
          <textarea v-model="form.llmSystemPrompt" rows="4" />
        </label>
      </article>

      <article class="settings-section">
        <div class="section-title">
          <h2>{{ form.llmSelect === "ollama_api" ? "Ollama 参数" : "OpenAI 兼容参数" }}</h2>
        </div>

        <div v-if="form.llmSelect === 'ollama_api'" class="field-grid">
          <label>
            <span>模型</span>
            <input v-model="form.ollamaModel" />
          </label>
          <label>
            <span>Base URL</span>
            <input v-model="form.ollamaBaseUrl" />
          </label>
        </div>

        <div v-else class="field-grid">
          <label>
            <span>API Key</span>
            <input v-model="form.openaiApiKey" type="password" />
          </label>
          <label>
            <span>Base URL</span>
            <input v-model="form.openaiBaseUrl" />
          </label>
          <label>
            <span>模型</span>
            <input v-model="form.openaiModel" />
          </label>
          <label>
            <span>超时秒数</span>
            <input v-model.number="form.openaiTimeout" min="1" type="number" />
          </label>
        </div>
      </article>
    </div>
  </section>
</template>
