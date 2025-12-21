<template>
  <div>
    <CenterRevealMask :visible="showMask">
      <div class="bg-container">
        <div class="bg-part left" :style="{ backgroundImage: `url(${meswinImg})` }"></div>
        <div class="bg-part right" :style="{ backgroundImage: `url(${meswinImg})` }"></div>
      </div>
      <meswinName :name="currentName" class="Meswinname" />
      <textarea :readonly="isWaiting" name="dialog-textarea" id="dialog-textarea" class="dialog-textarea"
        v-model="dialogText" @keyup="sendTextToWS" ref="textareaRef"></textarea>
      <SpritePlayer v-if="!isWaiting" :src="ringImg" :rows="12" :columns="5" :fps="45" :width="spriteSize"
        :height="spriteSize" :totalFrames="60" :loop="0"
        :style="{ position: 'absolute', left: caretX + 'px', top: caretY + 'px', pointerEvents: 'none', zIndex: 9999 }" />
    </CenterRevealMask>
    <SiriWave :visible="showSiriWave" class="Siri-wave"/>
  </div>
</template>

<script setup lang="js">
import { useHomeStore } from '@/stores/home';
import { useVADStore } from '@/stores/vad';
import { ref, onMounted, nextTick, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import CenterRevealMask from '@/component/CenterRevealMask.vue'
import SpritePlayer from '@/component/SpritePlayer.vue'
import meswinName from './meswinName.vue';
import SiriWave from './SiriWave.vue'
// @ts-ignore
import getCaretCoordinates from 'textarea-caret';
import meswinImg from '@/assets/meswin/meswin.png'
import ringImg from '@/assets/sprite/ring.png'

const homeStore = useHomeStore()
const vadStore = useVADStore()
const { textQueue, isWaiting, currentName, buttonStates } = storeToRefs(homeStore)
const { send } = homeStore
const showMask = ref(false)
const showSiriWave = ref(false)

const dialogText = ref('');
const caretX = ref(0)
const caretY = ref(0)
const textareaRef = ref()
const spriteSize = ref(44) // 固定像素大小

function updateCaret() {
  const textarea = textareaRef.value;
  if (!textarea) return
  const pos = textarea.value.length; // 末尾位置
  const coords = getCaretCoordinates(textarea, pos);
  caretX.value = coords.left + 16
  caretY.value = coords.top + 12
}

function sendTextToWS(e) {
  if (e.key === 'Enter' && !e.shiftKey && !isWaiting.value) {
    e.preventDefault(); // 阻止默认的换行行为
    const message = dialogText.value.trim();
    if (message) {
      send({ type: 'chat', data: message, token: localStorage.getItem('token') });
      dialogText.value = ''; // 发送后清空输入框
    }
  }
}

async function processTextQueue() {
  while (true) {
    updateCaret(); // 更新光标位置
    if (!isWaiting.value) {
      await new Promise(resolve => setTimeout(resolve, 100)); // 等待100ms再检查
      continue;
    }
    await nextTick(); // 等待下一帧，防止阻塞
    // 取出所有字符并筛选
    const filtered = textQueue.value.filter(ch => ch !== '\n' && ch.trim() !== '');
    dialogText.value = filtered.join('');
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms轮询
  }
}

const handleKeyDown = (e) => {
  if (e.key.toLowerCase() === 'h' && e.shiftKey) {
    if (showMask.value) {
      showMask.value = false;
    } else {
      showMask.value = true;
    }
  }
}

onMounted(() => {
  vadStore.initVAD()

  vadStore.onVoiceStart = () => {
    if (buttonStates.value.video) {
      showMask.value = false
      showSiriWave.value = true
    }
  }

  vadStore.onVoiceEnd = () => {
    if (buttonStates.value.video) {
      showMask.value = true
      showSiriWave.value = false
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  processTextQueue();
  setTimeout(() => {
    showMask.value = true
    updateCaret()
  }, 1000)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
})
</script>

<style>
.Meswinname {
  position: absolute;
  bottom: 40px;
  /* 改为固定像素 */
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.dialog-textarea {
  background: rgba(0, 0, 0, 0.0);
  color: #e6e6e6;
  font-family: 'Microsoft YaHei', 'SimHei', '黑体', 'STHeiti', sans-serif;
  font-size: 2.2rem;
  /* 改为固定像素 */
  text-shadow: 2px 2px 6px #000, 0 0 1px #fff;
  padding: 0 14vw;
  border: none;
  border-radius: 0.2em;
  letter-spacing: 0.05em;
  line-height: 1.6;
  box-sizing: border-box;
  border-bottom: 2px solid #e6a23c;
  position: absolute;
  bottom: 0;
  left: 0;
  resize: none;

  width: 100%;
  height: 246px;
  /* 改为固定像素 */
  overflow-y: auto;
  /* 保持可滚动 */
  scrollbar-width: none;
  /* Firefox 隐藏滚动条 */
}

.dialog-textarea::-webkit-scrollbar {
  width: 0px;
  /* Chrome/Safari 隐藏滚动条 */
  background: transparent;
}

.bg-container {
  position: relative;
  /* 改回 relative 以撑开父容器宽度 */
  width: 100%;
  height: 256px;
  /* 与 textarea 保持一致 */
  display: flex;
  pointer-events: none;
}

.bg-part {
  width: 50%;
  height: 100%;
  background-repeat: no-repeat;
  background-size: auto 100%;
}

.left {
  background-position: left bottom;
}

.right {
  background-position: right bottom;
}
</style>