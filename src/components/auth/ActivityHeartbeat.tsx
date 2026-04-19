'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000

export function ActivityHeartbeat() {
  const lastSentAtRef = useRef(0)

  useEffect(() => {
    const supabase = createClient()
    let isDisposed = false

    async function sendHeartbeat(force = false) {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden' && !force) {
        return
      }

      const now = Date.now()
      if (!force && now - lastSentAtRef.current < HEARTBEAT_INTERVAL_MS) {
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || isDisposed) return

      lastSentAtRef.current = now

      await supabase
        .from('profiles')
        .update({ last_active_at: new Date(now).toISOString() })
        .eq('id', user.id)
    }

    function handleActivity() {
      void sendHeartbeat()
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        void sendHeartbeat(true)
      }
    }

    void sendHeartbeat(true)

    window.addEventListener('focus', handleActivity)
    window.addEventListener('click', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('touchstart', handleActivity)
    document.addEventListener('visibilitychange', handleVisibility)

    const intervalId = window.setInterval(() => {
      void sendHeartbeat()
    }, HEARTBEAT_INTERVAL_MS)

    return () => {
      isDisposed = true
      window.removeEventListener('focus', handleActivity)
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.clearInterval(intervalId)
    }
  }, [])

  return null
}
