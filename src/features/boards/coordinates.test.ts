import { describe, expect, it } from 'vitest'
import type { QuadrantItem } from '../todos/todoRules'
import { moveItemByDelta } from './coordinates'

const item: QuadrantItem = {
  id: 'item-1',
  title: 'Move me',
  x: 0.5,
  y: 0.5,
  status: 'open',
  createdAt: '2026-08-21T00:00:00.000Z',
}

describe('moveItemByDelta', () => {
  it('converts a drag delta into normalized quadrant coordinates', () => {
    expect(
      moveItemByDelta(item, { x: 100, y: 50 }, { width: 400, height: 200 }),
    ).toMatchObject({
      x: 0.75,
      y: 0.25,
    })
  })

  it('keeps dragged items inside the canvas boundaries', () => {
    expect(
      moveItemByDelta(item, { x: -400, y: -400 }, { width: 400, height: 400 }),
    ).toMatchObject({
      x: 0,
      y: 1,
    })
    expect(
      moveItemByDelta(item, { x: 400, y: 400 }, { width: 400, height: 400 }),
    ).toMatchObject({
      x: 1,
      y: 0,
    })
  })
})
