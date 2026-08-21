import type { QuadrantItem } from '../todos/todoRules'

type Point = {
  x: number
  y: number
}

type CanvasSize = {
  width: number
  height: number
}

const clamp = (value: number): number => Math.min(1, Math.max(0, value))

export const moveItemByDelta = (
  item: QuadrantItem,
  delta: Point,
  canvasSize: CanvasSize,
): QuadrantItem => ({
  ...item,
  x: clamp(item.x + delta.x / canvasSize.width),
  y: clamp(item.y - delta.y / canvasSize.height),
})
