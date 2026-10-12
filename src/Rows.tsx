import { useEffect, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Item } from './api'

type RowProps = {
  item: Item
  flash: boolean
  editing: boolean
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onEdit: (id: string) => void
  onRename: (id: string, name: string) => void
  onCancelEdit: () => void
}

function Box({ checked }: { checked: boolean }) {
  return (
    <span className={`box${checked ? ' is-checked' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 20 20">
        <path d="M5 10.5l3.2 3.2L15 6.8" />
      </svg>
    </span>
  )
}

function EditButton({ item, onEdit }: { item: Item; onEdit: (id: string) => void }) {
  return (
    <button type="button" className="icon-btn edit" onClick={() => onEdit(item.id)} aria-label={`Modifier ${item.name}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      </svg>
    </button>
  )
}

function RemoveButton({ item, onRemove }: { item: Item; onRemove: (id: string) => void }) {
  return (
    <button type="button" className="icon-btn remove" onClick={() => onRemove(item.id)} aria-label={`Supprimer ${item.name}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  )
}

/** Édition sur place : Entrée ou ✓ enregistre, Échap ou ✕ annule. */
function EditForm({ item, onSave, onCancel }: { item: Item; onSave: (name: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(item.name)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    input.current?.focus()
    input.current?.select()
  }, [])

  return (
    <form
      className="edit-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSave(value)
      }}
    >
      <input
        ref={input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
          }
        }}
        aria-label={`Modifier ${item.name}`}
        maxLength={120}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="sentences"
        spellCheck={false}
        enterKeyHint="done"
      />
      <button type="submit" className="icon-btn save" aria-label="Enregistrer" disabled={!value.trim()}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </button>
      <button type="button" className="icon-btn cancel" aria-label="Annuler la modification" onClick={onCancel}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </form>
  )
}

/** Article de la liste : déplaçable, se barre quand on le coche. */
export function SortableRow({ item, flash, editing, onToggle, onRemove, onEdit, onRename, onCancelEdit }: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: editing,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-id={item.id}
      className={`row${item.checked ? ' is-checked' : ''}${isDragging ? ' is-dragging' : ''}${flash ? ' is-flash' : ''}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="icon-btn grip"
        aria-label={`Déplacer ${item.name}`}
        disabled={editing}
        {...attributes}
        {...listeners}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="6" r="1.6" />
          <circle cx="15" cy="6" r="1.6" />
          <circle cx="9" cy="12" r="1.6" />
          <circle cx="15" cy="12" r="1.6" />
          <circle cx="9" cy="18" r="1.6" />
          <circle cx="15" cy="18" r="1.6" />
        </svg>
      </button>
      {editing ? (
        <EditForm item={item} onSave={(name) => onRename(item.id, name)} onCancel={onCancelEdit} />
      ) : (
        <>
          <button type="button" role="checkbox" aria-checked={item.checked} className="main" onClick={() => onToggle(item.id)}>
            <Box checked={item.checked} />
            <span className="label">{item.name}</span>
          </button>
          <EditButton item={item} onEdit={onEdit} />
          <RemoveButton item={item} onRemove={onRemove} />
        </>
      )}
    </li>
  )
}

/** Article déjà pris : un toucher le remet dans la liste. */
export function DoneRow({ item, editing, onToggle, onRemove, onEdit, onRename, onCancelEdit }: Omit<RowProps, 'flash'>) {
  return (
    <li className="row row-done is-checked" data-id={item.id}>
      {editing ? (
        <EditForm item={item} onSave={(name) => onRename(item.id, name)} onCancel={onCancelEdit} />
      ) : (
        <>
          <button type="button" role="checkbox" aria-checked={true} className="main" onClick={() => onToggle(item.id)}>
            <Box checked />
            <span className="label">{item.name}</span>
          </button>
          <EditButton item={item} onEdit={onEdit} />
          <RemoveButton item={item} onRemove={onRemove} />
        </>
      )}
    </li>
  )
}
