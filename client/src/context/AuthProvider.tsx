import { onAuthStateChanged } from 'firebase/auth'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { auth } from '../lib/firebase'
import { authContext } from './authContextValue'
import type { AuthContextValue } from './authContextValue'

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [state, setState] = useState<AuthContextValue>({ user: null, isLoading: true, error: null })
  useEffect(
    () =>
      onAuthStateChanged(
        auth,
        (user) => setState({ user, isLoading: false, error: null }),
        (error) => {
          console.error('Authentication listener failed', error)
          setState({
            user: null,
            isLoading: false,
            error: 'Could not check your login. Reload to try again.',
          })
        },
      ),
    [],
  )
  return <authContext.Provider value={state}>{children}</authContext.Provider>
}
