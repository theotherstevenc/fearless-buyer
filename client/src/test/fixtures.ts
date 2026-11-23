import type { HouseholdData } from '../schemas/models'

export const fixtureData: HouseholdData = {
  sections: [
    { id: 'frozen', name: 'Frozen', sortOrder: 1, itemCount: 1 },
    { id: 'produce', name: 'Produce', sortOrder: 0, itemCount: 2 },
    { id: 'bakery', name: 'Bakery', sortOrder: 2, itemCount: 0 },
  ],
  catalog: [
    { id: 'apples', name: 'Apples', sectionId: 'produce', sortOrder: 1 },
    { id: 'lemons', name: 'Lemons', sectionId: 'produce', sortOrder: 0 },
    { id: 'peas', name: 'Peas', sectionId: 'frozen', sortOrder: 0 },
  ],
  list: { items: {} },
  revision: 0,
}
