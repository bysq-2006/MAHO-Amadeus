import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface CharacterConfig {
  id: string
  displayName: string
  modelType: 'live2d' | 'sprite'
  modelPath?: string
  spriteFrames?: Map<number, string>  // key: 口型百分比(0-100), value: 图片完整URL
  scale?: number
  position?: { x: number, y: number }
}

export interface BackgroundConfig {
  path: string
  alpha?: number
  scaleMode?: 'cover' | 'contain' | 'stretch'
}

export const useStageStore = defineStore('stage', () => {
  const characters = ref<CharacterConfig[]>([])

  const setCharacters = (list: CharacterConfig[]) => {
    characters.value = list
  }

  const updateCharacterTransform = (id: string, transform: Partial<Omit<CharacterConfig, 'id'>>) => {
    const target = characters.value.find(c => c.id === id)
    if (target) Object.assign(target, transform)
  }

  const background = ref<BackgroundConfig>({
    path: '/bg.png',
    alpha: 1,
    scaleMode: 'cover'
  })

  const setBackground = (path: string) => {
    background.value.path = path
  }

  return {
    characters,
    setCharacters,
    updateCharacterTransform,
    background,
    setBackground
  }
})
