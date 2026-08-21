import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const createTask = (title: string): void => {
  const canvas = screen.getByRole('region', { name: 'Quadrant canvas' })
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, width: 400, height: 400 }),
  })

  fireEvent.click(canvas, { clientX: 300, clientY: 300 })
  fireEvent.change(screen.getByLabelText('Task title'), {
    target: { value: title },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Create task' }))
}

describe('App', () => {
  it('shows priority and difficulty labels at the quadrant midline endpoints', () => {
    render(<App />)

    expect(screen.getByText('HIGH PRIORITY')).toBeInTheDocument()
    expect(screen.getByText('LOW PRIORITY')).toBeInTheDocument()
    expect(screen.getByText('HARD')).toBeInTheDocument()
    expect(screen.getByText('EASY')).toBeInTheDocument()
    expect(screen.queryByText('QUAD / DAILY')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Quad Daily' }),
    ).toBeInTheDocument()
  })

  it('creates a task at the clicked canvas position and adds it to the Todo list', () => {
    render(<App />)

    createTask('Write weekly review')

    expect(
      screen.getByRole('heading', { name: 'Write weekly review' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Immediate' }),
    ).toBeInTheDocument()
  })

  it('gives each canvas task marker its own color', () => {
    render(<App />)

    const canvas = screen.getByRole('region', { name: 'Quadrant canvas' })
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 400, height: 400 }),
    })
    fireEvent.click(canvas, { clientX: 100, clientY: 100 })
    fireEvent.change(screen.getByLabelText('Task title'), {
      target: { value: 'First task' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }))
    fireEvent.click(canvas, { clientX: 300, clientY: 300 })
    fireEvent.change(screen.getByLabelText('Task title'), {
      target: { value: 'Second task' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }))

    const firstColor = screen
      .getByRole('heading', { name: 'First task' })
      .closest('article')
      ?.style.getPropertyValue('--task-color')
    const secondColor = screen
      .getByRole('heading', { name: 'Second task' })
      .closest('article')
      ?.style.getPropertyValue('--task-color')

    expect(firstColor).not.toBe(secondColor)
  })

  it('closes the task composer when Escape is pressed', () => {
    render(<App />)

    const canvas = screen.getByRole('region', { name: 'Quadrant canvas' })
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 400, height: 400 }),
    })
    fireEvent.click(canvas, { clientX: 200, clientY: 200 })

    expect(screen.getByLabelText('Task title')).toBeInTheDocument()

    fireEvent.keyDown(screen.getByLabelText('Task title'), { key: 'Escape' })

    expect(screen.queryByLabelText('Task title')).not.toBeInTheDocument()
  })

  it('edits a task title from its canvas marker', () => {
    render(<App />)

    createTask('Draft report')
    fireEvent.click(screen.getByRole('button', { name: 'Edit Draft report' }))

    expect(screen.getByLabelText('Task title').closest('article')).toHaveClass(
      'is-editing',
    )
    expect(document.querySelector('.task-composer')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Task notes')).not.toBeInTheDocument()

    expect(
      fireEvent.keyDown(screen.getByLabelText('Task title'), { key: ' ' }),
    ).toBe(true)

    fireEvent.change(screen.getByLabelText('Task title'), {
      target: { value: 'Send report' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save task' }))

    expect(
      screen.getByRole('heading', { name: 'Send report' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Draft report')).not.toBeInTheDocument()
  })

  it('keeps a completed task in the Todo list with a checked control', () => {
    render(<App />)

    createTask('Follow up')
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(screen.getByText('1/1 complete')).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Complete Follow up' }),
    ).toBeChecked()
    expect(
      screen.getByRole('button', { name: 'Follow up' }).closest('li'),
    ).toHaveClass('is-complete')
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument()
  })

  it('keeps task boards isolated when changing dates', () => {
    render(<App />)

    createTask('Today only')
    fireEvent.click(screen.getByRole('button', { name: 'Next day' }))

    expect(screen.queryByText('Today only')).not.toBeInTheDocument()
    expect(screen.getByText('0/0 complete')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Previous day' }))

    expect(
      screen.getByRole('heading', { name: 'Today only' }),
    ).toBeInTheDocument()
  })

  it('loads an isolated board when selecting a date from the calendar', () => {
    render(<App />)

    createTask('Calendar task')
    const dateInput = screen.getByLabelText('Choose date')
    const initialDate = (dateInput as HTMLInputElement).value

    fireEvent.change(dateInput, { target: { value: '2000-01-01' } })

    expect(screen.queryByText('Calendar task')).not.toBeInTheDocument()
    expect(screen.getByText('0/0 complete')).toBeInTheDocument()

    fireEvent.change(dateInput, { target: { value: initialDate } })

    expect(
      screen.getByRole('heading', { name: 'Calendar task' }),
    ).toBeInTheDocument()
  })

  it('opens the matching Todo task note when its title is selected', () => {
    render(<App />)

    createTask('Locate me')
    fireEvent.click(screen.getByRole('button', { name: /^Locate me$/ }))

    expect(screen.getByLabelText('Task notes')).toBeInTheDocument()
    expect(screen.getByText('0/1 complete')).toBeInTheDocument()
  })

  it('shows and saves a note for the Todo task selected by the user', () => {
    render(<App />)

    createTask('Prepare briefing')
    fireEvent.click(screen.getByRole('button', { name: 'Prepare briefing' }))

    expect(screen.getByLabelText('Task notes').closest('li')).toContainElement(
      screen.getByRole('button', { name: 'Prepare briefing' }),
    )
    fireEvent.change(screen.getByLabelText('Task notes'), {
      target: { value: 'Bring the Q3 numbers.' },
    })

    expect(screen.getByLabelText('Task notes')).toHaveValue(
      'Bring the Q3 numbers.',
    )
    expect(
      screen.getByRole('heading', { name: 'Prepare briefing' }),
    ).toHaveTextContent('Prepare briefing')

    fireEvent.click(screen.getByRole('button', { name: 'Prepare briefing' }))
    expect(screen.queryByLabelText('Task notes')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Prepare briefing' }))
    fireEvent.click(screen.getByRole('heading', { name: 'Quad Daily' }))
    expect(screen.queryByLabelText('Task notes')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next day' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous day' }))
    fireEvent.click(screen.getByRole('button', { name: 'Prepare briefing' }))

    expect(screen.getByLabelText('Task notes')).toHaveValue(
      'Bring the Q3 numbers.',
    )
  })
})
