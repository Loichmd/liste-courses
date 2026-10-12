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
  created_at: string
}

const COLUMNS = 'id,name,search,checked,position,created_at'
const CARD_COLUMNS = 'id,name,number,created_at'

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

export async function insertCard(card: Pick<Card, 'id' | 'name' | 'number'>): Promise<Card> {
  const { id, name, number } = card
  const { data, error } = await supabase.from('loyalty_cards').insert({ id, name, number }).select(CARD_COLUMNS).single()
  fail(error)
  return data as Card
}

export async function updateCard(id: string, patch: Partial<Pick<Card, 'name' | 'number'>>): Promise<void> {
  const { error } = await supabase.from('loyalty_cards').update(patch).eq('id', id)
  fail(error)
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase.from('loyalty_cards').delete().eq('id', id)
  fail(error)
}
