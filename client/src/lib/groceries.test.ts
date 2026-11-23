import { describe, expect, it } from 'vitest'

import { activeListSchema } from '../schemas/models'
import { fixtureData } from '../test/fixtures'
import { changeSelection, groupGroceries } from './groceries'

describe('groupGroceries', () => {
  it('uses store route and custom item order rather than alphabetical order', () => {
    const groups = groupGroceries(fixtureData.sections, fixtureData.catalog, fixtureData.list, 'catalog')
    expect(groups.map((group) => group.section.name)).toEqual(['Produce', 'Frozen'])
    expect(groups[0].items.map((item) => item.name)).toEqual(['Lemons', 'Apples'])
  })
  it('hides selected groceries from catalog even when completed and preserves search order', () => {
    const list = { items: { lemons: { quantity: 3, completed: true } } }
    const catalog = groupGroceries(fixtureData.sections, fixtureData.catalog, list, 'catalog', '  a ')
    expect(catalog.flatMap((group) => group.items.map((item) => item.name))).toEqual(['Apples', 'Peas'])
    const selected = groupGroceries(fixtureData.sections, fixtureData.catalog, list, 'list')
    expect(selected[0].items[0].name).toBe('Lemons')
  })
  it('management includes selected groceries and empty sections', () => {
    const list = changeSelection(fixtureData.list, 'lemons', { type: 'select' })
    const groups = groupGroceries(fixtureData.sections, fixtureData.catalog, list, 'manage')
    expect(groups).toHaveLength(3)
    expect(groups[0].items).toHaveLength(2)
    expect(groups[2].items).toHaveLength(0)
  })
})

describe('changeSelection', () => {
  it('selects once, preserves quantity on repeat selection, and does not mutate input', () => {
    const first = changeSelection(fixtureData.list, 'lemons', { type: 'select' })
    const multiple = changeSelection(first, 'lemons', { type: 'quantity', quantity: 3 })
    expect(changeSelection(multiple, 'lemons', { type: 'select' })).toEqual(multiple)
    expect(fixtureData.list.items).toEqual({})
  })
  it('sets completion without affecting quantity or other selections', () => {
    const list = {
      items: { lemons: { quantity: 3, completed: false }, apples: { quantity: 1, completed: false } },
    }
    const updated = changeSelection(list, 'lemons', { type: 'complete', completed: true })
    expect(updated.items.lemons).toEqual({ quantity: 3, completed: true })
    expect(updated.items.apples).toEqual(list.items.apples)
    expect(changeSelection(updated, 'lemons', { type: 'remove' }).items).toEqual({
      apples: list.items.apples,
    })
  })
  it('rejects editing a removed item rather than resurrecting it', () => {
    expect(() => changeSelection(fixtureData.list, 'lemons', { type: 'quantity', quantity: 2 })).toThrow(
      'removed',
    )
  })
})

describe('activeListSchema', () => {
  it.each([0, -1, 1.5, NaN])('rejects invalid quantity %s', (quantity) => {
    expect(activeListSchema.safeParse({ items: { lemons: { quantity, completed: false } } }).success).toBe(
      false,
    )
  })
})
