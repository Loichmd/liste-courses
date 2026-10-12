/** Dates au format AAAA-MM-JJ, dans le fuseau de l'appareil (jamais d'UTC : un repas du soir reste le bon jour). */

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Minuit local du jour donné. */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isValidISO(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && toISO(parseISO(iso)) === iso
}

export function todayISO(): string {
  return toISO(new Date())
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Lundi de la semaine qui contient ce jour. */
export function startOfWeek(iso: string): string {
  const d = parseISO(iso)
  return addDays(iso, -((d.getDay() + 6) % 7))
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' })
const dayMonthShort = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const dayMonthLong = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })
const dayMonthYear = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const longDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const upper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** « Lundi » */
export function weekdayName(iso: string): string {
  return upper(weekday.format(parseISO(iso)))
}

/** « 12 oct. » */
export function shortDate(iso: string): string {
  return dayMonthShort.format(parseISO(iso))
}

/** « lundi 12 octobre 2026 » */
export function fullDate(iso: string): string {
  return longDate.format(parseISO(iso))
}

/** « 12 – 18 octobre », « 28 sept. – 4 oct. » ou, à cheval sur deux années, avec les années. */
export function weekTitle(start: string): string {
  const a = parseISO(start)
  const b = parseISO(addDays(start, 6))
  if (a.getFullYear() !== b.getFullYear()) return `${dayMonthYear.format(a)} – ${dayMonthYear.format(b)}`
  if (a.getMonth() === b.getMonth()) return `${a.getDate()} – ${dayMonthLong.format(b)}`
  return `${dayMonthShort.format(a)} – ${dayMonthShort.format(b)}`
}
