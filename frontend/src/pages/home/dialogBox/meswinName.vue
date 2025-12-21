<template>
  <div class="meswinname">
    <img :src="meswinLeft" alt="">
    <h4>{{ name }}</h4>
    <img :src="meswinRight" alt="">
  </div>
</template>

<script setup>
import meswinLeft from '@/assets/meswin/meswinLeft.png'
import meswinRight from '@/assets/meswin/meswinRight.png'

defineProps({
  name: String
})
</script>

<style scoped>
h4 {
  color: #ff9900;
  font-weight: 500;
  font-size: 2rem;
  text-shadow:
    1px 1px 2px #000,
    0 0 1px #000,
    0 0 2px #000;
  -webkit-text-stroke: 1px #000;
  font-family: 'Microsoft YaHei', 'SimHei', 'Arial', sans-serif;
  flex-shrink: 0;
}

img {
  margin: 0 0.5rem;
  user-select: none;
  -webkit-user-drag: none;
  pointer-events: none;
  flex-shrink: 0;
}

.meswinname {
  display: flex;
  align-items: center;
  white-space: nowrap;
  width: max-content;
}
</style>