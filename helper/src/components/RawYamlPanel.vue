<script setup lang="ts">
defineProps<{
  modelValue: string;
}>();

defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<template>
  <section class="settings-page">
    <div class="page-heading">
      <span class="section-icon">Y</span>
      <div>
        <h1>原始 YAML</h1>
        <p>直接编辑 backend/config.yaml 文本</p>
      </div>
    </div>

    <textarea
      class="raw-editor"
      :value="modelValue"
      spellcheck="false"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
  </section>
</template>
