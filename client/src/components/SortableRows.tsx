import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'

interface SortableRow {
  id: string
  label: string
  actions: ReactNode
}
interface SortableRowsProps {
  rows: SortableRow[]
  isBusy: boolean
  onReorder: (ids: string[]) => void
}
interface DragRowProps {
  row: SortableRow
  isBusy: boolean
  isFirst: boolean
  isLast: boolean
  onMove: (direction: number) => void
}

const DragRow = ({ row, isBusy, isFirst, isLast, onMove }: DragRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled: isBusy,
  })
  return (
    <li
      ref={setNodeRef}
      className={`manage-row ${isDragging ? 'dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        className="icon-button drag-handle"
        {...attributes}
        {...listeners}
        disabled={isBusy}
        aria-label={`Drag ${row.label} to reorder`}
      >
        <GripVertical size={18} />
      </button>
      <span className="flex-1 min-w-0 break-words">{row.label}</span>
      <div className="flex shrink-0">
        <button
          className="icon-button"
          disabled={isBusy || isFirst}
          onClick={() => onMove(-1)}
          aria-label={`Move ${row.label} up`}
        >
          <ArrowUp size={16} />
        </button>
        <button
          className="icon-button"
          disabled={isBusy || isLast}
          onClick={() => onMove(1)}
          aria-label={`Move ${row.label} down`}
        >
          <ArrowDown size={16} />
        </button>
        {row.actions}
      </div>
    </li>
  )
}

export const SortableRows = ({ rows, isBusy, onReorder }: SortableRowsProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = rows.map((row) => row.id)
  const handleMove = (oldIndex: number, newIndex: number) => {
    if (!isBusy && newIndex >= 0 && newIndex < ids.length) onReorder(arrayMove(ids, oldIndex, newIndex))
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id)
          handleMove(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="manage-rows">
          {rows.map((row, index) => (
            <DragRow
              key={row.id}
              row={row}
              isBusy={isBusy}
              isFirst={index === 0}
              isLast={index === rows.length - 1}
              onMove={(direction) => handleMove(index, index + direction)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
