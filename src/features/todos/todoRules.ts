export type ItemStatus = 'open' | 'done'

export type QuadrantItem = {
  id: string
  title: string
  note?: string
  x: number
  y: number
  status: ItemStatus
  createdAt: string
}

export type TodoGroup = 'quickWins' | 'focusTasks' | 'later' | 'reconsider'

export type TodoList = Record<TodoGroup, QuadrantItem[]>

const emptyTodoList = (): TodoList => ({
  quickWins: [],
  focusTasks: [],
  later: [],
  reconsider: [],
})

export const classifyItem = ({ x, y }: QuadrantItem): TodoGroup => {
  if (y >= 0.5) {
    return x >= 0.5 ? 'focusTasks' : 'quickWins'
  }

  return x >= 0.5 ? 'reconsider' : 'later'
}

const compareItems = (left: QuadrantItem, right: QuadrantItem): number => {
  return right.y - left.y || left.x - right.x
}

const sortItems = (items: QuadrantItem[]): QuadrantItem[] =>
  items
    .map((item, index) => ({ item, index }))
    .sort(
      (left, right) =>
        compareItems(left.item, right.item) || left.index - right.index,
    )
    .map(({ item }) => item)

export const generateTodoList = (items: QuadrantItem[]): TodoList => {
  const todoList = emptyTodoList()

  for (const item of items) {
    todoList[classifyItem(item)].push(item)
  }

  return {
    quickWins: sortItems(todoList.quickWins),
    focusTasks: sortItems(todoList.focusTasks),
    later: sortItems(todoList.later),
    reconsider: sortItems(todoList.reconsider),
  }
}
