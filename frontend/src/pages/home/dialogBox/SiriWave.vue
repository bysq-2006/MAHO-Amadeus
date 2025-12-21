<template>
  <div v-show="visible" ref="container" class="siri-wave-container"></div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import SiriWave from 'siriwave';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
});

const container = ref(null);
let siriWave = null;

onMounted(() => {
  siriWave = new SiriWave({
    container: container.value,
    width: window.innerWidth * 0.8, // 80vw
    height: 200,
    style: 'ios9',
    amplitude: 1,
    speed: 0.08, // 更慢的速度
    autostart: true,
  });
});

watch(() => props.visible, (newVal) => {
  if (newVal) {
    siriWave?.start();
  } else {
    siriWave?.stop();
  }
});

onUnmounted(() => {
  siriWave?.stop();
});
</script>

<style scoped>
.siri-wave-container {
  width: 80vw;
  height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  bottom: 50px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 100;
}
</style>
