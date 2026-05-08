import * as PIXI from 'pixi.js'
import { applyTransform } from '@/util/transform'
import type { CharacterConfig } from '@/stores/modules/stage'
import * as TWEEN from '@tweenjs/tween.js'

export class CharacterLayer {
  public container: PIXI.Container
  private models: Map<string, any> = new Map()
  private modelTypes: Map<string, 'live2d' | 'sprite'> = new Map()
  private spriteFrames: Map<string, Map<number, string>> = new Map()
  private tweenGroup: TWEEN.Group

  constructor(tweenGroup: TWEEN.Group) {
    this.container = new PIXI.Container()
    this.container.name = 'layer:characters'
    this.tweenGroup = tweenGroup
  }

  public async syncCharacters(configs: CharacterConfig[], Live2DModel: any, screen: { width: number, height: number }) {
    const activeIds = configs.map(c => c.id)

    for (const [id, model] of this.models.entries()) {
      if (!activeIds.includes(id)) {
        this.container.removeChild(model)
        model.destroy()
        this.models.delete(id)
        this.modelTypes.delete(id)
        this.spriteFrames.delete(id)
      }
    }

    for (const config of configs) {
      let model = this.models.get(config.id)

      if (!model) {
        if (config.modelType === 'sprite') {
          model = PIXI.Sprite.from(this.getClosestFrame(config, 0)!)
          model.anchor.set(0.5, 0.5)
          this.spriteFrames.set(config.id, config.spriteFrames ?? new Map())
        } else {
          model = await Live2DModel.from(config.modelPath, { autoInteract: false })
          model.anchor.set(0.5, 0.5)
          this.startBlinking(model)
        }
        this.container.addChild(model)
        this.models.set(config.id, model)
        this.modelTypes.set(config.id, config.modelType)
      }

      applyTransform(model, {
        x: config.position?.x ?? 0.5,
        y: config.position?.y ?? 0.65,
        scale: config.scale ?? 0.4
      }, screen)
    }
  }

  public updateLipSync(characterId: string | null, value: number) {
    if (!characterId) return
    const model = this.models.get(characterId)
    if (!model) return

    const type = this.modelTypes.get(characterId)
    if (type === 'sprite') {
      const frames = this.spriteFrames.get(characterId)
      if (!frames) return
      const url = this.findClosestUrl(frames, Math.round(value * 100))
      if (url) model.texture = PIXI.Texture.from(url)
    } else {
      model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', value)
    }
  }

  private getClosestFrame(config: CharacterConfig, percent: number): string | undefined {
    const frames = config.spriteFrames
    if (!frames || frames.size === 0) return undefined
    return this.findClosestUrl(frames, percent)
  }

  private findClosestUrl(frames: Map<number, string>, percent: number): string | undefined {
    let closestKey = -1
    let minDiff = Infinity
    for (const key of frames.keys()) {
      const diff = Math.abs(key - percent)
      if (diff < minDiff) {
        minDiff = diff
        closestKey = key
      }
    }
    return closestKey >= 0 ? frames.get(closestKey) : undefined
  }

  private startBlinking(model: any) {
    const coreModel = model.internalModel.coreModel
    const setEye = (val: number) => {
      coreModel.setParameterValueById('ParamEyeLOpen', val)
      coreModel.setParameterValueById('ParamEyeROpen', val)
    }

    const blink = () => {
      const t = new TWEEN.Tween({ val: 1 }, this.tweenGroup)
        .to({ val: 0 }, 120)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(o => setEye(o.val))
        .chain(
          new TWEEN.Tween({ val: 0 }, this.tweenGroup)
            .to({ val: 1 }, 120)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(o => setEye(o.val))
        )
      t.start()

      setTimeout(blink, Math.random() * 4000 + 2000)
    }

    blink()
  }
}
