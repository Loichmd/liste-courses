import { useEffect, useRef } from 'react'
import type { Card } from './api'
import { useImageUrls } from './images'

type Props = {
  card: Card
  onEdit: () => void
  onClose: () => void
}

/**
 * Fiche d'une carte en lecture seule : logo, nom, numéro et photo bien visible.
 * Rien ne se modifie ici : on ne change une carte qu'en touchant « Modifier ».
 */
export function CardDetail({ card, onEdit, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const urlOf = useImageUrls([card.logo_path, card.photo_path])
  const logoUrl = urlOf(card.logo_path)
  const photoUrl = urlOf(card.photo_path)

  useEffect(() => {
    const d = dialog.current
    if (d && !d.open) d.showModal()
  }, [])

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-labelledby="view-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose() // clic sur le fond
      }}
    >
      <div className="sheet-body">
        <div className="view-head">
          <span className={`card-icon view-logo${card.logo_path ? ' has-logo' : ''}`} aria-hidden="true">
            {card.logo_path ? (
              logoUrl && <img src={logoUrl} alt="" />
            ) : (
              <svg viewBox="0 0 24 24">
                <rect x="3" y="5.5" width="18" height="13" rx="3" />
                <path d="M3 10h18M7 15h4" />
              </svg>
            )}
          </span>
          <div className="view-id">
            <h2 id="view-title">{card.name}</h2>
            <p className={`view-number${card.number ? '' : ' is-empty'}`}>{card.number || 'Numéro non renseigné'}</p>
          </div>
        </div>

        {card.photo_path ? (
          <div className={`view-photo${photoUrl ? '' : ' is-loading'}`}>
            {photoUrl && <img src={photoUrl} alt={`Photo de la carte ${card.name}`} />}
          </div>
        ) : (
          <p className="view-nophoto">Pas de photo pour cette carte. Touchez « Modifier » pour en ajouter une.</p>
        )}

        <div className="sheet-actions">
          <button type="button" className="btn" onClick={onClose}>
            Fermer
          </button>
          <span className="spacer" />
          <button type="button" className="btn btn-primary" onClick={onEdit}>
            Modifier
          </button>
        </div>
      </div>
    </dialog>
  )
}
