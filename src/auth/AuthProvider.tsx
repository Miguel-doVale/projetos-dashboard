import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { Access } from '@/lib/types'

interface AuthState {
  loading: boolean
  email: string | null
  access: Access
  /** A leitura de `members/{uid}` falhou (rede, início lento): o acesso é desconhecido, não negado. */
  accessError: boolean
  retryAccess(): void
  signIn(email: string, password: string): Promise<string | null>
  signOut(): Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

const WRONG_CREDENTIALS = new Set([
  'auth/invalid-credential',
  'auth/wrong-password',
  'auth/user-not-found',
  'auth/invalid-email',
])

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [access, setAccess] = useState<Access>('none')
  const [accessFor, setAccessFor] = useState<string | null>(null)
  const [accessError, setAccessError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (next) => {
        setUser(next)
        setSessionReady(true)
      },
      () => {
        setUser(null)
        setSessionReady(true)
      },
    )
    return unsubscribe
  }, [])

  const uid = user?.uid ?? null

  useEffect(() => {
    if (!uid) {
      // Ao sair, o nível guardado é descartado.
      setAccess('none')
      setAccessFor(null)
      setAccessError(false)
      return
    }
    let active = true
    const settle = (next: Access) => {
      if (!active) return
      setAccess(next)
      setAccessError(false)
      setAccessFor(uid)
    }
    const fail = () => {
      if (!active) return
      setAccess('none')
      setAccessError(true)
      setAccessFor(uid)
    }
    if (uid === import.meta.env.VITE_OWNER_UID) {
      settle('owner')
    } else {
      getDoc(doc(db, 'members', uid)).then(
        (snap) => settle(snap.exists() ? 'member' : 'none'),
        (error) => {
          const code = (error as { code?: string } | null)?.code
          // Sem permissão para ler o próprio documento = não é membro. Qualquer outro erro é incerteza.
          if (code === 'permission-denied' || code === 'firestore/permission-denied') settle('none')
          else fail()
        },
      )
    }
    return () => {
      active = false
    }
  }, [uid, attempt])

  const retryAccess = useCallback(() => {
    setAccessError(false)
    setAccessFor(null)
    setAttempt((n) => n + 1)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return null
    } catch (error) {
      const code = (error as { code?: string } | null)?.code ?? ''
      if (WRONG_CREDENTIALS.has(code)) return 'E-mail ou senha incorretos.'
      if (code === 'auth/too-many-requests') return 'Muitas tentativas. Tente de novo em alguns minutos.'
    }
    return 'Não foi possível entrar. Tente de novo.'
  }, [])

  const signOut = useCallback(async () => {
    await fbSignOut(auth)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      loading: !sessionReady || (uid !== null && accessFor !== uid),
      email: user?.email ?? null,
      access: uid ? access : 'none',
      accessError: uid ? accessError : false,
      retryAccess,
      signIn,
      signOut,
    }),
    [sessionReady, uid, accessFor, user, access, accessError, retryAccess, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.')
  return ctx
}
