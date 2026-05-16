export class AudioPlayer {
  private context: AudioContext
  private analyser: AnalyserNode
  private dataArray: Uint8Array<ArrayBuffer>
  private animationId: number | null = null

  constructor(context?: AudioContext) {
    this.context = context || new (window.AudioContext || (window as any).webkitAudioContext)()
    this.analyser = this.context.createAnalyser()
    this.analyser.fftSize = 256
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount)
  }

  /**
   * 播放 Base64 编码的音频，并提供实时音量回调
   */
  public async playBase64(
    base64Data: string, 
    onProgress?: (volume: number) => void
  ): Promise<void> {
    // 1. 解码
    const binaryString = window.atob(base64Data)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }
    
    // 2. 转换为 AudioBuffer
    const audioBuffer = await this.context.decodeAudioData(bytes.buffer)

    // 3. 播放
    return new Promise((resolve) => {
      const source = this.context.createBufferSource()
      source.buffer = audioBuffer
      
      source.connect(this.analyser)
      this.analyser.connect(this.context.destination)

      const updateVolume = () => {
        this.analyser.getByteFrequencyData(this.dataArray)
        let sum = 0
        for (let i = 0; i < this.dataArray.length; i++) {
          sum += this.dataArray[i] ?? 0
        }
        const average = sum / this.dataArray.length
        
        // 映射到 0-1 的口型数值，增加一点灵敏度
        const threshold = 10
        let value = 0
        if (average > threshold) {
          value = Math.min(1, ((average - threshold) / (255 - threshold)) * 3.0)
        }
        
        onProgress?.(value)
        this.animationId = requestAnimationFrame(updateVolume)
      }

      source.onended = () => {
        if (this.animationId) cancelAnimationFrame(this.animationId)
        onProgress?.(0)
        resolve()
      }

      updateVolume()
      source.start(0)
    })
  }

  public getContext() {
    return this.context
  }
}
