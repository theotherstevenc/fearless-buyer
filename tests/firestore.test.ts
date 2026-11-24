import { readFile } from 'node:fs/promises'

import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  FieldPath,
  writeBatch,
} from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { changeSelection } from '../client/src/lib/groceries'
import { activeListSchema } from '../client/src/schemas/models'

let env: RulesTestEnvironment
let one: Firestore
let two: Firestore
let services: typeof import('../client/src/services/groceries')
const path = 'households/home'

vi.mock('../client/src/lib/firebase', () => ({ db: one, householdId: 'home' }))

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-fearless-buyer-tests',
    firestore: { rules: await readFile('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
  one = env.authenticatedContext('buyer-one').firestore()
  two = env.authenticatedContext('buyer-two').firestore()
  services = await import('../client/src/services/groceries')
})

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    const batch = writeBatch(db)
    batch.set(doc(db, path), { memberUids: ['buyer-one', 'buyer-two'] })
    batch.set(doc(db, `${path}/sections/produce`), { name: 'Produce', sortOrder: 0, itemCount: 2 })
    batch.set(doc(db, `${path}/sections/frozen`), { name: 'Frozen', sortOrder: 1, itemCount: 0 })
    batch.set(doc(db, `${path}/catalog/lemons`), { name: 'Lemons', sectionId: 'produce', sortOrder: 0 })
    batch.set(doc(db, `${path}/catalog/apples`), { name: 'Apples', sectionId: 'produce', sortOrder: 1 })
    batch.set(doc(db, `${path}/shoppingLists/active`), { items: {} })
    batch.set(doc(db, `${path}/metadata/ordering`), { revision: 0 })
    await batch.commit()
  })
})

afterAll(async () => {
  await env?.cleanup()
})

describe('household access', () => {
  it('allows both approved members and denies signed-out and unrelated accounts', async () => {
    await assertSucceeds(getDocs(collection(one, `${path}/catalog`)))
    await assertSucceeds(getDocs(collection(two, `${path}/catalog`)))
    for (const db of [
      env.unauthenticatedContext().firestore(),
      env.authenticatedContext('outsider').firestore(),
    ]) {
      await assertFails(getDoc(doc(db, path)))
      await assertFails(getDocs(collection(db, `${path}/catalog`)))
      await assertFails(setDoc(doc(db, `${path}/shoppingLists/active`), { items: {} }))
    }
  })
  it('denies membership changes, uncoordinated catalog deletion, and unrecognized paths', async () => {
    await assertFails(updateDoc(doc(one, path), { memberUids: ['buyer-one', 'outsider'] }))
    await assertFails(deleteDoc(doc(one, `${path}/catalog/lemons`)))
    await assertFails(setDoc(doc(one, `${path}/other/doc`), { value: 1 }))
  })
})

describe('active-list validation', () => {
  it('accepts selection, quantity, completion, removal and an atomic empty reset', async () => {
    const list = doc(one, `${path}/shoppingLists/active`)
    await assertSucceeds(
      setDoc(list, { items: { lemons: { quantity: 1, completed: false } }, changedItemId: 'lemons' }),
    )
    await assertSucceeds(updateDoc(list, { 'items.lemons.quantity': 3 }))
    await assertSucceeds(updateDoc(list, { 'items.lemons.completed': true }))
    await assertSucceeds(
      updateDoc(list, { 'items.apples': { quantity: 1, completed: false }, changedItemId: 'apples' }),
    )
    await assertSucceeds(
      setDoc(list, { items: { apples: { quantity: 1, completed: false } }, changedItemId: 'lemons' }),
    )
    await assertSucceeds(setDoc(list, { items: {} }))
  })
  it.each([0, -1, 1.5, '2'])('denies invalid quantities %s', async (quantity) => {
    await assertFails(
      setDoc(doc(one, `${path}/shoppingLists/active`), {
        items: { lemons: { quantity, completed: false } },
        changedItemId: 'lemons',
      }),
    )
  })
  it('denies unknown products, extra fields, and invalid completion types', async () => {
    const list = doc(one, `${path}/shoppingLists/active`)
    await assertFails(
      setDoc(list, { items: { missing: { quantity: 1, completed: false } }, changedItemId: 'missing' }),
    )
    await assertFails(
      setDoc(list, { items: { lemons: { quantity: 1, completed: 'yes' } }, changedItemId: 'lemons' }),
    )
    await assertFails(
      setDoc(list, {
        items: { lemons: { quantity: 1, completed: false, secret: 1 } },
        changedItemId: 'lemons',
      }),
    )
    await assertFails(setDoc(list, { items: {}, owner: 'outsider' }))
    await assertFails(
      setDoc(list, {
        items: { lemons: { quantity: 1, completed: false }, apples: { quantity: 1, completed: false } },
        changedItemId: 'lemons',
      }),
    )
  })
})

describe('catalog and section integrity', () => {
  it('deletes an unselected grocery through the actual service and preserves unrelated data', async () => {
    await services.deleteCatalogItem('lemons', 0)

    expect((await getDoc(doc(one, `${path}/catalog/lemons`))).exists()).toBe(false)
    expect((await getDoc(doc(one, `${path}/catalog/apples`))).exists()).toBe(true)
    expect((await getDoc(doc(one, `${path}/sections/produce`))).data()?.itemCount).toBe(1)
    expect((await getDoc(doc(one, `${path}/metadata/ordering`))).data()?.revision).toBe(1)
    expect((await getDoc(doc(one, `${path}/shoppingLists/active`))).data()?.items).toEqual({})
  })
  it("atomically removes a selected grocery and preserves the other member's list edit", async () => {
    await services.updateSelection('lemons', { type: 'select' })
    await services.updateSelection('apples', { type: 'select' })
    const list = doc(two, `${path}/shoppingLists/active`)
    await Promise.all([
      services.deleteCatalogItem('lemons', 0),
      runTransaction(two, async (transaction) => {
        await transaction.get(list)
        transaction.update(list, 'items.apples.completed', true, 'changedItemId', 'apples')
      }),
    ])

    expect((await getDoc(doc(two, `${path}/catalog/lemons`))).exists()).toBe(false)
    expect((await getDoc(list)).data()?.items).toEqual({ apples: { quantity: 1, completed: true } })
    expect((await getDoc(doc(two, `${path}/sections/produce`))).data()?.itemCount).toBe(1)
  })
  it('serializes deletion against selection without leaving an orphaned list entry', async () => {
    const results = await Promise.allSettled([
      services.deleteCatalogItem('lemons', 0),
      services.updateSelection('lemons', { type: 'select' }),
    ])

    expect(results[0].status).toBe('fulfilled')
    expect((await getDoc(doc(one, `${path}/catalog/lemons`))).exists()).toBe(false)
    expect((await getDoc(doc(one, `${path}/shoppingLists/active`))).data()?.items).toEqual({})
    expect((await getDoc(doc(one, `${path}/sections/produce`))).data()?.itemCount).toBe(1)
  })
  it('rejects a stale deletion without altering the catalog or section count', async () => {
    await updateDoc(doc(two, `${path}/metadata/ordering`), { revision: 1 })
    await expect(services.deleteCatalogItem('lemons', 0)).rejects.toThrow('Catalog changed')

    expect((await getDoc(doc(one, `${path}/catalog/lemons`))).exists()).toBe(true)
    expect((await getDoc(doc(one, `${path}/sections/produce`))).data()?.itemCount).toBe(2)
  })
  it('denies deletion that leaves a selected item orphaned', async () => {
    await services.updateSelection('lemons', { type: 'select' })
    const batch = writeBatch(one)
    batch.delete(doc(one, `${path}/catalog/lemons`))
    batch.update(doc(one, `${path}/sections/produce`), { itemCount: 1, lastItemId: 'lemons' })

    await assertFails(batch.commit())
    expect((await getDoc(doc(one, `${path}/catalog/lemons`))).exists()).toBe(true)
  })
  it('denies a fully coordinated deletion by an unrelated account', async () => {
    const db = env.authenticatedContext('outsider').firestore()
    const batch = writeBatch(db)
    batch.delete(doc(db, `${path}/catalog/lemons`))
    batch.update(doc(db, `${path}/sections/produce`), { itemCount: 1, lastItemId: 'lemons' })
    batch.update(doc(db, `${path}/shoppingLists/active`), {
      'items.lemons': deleteField(),
      changedItemId: 'lemons',
    })
    await assertFails(batch.commit())
  })
  it('appends products only with an atomic section reference-count update', async () => {
    const batch = writeBatch(one)
    batch.set(doc(one, `${path}/catalog/pears`), { name: 'Pears', sectionId: 'produce', sortOrder: 2 })
    batch.update(doc(one, `${path}/sections/produce`), { itemCount: 3, lastItemId: 'pears' })
    await assertSucceeds(batch.commit())
    await assertFails(deleteDoc(doc(one, `${path}/sections/produce`)))
    await assertSucceeds(deleteDoc(doc(one, `${path}/sections/frozen`)))
  })
  it('moves products between sections while updating both counts', async () => {
    const batch = writeBatch(one)
    batch.update(doc(one, `${path}/catalog/lemons`), { sectionId: 'frozen', sortOrder: 0 })
    batch.update(doc(one, `${path}/sections/produce`), { itemCount: 1, lastItemId: 'lemons' })
    batch.update(doc(one, `${path}/sections/frozen`), { itemCount: 1, lastItemId: 'lemons' })
    await assertSucceeds(batch.commit())
    expect((await getDoc(doc(one, `${path}/sections/produce`))).data()?.itemCount).toBe(1)
  })
  it('denies missing sections, forged counts, empty names and invalid order', async () => {
    await assertFails(
      setDoc(doc(one, `${path}/catalog/new`), { name: 'New', sectionId: 'missing', sortOrder: 0 }),
    )
    await assertFails(updateDoc(doc(one, `${path}/sections/produce`), { itemCount: 0, lastItemId: 'lemons' }))
    await assertFails(updateDoc(doc(one, `${path}/catalog/lemons`), { name: '   ' }))
    await assertFails(updateDoc(doc(one, `${path}/catalog/lemons`), { sortOrder: -1 }))
  })
})

describe('two-session synchronization', () => {
  const mutate = async (db: Firestore, id: string, action: Parameters<typeof changeSelection>[2]) => {
    const ref = doc(db, `${path}/shoppingLists/active`)
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref)
      const updated = changeSelection(activeListSchema.parse(snapshot.data()), id, action)
      transaction.update(
        ref,
        new FieldPath('items', id),
        updated.items[id] ?? deleteField(),
        'changedItemId',
        id,
      )
    })
  }
  it('preserves independent simultaneous edits and deduplicates selection', async () => {
    await Promise.all([mutate(one, 'lemons', { type: 'select' }), mutate(two, 'apples', { type: 'select' })])
    await Promise.all([
      mutate(one, 'lemons', { type: 'quantity', quantity: 3 }),
      mutate(two, 'apples', { type: 'complete', completed: true }),
    ])
    await Promise.all([mutate(one, 'lemons', { type: 'select' }), mutate(two, 'lemons', { type: 'select' })])
    expect((await getDoc(doc(one, `${path}/shoppingLists/active`))).data()).toEqual({
      items: { lemons: { quantity: 3, completed: false }, apples: { quantity: 1, completed: true } },
      changedItemId: 'lemons',
    })
  })
  it('notifies the other session of a confirmed update', async () => {
    const received = new Promise<void>((resolve, reject) => {
      const unsubscribe = onSnapshot(
        doc(two, `${path}/shoppingLists/active`),
        (snapshot) => {
          if (snapshot.data()?.items?.lemons && !snapshot.metadata.fromCache) {
            unsubscribe()
            resolve()
          }
        },
        reject,
      )
    })
    await mutate(one, 'lemons', { type: 'select' })
    await received
  })
  it('serializes reset against concurrent edits without leaving a partial list', async () => {
    await mutate(one, 'lemons', { type: 'select' })
    const ref = doc(two, `${path}/shoppingLists/active`)
    const results = await Promise.allSettled([
      runTransaction(two, async (transaction) => {
        await transaction.get(ref)
        transaction.set(ref, { items: {} })
      }),
      mutate(one, 'lemons', { type: 'quantity', quantity: 4 }),
    ])
    expect(results[0].status).toBe('fulfilled')
    expect((await getDoc(ref)).data()).toEqual({ items: {} })
  })
})
