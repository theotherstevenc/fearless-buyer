import { randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline/promises'

import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const PROJECT_ID = 'demo-fearless-buyer'
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
const app = initializeApp({ projectId: PROJECT_ID })
const auth = getAuth(app)
const db = getFirestore(app)
const prompt = createInterface({ input: process.stdin, output: process.stdout })

try {
  const household = db.doc('households/home')
  if ((await household.get()).exists) {
    console.log('Local household already exists. Existing users, catalog, and shopping list were preserved.')
  } else {
    console.log('Local emulator setup only. No production project is accessed.')
    const accounts: { uid: string; email: string; password: string }[] = []
    for (const [index, uid] of ['local-buyer-one', 'local-buyer-two'].entries()) {
      const email = `buyer${index + 1}@example.test`
      const password = randomBytes(15).toString('base64url')
      try {
        await auth.getUser(uid)
        await auth.updateUser(uid, { email, password })
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'auth/user-not-found') {
          await auth.createUser({ uid, email, password })
        } else {
          throw error
        }
      }
      accounts.push({ uid, email, password })
    }
    const batch = db.batch()
    batch.set(household, { memberUids: accounts.map((account) => account.uid) })
    batch.set(household.collection('shoppingLists').doc('active'), { items: {} })
    batch.set(household.collection('metadata').doc('ordering'), { revision: 0 })
    await batch.commit()
    console.log('Created an empty local household. Local-only login credentials:')
    for (const account of accounts) console.log(`${account.email}  ${account.password}`)
    console.log(
      'Passwords are generated and never saved to source files. Keep this terminal output for local login.',
    )
    if (process.stdin.isTTY) {
      await prompt.question('Press Enter when you have noted the local credentials. ')
    }
  }
} catch (error) {
  console.error('Local setup failed. Start npm run dev (or npm run emulators) first.', error)
  process.exitCode = 1
} finally {
  prompt.close()
}
