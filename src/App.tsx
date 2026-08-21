import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import { moveItemByDelta } from './features/boards/coordinates'
import {
  deleteItem,
  exportDailyBoards,
  getDailyBoard,
  importDailyBoards,
  upsertItem,
  type DailyBoard,
} from './features/boards/dailyBoardStore'
import {
  generateTodoList,
  type QuadrantItem,
  type TodoGroup,
} from './features/todos/todoRules'
import './workspace.css'

type ComposerPosition = { x: number; y: number }

type TaskMarkerProps = {
  draftTitle: string
  isEditing: boolean
  item: QuadrantItem
  onCancelEdit: () => void
  onDelete: (itemId: string) => void
  onEdit: (item: QuadrantItem) => void
  onEditSubmit: (event: FormEvent<HTMLFormElement>) => void
  onDraftTitleChange: (title: string) => void
  onStatusChange: (item: QuadrantItem) => void
}

const todoGroups: { id: TodoGroup; label: string }[] = [
  { id: 'quickWins', label: 'Immediate' },
  { id: 'focusTasks', label: 'Focus' },
  { id: 'later', label: 'Later' },
  { id: 'reconsider', label: 'Reconsider' },
]

const getDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const shiftDate = (date: string, days: number): string => {
  const nextDate = new Date(`${date}T00:00:00`)
  nextDate.setDate(nextDate.getDate() + days)
  return getDateKey(nextDate)
}

const getTaskMarkerColor = (itemId: string): string => {
  let hash = 0

  for (const character of itemId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }

  return `hsl(${hash % 360} 68% 82%)`
}

function TaskMarker({
  draftTitle,
  isEditing,
  item,
  onCancelEdit,
  onDelete,
  onEdit,
  onEditSubmit,
  onDraftTitleChange,
  onStatusChange,
}: TaskMarkerProps) {
  const { attributes, isDragging, listeners, setNodeRef, transform } =
    useDraggable({ id: item.id })
  const translate = transform === null ? '' : CSS.Translate.toString(transform)

  const stopDragFromControls = (event: PointerEvent<HTMLElement>): void => {
    event.stopPropagation()
  }

  return (
    <article
      className={`task-marker ${item.status === 'done' ? 'is-complete' : ''} ${isDragging ? 'is-dragging' : ''} ${isEditing ? 'is-editing' : ''}`}
      ref={setNodeRef}
      style={
        {
          left: `${item.x * 100}%`,
          top: `${(1 - item.y) * 100}%`,
          transform: `translate(-50%, -50%) ${translate}`,
          '--task-color': getTaskMarkerColor(item.id),
        } as CSSProperties
      }
      onClick={(event) => event.stopPropagation()}
      {...attributes}
      {...listeners}
    >
      {isEditing ? (
        <form
          className="task-marker-edit-form"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              onCancelEdit()
              return
            }

            event.stopPropagation()
          }}
          onPointerDown={stopDragFromControls}
          onSubmit={onEditSubmit}
        >
          <label>
            <span>Edit task</span>
            <input
              aria-label="Task title"
              autoFocus
              value={draftTitle}
              onChange={(event) => onDraftTitleChange(event.target.value)}
            />
          </label>
          <div>
            <button type="submit">Save task</button>
            <button type="button" onClick={onCancelEdit}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <h3>{item.title}</h3>
          <div className="task-actions" onPointerDown={stopDragFromControls}>
            <button type="button" onClick={() => onStatusChange(item)}>
              {item.status === 'open' ? 'Done' : 'Restore'}
            </button>
            <button
              type="button"
              aria-label={`Edit ${item.title}`}
              onClick={() => onEdit(item)}
            >
              Edit
            </button>
            <button
              type="button"
              aria-label={`Delete ${item.title}`}
              onClick={() => onDelete(item.id)}
            >
              ×
            </button>
          </div>
        </>
      )}
    </article>
  )
}

function App() {
  const initialDate = getDateKey(new Date())
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [board, setBoard] = useState<DailyBoard>(() =>
    getDailyBoard(initialDate),
  )
  const [composerPosition, setComposerPosition] =
    useState<ComposerPosition | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [editingItem, setEditingItem] = useState<QuadrantItem | null>(null)
  const [noteItemId, setNoteItemId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )
  const todoList = generateTodoList(board.items)

  const changeDate = (nextDate: string): void => {
    setSelectedDate(nextDate)
    setBoard(getDailyBoard(nextDate))
    setComposerPosition(null)
    setEditingItem(null)
    setNoteItemId(null)
  }

  const saveItem = (item: QuadrantItem): void => {
    upsertItem(selectedDate, item)
    setBoard((currentBoard) => {
      const itemIndex = currentBoard.items.findIndex(({ id }) => id === item.id)
      const items = [...currentBoard.items]
      if (itemIndex === -1) items.push(item)
      else items[itemIndex] = item
      return { ...currentBoard, items }
    })
  }

  const handleCanvasClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target !== event.currentTarget) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = Math.min(
      1,
      Math.max(0, (event.clientX - bounds.left) / bounds.width),
    )
    const y = Math.min(
      1,
      Math.max(0, 1 - (event.clientY - bounds.top) / bounds.height),
    )
    setComposerPosition({ x, y })
    setDraftTitle('')
    setEditingItem(null)
  }

  const handleTaskSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const title = draftTitle.trim()
    if (title === '') return

    if (editingItem !== null) {
      saveItem({ ...editingItem, title })
      cancelComposer()
      return
    }

    if (composerPosition === null) return

    saveItem({
      id: globalThis.crypto.randomUUID(),
      title,
      x: composerPosition.x,
      y: composerPosition.y,
      status: 'open',
      createdAt: new Date().toISOString(),
    })
    setComposerPosition(null)
    setDraftTitle('')
  }

  const startEditing = (item: QuadrantItem): void => {
    setDraftTitle(item.title)
    setEditingItem(item)
  }

  const cancelComposer = (): void => {
    setComposerPosition(null)
    setEditingItem(null)
    setDraftTitle('')
  }

  const updateStatus = (item: QuadrantItem): void =>
    saveItem({ ...item, status: item.status === 'open' ? 'done' : 'open' })

  const updateNote = (item: QuadrantItem, note: string): void =>
    saveItem({ ...item, note })

  const toggleSelectedItem = (itemId: string): void => {
    setNoteItemId((currentItemId) => (currentItemId === itemId ? null : itemId))
  }

  const removeItem = (itemId: string): void => {
    deleteItem(selectedDate, itemId)
    setBoard((currentBoard) => ({
      ...currentBoard,
      items: currentBoard.items.filter(({ id }) => id !== itemId),
    }))
    if (noteItemId === itemId) {
      setNoteItemId(null)
    }
  }

  const handleDragEnd = ({ active, delta }: DragEndEvent): void => {
    const canvasBounds = canvasRef.current?.getBoundingClientRect()
    const item = board.items.find(({ id }) => id === active.id)

    if (
      item === undefined ||
      canvasBounds === undefined ||
      canvasBounds.width === 0 ||
      canvasBounds.height === 0
    ) {
      return
    }

    saveItem(
      moveItemByDelta(item, delta, {
        width: canvasBounds.width,
        height: canvasBounds.height,
      }),
    )
  }

  const downloadBackup = (): void => {
    const backup = new Blob([exportDailyBoards()], {
      type: 'application/json',
    })
    const downloadUrl = URL.createObjectURL(backup)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = 'quad-daily-backup.json'
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(downloadUrl)
    setBackupStatus('Backup exported')
  }

  const handleImport = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (file === undefined) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (!importDailyBoards(String(reader.result ?? ''))) {
        setBackupStatus('Backup could not be imported')
        return
      }

      setBoard(getDailyBoard(selectedDate))
      setComposerPosition(null)
      setEditingItem(null)
      setBackupStatus('Backup imported')
    }
    reader.readAsText(file)
  }

  return (
    <main className="app-shell" onClick={() => setNoteItemId(null)}>
      <header className="topbar">
        <div>
          <h1>Quad Daily</h1>
        </div>
        <div className="header-actions">
          <div className="backup-actions" aria-label="Backup controls">
            <button type="button" onClick={downloadBackup}>
              Export
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
            >
              Import
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              aria-label="Import backup file"
              onChange={handleImport}
            />
          </div>
          <div className="date-controls" aria-label="Date controls">
            <button
              type="button"
              aria-label="Previous day"
              onClick={() => changeDate(shiftDate(selectedDate, -1))}
            >
              ←
            </button>
            <div className="selected-date">
              <input
                type="date"
                aria-label="Choose date"
                value={selectedDate}
                onChange={(event) => {
                  if (event.target.value !== '') {
                    changeDate(event.target.value)
                  }
                }}
              />
              <button type="button" onClick={() => changeDate(initialDate)}>
                Today
              </button>
            </div>
            <button
              type="button"
              aria-label="Next day"
              onClick={() => changeDate(shiftDate(selectedDate, 1))}
            >
              →
            </button>
          </div>
        </div>
      </header>
      {backupStatus !== null && (
        <p className="backup-status" role="status">
          {backupStatus}
        </p>
      )}
      <section className="workspace">
        <section className="board-panel" aria-labelledby="board-heading">
          <div className="panel-heading">
            <div>
              <p className="section-label">TODAY'S MAP</p>
              <h2 id="board-heading">Place what matters</h2>
            </div>
            <p className="completion-count">
              {board.items.filter(({ status }) => status === 'done').length}/
              {board.items.length} complete
            </p>
          </div>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div
              className="quadrant-canvas"
              ref={canvasRef}
              role="region"
              aria-label="Quadrant canvas"
              onClick={handleCanvasClick}
            >
              <div className="axis-line vertical" />
              <div className="axis-line horizontal" />
              <span className="midline-label priority-high">HIGH PRIORITY</span>
              <span className="midline-label priority-low">LOW PRIORITY</span>
              <span className="midline-label difficulty-easy">EASY</span>
              <span className="midline-label difficulty-hard">HARD</span>
              {board.items.map((item) => (
                <TaskMarker
                  draftTitle={draftTitle}
                  isEditing={editingItem?.id === item.id}
                  item={item}
                  key={item.id}
                  onCancelEdit={cancelComposer}
                  onDelete={removeItem}
                  onEdit={startEditing}
                  onEditSubmit={handleTaskSubmit}
                  onDraftTitleChange={setDraftTitle}
                  onStatusChange={updateStatus}
                />
              ))}
              {composerPosition !== null && (
                <form
                  className="task-composer"
                  style={{
                    left: `${composerPosition.x * 100}%`,
                    top: `${(1 - composerPosition.y) * 100}%`,
                  }}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      cancelComposer()
                    }
                  }}
                  onSubmit={handleTaskSubmit}
                >
                  <label>
                    <span>Task title</span>
                    <input
                      autoFocus
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                    />
                  </label>
                  <div>
                    <button type="submit">
                      {editingItem === null ? 'Create task' : 'Save task'}
                    </button>
                    <button type="button" onClick={cancelComposer}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </DndContext>
        </section>
        <aside className="todo-panel" aria-labelledby="todo-heading">
          <div className="panel-heading">
            <div>
              <p className="section-label">AUTO-GENERATED</p>
              <h2 id="todo-heading">Today's list</h2>
            </div>
          </div>
          <div className="todo-groups">
            {todoGroups.map(({ id, label }) => (
              <section className={`todo-group todo-group--${id}`} key={id}>
                <div className="todo-group-heading">
                  <h3>{label}</h3>
                  <span>{todoList[id].length}</span>
                </div>
                {todoList[id].length === 0 ? (
                  <span className="empty-list">Nothing here yet</span>
                ) : (
                  <ul>
                    {todoList[id].map((item) => (
                      <li
                        className={item.status === 'done' ? 'is-complete' : ''}
                        key={item.id}
                      >
                        <div className="todo-task-row">
                          <input
                            type="checkbox"
                            aria-label={`Complete ${item.title}`}
                            checked={item.status === 'done'}
                            onChange={() => updateStatus(item)}
                          />
                          <button
                            className="todo-task-button"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              toggleSelectedItem(item.id)
                            }}
                          >
                            {item.title}
                          </button>
                        </div>
                        {noteItemId === item.id && (
                          <section
                            className="task-note-panel"
                            aria-label={`Note for ${item.title}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <p className="section-label">NOTES</p>
                            <textarea
                              aria-label="Task notes"
                              value={item.note ?? ''}
                              onChange={(event) =>
                                updateNote(item, event.target.value)
                              }
                            />
                          </section>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </aside>
      </section>
    </main>
  )
}

export default App
