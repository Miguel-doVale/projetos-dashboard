import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Access } from '@/lib/types'

interface AuthState {
  loading: boolean
  email: string | null
  access: Access
  signIn(email: string, password: string): Promise<string | null>
  signOut(): Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [access, setAccess] = useState<Access>('none')
  const [accessFor, setAccessFor] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setSessionReady(true)
      })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setSessionReady(true)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id ?? null

  useEffect(() => {
    if (!userId) return
    let active = true
    const settle = (next: Access) => {
      if (!active) return
      setAccess(next)
      setAccessFor(userId)
    }
    Promise.resolve(supabase.rpc('current_access')).then(
      ({ data, error }) => settle(!error && (data === 'owner' || data === 'member') ? data : 'none'),
      () => settle('none'),
    )
    return () => {
      active = false
    }
  }, [userId])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (!error) return null
      if (error.code === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) {
        return 'E-mail ou senha incorretos.'
      }
    } catch {
      // cai na mensagem genérica
    }
    return 'Não foi possível entrar. Tente de novo.'
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      loading: !sessionReady || (userId !== null && accessFor !== userId),
      email: session?.user.email ?? null,
      access: userId ? access : 'none',
      signIn,
      signOut,
    }),
    [sessionReady, userId, accessFor, session, access, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.')
  return ctx
}
