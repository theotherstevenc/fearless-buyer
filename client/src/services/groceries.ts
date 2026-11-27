import {
  collection,
  deleteField,
  doc,
  FieldPath,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'

import { changeSelection, EMPTY_LIST } from '../lib/groceries'
import { db, householdId } from '../lib/firebase'
import {
  activeListSchema,
  catalogItemSchema,
  nameSchema,
  orderingSchema,
  sectionSchema,
  selectionSchema,
} from '../schemas/models'
import type { ActiveList, CatalogItem, Section } from '../schemas/models'

export const householdRef = doc(db, 'households', householdId)
export const sectionsRef = collection(householdRef, 'sections')
export const catalogRef = collection(householdRef, 'catalog')
export const listRef = doc(householdRef, 'shoppingLists', 'active')
export const orderRef = doc(householdRef, 'metadata', 'ordering')

type ListAction = Parameters<typeof changeSelection>[2]

// A plain write (not a transaction) so Firestore shows the change on this device immediately and
// syncs it in the background, including while offline. Only the one item's entry is written, and
// the security rules still validate it on the server; if they reject it, Firestore rolls it back.
export const updateSelection = async (
  list: ActiveList,
  itemId: string,
  action: ListAction,
): Promise<void> => {
  if (action.type === 'quantity') selectionSchema.shape.quantity.parse(action.quantity)
  const updated = changeSelection(list, itemId, action)
  await updateDoc(
    listRef,
    new FieldPath('items', itemId),
    updated.items[itemId] ?? deleteField(),
    'changedItemId',
    itemId,
  )
}

export const resetList = async (): Promise<void> => {
  await runTransaction(db, async (transaction) => {
    await transaction.get(listRef)
    transaction.set(listRef, EMPTY_LIST)
  })
}

const readRevision = (data: unknown): number => orderingSchema.parse(data).revision

export const saveSection = async (
  name: string,
  sections: Section[],
  expectedRevision: number,
  existing?: Section,
): Promise<void> => {
  const cleanName = nameSchema.parse(name)
  await runTransaction(db, async (transaction) => {
    const order = await transaction.get(orderRef)
    const revision = order.exists() ? readRevision(order.data()) : 0
    if (revision !== expectedRevision)
      throw new Error('Store layout changed. Please try again with the latest order.')
    const ref = existing ? doc(sectionsRef, existing.id) : doc(sectionsRef)
    const current = existing ? await transaction.get(ref) : null
    if (existing && !current?.exists()) throw new Error('This section no longer exists.')
    const stored = current?.exists() ? sectionSchema.parse(current.data()) : null
    const sortOrder = stored?.sortOrder ?? Math.max(-1, ...sections.map((section) => section.sortOrder)) + 1
    transaction.set(ref, {
      ...sectionSchema.parse({ name: cleanName, sortOrder, itemCount: stored?.itemCount ?? 0 }),
      updatedAt: serverTimestamp(),
    })
    transaction.set(orderRef, { revision: revision + 1 })
  })
}

export const saveCatalogItem = async (
  name: string,
  sectionId: string,
  catalog: CatalogItem[],
  expectedRevision: number,
  existing?: CatalogItem,
): Promise<void> => {
  await runTransaction(db, async (transaction) => {
    const order = await transaction.get(orderRef)
    const revision = order.exists() ? readRevision(order.data()) : 0
    if (revision !== expectedRevision)
      throw new Error('Catalog changed. Please try again with the latest order.')
    const ref = existing ? doc(catalogRef, existing.id) : doc(catalogRef)
    const current = existing ? await transaction.get(ref) : null
    if (existing && !current?.exists()) throw new Error('This item no longer exists.')
    const stored = current?.exists() ? catalogItemSchema.parse(current.data()) : null
    const section = await transaction.get(doc(sectionsRef, sectionId))
    if (!section.exists()) throw new Error('Choose an existing store section.')
    const oldSectionRef = stored && stored.sectionId !== sectionId ? doc(sectionsRef, stored.sectionId) : null
    const oldSection = oldSectionRef ? await transaction.get(oldSectionRef) : null
    const sortOrder =
      stored?.sectionId === sectionId
        ? stored.sortOrder
        : Math.max(
            -1,
            ...catalog.filter((item) => item.sectionId === sectionId).map((item) => item.sortOrder),
          ) + 1
    const item = catalogItemSchema.parse({ name, sectionId, sortOrder })
    if (!stored || stored.sectionId !== sectionId) {
      transaction.update(section.ref, {
        itemCount: sectionSchema.parse(section.data()).itemCount + 1,
        lastItemId: ref.id,
      })
      if (oldSectionRef && oldSection?.exists()) {
        transaction.update(oldSectionRef, {
          itemCount: sectionSchema.parse(oldSection.data()).itemCount - 1,
          lastItemId: ref.id,
        })
      }
    }
    transaction.set(ref, { ...item, updatedAt: serverTimestamp() })
    transaction.set(orderRef, { revision: revision + 1 })
  })
}

export const reorder = async (
  kind: 'sections' | 'catalog',
  orderedIds: string[],
  expectedRevision: number,
): Promise<void> => {
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(orderRef)
    const revision = snapshot.exists() ? readRevision(snapshot.data()) : 0
    if (revision !== expectedRevision)
      throw new Error('Store layout changed. Please try again with the latest order.')
    const refs = orderedIds.map((id) => doc(kind === 'sections' ? sectionsRef : catalogRef, id))
    const rows = await Promise.all(refs.map((ref) => transaction.get(ref)))
    if (rows.some((row) => !row.exists()))
      throw new Error('An item changed. Reload the store layout and try again.')
    refs.forEach((ref, index) => transaction.update(ref, { sortOrder: index, updatedAt: serverTimestamp() }))
    transaction.set(orderRef, { revision: revision + 1 })
  })
}

export const removeEmptySection = async (section: Section, expectedRevision: number): Promise<void> => {
  await runTransaction(db, async (transaction) => {
    const order = await transaction.get(orderRef)
    const current = await transaction.get(doc(sectionsRef, section.id))
    const revision = order.exists() ? readRevision(order.data()) : 0
    if (revision !== expectedRevision)
      throw new Error('Store layout changed. Try again with the latest order.')
    if (!current.exists()) throw new Error('This section was already removed.')
    if (sectionSchema.parse(current.data()).itemCount !== 0) {
      throw new Error('Move the items in this section to another section before removing it.')
    }
    transaction.delete(current.ref)
    transaction.set(orderRef, { revision: revision + 1 })
  })
}

export const deleteCatalogItem = async (itemId: string, expectedRevision: number): Promise<void> => {
  await runTransaction(db, async (transaction) => {
    const order = await transaction.get(orderRef)
    const current = await transaction.get(doc(catalogRef, itemId))
    const list = await transaction.get(listRef)
    const revision = order.exists() ? readRevision(order.data()) : 0
    if (revision !== expectedRevision)
      throw new Error('Catalog changed. Please try again with the latest items.')
    if (!current.exists()) throw new Error('This item was already deleted.')
    if (!list.exists()) throw new Error('Household setup is incomplete. Create the active list first.')
    const item = catalogItemSchema.parse(current.data())
    const section = await transaction.get(doc(sectionsRef, item.sectionId))
    if (!section.exists()) throw new Error("This item's store section no longer exists.")
    const storedSection = sectionSchema.parse(section.data())
    if (storedSection.itemCount === 0)
      throw new Error('The store section count is inconsistent. Please retry.')
    activeListSchema.parse(list.data())
    transaction.delete(current.ref)
    transaction.update(section.ref, { itemCount: storedSection.itemCount - 1, lastItemId: itemId })
    // Include removal even when unselected, so a concurrent selection cannot leave an orphan.
    transaction.update(listRef, new FieldPath('items', itemId), deleteField(), 'changedItemId', itemId)
    transaction.set(orderRef, { revision: revision + 1 })
  })
}
