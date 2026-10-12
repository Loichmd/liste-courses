import { useEffect, useRef, useState } from 'react'
import type { Item, Meal } from './api'
import { AddBar } from './AddBar'
import { fullDate, isValidISO } from './dates'
import { cleanName, normalize } from './normalize'
import { MAX_FOODS, type MealDraft } from './useMeals'

type Props = {
  meal: Meal | null // null : nouveau repas
  day: string // jour proposé pour un nouveau repas
  items: Item[]
  onSave: (draft: MealDraft) => void
  onDelete: () => void
  onClose: () => void
}

/** Fenêtre d'ajout / modification d'un repas : jour, titre, description et aliments (autocomplétion « commence par »). */
export function MealSheet({ meal, day: proposedDay, items, onSave, onDelete, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleInput = useRef<HTMLInputElement>(null)
  const typed = useRef('') // aliment tapé mais pas encore validé
  const [day, setDay] = useState(meal?.day ?? proposedDay)
  const [title, setTitle] = useState(meal?.title ?? '')
  const [description, setDescription] = useState(meal?.description ?? '')
  const [foods, setFoods] = useState<string[]>(meal?.foods ?? [])

  useEffect(() => {
    const d = dialog.current
    if (d && !d.open) d.showModal()
    if (!meal) titleInput.current?.focus() // nouveau repas : on tape le titre tout de suite
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seulement à l'ouverture
  }, [])

  const canSave = title.trim().length > 0 && isValidISO(day)
  const full = foods.length >= MAX_FOODS

  function addFood(raw: string) {
    const name = cleanName(raw)
    const key = normalize(name)
    if (!key || full) return
    setFoods((f) => (f.some((x) => normalize(x) === key) ? f : [...f, name]))
  }

  function save() {
    // Un aliment tapé sans avoir été validé est ajouté aussi : rien ne se perd.
    const pending = typed.current.trim()
    onSave({ day, title, description, foods: pending ? [...foods, pending] : foods })
  }

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-labelledby="meal-sheet-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose() // clic sur le fond
      }}
    >
      <form
        className="sheet-body"
        onSubmit={(e) => {
          e.preventDefault()
          if (canSave) save()
        }}
      >
        <h2 id="meal-sheet-title">{meal ? 'Modifier le repas' : 'Nouveau repas'}</h2>

        <label className="field">
          <span>Titre</span>
          <input
            ref={titleInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Lasagnes"
            maxLength={120}
            autoComplete="off"
            autoCapitalize="sentences"
            enterKeyHint="next"
          />
        </label>

        <label className="field">
          <span>Jour</span>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} required />
          {isValidISO(day) && <small className="field-note">{fullDate(day)}</small>}
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Recette, idées, qui cuisine…"
            rows={3}
            maxLength={2000}
            autoCapitalize="sentences"
          />
        </label>

        <div className="field-block">
          <span className="field-label" id="foods-label">
            Aliments
          </span>
          {foods.length > 0 && (
            <ul className="chips" aria-labelledby="foods-label">
              {foods.map((food) => (
                <li key={food} className="chip">
                  <span>{food}</span>
                  <button
                    type="button"
                    aria-label={`Retirer ${food}`}
                    onClick={() => setFoods((f) => f.filter((x) => x !== food))}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7 7l10 10M17 7L7 17" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {full ? (
            <p className="field-note">Maximum {MAX_FOODS} aliments par repas.</p>
          ) : (
            <AddBar
              items={items}
              onAdd={addFood}
              placeholder="Ajouter un aliment"
              inline
              onDraft={(text) => {
                typed.current = text
              }}
            />
          )}
          <p className="field-note">Les nouveaux aliments sont ajoutés à votre liste de courses à l'enregistrement.</p>
        </div>

        <div className="sheet-actions">
          {meal && (
            <button type="button" className="btn btn-danger" onClick={onDelete}>
              Supprimer
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" disabled={!canSave}>
            Enregistrer
          </button>
        </div>
      </form>
    </dialog>
  )
}
