import { useMemo, useState } from 'react'
import type { Item, Meal } from './api'
import { addDays, fullDate, shortDate, startOfWeek, todayISO, weekDays, weekTitle, weekdayName } from './dates'
import { MealSheet } from './MealSheet'
import type { MealDraft } from './useMeals'

type Props = {
  meals: Meal[]
  ready: boolean
  items: Item[]
  onAdd: (draft: MealDraft) => void
  onUpdate: (id: string, draft: MealDraft) => void
  onRemove: (meal: Meal) => void
}

type Sheet = { mode: 'new'; day: string } | { mode: 'edit'; id: string } | null

const FOODS_SHOWN = 6 // au-delà, « +N »

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  )
}

export function MealsView({ meals, ready, items, onAdd, onUpdate, onRemove }: Props) {
  const today = todayISO()
  const thisWeek = startOfWeek(today)
  const [weekStart, setWeekStart] = useState(thisWeek)
  const [sheet, setSheet] = useState<Sheet>(null)

  const days = useMemo(() => weekDays(weekStart), [weekStart])
  const byDay = useMemo(() => {
    const map = new Map<string, Meal[]>()
    for (const m of meals) {
      if (m.day < days[0] || m.day > days[6]) continue
      map.set(m.day, [...(map.get(m.day) ?? []), m])
    }
    return map
  }, [meals, days])

  const editing = sheet?.mode === 'edit' ? (meals.find((m) => m.id === sheet.id) ?? null) : null
  const sheetOpen = sheet?.mode === 'new' || (sheet?.mode === 'edit' && editing !== null)

  return (
    <>
      <div className="sticky">
        <div className="week-bar">
          <button
            type="button"
            className="week-nav"
            aria-label="Semaine précédente"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <Chevron dir="left" />
          </button>
          <div className="week-title">
            <strong aria-live="polite">{weekTitle(weekStart)}</strong>
            {weekStart === thisWeek ? (
              <span>Cette semaine</span>
            ) : (
              <button type="button" className="week-today" onClick={() => setWeekStart(thisWeek)}>
                Aujourd'hui
              </button>
            )}
          </div>
          <button
            type="button"
            className="week-nav"
            aria-label="Semaine suivante"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            <Chevron dir="right" />
          </button>
        </div>
      </div>

      <main>
        {!ready ? (
          <p className="hint">Chargement…</p>
        ) : (
          <div className="days">
            {days.map((day) => {
              const list = byDay.get(day) ?? []
              const isToday = day === today
              return (
                <section key={day} className={`day${isToday ? ' is-today' : ''}`} aria-label={fullDate(day)}>
                  <header className="day-head">
                    <h2 className="day-name">
                      {weekdayName(day)} <span>{shortDate(day)}</span>
                    </h2>
                    {isToday && <span className="day-flag">Aujourd'hui</span>}
                    <button
                      type="button"
                      className="day-add"
                      aria-label={`Ajouter un repas, ${fullDate(day)}`}
                      onClick={() => setSheet({ mode: 'new', day })}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </header>

                  {list.length === 0 ? (
                    <p className="day-empty">Rien de prévu</p>
                  ) : (
                    <ul className="meal-list">
                      {list.map((meal) => (
                        <li key={meal.id}>
                          <button type="button" className="meal" onClick={() => setSheet({ mode: 'edit', id: meal.id })}>
                            <span className="meal-title">{meal.title}</span>
                            {meal.description && <span className="meal-desc">{meal.description}</span>}
                            {meal.foods.length > 0 && (
                              <span className="meal-foods">
                                {meal.foods.slice(0, FOODS_SHOWN).map((f) => (
                                  <span key={f} className="chip chip-static">
                                    {f}
                                  </span>
                                ))}
                                {meal.foods.length > FOODS_SHOWN && (
                                  <span className="chip chip-static chip-more">+{meal.foods.length - FOODS_SHOWN}</span>
                                )}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </main>

      {sheetOpen && (
        <MealSheet
          key={editing?.id ?? `new-${sheet?.mode === 'new' ? sheet.day : ''}`}
          meal={editing}
          day={sheet?.mode === 'new' ? sheet.day : today}
          items={items}
          onClose={() => setSheet(null)}
          onSave={(draft) => {
            if (editing) onUpdate(editing.id, draft)
            else onAdd(draft)
            setWeekStart(startOfWeek(draft.day)) // on affiche la semaine du repas enregistré
            setSheet(null)
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
