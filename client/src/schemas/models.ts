import { z } from 'zod'

export const nameSchema = z.string().trim().min(1, 'Enter a name.').max(100, 'Use 100 characters or fewer.')
export const sectionSchema = z.object({
  name: nameSchema,
  sortOrder: z.number().int().nonnegative(),
  itemCount: z.number().int().nonnegative(),
})
export const catalogItemSchema = sectionSchema
  .omit({ itemCount: true })
  .extend({ sectionId: z.string().min(1) })
export const selectionSchema = z.object({
  quantity: z.number().int().positive('Quantity must be a whole number greater than zero.'),
  completed: z.boolean(),
})
export const activeListSchema = z.object({ items: z.record(z.string(), selectionSchema) })
export const orderingSchema = z.object({ revision: z.number().int().nonnegative() })
export const householdSchema = z.object({ memberUids: z.array(z.string()).length(2) })

export interface Section extends z.infer<typeof sectionSchema> {
  id: string
}
export interface CatalogItem extends z.infer<typeof catalogItemSchema> {
  id: string
}
export type Selection = z.infer<typeof selectionSchema>
export type ActiveList = z.infer<typeof activeListSchema>
export interface HouseholdData {
  sections: Section[]
  catalog: CatalogItem[]
  list: ActiveList
  revision: number
}
export interface GroceryGroup {
  section: Section
  items: CatalogItem[]
}
