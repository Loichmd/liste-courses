import { useCallback, useMemo, useRef } from 'react'
import * as api from './api'
import type { Card } from './api'
import { imagePath, rememberLocal, type CardImages } from './images'
import { newId } from './normalize'
import { useRemoteList } from './useRemoteList'
import type { ShowToast } from './useToast'

const UNDO_MS = 7000 // les fichiers d'une carte supprimée restent le temps de pouvoir annuler

export function useCards(showToast: ShowToast) {
  const { rows, setRows, ready, sync } = useRemoteList<Card>(api.fetchCards, showToast)
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const cleanup = useRef(new Map<string, number>())

  const add = useCallback(
    (name: string, number: string, images: CardImages = {}) => {
      const id = newId()
      const logo_path = images.logo ? imagePath(id, 'logo', images.logo) : null
      const photo_path = images.photo ? imagePath(id, 'photo', images.photo) : null
      const card: Card = { id, name, number, logo_path, photo_path, created_at: new Date().toISOString() }
      if (images.logo && logo_path) rememberLocal(logo_path, images.logo)
      if (images.photo && photo_path) rememberLocal(photo_path, images.photo)
      setRows((p) => [...p, card])
      void sync(async () => {
        // Les fichiers d'abord : une carte en base ne pointe jamais vers une image absente.
        if (images.logo && logo_path) await api.uploadImage(logo_path, images.logo)
        if (images.photo && photo_path) await api.uploadImage(photo_path, images.photo)
        const saved = await api.insertCard(card)
        setRows((p) => p.map((c) => (c.id === saved.id ? saved : c)))
      })
    },
    [setRows, sync],
  )

  const update = useCallback(
    (id: string, name: string, number: string, images: CardImages = {}) => {
      const prev = rowsRef.current.find((c) => c.id === id)
      if (!prev) return
      let logo_path = prev.logo_path ?? null
      let photo_path = prev.photo_path ?? null
      const stale: string[] = [] // anciens fichiers remplacés ou retirés
      if (images.logo !== undefined) {
        if (logo_path) stale.push(logo_path)
        logo_path = images.logo ? imagePath(id, 'logo', images.logo) : null
      }
      if (images.photo !== undefined) {
        if (photo_path) stale.push(photo_path)
        photo_path = images.photo ? imagePath(id, 'photo', images.photo) : null
      }
      if (images.logo && logo_path) rememberLocal(logo_path, images.logo)
      if (images.photo && photo_path) rememberLocal(photo_path, images.photo)
      setRows((p) => p.map((c) => (c.id === id ? { ...c, name, number, logo_path, photo_path } : c)))
      void sync(async () => {
        if (images.logo && logo_path) await api.uploadImage(logo_path, images.logo)
        if (images.photo && photo_path) await api.uploadImage(photo_path, images.photo)
        await api.updateCard(id, { name, number, logo_path, photo_path })
        await api.removeImages(stale).catch(() => {
          /* un fichier orphelin ne gêne pas */
        })
      })
    },
    [setRows, sync],
  )

  const restore = useCallback(
    (card: Card) => {
      window.clearTimeout(cleanup.current.get(card.id))
      cleanup.current.delete(card.id)
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
      const files = [card.logo_path, card.photo_path].filter((p): p is string => !!p)
      if (files.length > 0) {
        cleanup.current.set(
          card.id,
          window.setTimeout(() => {
            cleanup.current.delete(card.id)
            void api.removeImages(files).catch(() => {
              /* un fichier orphelin ne gêne pas */
            })
          }, UNDO_MS),
        )
      }
    },
    [restore, setRows, showToast, sync],
  )

  const cards = useMemo(
    () => [...rows].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
    [rows],
  )

  return { cards, ready, add, update, remove }
}
