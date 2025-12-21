<template>
  <div class="home-page">
    <div v-if="wsStatus !== 'connected'" class="ws-status-tip">WebSocket连接失效，正在尝试连接...</div>
    <!-- 左上角按钮区 -->
    <div class="button-sidebar">
      <div class="side-button" :class="{ active: buttonStates.video }" @click="buttonStates.video = !buttonStates.video"
        title="视频通话">
        <img src="@/assets/videocall.png" alt="video" />
      </div>
      <!-- 可以在这里继续添加更多按钮 -->
    </div>
    <dialogBox class="dialog" />
    <illustration ref="illustrationRef" class="illustrat" />
  </div>
</template>

<script setup>
import illustration from './illustration.vue'
import dialogBox from './dialogBox/dialogBox.vue'
import { onMounted, ref } from 'vue'
import { useHomeStore } from '@/stores/home'
import { useVADStore } from '@/stores/vad'
import { storeToRefs } from 'pinia'
const homeStore = useHomeStore()
const vadStore = useVADStore()
const { audioQueue, wsStatus, buttonStates } = storeToRefs(homeStore)
const { getAudioContext } = vadStore
const illustrationRef = ref(null)

// 音频分析器
let analyser = null
let dataArray = null

const initAudioContext = () => {
  const audioContext = getAudioContext()
  if (!analyser) {
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    dataArray = new Uint8Array(analyser.frequencyBinCount)
  }
  return audioContext
}

const playAudio = (blob) => {
  return new Promise(async (resolve) => {
    const audioContext = initAudioContext()

    const arrayBuffer = await blob.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    const source = audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(analyser)
    analyser.connect(audioContext.destination)

    let animationId
    const updateLipSync = () => {
      if (!analyser) return
      analyser.getByteFrequencyData(dataArray)

      // 计算平均音量
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
      }
      const average = sum / dataArray.length

      // 增加门限防止一直张嘴 (底噪过滤)
      const threshold = 10
      let value = 0
      if (average > threshold) {
        value = Math.min(1, ((average - threshold) / (255 - threshold)) * 3.0)
      }

      if (illustrationRef.value) {
        illustrationRef.value.setMouthOpen(value)
      }

      animationId = requestAnimationFrame(updateLipSync)
    }

    source.onended = () => {
      cancelAnimationFrame(animationId)
      if (illustrationRef.value) {
        illustrationRef.value.setMouthOpen(0) // 播放结束闭嘴
      }
      resolve()
    }

    updateLipSync()
    source.start(0)
  })
}

const processAudioQueue = async () => {
  let audioBuffer = ''
  while (true) {
    if (audioQueue.value.length > 0) {
      const chunk = audioQueue.value.shift()
      if (chunk) {
        audioBuffer += chunk.data
        if (chunk.is_final) {
          try {
            const binaryString = window.atob(audioBuffer)
            const len = binaryString.length
            const bytes = new Uint8Array(len)
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }
            const blob = new Blob([bytes], { type: 'audio/wav' })
            await playAudio(blob)
          } catch (error) {
            console.error('音频播放失败:', error)
          } finally {
            audioBuffer = ''
          }
        }
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
}

onMounted(() => {
  processAudioQueue()
})
</script>

<style scoped>
.illustrat {
  position: absolute;
}

.home-page {
  background-image: url('/bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  min-height: 100vh;
  position: relative;
}

.button-sidebar {
  position: absolute;
  top: 50px;
  /* 避开顶部的状态提示 */
  left: 2.8vw;
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 100;
}

.side-button {
  width: 64px;
  height: 64px;
  min-width: 40px;
  min-height: 40px;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0.8;
}

.side-button:active {
  transform: scale(0.95);
}

.side-button img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.side-button.active {
  opacity: 1;
}

.ws-status-tip {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  text-align: center;
  color: #e6a23c;
  font-family: 'Microsoft YaHei', 'SimHei', '黑体', 'STHeiti', sans-serif;
  font-size: 2.1vw;
  text-shadow: 2px 2px 6px #000, 0 0 1px #fff;
  padding: 0.5em 0;
  border: none;
  border-bottom: 2px solid #e6a23c;
  letter-spacing: 0.05em;
  line-height: 1.6;
  box-sizing: border-box;
  background: none;
  z-index: 10;
}

.dialog {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 2;
}
</style>