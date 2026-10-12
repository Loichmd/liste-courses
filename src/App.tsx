import { useState } from 'react'
import { CardsView } from './CardsView'
import { CoursesView } from './CoursesView'
import { isConfigured } from './supabase'
import { useCards } from './useCards'
import { useItems } from './useItems'
import { useToast } from './useToast'

type Tab = 'courses' | 'cartes'

export default function App() {
  const { toast, show } = useToast()
  const items = useItems(show)
  const cards = useCards(show)
  const [tab, setTab] = useState<Tab>(() => (window.location.hash === '#cartes' ? 'cartes' : 'courses'))

  function go(next: Tab) {
    setTab(next)
    try {
      // L'adresse /#cartes ouvre directement les cartes (utile en raccourci sur l'écran d'accueil).
      window.history.replaceState(null, '', next === 'cartes' ? '#cartes' : window.location.pathname + window.location.search)
    } catch {
      /* sans conséquence */
    }
  }

  if (!isConfigured) {
    return (
      <div className="app">
        <h1 className="title">Courses</h1>
        <p className="notice">
          La base n'est pas configurée. Définissez <code>VITE_SUPABASE_URL</code> et{' '}
          <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, puis relancez le build.
        </p>
      </div>
    )
  }

  const remaining = items.active.filter((i) => !i.checked).length
  const cardCount = cards.cards.length
  let subtitle = ''
  if (tab === 'courses' && items.ready) subtitle = remaining === 0 ? 'Rien à acheter' : `${remaining} à acheter`
  if (tab === 'cartes' && cards.ready) subtitle = cardCount === 0 ? 'Aucune carte' : `${cardCount} carte${cardCount > 1 ? 's' : ''}`

  return (
    <div className="app">
      <header className="top">
        <h1 className="title">{tab === 'courses' ? 'Courses' : 'Cartes'}</h1>
        <p className="count" aria-live="polite">
          {subtitle}
        </p>
      </header>

      <nav className="tabs" aria-label="Sections">
        <button type="button" className="tab" aria-current={tab === 'courses' ? 'page' : undefined} onClick={() => go('courses')}>
          Courses
        </button>
        <button type="button" className="tab" aria-current={tab === 'cartes' ? 'page' : undefined} onClick={() => go('cartes')}>
          Cartes
        </button>
      </nav>

      {tab === 'courses' ? (
        <CoursesView list={items} />
      ) : (
        <CardsView cards={cards.cards} ready={cards.ready} onAdd={cards.add} onUpdate={cards.update} onRemove={cards.remove} />
      )}

      {toast && (
        <div className="toast" role="status">
          <span>{toast.text}</span>
          <button type="button" onClick={() => (toast.action ? toast.action.run() : show(null))}>
            {toast.action?.label ?? 'Fermer'}
          </button>
        </div>
      )}
    </div>
  )
}
