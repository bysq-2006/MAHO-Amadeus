import * as PIXI from 'pixi.js'

export interface TransformProps {
  x?: number
  y?: number
  scale?: number
}

/**
 * 归一化坐标 (0-1) -> 像素坐标，并应用缩放。
 * 省略 screen 时 x/y 按像素处理。
 */
export function applyTransform(
  target: PIXI.DisplayObject,
  props: TransformProps,
  screen?: { width: number; height: number }
) {
  if (props.x !== undefined) target.x = screen ? props.x * screen.width : props.x
  if (props.y !== undefined) target.y = screen ? props.y * screen.height : props.y
  if (props.scale !== undefined) target.scale.set(props.scale)
}
