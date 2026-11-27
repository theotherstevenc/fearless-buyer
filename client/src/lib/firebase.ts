import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const useEmulators = import.meta.env.DEV && (import.meta.env.VITE_USE_FIREBASE_EMULATORS ?? 'true') === 'true'
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? (useEmulators ? 'demo-fearless-buyer' : '')

if (!projectId || (!useEmulators && projectId.startsWith('demo-'))) {
  throw new Error('Configure a real Firebase project before building for production. See README.md.')
}
if (!useEmulators && !import.meta.env.VITE_FIREBASE_API_KEY) {
  throw new Error('Missing Firebase configuration. See client/.env.example.')
}

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'demo-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
  projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? 'demo-app',
})

export const auth = getAuth(app)
// Keep data on the device so the list opens and accepts changes with poor signal in the store.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
export const householdId: string = import.meta.env.VITE_HOUSEHOLD_ID ?? 'home'

if (useEmulators) {
  if (!projectId.startsWith('demo-')) throw new Error('Local emulators require a demo- project ID.')
  // Use the page's host so a phone on the LAN (npm run dev:lan) reaches the emulators on this machine.
  const emulatorHost = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true })
  connectFirestoreEmulator(db, emulatorHost, 8080)
}
