/// <reference types="vite/client" />

import type * as PIXI from 'pixi.js'

declare global {
  interface Window {
    PIXI: typeof PIXI
  }
}

export {}
