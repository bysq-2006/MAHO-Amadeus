import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useWSStore } from './modules/ws'

export interface AudioChunk {
  data: string // base64
  is_final: boolean
}

/**
 * 演出片段：存储一次完整对话的所有流式数据
 * 仅作为底层数据缓冲，不包含播放逻辑
 */
export interface PerformanceSegment {
  uniqueId: string
  characterId: string
  
  // 内容缓冲
  text: string
  thinkText: string
  audioChunks: AudioChunk[]
  
  // 状态标记
  isThinkingComplete: boolean
  isSegmentComplete: boolean // 后端是否发送了总体的 'end' 信号
}

export const usePerformanceStore = defineStore('performance', () => {
    const wsStore = useWSStore()
    
    const queue = ref<PerformanceSegment[]>([])

    // 获取队列头部的 Performance（正在演出的片段）
    const headPerformance = computed(() => {
        return queue.value.length > 0 ? queue.value[0] : null
    })

    // 获取队列尾部的 Performance（正在接收数据的片段）
    const tailPerformance = computed(() => {
        if (queue.value.length === 0) return null
        const last = queue.value[queue.value.length - 1]
        if (!last || last.isSegmentComplete) return null
        return last
    })

    // --- 监听 WebSocket 消息，填充排队数据 ---
    
    wsStore.wsClient.on('start', (msg: any) => {
        const charId = msg.character || 'unknown'

        const newSegment: PerformanceSegment = {
            uniqueId: Date.now().toString() + Math.random().toString(36).substring(2, 7),
            characterId: charId,
            text: '',
            thinkText: '',
            audioChunks: [],
            isThinkingComplete: false,
            isSegmentComplete: false
        }
        queue.value.push(newSegment)
    })

    wsStore.wsClient.on('text', (msg: any) => {
        if (tailPerformance.value && tailPerformance.value.characterId === msg.character) {
             tailPerformance.value.text += (msg.data || '')
             tailPerformance.value.isThinkingComplete = true // 正文来了，思考肯定结束了
        }
    })
    
    wsStore.wsClient.on('thinkText', (msg: any) => {
        if (tailPerformance.value && tailPerformance.value.characterId === msg.character) {
             tailPerformance.value.thinkText += (msg.data || '')
        }
    })

    // 临时缓冲区：用于拼接同一句话的音频分片
    let audioBuffer: string[] = []

    wsStore.wsClient.on('audio', (msg: any) => {
         const receiver = tailPerformance.value
         if (receiver && (receiver.characterId === msg.character || msg.character === undefined)) {
             // 收集分片
             if (msg.data) audioBuffer.push(msg.data)
             
             // 如果是本次音频流的最后一帧，则合并为一个可播放单元
             if (msg.is_final) {
                 const fullBase64 = audioBuffer.join('') // 后端按30k切分(3的倍数)，直接拼接安全
                 receiver.audioChunks.push({
                     data: fullBase64,
                     is_final: true
                 })
                 audioBuffer = [] // 清空缓冲
             }
         }
    })

    wsStore.wsClient.on('end', (msg: any) => {
        const receiver = tailPerformance.value
        if (receiver && (receiver.characterId === msg.character || msg.character === undefined)) {
             // 如果还有残留的音频缓冲（防御性代码），强制合并
             if (audioBuffer.length > 0) {
                  receiver.audioChunks.push({
                      data: audioBuffer.join(''),
                      is_final: true
                  })
                  audioBuffer = []
             }

             receiver.isThinkingComplete = true
             // 最后标记整个片段结束，这会导致 tailPerformance 变为 null
             receiver.isSegmentComplete = true
        }
    })
    
    const popPerformance = () => {
        queue.value.shift()
    }
    
    const clearQueue = () => {
        queue.value = []
        audioBuffer = []
    }

    return {
        queue,
        headPerformance,
        tailPerformance,
        popPerformance,
        clearQueue
    }
})
