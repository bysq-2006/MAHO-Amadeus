import { defineStore } from 'pinia'
import { ref } from 'vue'
import config from '../config.json'
import { MahoWebSocket } from '../api/ws'
// @ts-ignore
import VAD from '../util/vad.js'

export const useHomeStore = defineStore('home', () => {
  // 队列1：字符流（type: 'text'）
  const textQueue = ref<string[]>([])
  const audioQueue = ref<{ data: string, is_final: boolean }[]>([])
  const isWaiting = ref(true)
  const wsStatus = ref('closed')
  
  // 按钮状态
  const buttonStates = ref({
    video: false
  })
  
  const userName = ref(localStorage.getItem('username') || '未命名')
  const amadeusName = ref(config.amadeusName || '比屋定真帆')
  const currentName = ref(userName.value)

  const wsClient = new MahoWebSocket()

  // --- 音频上下文管理 ---
  let audioCtx: AudioContext | null = null
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      audioCtx = new AudioContextClass()
    }
    // 浏览器策略：必须在用户交互后 resume
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
    return audioCtx
  }

  // --- VAD 相关逻辑 ---
  const userAudioQueue = ref<Float32Array[]>([])
  const isVADInitialized = ref(false)
  let isSpeaking = false

  // 暴露给外部自定义的回调钩子
  const onVoiceStart = ref<(() => void) | null>(null)
  const onVoiceEnd = ref<(() => void) | null>(null)

  async function initVAD() {
    if (isVADInitialized.value) return
    isVADInitialized.value = true

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = getAudioContext()
      const source = ctx.createMediaStreamSource(stream)

      // 创建音频处理器用于获取原始 PCM 数据
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      source.connect(processor)
      processor.connect(ctx.destination)

      processor.onaudioprocess = (e) => {
        if (isSpeaking && buttonStates.value.video) {
          const inputData = e.inputBuffer.getChannelData(0)
          userAudioQueue.value.push(new Float32Array(inputData))
        }
      }
      
      // 初始化 VAD 实例
      new (VAD as any)({
        source: source,
        voice_start: () => {
          if (buttonStates.value.video) {
            isSpeaking = true
            console.log('VAD: 检测到语音开始')
            onVoiceStart.value?.()
          }
        },
        voice_stop: () => {
          if (buttonStates.value.video) {
            isSpeaking = false
            console.log('VAD: 检测到语音结束，已清空临时队列')
            userAudioQueue.value = []
            onVoiceEnd.value?.()
          }
        }
      })
      console.log('VAD 系统已就绪')
    } catch (err) {
      isVADInitialized.value = false
      console.error('VAD 初始化失败，请检查麦克风权限:', err)
    }
  }
  // --------------------

  // 注册 WebSocket 回调函数
  wsClient.on('open', () => {
    wsStatus.value = 'connected'
  })

  wsClient.on('close', () => {
    wsStatus.value = 'closed'
  })

  wsClient.on('text', (msg: any) => {
    textQueue.value.push(msg.data)
  })

  wsClient.on('audio', (msg: any) => {
    audioQueue.value.push({
      data: msg.data,
      is_final: msg.is_final
    })
  })

  wsClient.on('start', () => {
    textQueue.value = []
    isWaiting.value = true
    currentName.value = amadeusName.value
  })

  wsClient.on('end', () => {
    currentName.value = userName.value
    isWaiting.value = false
  })

  function send(data: any) {
    wsClient.send(data)
  }

  return {
    textQueue,
    audioQueue,
    isWaiting,
    wsStatus,
    buttonStates,
    currentName,
    userAudioQueue,
    onVoiceStart,
    onVoiceEnd,
    getAudioContext,
    initVAD,
    send
  }
})