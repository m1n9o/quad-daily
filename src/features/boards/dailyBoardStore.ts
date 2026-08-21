import type { QuadrantItem } from '../todos/todoRules'

export type DailyBoard = {
  date: string
  items: QuadrantItem[]
}

type StoredBoards = {
  version: 1
  boards: Record<string, DailyBoard>
}

const storageKey = 'quad-daily:boards'

const emptyBoard = (date: string): DailyBoard => ({ date, items: [] })

const isStoredBoards = (value: unknown): value is StoredBoards => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const { version, boards } = value as Record<string, unknown>
  return version === 1 && typeof boards === 'object' && boards !== null
}

const parseStoredBoards = (value: string): StoredBoards | null => {
  try {
    const parsed: unknown = JSON.parse(value)
    return isStoredBoards(parsed) ? parsed : null
  } catch {
    return null
  }
}

const readStoredBoards = (): StoredBoards => {
  const value = localStorage.getItem(storageKey)
  return value === null
    ? { version: 1, boards: {} }
    : (parseStoredBoards(value) ?? { version: 1, boards: {} })
}

const writeStoredBoards = (storedBoards: StoredBoards): void => {
  localStorage.setItem(storageKey, JSON.stringify(storedBoards))
}

export const getDailyBoard = (date: string): DailyBoard => {
  return readStoredBoards().boards[date] ?? emptyBoard(date)
}

export const saveDailyBoard = (board: DailyBoard): void => {
  const storedBoards = readStoredBoards()
  storedBoards.boards[board.date] = board
  writeStoredBoards(storedBoards)
}

export const upsertItem = (date: string, item: QuadrantItem): void => {
  const board = getDailyBoard(date)
  const itemIndex = board.items.findIndex(({ id }) => id === item.id)

  if (itemIndex === -1) {
    saveDailyBoard({ ...board, items: [...board.items, item] })
    return
  }

  const items = [...board.items]
  items[itemIndex] = item
  saveDailyBoard({ ...board, items })
}

export const deleteItem = (date: string, itemId: string): void => {
  const board = getDailyBoard(date)
  saveDailyBoard({
    ...board,
    items: board.items.filter(({ id }) => id !== itemId),
  })
}

export const exportDailyBoards = (): string =>
  JSON.stringify(readStoredBoards(), null, 2)

export const importDailyBoards = (backup: string): boolean => {
  const storedBoards = parseStoredBoards(backup)

  if (storedBoards === null) {
    return false
  }

  writeStoredBoards(storedBoards)
  return true
}
