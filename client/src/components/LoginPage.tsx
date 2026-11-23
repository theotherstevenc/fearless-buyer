import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth'
import { ShoppingBasket } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'

import { auth } from '../lib/firebase'

export const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    setIsBusy(true)
    setError('')
    setNotice('')
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (error) {
      console.error('Login failed', error)
      setError('Could not sign in. Check your email and password, or try again when connected.')
    } finally {
      setIsBusy(false)
    }
  }
  const handleReset = async () => {
    if (!email.trim()) {
      setError('Enter your email address first.')
      return
    }
    setIsBusy(true)
    setError('')
    setNotice('')
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setNotice('If an account matches, a password reset email will arrive shortly.')
    } catch (error) {
      console.error('Password reset failed', error)
      setError('Could not request a password reset. Check your email and connection, then try again.')
    } finally {
      setIsBusy(false)
    }
  }
  return (
    <main className="login-shell">
      <div className="brand-mark">
        <ShoppingBasket size={28} aria-hidden="true" />
      </div>
      <h1 className="text-3xl font-semibold">Fearless Buyer</h1>
      <p className="text-muted mt-2 mb-8">Your shared groceries. Your store order.</p>
      <form onSubmit={handleLogin} className="panel space-y-5">
        <h2 className="text-lg font-semibold">Welcome back</h2>
        <p className="text-muted text-sm">Sign in with your household account.</p>
        <label className="field">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="field">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        <button className="button-primary w-full" disabled={isBusy} type="submit">
          {isBusy ? 'Please wait...' : 'Sign in'}
        </button>
        <button className="button-quiet w-full" disabled={isBusy} type="button" onClick={handleReset}>
          Forgot password?
        </button>
      </form>
      <p className="text-muted mt-5 text-sm">Private to your household. No public registration.</p>
    </main>
  )
}
