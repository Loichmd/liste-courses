import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { searchItems } from './api'
import type { Item } from './api'
import { normalize } from './normalize'

type Props = {
  items: Item[]
  onAdd: (name: string) => void
  placeholder?: string
  /** Liste de suggestions dans le flux de la page (fenêtre de saisie), au lieu d'une liste flottante. */
  inline?: boolean
  /** Texte tapé mais pas encore ajouté (pour ne pas le perdre à l'enregistrement d'une fiche). */
  onDraft?: (text: string) => void
}

type Row = { kind: 'item'; item: Item } | { kind: 'create'; name: string }

export function AddBar({ items, onAdd, placeholder = 'Ajouter un article', inline = false, onDraft }: Props) {
  const [value, setRaw] = useState('')
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(-1)
  const [remote, setRemote] = useState<{ query: string; rows: Item[] } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const seq = useRef(0)

  function setValue(next: string) {
    setRaw(next)
    onDraft?.(next)
  }

  const query = normalize(value)
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])

  // Autocomplétion : requête « commence par » sur la base, avec un résultat local instantané en attendant.
  useEffect(() => {
    if (!query) {
      setRemote(null)
      return
    }
    const mine = ++seq.current
    const timer = window.setTimeout(async () => {
      try {
        const rows = await searchItems(query)
        if (mine === seq.current) setRemote({ query, rows })
      } catch {
        /* on garde les résultats locaux */
      }
    }, 80)
    return () => window.clearTimeout(timer)
  }, [query])

  const rows: Row[] = useMemo(() => {
    if (!query) return []
    const found =
      remote && remote.query === query
        ? remote.rows
        : items.filter((i) => i.search.startsWith(query)).sort((a, b) => a.search.localeCompare(b.search)).slice(0, 8)
    const list: Row[] = found.map((i) => ({ kind: 'item', item: byId.get(i.id) ?? i }))
    if (!found.some((i) => i.search === query)) list.push({ kind: 'create', name: value.trim() })
    return list
  }, [query, remote, items, byId, value])

  function submit(name: string) {
    if (!normalize(name)) return
    onAdd(name)
    setValue('')
    setCursor(-1)
    inputRef.current?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'ArrowDown' && rows.length) {
      e.preventDefault()
      setOpen(true)
      setCursor((c) => (c + 1) % rows.length)
    } else if (e.key === 'ArrowUp' && rows.length) {
      e.preventDefault()
      setCursor((c) => (c <= 0 ? rows.length - 1 : c - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const row = cursor >= 0 ? rows[cursor] : undefined
      submit(row?.kind === 'item' ? row.item.name : value)
    } else if (e.key === 'Escape') {
      // Ce qui est géré ici ne ferme pas la fenêtre qui contient la barre.
      if (open && rows.length) {
        e.preventDefault()
        setOpen(false)
      } else if (value) {
        e.preventDefault()
        setValue('')
      }
    }
  }

  const showList = open && rows.length > 0
  const typedLength = value.trim().length

  // Dans une fenêtre, les suggestions s'affichent sous la barre : on les ramène à l'écran si elles sont coupées.
  useEffect(() => {
    if (inline && showList) listRef.current?.scrollIntoView({ block: 'nearest' })
  }, [inline, showList, rows.length])

  return (
    <div className="addbar">
      <div className="addbar-field">
        <svg className="addbar-plus" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setCursor(-1)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="sentences"
          spellCheck={false}
          enterKeyHint="done"
          maxLength={120}
        />
        {value.trim() && (
          <button
            type="button"
            className="addbar-submit"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => submit(value)}
          >
            Ajouter
          </button>
        )}
      </div>

      {showList && (
        <ul ref={listRef} id={listId} className={`suggest${inline ? ' suggest-inline' : ''}`} role="listbox">
          {rows.map((row, idx) => {
            const selected = idx === cursor
            if (row.kind === 'create') {
              return (
                <li
                  key="create"
                  role="option"
                  aria-selected={selected}
                  className={`suggest-row suggest-create${selected ? ' is-selected' : ''}`}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => submit(row.name)}
                >
                  <span>
                    Créer « <strong>{row.name}</strong> »
                  </span>
                </li>
              )
            }
            const { item } = row
            const onList = !item.checked
            return (
              <li
                key={item.id}
                role="option"
                aria-selected={selected}
                className={`suggest-row${selected ? ' is-selected' : ''}`}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => submit(item.name)}
              >
                <span>
                  <strong>{item.name.slice(0, typedLength)}</strong>
                  {item.name.slice(typedLength)}
                </span>
                <span className={`suggest-tag${onList ? ' is-on' : ''}`}>{onList ? 'Dans la liste' : 'Ajouter'}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
