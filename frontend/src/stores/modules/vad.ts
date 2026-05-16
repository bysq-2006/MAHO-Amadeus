import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useWSStore } from './ws'
import { useAppStore } from './app'
import { useDirectorStore } from '../director'
// @ts-ignore
import VAD from '@/util/vad'

export const useVADStore = defineStore('vad', () => {
  const wsStore = useWSStore()
  const appStore = useAppStore()
  const directorStore = useDirectorStore()
  
  const isVADInitialized = ref(false)
  
  // 暴露给外部自定义的回调钩子
  const onVoiceStart = ref<(() => void) | null>(null)
  const onVoiceEnd = ref<(() => void) | null>(null)

  // --- 音频上下文管理 ---
  let audioCtx: AudioContext | null = null
  let vadInstance: any = null
  let processor: ScriptProcessorNode | null = null
  let source: MediaStreamAudioSourceNode | null = null

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

  // 设置回调钩子
  function setCallbacks(callbacks: {
    onVoiceStart?: () => void
    onVoiceEnd?: () => void
  }) {
    if (callbacks.onVoiceStart) onVoiceStart.value = callbacks.onVoiceStart
    if (callbacks.onVoiceEnd) onVoiceEnd.value = callbacks.onVoiceEnd
  }

  // 开始采集音频（当检测到语音开始时调用）
  function startRecording() {
    if (processor && audioCtx) {
      // 连接 processor 到 destination 以激活 onaudioprocess
      processor.connect(audioCtx.destination)
    }
  }

  // 停止采集音频（当检测到语音结束时调用）
  function stopRecording() {
    if (processor) {
      // 断开 processor 以停止 onaudioprocess，避免空转
      processor.disconnect()
    }
  }

  async function initVAD() {
    if (isVADInitialized.value) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = getAudioContext()
      console.log('VAD: AudioContext 采样率', ctx.sampleRate)
      source = ctx.createMediaStreamSource(stream)

      // 创建音频处理器用于获取原始 PCM 数据
      // 注意：createScriptProcessor 已废弃，未来应迁移到 AudioWorklet
      processor = ctx.createScriptProcessor(4096, 1, 1)
      
      // 初始只连接 source -> processor，不连接 destination
      // 这样 onaudioprocess 不会触发，避免空转
      source.connect(processor)

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0)
        
        // 转换为 16-bit PCM
        const pcmData = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i] ?? 0))
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }

        // 转换为 Base64 并发送分片
        const uint8Array = new Uint8Array(pcmData.buffer)
        let binary = ''
        for (let i = 0; i < uint8Array.byteLength; i++) {
          binary += String.fromCharCode(uint8Array[i] ?? 0)
        }
        const base64 = btoa(binary)

        wsStore.send({
          type: 'audio',
          data: base64,
          is_final: false
        })
      }
      
      // 初始化 VAD 实例
      vadInstance = new (VAD as any)({
        source: source,
        voice_start: () => {
          if (!appStore.buttonStates.video) return
          
          console.log('VAD: 检测到语音开始')
          directorStore.interrupt()
          startRecording()
          onVoiceStart.value?.()
        },
        voice_stop: () => {
          if (!appStore.buttonStates.video) return
          
          console.log('VAD: 检测到语音结束')
          stopRecording()

          // 发送结束标志
          wsStore.send({
            type: 'audio',
            data: '',
            is_final: true
          })

          onVoiceEnd.value?.()
        }
      })
      
      isVADInitialized.value = true
      console.log('VAD 系统已就绪')
    } catch (err) {
      isVADInitialized.value = false
      console.error('VAD 初始化失败，请检查麦克风权限:', err)
    }
  }

  // 销毁 VAD 资源
  function destroy() {
    stopRecording()
    
    if (processor) {
      processor.onaudioprocess = null
      processor = null
    }
    
    if (source) {
      source.disconnect()
      source = null
    }
    
    if (audioCtx) {
      audioCtx.close()
      audioCtx = null
    }
    
    vadInstance = null
    isVADInitialized.value = false
  }

  return {
    isVADInitialized,
    onVoiceStart,
    onVoiceEnd,
    getAudioContext,
    initVAD,
    setCallbacks,
    destroy
  }
})
