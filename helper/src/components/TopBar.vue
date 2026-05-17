<script setup lang="ts">
defineProps<{
  configPath: string;
  status: string;
  error: string;
  loading: boolean;
  saving: boolean;
}>();

defineEmits<{
  reload: [];
  save: [];
}>();
</script>

<template>
  <header class="topbar">
    <div>
      <p class="path">{{ configPath || "backend/config.yaml" }}</p>
      <p v-if="status" class="status">{{ status }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
    <div class="actions">
      <button class="ghost" type="button" :disabled="loading" @click="$emit('reload')">
        {{ loading ? "加载中" : "重新加载" }}
      </button>
      <button class="primary" type="button" :disabled="saving" @click="$emit('save')">
        {{ saving ? "保存中" : "保存配置" }}
      </button>
    </div>
  </header>
</template>
