import { useState } from 'react'
import { CardsView } from './CardsView'
import { CoursesView } from './CoursesView'
import { MealsView } from './MealsView'
import { todayISO } from './dates'
import { isConfigured } from './supabase'
import { useCards } from './useCards'
import { useItems } from './useItems'
import { useMeals } from './useMeals'
import { useToast } from './useToast'

type Tab = 'courses' | 'repas' | 'cartes'

const HASHES: Record<Tab, string> = { courses: '', repas: '#repas', cartes: '#cartes' }
const TITLES: Record<Tab, string> = { courses: 'Courses', repas: 'Repas', cartes: 'Cartes' }

function tabFromHash(): Tab {
  const hash = window.location.hash
  return hash === '#cartes' ? 'cartes' : hash === '#repas' ? 'repas' : 'courses'
}

export default function App() {
  const { toast, show } = useToast()
  const items = useItems(show)
  const cards = useCards(show)
  const meals = useMeals(show, items.add)
  const [tab, setTab] = useState<Tab>(tabFromHash)

  function go(next: Tab) {
    setTab(next)
    try {
      // L'adresse /#cartes ou /#repas ouvre directement la section (utile en raccourci sur l'écran d'accueil).
      window.history.replaceState(null, '', HASHES[next] || window.location.pathname + window.location.search)
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
  if (tab === 'repas' && meals.ready) {
    const today = todayISO()
    const upcoming = meals.meals.filter((m) => m.day >= today).length
    subtitle = upcoming === 0 ? 'Aucun repas à venir' : `${upcoming} repas à venir`
  }

  return (
    <div className="app">
      <header className="top">
        <h1 className="title">{TITLES[tab]}</h1>
        <p className="count" aria-live="polite">
          {subtitle}
        </p>
      </header>

      <nav className="tabs" aria-label="Sections">
        <button type="button" className="tab" aria-current={tab === 'courses' ? 'page' : undefined} onClick={() => go('courses')}>
          Courses
        </button>
        <button type="button" className="tab" aria-current={tab === 'repas' ? 'page' : undefined} onClick={() => go('repas')}>
          Repas
        </button>
        <button type="button" className="tab" aria-current={tab === 'cartes' ? 'page' : undefined} onClick={() => go('cartes')}>
          Cartes
        </button>
      </nav>

      {tab === 'courses' ? (
        <CoursesView list={items} />
      ) : tab === 'repas' ? (
        <MealsView
          meals={meals.meals}
          ready={meals.ready}
          items={items.items}
          onAdd={meals.add}
          onUpdate={meals.update}
          onRemove={meals.remove}
        />
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
