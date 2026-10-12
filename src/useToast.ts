import { useCallback, useRef, useState } from 'react'

export type Toast = { text: string; action?: { label: string; run: () => void } }
export type ShowToast = (toast: Toast | null) => void

/** Message temporaire en bas d'écran (erreurs, « Annuler » après une suppression). */
export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number>()

  const show: ShowToast = useCallback((t) => {
    window.clearTimeout(timer.current)
    setToast(t)
    if (t) timer.current = window.setTimeout(() => setToast(null), 6000)
  }, [])

  return { toast, show }
}
