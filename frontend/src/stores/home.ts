import { defineStore } from 'pinia'
import { ref } from 'vue'
import config from '../config.json'
import { MahoWebSocket } from '../api/ws'

export const useHomeStore = defineStore('home', () => {
  // 队列1：字符流（type: 'text'）
  const textQueue = ref<string[]>([])
  const thinkText = ref('')
  const audioQueue = ref<{ data: string, is_final: boolean }[]>([])
  const isWaiting = ref(false)
  const wsStatus = ref('closed')
  
  // 按钮状态
  const buttonStates = ref({
    video: false
  })
  
  const userName = ref(localStorage.getItem('username') || '未命名')
  const amadeusName = ref(config.amadeusName || '比屋定真帆')
  const currentName = ref(userName.value)

  const wsClient = new MahoWebSocket()

  // 注册 WebSocket 回调函数
  wsClient.on('open', () => {
    wsStatus.value = 'connected'
  })

  wsClient.on('close', () => {
    wsStatus.value = 'closed'
  })

  wsClient.on('thinkText', (msg: any) => {
    thinkText.value += msg.data
  })

  wsClient.on('text', (msg: any) => {
    if (thinkText.value) {
      thinkText.value = ''
    }
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
    thinkText.value = ''
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
    thinkText,
    audioQueue,
    isWaiting,
    wsStatus,
    buttonStates,
    currentName,
    send
  }
})