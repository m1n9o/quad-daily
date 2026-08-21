import { afterEach, describe, expect, it } from 'vitest'
import type { QuadrantItem } from '../todos/todoRules'
import {
  deleteItem,
  exportDailyBoards,
  getDailyBoard,
  importDailyBoards,
  saveDailyBoard,
  upsertItem,
} from './dailyBoardStore'

const storageKey = 'quad-daily:boards'
const date = '2026-08-21'

const item = (id: string): QuadrantItem => ({
  id,
  title: id,
  x: 0.8,
  y: 0.2,
  status: 'open',
  createdAt: '2026-08-21T00:00:00.000Z',
})

afterEach(() => {
  localStorage.clear()
})

describe('getDailyBoard', () => {
  it('returns an empty board when no board has been saved for the date', () => {
    expect(getDailyBoard(date)).toEqual({ date, items: [] })
  })

  it('returns an empty board for malformed or unsupported stored data', () => {
    localStorage.setItem(storageKey, '{not json')
    expect(getDailyBoard(date)).toEqual({ date, items: [] })

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 2,
        boards: { [date]: { date, items: [item('x')] } },
      }),
    )
    expect(getDailyBoard(date)).toEqual({ date, items: [] })
  })
})

describe('daily board persistence', () => {
  it('saves and retrieves boards independently by date', () => {
    saveDailyBoard({ date, items: [item('today')] })
    saveDailyBoard({ date: '2026-08-22', items: [item('tomorrow')] })

    expect(getDailyBoard(date).items.map(({ id }) => id)).toEqual(['today'])
    expect(getDailyBoard('2026-08-22').items.map(({ id }) => id)).toEqual([
      'tomorrow',
    ])
  })

  it('upserts and deletes individual items without changing other items', () => {
    saveDailyBoard({ date, items: [item('existing')] })

    upsertItem(date, item('new'))
    upsertItem(date, { ...item('existing'), title: 'updated' })
    deleteItem(date, 'new')

    expect(getDailyBoard(date).items).toEqual([
      { ...item('existing'), title: 'updated' },
    ])
  })
})

describe('daily board backups', () => {
  it('exports all dates and restores them from an imported backup', () => {
    saveDailyBoard({ date, items: [item('today')] })
    saveDailyBoard({ date: '2026-08-22', items: [item('tomorrow')] })

    const backup = exportDailyBoards()
    localStorage.clear()

    expect(importDailyBoards(backup)).toBe(true)
    expect(getDailyBoard(date).items.map(({ id }) => id)).toEqual(['today'])
    expect(getDailyBoard('2026-08-22').items.map(({ id }) => id)).toEqual([
      'tomorrow',
    ])
  })

  it('rejects malformed or unsupported imports without replacing current data', () => {
    saveDailyBoard({ date, items: [item('keep')] })

    expect(importDailyBoards('{not json')).toBe(false)
    expect(importDailyBoards(JSON.stringify({ version: 2, boards: {} }))).toBe(
      false,
    )
    expect(getDailyBoard(date).items.map(({ id }) => id)).toEqual(['keep'])
  })
})
