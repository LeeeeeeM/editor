import { expect, test, type Page } from '@playwright/test'

const storyUrl = '/?story=get-selection-markdown--get-selection-markdown&mode=preview'
const runtimeErrors = new WeakMap<Page, string[]>()

type TextSelection = {
  rootTestId: string
  startText: string
  startOffset: number
  endText?: string
  endOffset: number
  backward?: boolean
}

async function selectText(page: Page, selection: TextSelection) {
  const root = page.getByTestId(selection.rootTestId)
  await root.scrollIntoViewIfNeeded()
  await root.getByText(selection.startText, { exact: false }).first().scrollIntoViewIfNeeded()
  const points = await root.evaluate((root, options) => {
    const findPoint = (needle: string, relativeOffset: number) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let current: Node | null = walker.nextNode()
      while (current) {
        const value = current.textContent ?? ''
        const start = value.indexOf(needle)
        if (start >= 0) {
          const offset = start + relativeOffset
          const range = document.createRange()
          range.setStart(current, offset)
          range.collapse(true)
          const rect = range.getBoundingClientRect()
          return { x: rect.left, y: rect.top + rect.height / 2 }
        }
        current = walker.nextNode()
      }
      throw new Error(`Could not find text node containing: ${needle}`)
    }

    const start = findPoint(options.startText, options.startOffset)
    const end = findPoint(options.endText ?? options.startText, options.endOffset)
    return { start, end }
  }, selection)

  await page.mouse.move(points.start.x, points.start.y)
  await page.mouse.down()
  await page.mouse.move(points.end.x, points.end.y, { steps: 10 })
  await page.mouse.up()

  await page.getByTestId(selection.rootTestId).evaluate((root, options) => {
    const findPoint = (needle: string, relativeOffset: number) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let current: Node | null = walker.nextNode()
      while (current) {
        const value = current.textContent ?? ''
        const start = value.indexOf(needle)
        if (start >= 0) return { node: current, offset: start + relativeOffset }
        current = walker.nextNode()
      }
      throw new Error(`Could not find text node containing: ${needle}`)
    }
    const start = findPoint(options.startText, options.startOffset)
    const end = findPoint(options.endText ?? options.startText, options.endOffset)
    const browserSelection = window.getSelection()
    if (!browserSelection) throw new Error('The browser did not expose a DOM selection')
    if (options.backward) browserSelection.setBaseAndExtent(end.node, end.offset, start.node, start.offset)
    else browserSelection.setBaseAndExtent(start.node, start.offset, end.node, end.offset)
    document.dispatchEvent(new Event('selectionchange', { bubbles: true }))
  }, selection)
  await page.waitForTimeout(50)
}

async function selectAll(page: Page, rootTestId: string) {
  const root = page.getByTestId(rootTestId)
  await root.scrollIntoViewIfNeeded()
  const editable = root.locator('[contenteditable="true"]').first()
  await editable.click({ position: { x: 20, y: 20 } })
  await page.keyboard.press('ControlOrMeta+a')
  await page.waitForTimeout(50)
}

async function collapseSelection(page: Page, rootTestId: string, text: string, offset: number) {
  await selectText(page, { rootTestId, startText: text, startOffset: offset, endOffset: offset })
}

async function readPrimarySelection(page: Page) {
  await page.getByRole('button', { name: 'Read primary selection' }).click()
  return (await page.getByLabel('Primary selection result').textContent()) ?? ''
}

async function readSecondarySelection(page: Page) {
  await page.getByRole('button', { name: 'Read secondary selection' }).click()
  return (await page.getByLabel('Secondary selection result').textContent()) ?? ''
}

async function readPrimaryMarkdown(page: Page) {
  await page.getByRole('button', { name: 'Read primary Markdown' }).click()
  return (await page.getByLabel('Primary full Markdown').textContent()) ?? ''
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  runtimeErrors.set(page, errors)
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`)
  })

  await page.goto(storyUrl)
  await expect(page.getByRole('heading', { name: 'Selection Markdown fixture ready' })).toBeVisible()
  await expect(page.getByLabel('Selection error')).toBeEmpty()
})

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page) ?? [], 'unexpected browser runtime errors').toEqual([])
})

test('CX-5 exports partial plain, formatted, code, and linked text', async ({ page }) => {
  const rootTestId = 'selection-primary-editor'

  await selectText(page, { rootTestId, startText: 'Plain alpha bravo charlie.', startOffset: 12, endOffset: 17 })
  expect(await readPrimarySelection(page)).toBe('bravo')

  await selectText(page, { rootTestId, startText: 'boldword', startOffset: 0, endOffset: 4 })
  expect(await readPrimarySelection(page)).toBe('**bold**')

  await selectText(page, { rootTestId, startText: 'italicword', startOffset: 0, endOffset: 6 })
  expect(await readPrimarySelection(page)).toBe('*italic*')

  await selectText(page, { rootTestId, startText: 'codeword', startOffset: 0, endOffset: 4 })
  expect(await readPrimarySelection(page)).toBe('`code`')

  await selectText(page, { rootTestId, startText: 'linked text', startOffset: 1, endOffset: 6 })
  expect(await readPrimarySelection(page)).toBe('[inked](https://example.com/selection)')
})

test('CX-5 makes forward and backward multi-block selections equivalent', async ({ page }) => {
  const range = {
    rootTestId: 'selection-primary-editor',
    startText: 'First block alpha.',
    startOffset: 6,
    endText: 'Second block bravo.',
    endOffset: 18
  }

  await selectText(page, range)
  const forward = await readPrimarySelection(page)
  expect(forward).toBe('block alpha.\n\nSecond block bravo')

  await selectText(page, { ...range, backward: true })
  expect(await readPrimarySelection(page)).toBe(forward)
})

test('CX-5 preserves nested ordered and task-list structure', async ({ page }) => {
  const rootTestId = 'selection-primary-editor'
  await selectText(page, {
    rootTestId,
    startText: 'Ordered alpha',
    startOffset: 0,
    endText: 'Nested ordered beta',
    endOffset: 'Nested ordered beta'.length
  })
  const ordered = await readPrimarySelection(page)
  expect(ordered).toContain('1. Ordered alpha')
  expect(ordered).toContain('1. Nested ordered beta')

  await selectText(page, {
    rootTestId,
    startText: 'Task pending',
    startOffset: 0,
    endText: 'Task complete',
    endOffset: 'Task complete'.length
  })
  const tasks = await readPrimarySelection(page)
  expect(tasks).toContain('[ ] Task pending')
  expect(tasks).toContain('[x] Task complete')
})

test('CX-5 carries atomic and custom constructs through the configured exporter', async ({ page }) => {
  const primary = page.getByTestId('selection-primary-editor')
  await primary.locator('hr').click()
  expect(await readPrimarySelection(page)).toBe('***')

  await selectAll(page, 'selection-primary-editor')
  const markdown = await readPrimarySelection(page)

  expect(markdown).toContain('fixture: selection')
  expect(markdown).toContain('| Table | Stable |')
  expect(markdown).toContain('***')
  expect(markdown).toContain('const selected = true')
  expect(markdown).toContain('![Selection image](/favicon.svg "Selection title")')
  expect(markdown).toContain(':::note')
  expect(markdown).toContain('Directive selection content.')
  expect(markdown).toContain('<Grid>')
  expect(markdown).toContain("from './selection-components'")
})

test('CX-5 keeps repeated reads, full Markdown, callbacks, and editor configuration isolated', async ({ page }) => {
  const primaryBefore = await readPrimaryMarkdown(page)
  const primaryChangeCount = await page.getByLabel('Primary change count').textContent()
  const secondaryChangeCount = await page.getByLabel('Secondary change count').textContent()

  await selectText(page, {
    rootTestId: 'selection-primary-editor',
    startText: 'Plain alpha bravo charlie.',
    startOffset: 0,
    endOffset: 5
  })
  expect(await readPrimarySelection(page)).toBe('Plain')

  await selectText(page, {
    rootTestId: 'selection-secondary-editor',
    startText: 'Secondary plain text.',
    startOffset: 0,
    endOffset: 9
  })
  expect(await readSecondarySelection(page)).toBe('replacement:SECONDARY')
  expect(await readSecondarySelection(page)).toBe('replacement:SECONDARY')

  await selectAll(page, 'selection-secondary-editor')
  expect(await readSecondarySelection(page)).toContain('+ replacement:SECONDARY ITEM')

  expect(await readPrimaryMarkdown(page)).toBe(primaryBefore)
  expect(await page.getByLabel('Primary change count').textContent()).toBe(primaryChangeCount)
  expect(await page.getByLabel('Secondary change count').textContent()).toBe(secondaryChangeCount)
})

test('CX-5 routes nested selections and returns empty for collapsed, source, and diff states', async ({ page }) => {
  await selectText(page, {
    rootTestId: 'selection-nested-editor',
    startText: 'Nested JSX selection content with ',
    startOffset: 7,
    endText: 'nested bold',
    endOffset: 6
  })
  const nested = await readPrimarySelection(page)
  expect(nested).toContain('JSX selection content with **nested**')
  expect(nested).not.toContain('<Grid>')

  await collapseSelection(page, 'selection-primary-editor', 'Plain alpha bravo charlie.', 3)
  expect(await readPrimarySelection(page)).toBe('')

  await page.getByRole('button', { name: 'Read source selection' }).click()
  await expect(page.getByLabel('Source selection result')).toBeEmpty()
  await page.getByRole('button', { name: 'Read diff selection' }).click()
  await expect(page.getByLabel('Diff selection result')).toBeEmpty()
})
