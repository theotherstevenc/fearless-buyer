import { createContext } from 'react'
import type { User } from 'firebase/auth'

export interface AuthContextValue {
  user: User | null
  isLoading: boolean
  error: string | null
}

export const authContext = createContext<AuthContextValue | undefined>(undefined)
