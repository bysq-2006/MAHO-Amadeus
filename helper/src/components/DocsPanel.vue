<script setup lang="ts">
import type { DocFile } from "../types/docs";

defineProps<{
  doc: DocFile | null;
  search: string;
  matches: Array<{ line: string; lineNumber: number }>;
  loading: boolean;
  error: string;
}>();

defineEmits<{
  "update:search": [value: string];
}>();
</script>

<template>
  <section class="docs-page">
    <div class="doc-searchbar">
      <input
        :value="search"
        placeholder="搜索当前文档关键词"
        type="search"
        @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div v-if="error" class="doc-state error">{{ error }}</div>
    <div v-else-if="loading" class="doc-state">正在读取文档...</div>
    <div v-else-if="!doc" class="doc-state">请选择左侧文档</div>

    <article v-else class="doc-reader">
      <header class="doc-header">
        <div>
          <h1>{{ doc.title }}</h1>
          <p>{{ doc.path }}</p>
        </div>
      </header>

      <section v-if="search.trim()" class="doc-matches">
        <h2>匹配结果</h2>
        <p v-if="matches.length === 0">没有找到匹配内容</p>
        <button v-for="item in matches" :key="item.lineNumber" type="button">
          <span>Line {{ item.lineNumber }}</span>
          <strong>{{ item.line }}</strong>
        </button>
      </section>

      <pre class="doc-content">{{ doc.content }}</pre>
    </article>
  </section>
</template>
