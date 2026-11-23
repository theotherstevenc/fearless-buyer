import { useContext } from 'react'

import { authContext } from './authContextValue'
import type { AuthContextValue } from './authContextValue'

export const useAuth = (): AuthContextValue => {
  const value = useContext(authContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider.')
  return value
}
