import { useEffect, useRef, useState } from 'react'
import type { Card } from './api'
import { prepareImage, useImageUrls, type CardImages, type ImageKind } from './images'

type Props = {
  card: Card | null // null : nouvelle carte
  onSave: (name: string, number: string, images: CardImages) => void
  onDelete: () => void
  onClose: () => void
}

/** Choix en cours pour une image : garder celle de la carte, la retirer, ou en utiliser une nouvelle. */
type Choice = { state: 'keep' } | { state: 'none' } | { state: 'new'; blob: Blob; url: string }

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 18l5-5 4 4 3-3 4 4" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

/** Fenêtre d'ajout / modification d'une carte (élément <dialog> natif : Échap et focus gérés par le navigateur). */
export function CardSheet({ card, onSave, onDelete, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  const logoInput = useRef<HTMLInputElement>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const made = useRef<string[]>([]) // adresses blob: à libérer à la fermeture
  const [name, setName] = useState(card?.name ?? '')
  const [number, setNumber] = useState(card?.number ?? '')
  const [logo, setLogo] = useState<Choice>({ state: 'keep' })
  const [photo, setPhoto] = useState<Choice>({ state: 'keep' })
  const [busy, setBusy] = useState<ImageKind | null>(null)
  const [error, setError] = useState<string | null>(null)
  const urlOf = useImageUrls([card?.logo_path, card?.photo_path])

  useEffect(() => {
    const d = dialog.current
    if (d && !d.open) d.showModal()
    if (!card) nameInput.current?.focus() // nouvelle carte : on tape le nom tout de suite
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seulement à l'ouverture
  }, [])

  useEffect(() => {
    const urls = made.current
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [])

  const canSave = name.trim().length > 0 && busy === null

  const hasLogo = logo.state === 'new' || (logo.state === 'keep' && !!card?.logo_path)
  const hasPhoto = photo.state === 'new' || (photo.state === 'keep' && !!card?.photo_path)
  const logoUrl = logo.state === 'new' ? logo.url : logo.state === 'keep' ? urlOf(card?.logo_path) : undefined
  const photoUrl = photo.state === 'new' ? photo.url : photo.state === 'keep' ? urlOf(card?.photo_path) : undefined

  async function pick(kind: ImageKind, file: File | undefined) {
    if (!file) return
    setError(null)
    setBusy(kind)
    try {
      const blob = await prepareImage(file, kind)
      const url = URL.createObjectURL(blob)
      made.current.push(url)
      ;(kind === 'logo' ? setLogo : setPhoto)({ state: 'new', blob, url })
    } catch {
      setError("Cette image n'a pas pu être lue. Essayez une photo JPEG ou PNG.")
    } finally {
      setBusy(null)
    }
  }

  function save() {
    onSave(name.trim(), number.trim(), {
      logo: logo.state === 'new' ? logo.blob : logo.state === 'none' && card?.logo_path ? null : undefined,
      photo: photo.state === 'new' ? photo.blob : photo.state === 'none' && card?.photo_path ? null : undefined,
    })
  }

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
          if (canSave) save()
        }}
      >
        <h2 id="sheet-title">{card ? 'Modifier la carte' : 'Nouvelle carte'}</h2>

        <div className="identity">
          <div className="logo-slot">
            <button
              type="button"
              className={`logo-tile${hasLogo ? ' has-image' : ''}`}
              aria-label={hasLogo ? "Changer le logo de l'enseigne" : "Ajouter le logo de l'enseigne"}
              onClick={() => logoInput.current?.click()}
            >
              {logoUrl ? <img src={logoUrl} alt="" /> : hasLogo ? null : <ImageIcon />}
            </button>
            {hasLogo && (
              <button
                type="button"
                className="slot-remove"
                aria-label="Retirer le logo"
                onClick={() => setLogo({ state: 'none' })}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 7l10 10M17 7L7 17" />
                </svg>
              </button>
            )}
            <span className="slot-caption">{busy === 'logo' ? 'Envoi…' : 'Logo'}</span>
            <input
              ref={logoInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void pick('logo', e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>

          <label className="field">
            <span>Nom</span>
            <input
              ref={nameInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Carrefour"
              maxLength={80}
              autoComplete="off"
              autoCapitalize="sentences"
              enterKeyHint="next"
            />
          </label>
        </div>

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

        <div className="field-block">
          <span className="field-label">Photo de la carte</span>
          {hasPhoto ? (
            <>
              <button
                type="button"
                className={`photo-frame${photoUrl ? '' : ' is-loading'}`}
                aria-label="Remplacer la photo de la carte"
                onClick={() => photoInput.current?.click()}
              >
                {photoUrl && <img src={photoUrl} alt={`Photo de la carte ${name.trim() || 'de fidélité'}`} />}
              </button>
              <div className="photo-actions">
                <button type="button" className="btn btn-small" onClick={() => photoInput.current?.click()}>
                  {busy === 'photo' ? 'Envoi…' : 'Remplacer'}
                </button>
                <button type="button" className="btn btn-small btn-danger" onClick={() => setPhoto({ state: 'none' })}>
                  Retirer
                </button>
              </div>
            </>
          ) : (
            <button type="button" className="photo-empty" onClick={() => photoInput.current?.click()}>
              <CameraIcon />
              <span>{busy === 'photo' ? 'Envoi…' : 'Ajouter une photo de la carte'}</span>
            </button>
          )}
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void pick('photo', e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>

        {error && (
          <p className="sheet-error" role="alert">
            {error}
          </p>
        )}

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
