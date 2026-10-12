import { useEffect, useRef, useState } from 'react'
import type { Card } from './api'

type Props = {
  card: Card | null // null : nouvelle carte
  onSave: (name: string, number: string) => void
  onDelete: () => void
  onClose: () => void
}

/** Fenêtre d'ajout / modification d'une carte (élément <dialog> natif : Échap et focus gérés par le navigateur). */
export function CardSheet({ card, onSave, onDelete, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState(card?.name ?? '')
  const [number, setNumber] = useState(card?.number ?? '')

  useEffect(() => {
    const d = dialog.current
    if (d && !d.open) d.showModal()
  }, [])

  const canSave = name.trim().length > 0

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-labelledby="sheet-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose() // clic sur le fond
      }}
    >
      <form
        className="sheet-body"
        onSubmit={(e) => {
          e.preventDefault()
          if (canSave) onSave(name.trim(), number.trim())
        }}
      >
        <h2 id="sheet-title">{card ? 'Modifier la carte' : 'Nouvelle carte'}</h2>

        <label className="field">
          <span>Nom</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Carrefour"
            maxLength={80}
            autoComplete="off"
            autoCapitalize="sentences"
            enterKeyHint="next"
          />
        </label>

        <label className="field">
          <span>Numéro</span>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Numéro de la carte"
            maxLength={64}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="done"
          />
        </label>

        <div className="sheet-actions">
          {card && (
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
