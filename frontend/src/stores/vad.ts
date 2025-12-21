import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useHomeStore } from './home'
// @ts-ignore
import VAD from '../util/vad.js'

export const useVADStore = defineStore('vad', () => {
  const homeStore = useHomeStore()
  
  const isVADInitialized = ref(false)
  let isSpeaking = false

  // 暴露给外部自定义的回调钩子
  const onVoiceStart = ref<(() => void) | null>(null)
  const onVoiceEnd = ref<(() => void) | null>(null)

  // --- 音频上下文管理 ---
  let audioCtx: AudioContext | null = null
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      // 尝试指定采样率为 16000，这是讯飞 ASR 要求的
      try {
        audioCtx = new AudioContextClass({ sampleRate: 16000 })
      } catch (e) {
        console.warn('无法指定采样率为 16000，使用默认采样率', e)
        audioCtx = new AudioContextClass()
      }
    }
    // 浏览器策略：必须在用户交互后 resume
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
    return audioCtx
  }

  async function initVAD() {
    if (isVADInitialized.value) return
    isVADInitialized.value = true

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = getAudioContext()
      console.log('VAD: AudioContext 采样率:', ctx.sampleRate)
      const source = ctx.createMediaStreamSource(stream)

      // 创建音频处理器用于获取原始 PCM 数据
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      source.connect(processor)
      processor.connect(ctx.destination)

      processor.onaudioprocess = (e) => {
        if (isSpeaking && homeStore.buttonStates.video) {
          const inputData = e.inputBuffer.getChannelData(0)
          
          // 转换为 16-bit PCM
          const pcmData = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]))
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
          }

          // 转换为 Base64 并发送分片
          const uint8Array = new Uint8Array(pcmData.buffer)
          let binary = ''
          for (let i = 0; i < uint8Array.byteLength; i++) {
            binary += String.fromCharCode(uint8Array[i])
          }
          const base64 = btoa(binary)

          homeStore.send({
            type: 'audio',
            data: base64,
            is_final: false,
            token: localStorage.getItem('token')
          })
        }
      }
      
      // 初始化 VAD 实例
      new (VAD as any)({
        source: source,
        voice_start: () => {
          if (homeStore.buttonStates.video) {
            isSpeaking = true
            console.log('VAD: 检测到语音开始')
            homeStore.send({ type: 'interrupt' })
            onVoiceStart.value?.()
          }
        },
        voice_stop: () => {
          if (homeStore.buttonStates.video) {
            isSpeaking = false
            console.log('VAD: 检测到语音结束')

            // 发送结束标志
            homeStore.send({
              type: 'audio',
              data: '',
              is_final: true,
              token: localStorage.getItem('token')
            })

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

  return {
    isVADInitialized,
    onVoiceStart,
    onVoiceEnd,
    getAudioContext,
    initVAD
  }
})
