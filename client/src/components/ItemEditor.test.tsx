import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { fixtureData } from '../test/fixtures'
import { saveCatalogItem } from '../services/groceries'
import { ItemEditor } from './ItemEditor'

vi.mock('../services/groceries', () => ({ saveCatalogItem: vi.fn().mockResolvedValue(undefined) }))

describe('ItemEditor', () => {
  it('saves an unlisted grocery to catalog only', async () => {
    const onClose = vi.fn()
    render(<ItemEditor data={fixtureData} onClose={onClose} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Name'), '  Bread  ')
    await user.selectOptions(screen.getByLabelText('Store section'), 'bakery')
    await user.click(screen.getByRole('button', { name: 'Save grocery' }))
    expect(saveCatalogItem).toHaveBeenCalledWith('Bread', 'bakery', fixtureData.catalog, 0, undefined)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
