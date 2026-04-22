import { defineStore } from 'pinia'
import { ref } from 'vue'
import { AudioPlayer } from '@/util/AudioPlayer'

export const useAudioStore = defineStore('audio', () => {
  const player = new AudioPlayer()

  const mouthOpen = ref(0)
  const speakingCharacterId = ref<string | null>(null)

  const play = async (base64Data: string, characterId: string) => {
    speakingCharacterId.value = characterId
    try {
      await player.playBase64(base64Data, (volume) => {
        mouthOpen.value = volume
      })
    } finally {
      mouthOpen.value = 0
      speakingCharacterId.value = null
    }
  }

  return {
    mouthOpen,
    speakingCharacterId,
    play
  }
})
