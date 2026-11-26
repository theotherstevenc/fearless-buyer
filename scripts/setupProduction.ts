import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'
import { parseArgs } from 'node:util'

import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { z } from 'zod'

import { nameSchema } from '../client/src/schemas/models'

const SEED_PATH = new URL('../data/catalogSeed.json', import.meta.url)
const MAX_BATCH_WRITES = 500
const USAGE = `Usage:
  npm run setup:production -- --project <firebase-project-id> --member <email> --member <email> [--household home] [--seed]`

const seedSchema = z.strictObject({
  version: z.literal(1),
  sections: z.array(z.strictObject({ name: nameSchema, items: z.array(nameSchema) })).min(1),
})

interface Member {
  uid: string
  email: string
  isNew: boolean
}

class SetupError extends Error {}

const fail = (message: string): never => {
  throw new SetupError(message)
}

const parseOptions = () => {
  try {
    return parseArgs({
      options: {
        project: { type: 'string' },
        household: { type: 'string', default: 'home' },
        member: { type: 'string', multiple: true, default: [] },
        seed: { type: 'boolean', default: false },
      },
    }).values
  } catch (error) {
    return fail(`${error instanceof Error ? error.message : error}\n${USAGE}`)
  }
}

const readOptions = (): { projectId: string; householdId: string; emails: string[]; shouldSeed: boolean } => {
  const values = parseOptions()
  const projectId = values.project?.trim() || fail(`Missing --project.\n${USAGE}`)
  const householdId = values.household.trim()
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(householdId)) fail('Use letters, numbers, - or _ for --household.')
  const emails = values.member.map((email) => z.email().parse(email.trim().toLowerCase()))
  if (emails.length !== 2 || emails[0] === emails[1])
    fail(`Provide exactly two different --member emails.\n${USAGE}`)
  return { projectId, householdId, emails, shouldSeed: values.seed }
}

// Rehearsals run against emulators with a demo- project; real runs must never use either.
const checkTarget = (projectId: string): boolean => {
  const authEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST
  const firestoreEmulator = process.env.FIRESTORE_EMULATOR_HOST
  if (Boolean(authEmulator) !== Boolean(firestoreEmulator)) {
    fail('Set both FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST, or neither.')
  }
  const isRehearsal = Boolean(authEmulator)
  if (isRehearsal && !projectId.startsWith('demo-')) fail('Emulator rehearsals must use a demo- project ID.')
  if (!isRehearsal && projectId.startsWith('demo-'))
    fail('demo- projects are local only. Use the real project ID.')
  return isRehearsal
}

const readSeed = async (): Promise<z.infer<typeof seedSchema>> =>
  seedSchema.parse(JSON.parse(await readFile(SEED_PATH, 'utf8')))

const findOrCreateMember = async (auth: ReturnType<typeof getAuth>, email: string): Promise<Member> => {
  try {
    const user = await auth.getUserByEmail(email)
    return { uid: user.uid, email, isNew: false }
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'auth/user-not-found')) throw error
  }
  // No password is set; the member chooses one through the reset link.
  const user = await auth.createUser({ email, emailVerified: false })
  return { uid: user.uid, email, isNew: true }
}

const confirm = async (question: string): Promise<string> => {
  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return await prompt.question(question)
  } finally {
    prompt.close()
  }
}

try {
  const { projectId, householdId, emails, shouldSeed } = readOptions()
  const isRehearsal = checkTarget(projectId)
  const placeholder = emails.find((email) => /@(example\.(com|org|net)|[^@]+\.test)$/.test(email))
  if (!isRehearsal && placeholder)
    fail(`${placeholder} is a placeholder address. Use the real member emails.`)
  const seed = shouldSeed ? await readSeed() : null
  const seedItemCount = seed?.sections.reduce((total, section) => total + section.items.length, 0) ?? 0
  const writeCount = 3 + (seed ? seed.sections.length + seedItemCount : 0)
  if (writeCount > MAX_BATCH_WRITES)
    fail(`The seed needs ${writeCount} writes; one batch allows ${MAX_BATCH_WRITES}.`)

  const app = initializeApp({ projectId })
  const auth = getAuth(app)
  const db = getFirestore(app)
  const household = db.doc(`households/${householdId}`)
  if ((await household.get()).exists) {
    fail(`households/${householdId} already exists in ${projectId}. Nothing was changed.`)
  }

  console.log(isRehearsal ? '\nREHEARSAL against local emulators.' : '\nPRODUCTION setup.')
  console.log(`Project:   ${projectId}`)
  console.log(`Household: households/${householdId}`)
  console.log(`Members:   ${emails.join(', ')} (existing accounts are reused; passwords are never changed)`)
  console.log(
    seed
      ? `Catalog:   ${seed.sections.length} sections and ${seedItemCount} items from data/catalogSeed.json`
      : 'Catalog:   empty',
  )
  const answer = await confirm('\nType the project ID to continue: ')
  if (answer.trim() !== projectId) fail('Confirmation did not match. Nothing was changed.')

  const members: Member[] = []
  for (const email of emails) members.push(await findOrCreateMember(auth, email))
  if (members[0].uid === members[1].uid) fail('Both emails resolved to the same account.')

  const batch = db.batch()
  batch.create(household, { memberUids: members.map((member) => member.uid) })
  batch.create(household.collection('shoppingLists').doc('active'), { items: {} })
  batch.create(household.collection('metadata').doc('ordering'), { revision: 0 })
  seed?.sections.forEach((section, sectionOrder) => {
    const sectionRef = household.collection('sections').doc()
    batch.create(sectionRef, {
      name: section.name,
      sortOrder: sectionOrder,
      itemCount: section.items.length,
      updatedAt: FieldValue.serverTimestamp(),
    })
    section.items.forEach((name, itemOrder) => {
      batch.create(household.collection('catalog').doc(), {
        name,
        sectionId: sectionRef.id,
        sortOrder: itemOrder,
        updatedAt: FieldValue.serverTimestamp(),
      })
    })
  })
  await batch.commit()
  console.log(
    `\nCreated households/${householdId}${seed ? ' with the seed catalog' : ' with an empty catalog'}.`,
  )

  for (const member of members) {
    if (member.isNew) {
      const link = await auth.generatePasswordResetLink(member.email)
      console.log(
        `\n${member.email}: new account. Open this link to choose a password (expires soon):\n${link}`,
      )
    } else {
      console.log(`\n${member.email}: existing account reused. Password unchanged.`)
    }
  }
  console.log('\nShare each link privately with its owner only. Links are not saved anywhere.')
  if (householdId !== 'home')
    console.log(`Set VITE_HOUSEHOLD_ID=${householdId} in client/.env.local before building.`)
} catch (error) {
  if (error instanceof SetupError) {
    console.error(`\nProduction setup stopped. ${error.message}`)
  } else if (error instanceof z.ZodError) {
    console.error(`\nProduction setup stopped.\n${z.prettifyError(error)}`)
  } else {
    console.error('\nProduction setup failed.', error)
    console.error(
      'Check credentials: gcloud auth application-default login (with a quota project), or GOOGLE_APPLICATION_CREDENTIALS.',
    )
  }
  process.exitCode = 1
}
