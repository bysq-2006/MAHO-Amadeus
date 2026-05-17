<script setup lang="ts">
export interface HomeSearchResult {
  id: string;
  title: string;
  subtitle: string;
  kind: "配置" | "文档";
}

defineProps<{
  query: string;
  configPath: string;
  loadingConfig: boolean;
  results: HomeSearchResult[];
}>();

defineEmits<{
  "update:query": [value: string];
  "update:configPath": [value: string];
  openResult: [id: string];
  loadConfigPath: [];
}>();
</script>

<template>
  <section class="home-page">
    <div class="home-hero">
      <div>
        <p>MAHO Helper</p>
        <h1>主页导航</h1>
      </div>
      <input
        :value="query"
        autofocus
        placeholder="搜索配置、文档、关键词..."
        type="search"
        @input="$emit('update:query', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="home-grid">
      <article class="settings-section">
        <div class="section-title">
          <h2>配置文件路径</h2>
          <button class="primary" type="button" :disabled="loadingConfig" @click="$emit('loadConfigPath')">
            {{ loadingConfig ? "加载中" : "加载配置" }}
          </button>
        </div>
        <label>
          <span>YAML 路径</span>
          <input
            :value="configPath"
            placeholder="例如 D:\\bysq_D\\MAHO\\backend\\config.yaml"
            @input="$emit('update:configPath', ($event.target as HTMLInputElement).value)"
          />
        </label>
      </article>

      <article class="settings-section">
        <div class="section-title">
          <h2>搜索结果</h2>
          <span class="result-count">{{ results.length }} 项</span>
        </div>
        <div class="result-list">
          <button v-for="result in results" :key="result.id" type="button" @click="$emit('openResult', result.id)">
            <span>{{ result.kind }}</span>
            <strong>{{ result.title }}</strong>
            <small>{{ result.subtitle }}</small>
          </button>
          <p v-if="results.length === 0" class="empty-result">没有匹配项</p>
        </div>
      </article>
    </div>
  </section>
</template>
