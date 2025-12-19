<template>
  <div class="center-reveal-container">
    <Transition name="center-expand">
      <div v-show="visible" class="center-reveal-content">
        <slot></slot>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
}>()
</script>

<style scoped>
.center-reveal-container {
  /* 容器可以是块级或行内块，取决于具体需求，这里默认 fit-content */
  width: 100%;
  height: fit-content;
}

.center-reveal-content {
  /* 确保内容在动画过程中保持布局 */
  width: 100%;
  height: 100%;
}

/* 进入和离开的动画激活状态 */
.center-expand-enter-active,
.center-expand-leave-active {
  transition: clip-path 0.6s ease-in-out;
}

/* 进入的起始状态 和 离开的结束状态 (遮罩闭合，位于中间) */
.center-expand-enter-from,
.center-expand-leave-to {
  clip-path: inset(0 50% 0 50%);
}

/* 进入的结束状态 和 离开的起始状态 (遮罩完全打开) */
.center-expand-enter-to,
.center-expand-leave-from {
  clip-path: inset(0 0 0 0);
}
</style>
