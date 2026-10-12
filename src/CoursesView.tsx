import { useEffect, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { AddBar } from './AddBar'
import { DoneRow, SortableRow } from './Rows'
import type { useItems } from './useItems'

type ItemsApi = ReturnType<typeof useItems>

function readOpen(): boolean {
  try {
    return localStorage.getItem('courses:done-open') === '1'
  } catch {
    return false
  }
}

export function CoursesView({ list }: { list: ItemsApi }) {
  const { items, active, done, ready, flashId, add, toggle, rename, remove, reorder } = list
  const [doneOpen, setDoneOpen] = useState(readOpen)
  const [editingId, setEditingId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    try {
      localStorage.setItem('courses:done-open', doneOpen ? '1' : '0')
    } catch {
      /* stockage indisponible : sans conséquence */
    }
  }, [doneOpen])

  // Fait défiler jusqu'à l'article ajouté ou déjà présent.
  useEffect(() => {
    if (!flashId) return
    document.querySelector(`[data-id="${flashId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [flashId])

  function onDragEnd({ active: a, over }: DragEndEvent) {
    if (!over || a.id === over.id) return
    const ids = active.map((i) => i.id)
    const from = ids.indexOf(String(a.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    reorder(arrayMove(ids, from, to))
  }

  const rowProps = {
    onToggle: toggle,
    onRemove: remove,
    onEdit: setEditingId,
    onRename: (id: string, name: string) => {
      if (rename(id, name)) setEditingId(null)
    },
    onCancelEdit: () => setEditingId(null),
  }

  return (
    <>
      <div className="sticky">
        <AddBar items={items} onAdd={add} />
      </div>

      <main>
        {!ready ? (
          <p className="hint">Chargement…</p>
        ) : (
          <>
            {active.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                onDragEnd={onDragEnd}
              >
                <SortableContext items={active.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <ul className="list" aria-label="Articles à acheter">
                    {active.map((item) => (
                      <SortableRow
                        key={item.id}
                        item={item}
                        flash={flashId === item.id}
                        editing={editingId === item.id}
                        {...rowProps}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}

            {active.length === 0 && (
              <p className="hint">
                {items.length === 0
                  ? 'Tapez un article ci-dessus. Il est enregistré et proposé la prochaine fois.'
                  : 'Liste vide. Tapez un article, ou rouvrez les articles cochés pour en remettre.'}
              </p>
            )}

            {done.length > 0 && (
              <section className="done">
                <button
                  type="button"
                  className="done-head"
                  aria-expanded={doneOpen}
                  aria-controls="done-list"
                  onClick={() => setDoneOpen((o) => !o)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                  {done.length} {done.length > 1 ? 'articles cochés' : 'article coché'}
                </button>
                {doneOpen && (
                  <>
                    <p className="done-hint">Touchez un article pour le remettre dans la liste.</p>
                    <ul id="done-list" className="list list-done">
                      {done.map((item) => (
                        <DoneRow key={item.id} item={item} editing={editingId === item.id} {...rowProps} />
                      ))}
                    </ul>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </>
  )
}
