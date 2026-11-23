import { onSnapshot } from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'

import { getErrorMessage } from '../lib/groceries'
import {
  activeListSchema,
  catalogItemSchema,
  householdSchema,
  orderingSchema,
  sectionSchema,
} from '../schemas/models'
import type { HouseholdData } from '../schemas/models'
import { catalogRef, householdRef, listRef, orderRef, sectionsRef } from '../services/groceries'

interface HouseholdResult {
  data: HouseholdData | null
  isLoading: boolean
  isFromCache: boolean
  hasPendingWrites: boolean
  error: string | null
  retry: () => void
}

export const useHousehold = (userId: string): HouseholdResult => {
  const [state, setState] = useState<Omit<HouseholdResult, 'retry'>>({
    data: null,
    isLoading: true,
    isFromCache: true,
    hasPendingWrites: false,
    error: null,
  })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    let disposed = false
    let failed = false
    const ready = new Set<string>()
    const cached = new Map<string, boolean>()
    const pending = new Map<string, boolean>()
    const data: HouseholdData = { sections: [], catalog: [], list: { items: {} }, revision: 0 }
    setState({ data: null, isLoading: true, isFromCache: true, hasPendingWrites: false, error: null })

    const fail = (error: unknown) => {
      if (disposed) return
      failed = true
      console.error('Household subscription failed', error)
      setState((current) => ({
        ...current,
        data: null,
        isLoading: false,
        error: getErrorMessage(error),
      }))
    }
    const publish = (key: string, fromCache: boolean, hasPendingWrites: boolean) => {
      ready.add(key)
      cached.set(key, fromCache)
      pending.set(key, hasPendingWrites)
      if (disposed || failed || ready.size !== 5) return
      setState({
        data: { ...data },
        isLoading: false,
        isFromCache: [...cached.values()].some(Boolean),
        hasPendingWrites: [...pending.values()].some(Boolean),
        error: null,
      })
    }
    const unsubscribes = [
      onSnapshot(
        householdRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          try {
            const household = householdSchema.parse(snapshot.data())
            if (!household.memberUids.includes(userId))
              throw new Error('Your account is not a household member.')
            publish('household', snapshot.metadata.fromCache, snapshot.metadata.hasPendingWrites)
          } catch (error) {
            fail(error)
          }
        },
        fail,
      ),
      onSnapshot(
        sectionsRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          try {
            data.sections = snapshot.docs.map((item) => ({
              ...sectionSchema.parse(item.data()),
              id: item.id,
            }))
            publish('sections', snapshot.metadata.fromCache, snapshot.metadata.hasPendingWrites)
          } catch (error) {
            fail(error)
          }
        },
        fail,
      ),
      onSnapshot(
        catalogRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          try {
            data.catalog = snapshot.docs.map((item) => ({
              ...catalogItemSchema.parse(item.data()),
              id: item.id,
            }))
            publish('catalog', snapshot.metadata.fromCache, snapshot.metadata.hasPendingWrites)
          } catch (error) {
            fail(error)
          }
        },
        fail,
      ),
      onSnapshot(
        listRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          try {
            if (!snapshot.exists())
              throw new Error('Household setup is incomplete. Create the active list first.')
            data.list = activeListSchema.parse(snapshot.data())
            publish('list', snapshot.metadata.fromCache, snapshot.metadata.hasPendingWrites)
          } catch (error) {
            fail(error)
          }
        },
        fail,
      ),
      onSnapshot(
        orderRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          try {
            if (!snapshot.exists())
              throw new Error('Household setup is incomplete. Create the ordering record first.')
            data.revision = orderingSchema.parse(snapshot.data()).revision
            publish('order', snapshot.metadata.fromCache, snapshot.metadata.hasPendingWrites)
          } catch (error) {
            fail(error)
          }
        },
        fail,
      ),
    ]
    return () => {
      disposed = true
      unsubscribes.forEach((unsubscribe) => unsubscribe())
    }
  }, [userId, attempt])
  return { ...state, retry }
}
