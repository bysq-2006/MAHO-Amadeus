import { defineStore } from 'pinia'
import { ref } from 'vue'
import { MahoWebSocket } from '../../api/ws'
import { useStageStore, type CharacterConfig } from './stage'
import { resolveAssetUrl } from '@/util/asset'

export const useWSStore = defineStore('ws', () => {
  const wsClient = new MahoWebSocket()
  const stageStore = useStageStore()

  const wsStatus = ref('closed')

  wsClient.on('open', () => {
    wsStatus.value = 'connected'
    // 连接建立后拉取舞台配置
    send({ type: 'get_stage' })
  })

  wsClient.on('close', () => {
    wsStatus.value = 'closed'
  })

  wsClient.on('stage', (msg: any) => {
    const list: CharacterConfig[] = (msg.characters ?? []).map((c: any) => ({
      id: c.id,
      displayName: c.displayName,
      modelPath: resolveAssetUrl(c.modelPath),
      scale: c.scale,
      position: c.position,
    }))
    stageStore.setCharacters(list)
  })

  function send(data: any) {
    wsClient.send({ ...data, token: localStorage.getItem('token') })
  }

  return {
    wsClient,
    wsStatus,
    send
  }
})
