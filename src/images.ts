import { useEffect, useState } from 'react'
import { signImages } from './api'

export type ImageKind = 'logo' | 'photo'

/** Modification des images d'une carte : undefined = inchangée, null = retirée, Blob = nouvelle image. */
export type CardImages = { logo?: Blob | null; photo?: Blob | null }

const MAX_SIDE: Record<ImageKind, number> = { logo: 256, photo: 1400 }

/** Réduit l'image dans le navigateur avant l'envoi (une photo de téléphone pèse plusieurs Mo). */
export async function prepareImage(file: File, kind: ImageKind): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    if (!img.naturalWidth || !img.naturalHeight) throw new Error('image vide')
    const scale = Math.min(1, MAX_SIDE[kind] / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.max(1, Math.round(img.naturalWidth * scale))
    const height = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas indisponible')
    // Un logo détouré (PNG, WebP…) garde sa transparence ; le reste part en JPEG sur fond blanc.
    const type = kind === 'logo' && file.type !== 'image/jpeg' ? 'image/png' : 'image/jpeg'
    if (type === 'image/jpeg') {
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, width, height)
    }
    ctx.drawImage(img, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encodage impossible'))), type, 0.85),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Nom de fichier unique : une image remplacée ne reste pas en cache sous l'ancien nom. */
export function imagePath(cardId: string, kind: ImageKind, blob: Blob): string {
  return `${cardId}/${kind}-${Date.now().toString(36)}.${blob.type === 'image/png' ? 'png' : 'jpg'}`
}

const local = new Map<string, string>() // chemin -> adresse blob: d'une image qui vient d'être choisie
const signed = new Map<string, { url: string; until: number }>() // chemin -> adresse temporaire du bucket privé
const KEEP_MS = 50 * 60 * 1000 // les adresses signées valent 1 h : on les renouvelle avant

/** Affiche tout de suite l'image choisie, sans attendre l'envoi ni la signature. */
export function rememberLocal(path: string, blob: Blob): void {
  local.set(path, URL.createObjectURL(blob))
}

/** Renvoie une fonction chemin -> adresse affichable (undefined tant que l'adresse n'est pas arrivée). */
export function useImageUrls(paths: (string | null | undefined)[]): (path: string | null | undefined) => string | undefined {
  const [, setTick] = useState(0)
  const key = [...new Set(paths.filter((p): p is string => !!p))].sort().join('|')

  useEffect(() => {
    let alive = true
    const load = () => {
      if (!key) return
      const now = Date.now()
      const need = key.split('|').filter((p) => !local.has(p) && (signed.get(p)?.until ?? 0) <= now)
      if (need.length === 0) return
      signImages(need)
        .then((urls) => {
          urls.forEach((url, p) => signed.set(p, { url, until: now + KEEP_MS }))
          if (alive) setTick((t) => t + 1)
        })
        .catch(() => {
          /* les images manquent, le reste de l'écran fonctionne */
        })
    }
    load()
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [key])

  return (path) => (path ? (local.get(path) ?? signed.get(path)?.url) : undefined)
}
