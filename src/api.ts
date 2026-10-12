import { supabase } from './supabase'

export type Item = {
  id: string
  name: string
  search: string
  checked: boolean
  position: number
  created_at: string
}

export type Card = {
  id: string
  name: string
  number: string
  logo_path: string | null // chemin du logo de l'enseigne dans le bucket card-images
  photo_path: string | null // chemin de la photo de la carte
  created_at: string
}

export type Meal = {
  id: string
  day: string // AAAA-MM-JJ
  title: string
  description: string
  foods: string[] // noms d'aliments, ajoutés à la liste de courses à l'enregistrement
  created_at: string
}

const COLUMNS = 'id,name,search,checked,position,created_at'
const CARD_COLUMNS = 'id,name,number,logo_path,photo_path,created_at'
const MEAL_COLUMNS = 'id,day,title,description,foods,created_at'
const BUCKET = 'card-images'

export class ApiError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

function fail(error: { message: string; code?: string } | null): void {
  if (error) throw new ApiError(error.message, error.code)
}

/* ---------- Articles ---------- */

export async function fetchItems(): Promise<Item[]> {
  const { data, error } = await supabase.from('items').select(COLUMNS).order('position', { ascending: true })
  fail(error)
  return (data ?? []) as Item[]
}

/** Recherche « commence par » dans la base (insensible à la casse et aux accents). */
export async function searchItems(prefix: string, limit = 8): Promise<Item[]> {
  const escaped = prefix.replace(/[\\%_]/g, (c) => '\\' + c)
  const { data, error } = await supabase
    .from('items')
    .select(COLUMNS)
    .like('search', `${escaped}%`)
    .order('search', { ascending: true })
    .limit(limit)
  fail(error)
  return (data ?? []) as Item[]
}

export async function insertItem(item: Pick<Item, 'id' | 'name' | 'checked' | 'position'>): Promise<Item> {
  const { id, name, checked, position } = item
  const { data, error } = await supabase.from('items').insert({ id, name, checked, position }).select(COLUMNS).single()
  fail(error)
  return data as Item
}

export async function updateItem(id: string, patch: Partial<Pick<Item, 'name' | 'checked' | 'position'>>): Promise<void> {
  const { error } = await supabase.from('items').update(patch).eq('id', id)
  fail(error)
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id)
  fail(error)
}

export async function reorderItems(ids: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_items', { ids })
  fail(error)
}

/* ---------- Cartes de fidélité ---------- */

export async function fetchCards(): Promise<Card[]> {
  const { data, error } = await supabase.from('loyalty_cards').select(CARD_COLUMNS).order('name', { ascending: true })
  fail(error)
  return (data ?? []) as Card[]
}

export async function insertCard(card: Pick<Card, 'id' | 'name' | 'number' | 'logo_path' | 'photo_path'>): Promise<Card> {
  const { id, name, number } = card
  const row = { id, name, number, logo_path: card.logo_path ?? null, photo_path: card.photo_path ?? null }
  const { data, error } = await supabase.from('loyalty_cards').insert(row).select(CARD_COLUMNS).single()
  fail(error)
  return data as Card
}

export async function updateCard(
  id: string,
  patch: Partial<Pick<Card, 'name' | 'number' | 'logo_path' | 'photo_path'>>,
): Promise<void> {
  const { error } = await supabase.from('loyalty_cards').update(patch).eq('id', id)
  fail(error)
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase.from('loyalty_cards').delete().eq('id', id)
  fail(error)
}

/* ---------- Agenda des repas ---------- */

export async function fetchMeals(): Promise<Meal[]> {
  // Les plus récents d'abord si la table devient grande ; l'application trie par jour.
  const { data, error } = await supabase.from('meals').select(MEAL_COLUMNS).order('day', { ascending: false }).limit(1000)
  fail(error)
  return (data ?? []) as Meal[]
}

export async function insertMeal(meal: Pick<Meal, 'id' | 'day' | 'title' | 'description' | 'foods'>): Promise<Meal> {
  const { id, day, title, description, foods } = meal
  const { data, error } = await supabase.from('meals').insert({ id, day, title, description, foods }).select(MEAL_COLUMNS).single()
  fail(error)
  return data as Meal
}

export async function updateMeal(
  id: string,
  patch: Partial<Pick<Meal, 'day' | 'title' | 'description' | 'foods'>>,
): Promise<void> {
  const { error } = await supabase.from('meals').update(patch).eq('id', id)
  fail(error)
}

export async function deleteMeal(id: string): Promise<void> {
  const { error } = await supabase.from('meals').delete().eq('id', id)
  fail(error)
}

/* ---------- Images des cartes (bucket privé) ---------- */

export async function uploadImage(path: string, blob: Blob): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false })
  fail(error)
}

/** Adresses temporaires (1 h) pour afficher des images du bucket privé. */
export async function signImages(paths: string[], expiresIn = 3600): Promise<Map<string, string>> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, expiresIn)
  fail(error)
  const urls = new Map<string, string>()
  for (const d of data ?? []) if (d.path && d.signedUrl) urls.set(d.path, d.signedUrl)
  return urls
}

export async function removeImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  fail(error)
}
