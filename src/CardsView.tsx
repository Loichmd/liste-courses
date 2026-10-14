import { useMemo, useState } from 'react'
import type { Card } from './api'
import { CardDetail } from './CardDetail'
import { CardSheet } from './CardSheet'
import { useImageUrls, type CardImages } from './images'
import { normalize } from './normalize'

type Props = {
  cards: Card[]
  ready: boolean
  onAdd: (name: string, number: string, images: CardImages) => void
  onUpdate: (id: string, name: string, number: string, images: CardImages) => void
  onRemove: (card: Card) => void
}

// Toucher une carte l'ouvre en lecture seule (« view ») ; on ne la modifie (« edit ») qu'en touchant « Modifier ».
type Sheet = { mode: 'new' } | { mode: 'view'; id: string } | { mode: 'edit'; id: string } | null

/** Met en évidence la partie du nom qui correspond à la recherche. */
function Highlight({ text, query }: { text: string; query: string }) {
  const norm = normalize(text)
  const at = query ? norm.indexOf(query) : -1
  if (at < 0 || norm.length !== text.length) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  )
}

export function CardsView({ cards, ready, onAdd, onUpdate, onRemove }: Props) {
  const [query, setQuery] = useState('')
  const [sheet, setSheet] = useState<Sheet>(null)

  const logoUrl = useImageUrls(cards.map((c) => c.logo_path))
  const q = normalize(query)
  // Recherche « contient » : sans accents ni majuscules, n'importe où dans le nom.
  const shown = useMemo(() => (q ? cards.filter((c) => normalize(c.name).includes(q)) : cards), [cards, q])
  const current = sheet && sheet.mode !== 'new' ? (cards.find((c) => c.id === sheet.id) ?? null) : null
  const viewing = sheet?.mode === 'view' ? current : null
  const editing = sheet?.mode === 'edit' ? current : null

  return (
    <>
      <div className="sticky">
        <div className="cards-bar">
          <div className="addbar-field">
            <svg className="addbar-plus" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une carte"
              aria-label="Rechercher une carte par nom"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
            />
          </div>
          <button type="button" className="add-btn" aria-label="Ajouter une carte" onClick={() => setSheet({ mode: 'new' })}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      <main>
        {!ready ? (
          <p className="hint">Chargement…</p>
        ) : cards.length === 0 ? (
          <p className="hint">Aucune carte pour le moment. Touchez + pour ajouter la première.</p>
        ) : shown.length === 0 ? (
          <p className="hint">Aucune carte ne contient « {query.trim()} ».</p>
        ) : (
          <ul className="list" aria-label="Cartes de fidélité">
            {shown.map((card) => (
              <li key={card.id} className="row">
                <button type="button" className="card-row" onClick={() => setSheet({ mode: 'view', id: card.id })}>
                  <span className={`card-icon${card.logo_path ? ' has-logo' : ''}`} aria-hidden="true">
                    {card.logo_path ? (
                      logoUrl(card.logo_path) && <img src={logoUrl(card.logo_path)} alt="" loading="lazy" />
                    ) : (
                      <svg viewBox="0 0 24 24">
                        <rect x="3" y="5.5" width="18" height="13" rx="3" />
                        <path d="M3 10h18M7 15h4" />
                      </svg>
                    )}
                  </span>
                  <span className="card-main">
                    <span className="card-name">
                      <Highlight text={card.name} query={q} />
                    </span>
                    <span className={`card-number${card.number ? '' : ' is-empty'}`}>
                      {card.number || 'Numéro non renseigné'}
                    </span>
                  </span>
                  <svg className="chev" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {viewing && (
        <CardDetail
          key={`view-${viewing.id}`}
          card={viewing}
          onEdit={() => setSheet({ mode: 'edit', id: viewing.id })}
          onClose={() => setSheet(null)}
        />
      )}

      {(sheet?.mode === 'new' || editing) && (
        <CardSheet
          key={editing ? `edit-${editing.id}` : 'new'}
          card={editing}
          // Annuler une modification ramène à la fiche ; annuler un ajout referme la fenêtre.
          onClose={() => setSheet(editing ? { mode: 'view', id: editing.id } : null)}
          onSave={(name, number, images) => {
            if (editing) {
              onUpdate(editing.id, name, number, images)
              setSheet({ mode: 'view', id: editing.id }) // on revoit la fiche, mise à jour
            } else {
              onAdd(name, number, images)
              setSheet(null)
            }
          }}
          onDelete={() => {
            if (editing) onRemove(editing)
            setSheet(null)
          }}
        />
      )}
    </>
  )
}
