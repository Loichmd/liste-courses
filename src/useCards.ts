import { useCallback, useMemo } from 'react'
import * as api from './api'
import type { Card } from './api'
import { newId } from './normalize'
import { useRemoteList } from './useRemoteList'
import type { ShowToast } from './useToast'

export function useCards(showToast: ShowToast) {
  const { rows, setRows, ready, sync } = useRemoteList<Card>(api.fetchCards, showToast)

  const add = useCallback(
    (name: string, number: string) => {
      const card: Card = { id: newId(), name, number, created_at: new Date().toISOString() }
      setRows((p) => [...p, card])
      void sync(async () => {
        const saved = await api.insertCard(card)
        setRows((p) => p.map((c) => (c.id === saved.id ? saved : c)))
      })
    },
    [setRows, sync],
  )

  const update = useCallback(
    (id: string, name: string, number: string) => {
      setRows((p) => p.map((c) => (c.id === id ? { ...c, name, number } : c)))
      void sync(() => api.updateCard(id, { name, number }))
    },
    [setRows, sync],
  )

  const restore = useCallback(
    (card: Card) => {
      setRows((p) => (p.some((c) => c.id === card.id) ? p : [...p, card]))
      showToast(null)
      void sync(() => api.insertCard(card))
    },
    [setRows, showToast, sync],
  )

  const remove = useCallback(
    (card: Card) => {
      setRows((p) => p.filter((c) => c.id !== card.id))
      showToast({ text: `« ${card.name} » supprimée`, action: { label: 'Annuler', run: () => restore(card) } })
      void sync(() => api.deleteCard(card.id))
    },
    [restore, setRows, showToast, sync],
  )

  const cards = useMemo(
    () => [...rows].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
    [rows],
  )

  return { cards, ready, add, update, remove }
}
