import { describe, expect, it } from 'vitest'
import { classifyItem, generateTodoList, type QuadrantItem } from './todoRules'

const item = (
  id: string,
  x: number,
  y: number,
  status: QuadrantItem['status'] = 'open',
): QuadrantItem => ({
  id,
  title: id,
  x,
  y,
  status,
  createdAt: '2026-08-21T00:00:00.000Z',
})

describe('classifyItem', () => {
  it.each([
    ['quickWins', item('quick', 0.49, 0.5)],
    ['focusTasks', item('focus', 0.5, 0.5)],
    ['later', item('later', 0.49, 0.49)],
    ['reconsider', item('reconsider', 0.5, 0.49)],
  ] as const)(
    'classifies %s at the correct threshold',
    (expected, quadrantItem) => {
      expect(classifyItem(quadrantItem)).toBe(expected)
    },
  )
})

describe('generateTodoList', () => {
  it('groups all items and sorts each group by priority then lower difficulty', () => {
    const todoList = generateTodoList([
      item('quick-low', 0.3, 0.6),
      item('focus-hard', 0.8, 0.8),
      item('later', 0.4, 0.2),
      item('reconsider', 0.8, 0.2),
      item('quick-high', 0.4, 0.9),
      item('focus-easier', 0.6, 0.8),
      item('completed', 0.1, 1, 'done'),
    ])

    expect(todoList.quickWins.map(({ id }) => id)).toEqual([
      'completed',
      'quick-high',
      'quick-low',
    ])
    expect(todoList.focusTasks.map(({ id }) => id)).toEqual([
      'focus-easier',
      'focus-hard',
    ])
    expect(todoList.later.map(({ id }) => id)).toEqual(['later'])
    expect(todoList.reconsider.map(({ id }) => id)).toEqual(['reconsider'])
  })

  it('keeps original order for items with equal coordinates', () => {
    const todoList = generateTodoList([
      item('first', 0.3, 0.8),
      item('second', 0.3, 0.8),
    ])

    expect(todoList.quickWins.map(({ id }) => id)).toEqual(['first', 'second'])
  })
})
