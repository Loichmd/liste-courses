import { useCallback, useEffect, useRef, useState } from 'react'
import type { ShowToast } from './useToast'

/** Liste lue en base, modifiée en local tout de suite ; en cas d'erreur d'écriture, on recharge l'état réel. */
export function useRemoteList<T>(fetcher: () => Promise<T[]>, showToast: ShowToast) {
  const [rows, setRows] = useState<T[]>([])
  const [ready, setReady] = useState(false)
  const pending = useRef(0)

  const load = useCallback(async () => {
    try {
      setRows(await fetcher())
    } catch {
      showToast({ text: 'Connexion impossible. Vérifiez le réseau.' })
    } finally {
      setReady(true)
    }
  }, [fetcher, showToast])

  useEffect(() => {
    void load()
    const onVisible = () => {
      if (document.visibilityState === 'visible' && pending.current === 0) void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const sync = useCallback(
    async (op: () => Promise<unknown>) => {
      pending.current++
      try {
        await op()
      } catch (e) {
        if ((e as { code?: string }).code !== '23505') showToast({ text: "L'action n'a pas pu être enregistrée." })
        pending.current--
        await load()
        return
      }
      pending.current--
    },
    [load, showToast],
  )

  return { rows, setRows, ready, sync }
}
