import type { ActiveList, CatalogItem, GroceryGroup, Section, Selection } from '../schemas/models'

export const EMPTY_LIST: ActiveList = { items: {} }

export const groupGroceries = (
  sections: Section[],
  catalog: CatalogItem[],
  list: ActiveList,
  mode: 'catalog' | 'list' | 'manage',
  search = '',
): GroceryGroup[] => {
  const needle = search.trim().toLocaleLowerCase()
  const groups = [...sections]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    .map((section) => ({
      section,
      items: catalog
        .filter((item) => {
          const selected = Object.hasOwn(list.items, item.id)
          return (
            item.sectionId === section.id &&
            (mode === 'manage' || (mode === 'list' ? selected : !selected)) &&
            item.name.toLocaleLowerCase().includes(needle)
          )
        })
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    }))
  return mode === 'manage' ? groups : groups.filter((group) => group.items.length > 0)
}

export const changeSelection = (
  list: ActiveList,
  itemId: string,
  action:
    | { type: 'select' }
    | { type: 'remove' }
    | { type: 'quantity'; quantity: number }
    | { type: 'complete'; completed: boolean },
): ActiveList => {
  const items = { ...list.items }
  const current: Selection | undefined = items[itemId]
  switch (action.type) {
    case 'select':
      if (!current) items[itemId] = { quantity: 1, completed: false }
      break
    case 'remove':
      delete items[itemId]
      break
    case 'quantity':
    case 'complete':
      if (!current) throw new Error('This item was removed from the list. Select it again first.')
      items[itemId] =
        action.type === 'quantity'
          ? { ...current, quantity: action.quantity }
          : { ...current, completed: action.completed }
  }
  return { items }
}

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.message.includes('permission-denied'))
      return 'Your account does not have access to this household.'
    if (error.message.includes('unavailable') || error.message.includes('offline'))
      return 'Could not save. Check your connection and try again.'
    return error.message
  }
  return 'Something went wrong. Please try again.'
}
