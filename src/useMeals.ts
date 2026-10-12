import { useCallback, useMemo, useRef } from 'react'
import * as api from './api'
import type { Meal } from './api'
import { cleanName, newId, normalize } from './normalize'
import { useRemoteList } from './useRemoteList'
import type { ShowToast } from './useToast'

export const MAX_FOODS = 60

export type MealDraft = { day: string; title: string; description: string; foods: string[] }

/** Noms propres, sans doublon (accents et majuscules ignorés), dans l'ordre saisi. */
export function tidyFoods(foods: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of foods) {
    const name = cleanName(raw)
    const key = normalize(name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(name)
    if (out.length === MAX_FOODS) break
  }
  return out
}

function tidy(draft: MealDraft): MealDraft {
  return {
    day: draft.day,
    title: draft.title.replace(/\s+/g, ' ').trim().slice(0, 120),
    description: draft.description.trim().slice(0, 2000),
    foods: tidyFoods(draft.foods),
  }
}

/**
 * Agenda des repas. `addToList` ajoute un aliment à la liste de courses (réactive l'article s'il était coché).
 * Les aliments partent dans la liste à l'enregistrement : à la création tous, à la modification seulement les nouveaux,
 * pour qu'un article déjà acheté ne revienne pas à chaque retouche d'un repas. Retirer un aliment d'un repas ne touche pas la liste.
 */
export function useMeals(showToast: ShowToast, addToList: (name: string) => void) {
  const { rows, setRows, ready, sync } = useRemoteList<Meal>(api.fetchMeals, showToast)
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  const pushToList = useCallback(
    (foods: string[]) => {
      // À l'envers : le premier aliment du repas se retrouve en haut de la liste.
      for (let i = foods.length - 1; i >= 0; i--) addToList(foods[i])
    },
    [addToList],
  )

  const add = useCallback(
    (raw: MealDraft) => {
      const draft = tidy(raw)
      if (!draft.title) return
      const meal: Meal = { id: newId(), ...draft, created_at: new Date().toISOString() }
      setRows((p) => [...p, meal])
      void sync(async () => {
        const saved = await api.insertMeal(meal)
        setRows((p) => p.map((m) => (m.id === saved.id ? saved : m)))
      })
      pushToList(draft.foods)
    },
    [pushToList, setRows, sync],
  )

  const update = useCallback(
    (id: string, raw: MealDraft) => {
      const prev = rowsRef.current.find((m) => m.id === id)
      const draft = tidy(raw)
      if (!prev || !draft.title) return
      const known = new Set(prev.foods.map(normalize))
      setRows((p) => p.map((m) => (m.id === id ? { ...m, ...draft } : m)))
      void sync(() => api.updateMeal(id, draft))
      pushToList(draft.foods.filter((f) => !known.has(normalize(f))))
    },
    [pushToList, setRows, sync],
  )

  const restore = useCallback(
    (meal: Meal) => {
      setRows((p) => (p.some((m) => m.id === meal.id) ? p : [...p, meal]))
      showToast(null)
      void sync(() => api.insertMeal(meal))
    },
    [setRows, showToast, sync],
  )

  const remove = useCallback(
    (meal: Meal) => {
      setRows((p) => p.filter((m) => m.id !== meal.id))
      showToast({ text: `« ${meal.title} » supprimé`, action: { label: 'Annuler', run: () => restore(meal) } })
      void sync(() => api.deleteMeal(meal.id))
    },
    [restore, setRows, showToast, sync],
  )

  const meals = useMemo(
    () => [...rows].sort((a, b) => a.day.localeCompare(b.day) || a.created_at.localeCompare(b.created_at)),
    [rows],
  )

  return { meals, ready, add, update, remove }
}
