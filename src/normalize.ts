/** Même normalisation que le trigger SQL `items_set_search` : minuscules, sans accents. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/ø/g, 'o')
    .replace(/ł/g, 'l')
    .replace(/đ/g, 'd')
    // Ponctuation typographique (apostrophe de l'iPhone, tirets, guillemets) : comme `unaccent` côté base
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/«/g, '<<')
    .replace(/»/g, '>>')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Nom affiché : espaces propres, première lettre en majuscule. */
export function cleanName(input: string): string {
  const name = input.replace(/\s+/g, ' ').trim().slice(0, 120)
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}
