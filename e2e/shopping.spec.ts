import { randomBytes } from 'node:crypto'

import { expect, test } from '@playwright/test'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
const app = initializeApp({ projectId: 'demo-fearless-buyer' })
const db = getFirestore(app)
const auth = getAuth(app)

test('empty setup, catalog-only add, shared shopping, quantity, completion and reset', async ({
  page,
  browser,
}) => {
  const password = randomBytes(18).toString('base64url')
  const suffix = randomBytes(6).toString('hex')
  const first = await auth.createUser({ email: `first-${suffix}@example.test`, password })
  const second = await auth.createUser({ email: `second-${suffix}@example.test`, password })
  const home = db.doc('households/home')
  await db.recursiveDelete(home)
  await home.set({ memberUids: [first.uid, second.uid] })
  await home.collection('shoppingLists').doc('active').set({ items: {} })
  await home.collection('metadata').doc('ordering').set({ revision: 0 })
  const otherContext = await browser.newContext()
  const other = await otherContext.newPage()
  try {
    for (const [tab, email] of [
      [page, first.email],
      [other, second.email],
    ] as const) {
      await tab.goto('http://127.0.0.1:5173')
      await tab.getByLabel('Email', { exact: true }).fill(email!)
      await tab.getByLabel('Password', { exact: true }).fill(password)
      await tab.getByRole('button', { name: 'Sign in', exact: true }).click()
      await expect(tab.getByText('Synced with your household')).toBeVisible()
    }
    await page.getByRole('button', { name: 'Set up store sections' }).click()
    await page.getByLabel('New section').fill('Produce')
    await page.getByRole('button', { name: 'Add section', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Rename Produce' })).toBeVisible()
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click()
    for (const name of ['Lemons', 'Apples']) {
      await page.getByRole('button', { name: 'Add item', exact: true }).click()
      await page.getByLabel('Name', { exact: true }).fill(name)
      await page.getByRole('button', { name: 'Save grocery' }).click()
      await expect(page.getByRole('button', { name: `Add ${name} to Grocery List` })).toBeVisible()
    }
    await page.getByRole('tab', { name: /Grocery List/ }).click()
    await expect(page.getByText('A fresh list starts here')).toBeVisible()
    await page.getByRole('tab', { name: 'Catalog', exact: true }).click()
    await page.getByRole('button', { name: 'Add Lemons to Grocery List' }).click()
    await expect(page.getByRole('button', { name: 'Add Lemons to Grocery List' })).toHaveCount(0)
    await expect(other.getByRole('button', { name: 'Add Lemons to Grocery List' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Add Apples to Grocery List' }).click()
    await page.getByRole('tab', { name: /Grocery List/ }).click()
    await expect(page.getByRole('checkbox').first()).toHaveAccessibleName('Lemons in cart')
    await expect(page.getByRole('button', { name: /Edit/ })).toHaveCount(0)
    await page.getByRole('button', { name: 'Change quantity for Lemons, currently 1' }).click()
    await page.getByRole('spinbutton').fill('3')
    await page.getByRole('button', { name: 'Save quantity' }).click()
    await expect(page.getByText('×3')).toBeVisible()
    await page.getByRole('checkbox', { name: 'Lemons in cart' }).click()
    await expect(page.getByRole('checkbox').first()).toBeChecked()
    await other.getByRole('tab', { name: /Grocery List/ }).click()
    await expect(other.getByText('×3')).toBeVisible()
    await expect(other.getByRole('checkbox', { name: 'Lemons in cart' })).toBeChecked()
    await page.getByRole('button', { name: 'Remove Apples from Grocery List' }).click()
    await expect(page.getByRole('checkbox', { name: 'Apples in cart' })).toHaveCount(0)
    await page.getByRole('button', { name: 'New list', exact: true }).click()
    await page.getByRole('button', { name: 'Start new list', exact: true }).click()
    await expect(page.getByText('A fresh list starts here')).toBeVisible()
    await expect(other.getByText('A fresh list starts here')).toBeVisible()
    await page.getByRole('tab', { name: 'Catalog', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Add Lemons to Grocery List' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  } finally {
    if (browser.isConnected()) await otherContext.close()
    await auth.deleteUser(first.uid)
    await auth.deleteUser(second.uid)
    await db.recursiveDelete(home)
  }
})
