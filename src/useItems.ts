import { useCallback, useMemo, useRef, useState } from 'react'
import * as api from './api'
import type { Item } from './api'
import { cleanName, newId, normalize } from './normalize'
import { useRemoteList } from './useRemoteList'
import type { ShowToast } from './useToast'

const STRIKE_MS = 480 // le temps de voir l'article se barrer avant qu'il se masque

export function useItems(showToast: ShowToast) {
  const { rows: items, setRows: setItems, ready, sync } = useRemoteList<Item>(api.fetchItems, showToast)
  const [leaving, setLeaving] = useState<Set<string>>(() => new Set())
  const [flashId, setFlashId] = useState<string | null>(null)

  const itemsRef = useRef(items)
  itemsRef.current = items
  const timers = useRef(new Map<string, number>())

  const flash = useCallback((id: string) => {
    setFlashId(id)
    window.setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 1400)
  }, [])

  const stopLeaving = useCallback((id: string) => {
    window.clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setLeaving((s) => {
      if (!s.has(id)) return s
      const next = new Set(s)
      next.delete(id)
      return next
    })
  }, [])

  const topPosition = () =>
    Math.min(0, ...itemsRef.current.filter((i) => !i.checked).map((i) => i.position)) - 1

  /** Ajoute un article : le réactive s'il existe déjà, sinon le crée en base. */
  const add = useCallback(
    (raw: string) => {
      const name = cleanName(raw)
      const search = normalize(name)
      if (!search) return
      const existing = itemsRef.current.find((i) => i.search === search)

      if (existing) {
        if (existing.checked) {
          const position = topPosition()
          stopLeaving(existing.id)
          setItems((p) => p.map((i) => (i.id === existing.id ? { ...i, checked: false, position } : i)))
          void sync(() => api.updateItem(existing.id, { checked: false, position }))
        }
        flash(existing.id)
        return
      }

      const item: Item = {
        id: newId(),
        name,
        search,
        checked: false,
        position: topPosition(),
        created_at: new Date().toISOString(),
      }
      setItems((p) => [item, ...p])
      flash(item.id)
      void sync(async () => {
        const saved = await api.insertItem(item)
        setItems((p) => p.map((i) => (i.id === saved.id ? saved : i)))
      })
    },
    [flash, setItems, stopLeaving, sync],
  )

  const toggle = useCallback(
    (id: string) => {
      const item = itemsRef.current.find((i) => i.id === id)
      if (!item) return
      if (!item.checked) {
        setItems((p) => p.map((i) => (i.id === id ? { ...i, checked: true } : i)))
        setLeaving((s) => new Set(s).add(id))
        window.clearTimeout(timers.current.get(id))
        timers.current.set(id, window.setTimeout(() => stopLeaving(id), STRIKE_MS))
        void sync(() => api.updateItem(id, { checked: true }))
      } else {
        const position = topPosition()
        stopLeaving(id)
        setItems((p) => p.map((i) => (i.id === id ? { ...i, checked: false, position } : i)))
        flash(id)
        void sync(() => api.updateItem(id, { checked: false, position }))
      }
    },
    [flash, setItems, stopLeaving, sync],
  )

  /** Renomme un article. Renvoie false si le nom est vide ou déjà pris (l'édition reste ouverte). */
  const rename = useCallback(
    (id: string, raw: string): boolean => {
      const name = cleanName(raw)
      const search = normalize(name)
      const item = itemsRef.current.find((i) => i.id === id)
      if (!item || !search) return false
      if (name === item.name) return true
      const clash = itemsRef.current.find((i) => i.id !== id && i.search === search)
      if (clash) {
        showToast({ text: `« ${clash.name} » existe déjà.` })
        return false
      }
      setItems((p) => p.map((i) => (i.id === id ? { ...i, name, search } : i)))
      void sync(() => api.updateItem(id, { name }))
      return true
    },
    [setItems, showToast, sync],
  )

  const restore = useCallback(
    (item: Item) => {
      setItems((p) => (p.some((i) => i.id === item.id) ? p : [...p, item]))
      showToast(null)
      void sync(() => api.insertItem(item))
    },
    [setItems, showToast, sync],
  )

  const remove = useCallback(
    (id: string) => {
      const item = itemsRef.current.find((i) => i.id === id)
      if (!item) return
      stopLeaving(id)
      setItems((p) => p.filter((i) => i.id !== id))
      showToast({ text: `« ${item.name} » supprimé`, action: { label: 'Annuler', run: () => restore(item) } })
      void sync(() => api.deleteItem(id))
    },
    [restore, setItems, showToast, stopLeaving, sync],
  )

  const reorder = useCallback(
    (ids: string[]) => {
      const order = new Map(ids.map((id, i) => [id, i + 1]))
      setItems((p) => p.map((i) => (order.has(i.id) ? { ...i, position: order.get(i.id)! } : i)))
      void sync(() => api.reorderItems(ids))
    },
    [setItems, sync],
  )

  const active = useMemo(
    () =>
      items
        .filter((i) => !i.checked || leaving.has(i.id))
        .sort((a, b) => a.position - b.position),
    [items, leaving],
  )
  const done = useMemo(
    () =>
      items
        .filter((i) => i.checked && !leaving.has(i.id))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
    [items, leaving],
  )

  return { items, active, done, ready, flashId, add, toggle, rename, remove, reorder }
}
