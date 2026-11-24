import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
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

const DRAG_HOLD_DURATION_MS = 300
const DRAG_MOVEMENT_TOLERANCE_PX = 6

interface SortableRow {
  id: string
  label: string
  actions: ReactNode
}
interface SortableRowsProps {
  rows: SortableRow[]
  isBusy: boolean
  onReorder: (ids: string[]) => Promise<boolean>
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
      <button
        className="manage-row-label"
        {...attributes}
        {...listeners}
        disabled={isBusy}
        aria-label={`Hold ${row.label} to reorder`}
        title={row.label}
      >
        {row.label}
      </button>
      <div className="manage-row-actions">
        <button
          className={`icon-button ${isFirst ? 'is-unavailable' : ''}`}
          disabled={isBusy || isFirst}
          onClick={() => onMove(-1)}
          aria-label={`Move ${row.label} up`}
        >
          <ArrowUp size={16} />
        </button>
        <button
          className={`icon-button ${isLast ? 'is-unavailable' : ''}`}
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
  const [pendingOrder, setPendingOrder] = useState<{ sourceOrder: string; ids: string[] } | null>(null)
  const [isReordering, setIsReordering] = useState(false)
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { delay: DRAG_HOLD_DURATION_MS, tolerance: DRAG_MOVEMENT_TOLERANCE_PX },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: DRAG_HOLD_DURATION_MS, tolerance: DRAG_MOVEMENT_TOLERANCE_PX },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const sourceIds = rows.map((row) => row.id)
  const sourceOrder = JSON.stringify(sourceIds)
  const ids = pendingOrder?.sourceOrder === sourceOrder ? pendingOrder.ids : sourceIds
  useEffect(() => {
    setPendingOrder((current) => (current && current.sourceOrder !== sourceOrder ? null : current))
  }, [sourceOrder])
  const orderedRows = [...rows].sort((one, two) => ids.indexOf(one.id) - ids.indexOf(two.id))
  const handleMove = async (oldIndex: number, newIndex: number) => {
    if (isBusy || isReordering || oldIndex < 0 || newIndex < 0 || newIndex >= ids.length) return
    const nextIds = arrayMove(ids, oldIndex, newIndex)
    setPendingOrder({ sourceOrder, ids: nextIds })
    setIsReordering(true)
    let isSaved = false
    try {
      isSaved = await onReorder(nextIds)
    } finally {
      if (!isSaved) setPendingOrder(null)
      setIsReordering(false)
    }
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id)
          void handleMove(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="manage-rows">
          {orderedRows.map((row, index) => (
            <DragRow
              key={row.id}
              row={row}
              isBusy={isBusy || isReordering}
              isFirst={index === 0}
              isLast={index === rows.length - 1}
              onMove={(direction) => {
                void handleMove(index, index + direction)
              }}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
