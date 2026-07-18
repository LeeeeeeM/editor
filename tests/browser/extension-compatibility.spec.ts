import { expect, test, type Locator, type Page } from '@playwright/test'

const storyUrl = '/?story=extension-compatibility--extension-compatibility&mode=preview'
const runtimeErrors = new WeakMap<Page, string[]>()

async function placeCaret(page: Page, locator: Locator) {
  await locator.evaluate((element) => {
    const editable = element.closest<HTMLElement>('[contenteditable="true"]')
    if (!editable) throw new Error('The selected public DOM node is not inside a contenteditable')
    editable.focus()
    const range = document.createRange()
    range.selectNodeContents(element)
    range.collapse(false)
    const selection = window.getSelection()
    if (!selection) throw new Error('The browser did not expose a DOM selection')
    selection.removeAllRanges()
    selection.addRange(range)
    document.dispatchEvent(new Event('selectionchange', { bubbles: true }))
  })
}

async function appendText(page: Page, locator: Locator, text: string) {
  await placeCaret(page, locator)
  // Table activation focuses its newly active cell once; reapply the public
  // DOM selection after that focus hand-off so the marker remains atomic.
  await page.waitForTimeout(20)
  await placeCaret(page, locator)
  await page.keyboard.type(text)
  await expect(locator).toContainText(text.trim())
}

async function readExtensionMarkdown(page: Page) {
  await page.getByRole('button', { name: 'Read extension Markdown' }).click()
  return (await page.getByLabel('Extension read Markdown').textContent()) ?? ''
}

async function expectExtensionMarkdown(page: Page, assertion: (markdown: string) => void) {
  await expect
    .poll(async () => {
      const markdown = await readExtensionMarkdown(page)
      assertion(markdown)
      return true
    })
    .toBe(true)
}

async function clickHistoryUntil(page: Page, control: Locator, target: Locator, expectedText: string) {
  let clicks = 0
  while (((await target.textContent()) ?? '') !== expectedText && clicks < 24) {
    if (!(await control.isEnabled())) {
      throw new Error(
        `History control became disabled before reaching ${JSON.stringify(expectedText)}; current text is ${JSON.stringify(
          await target.textContent()
        )}`
      )
    }
    await control.click()
    clicks++
    await page.waitForTimeout(20)
  }
  expect(await target.textContent()).toBe(expectedText)
  expect(clicks).toBeGreaterThan(0)
}

async function drainHistoryEndpoint(page: Page, control: Locator) {
  let clicks = 0
  while ((await control.isEnabled()) && clicks < 24) {
    await control.click()
    clicks++
    await page.waitForTimeout(20)
  }
  await expect(control).toBeDisabled()
}

async function probeStats(page: Page) {
  return JSON.parse((await page.getByLabel('Extension probe stats').textContent()) ?? '{}') as Record<
    'root' | 'nested' | 'table',
    { mounts: number; cleanups: number }
  >
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  runtimeErrors.set(page, errors)
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`)
  })

  await page.goto(storyUrl)
  await expect(page.getByRole('heading', { name: 'Extension compatibility fixture ready' })).toBeVisible()
  await expect(page.getByLabel('Extension error')).toBeEmpty()
  await expect(page.getByTestId('extension-root-probe')).toBeVisible()
})

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page) ?? [], 'unexpected browser runtime errors').toEqual([])
})

test('CX-7a keeps consumer Gurx, node, visitor, and React child plugins extension-agnostic', async ({ page }) => {
  const rootProbe = page.getByTestId('extension-root-probe')
  const nestedProbes = page.getByTestId('extension-nested-probe')
  const tableProbes = page.getByTestId('extension-table-probe')
  await expect(nestedProbes).toHaveCount(3)
  await expect(tableProbes).toHaveCount(2)
  await expect(page.getByLabel('Extension layout ref ready')).toHaveText('true')
  await expect(page.getByLabel('Extension effect ref ready')).toHaveText('true')
  await expect(rootProbe).toContainText(/^root:realm-\d+$/)
  await expect(rootProbe).toHaveAttribute('data-plugin-init-count', '1')
  await expect(nestedProbes.nth(0)).toHaveAttribute('data-plugin-init-count', '1')
  await expect(tableProbes.nth(0)).toHaveAttribute('data-plugin-init-count', '1')

  const editorIds = [
    await rootProbe.getAttribute('data-editor-id'),
    await nestedProbes.nth(0).getAttribute('data-editor-id'),
    await nestedProbes.nth(1).getAttribute('data-editor-id'),
    await nestedProbes.nth(2).getAttribute('data-editor-id'),
    await tableProbes.nth(0).getAttribute('data-editor-id')
  ]
  expect(new Set(editorIds).size).toBe(editorIds.length)

  const rootEditorId = await rootProbe.getAttribute('data-editor-id')
  const nestedIdentities = await nestedProbes.evaluateAll((probes) =>
    probes.map((probe) => ({
      id: probe.getAttribute('data-editor-id'),
      parentId: probe.getAttribute('data-parent-editor-id')
    }))
  )
  const nestedEditorIds = nestedIdentities.map(({ id }) => id)
  const recursiveNestedIdentity = nestedIdentities.find(({ parentId }) => nestedEditorIds.includes(parentId))
  expect(recursiveNestedIdentity).toBeDefined()
  expect(recursiveNestedIdentity?.parentId).not.toBe(rootEditorId)

  await page.getByRole('button', { name: 'Read extension Markdown' }).click()
  await expect(page.getByLabel('Extension read Markdown')).toContainText('consumer:Custom consumer text.')

  const rootText = page.getByTestId('extension-root-editor').locator('p').filter({ hasText: 'Root history text.' }).first()
  const nestedText = page.locator('p').filter({ hasText: 'Nested A text.' }).first()
  const tableText = page.getByRole('cell', { name: 'Table text' }).locator('p')
  await appendText(page, rootText, ' ROOT-CX7')
  await appendText(page, nestedText, ' NESTED-CX7')
  await appendText(page, tableText, ' TABLE-CX7')
  await page.getByRole('button', { name: 'Read extension Markdown' }).click()
  await expect(page.getByLabel('Extension read Markdown')).toContainText('ROOT-CX7')
  await expect(page.getByLabel('Extension read Markdown')).toContainText('NESTED-CX7')
  await expect(page.getByLabel('Extension read Markdown')).toContainText('TABLE-CX7')

  await page.getByRole('button', { name: 'Toggle extension read only' }).click()
  await expect(page.getByTestId('extension-root-editor').locator('[contenteditable="true"]')).toHaveCount(0)
  await expect(page.getByTestId('extension-root-editor').locator('[contenteditable="false"]')).not.toHaveCount(0)
  await page.getByRole('button', { name: 'Toggle extension read only' }).click()
  await expect(page.getByTestId('extension-root-editor').locator('[contenteditable="true"]')).not.toHaveCount(0)
})

test('CX-7b preserves normal, suppressed-root, and table-local history availability', async ({ page }) => {
  const undo = page.getByRole('radio', { name: /Undo/ })
  const redo = page.getByRole('radio', { name: /Redo/ })
  const rootText = page.getByTestId('extension-root-editor').locator('p').filter({ hasText: 'Root history text.' }).first()
  const nestedA = page.locator('p').filter({ hasText: 'Nested A text.' }).first()
  const nestedB = page.locator('p').filter({ hasText: 'Nested B text.' }).first()

  await expect(undo).toBeDisabled()
  await expect(redo).toBeDisabled()
  await appendText(page, rootText, ' R')
  await appendText(page, nestedA, ' A')
  await appendText(page, nestedB, ' B')
  await expect(undo).toBeEnabled()
  await expect(redo).toBeDisabled()

  await clickHistoryUntil(page, undo, nestedB, 'Nested B text.')
  await expect(undo).toBeEnabled()
  await expect(redo).toBeEnabled()
  await clickHistoryUntil(page, undo, nestedA, 'Nested A text.')
  await expect(undo).toBeEnabled()
  await expect(redo).toBeEnabled()
  await clickHistoryUntil(page, undo, rootText, 'Root history text.')
  await drainHistoryEndpoint(page, undo)
  await expect(undo).toBeDisabled()
  await expect(redo).toBeEnabled()

  await clickHistoryUntil(page, redo, rootText, 'Root history text. R')
  await clickHistoryUntil(page, redo, nestedA, 'Nested A text. A')
  await clickHistoryUntil(page, redo, nestedB, 'Nested B text. B')
  await drainHistoryEndpoint(page, redo)
  await expect(undo).toBeEnabled()
  await expect(redo).toBeDisabled()
  await expectExtensionMarkdown(page, (markdown) => {
    expect(markdown).toContain('Root history text. R')
    expect(markdown).toContain('Nested A text. A')
    expect(markdown).toContain('Nested B text. B')
  })

  await page.getByRole('button', { name: 'Use normal history' }).click()
  await expect(page.getByLabel('Extension mode')).toHaveText('normal')
  await expect(undo).toBeDisabled()
  await expect(redo).toBeDisabled()
  const beforeTableSave = await readExtensionMarkdown(page)
  const tableRootText = page.getByTestId('extension-root-editor').locator('p').filter({ hasText: 'Root history text.' }).first()
  await placeCaret(page, tableRootText)
  const tableText = page.getByRole('cell', { name: /Table text/ }).locator('p')
  await appendText(page, tableText, ' T')
  await expect(undo).toBeEnabled()
  await expect(redo).toBeDisabled()
  await clickHistoryUntil(page, undo, tableText, 'Table text')
  await drainHistoryEndpoint(page, undo)
  await expect(undo).toBeDisabled()
  await expect(redo).toBeEnabled()
  await clickHistoryUntil(page, redo, tableText, 'Table text T')
  await drainHistoryEndpoint(page, redo)
  await expect(undo).toBeEnabled()
  await expect(redo).toBeDisabled()

  const afterTableSave = await readExtensionMarkdown(page)
  expect(afterTableSave).toContain('Table text T')
  await placeCaret(page, tableRootText)
  await expect(undo).toBeEnabled()
  await undo.click()
  await expect(undo).toBeDisabled()
  await expect(redo).toBeEnabled()
  expect(await readExtensionMarkdown(page)).toBe(beforeTableSave)
  await placeCaret(page, tableRootText)
  await redo.click()
  await expect(undo).toBeEnabled()
  await expect(redo).toBeDisabled()
  expect(await readExtensionMarkdown(page)).toBe(afterTableSave)

  await page.getByRole('button', { name: 'Use suppressed root history' }).click()
  await expect(page.getByLabel('Extension mode')).toHaveText('suppressed')
  const suppressedRoot = page.getByTestId('extension-root-editor').locator('p').filter({ hasText: 'Root history text.' }).first()
  await appendText(page, suppressedRoot, ' R')
  await expect(undo).toBeDisabled()
  await expect(redo).toBeDisabled()

  const suppressedA = page.locator('p').filter({ hasText: 'Nested A text.' }).first()
  const suppressedB = page.locator('p').filter({ hasText: 'Nested B text.' }).first()
  await appendText(page, suppressedA, ' A')
  await appendText(page, suppressedB, ' B')
  await expect(undo).toBeEnabled()
  await expect(redo).toBeDisabled()
  await clickHistoryUntil(page, undo, suppressedB, 'Nested B text.')
  await expect(undo).toBeEnabled()
  await expect(redo).toBeEnabled()
  await clickHistoryUntil(page, undo, suppressedA, 'Nested A text.')
  await drainHistoryEndpoint(page, undo)
  await expect(suppressedRoot).toHaveText('Root history text. R')
  await expect(undo).toBeDisabled()
  await expect(redo).toBeEnabled()
  await clickHistoryUntil(page, redo, suppressedA, 'Nested A text. A')
  await clickHistoryUntil(page, redo, suppressedB, 'Nested B text. B')
  await drainHistoryEndpoint(page, redo)
  await expect(undo).toBeEnabled()
  await expect(redo).toBeDisabled()
  await expectExtensionMarkdown(page, (markdown) => {
    expect(markdown).toContain('Root history text. R')
    expect(markdown).toContain('Nested A text. A')
    expect(markdown).toContain('Nested B text. B')
  })
})

test('CX-7c recreates clean editor identities through Strict Mode unmount and remount', async ({ page }) => {
  await page.getByRole('button', { name: 'Enable extension Strict Mode' }).click()
  await expect(page.getByLabel('Extension React mode')).toHaveText('strict')
  await expect.poll(async () => (await probeStats(page)).root.mounts).toBe(3)
  await expect.poll(async () => (await probeStats(page)).root.cleanups).toBe(2)
  await expect.poll(async () => (await probeStats(page)).nested.mounts).toBe(9)
  await expect.poll(async () => (await probeStats(page)).nested.cleanups).toBe(6)
  await expect.poll(async () => (await probeStats(page)).table.mounts).toBe(6)
  await expect.poll(async () => (await probeStats(page)).table.cleanups).toBe(4)

  const initialProbe = page.getByTestId('extension-root-probe')
  const initialEditorId = await initialProbe.getAttribute('data-editor-id')
  const initialRealm = await initialProbe.textContent()
  const initialNestedEditorIds = await page
    .getByTestId('extension-nested-probe')
    .evaluateAll((probes) => probes.map((probe) => probe.getAttribute('data-editor-id')))
  const initialTableEditorIds = await page
    .getByTestId('extension-table-probe')
    .evaluateAll((probes) => probes.map((probe) => probe.getAttribute('data-editor-id')))
  await page.getByRole('button', { name: 'Capture extension public ref' }).click()
  const initialPublicRefId = await page.getByLabel('Extension public ref id').textContent()
  expect(initialPublicRefId).not.toBe('')
  const initialStats = await probeStats(page)
  expect(initialStats.root.mounts).toBe(3)
  expect(initialStats.root.cleanups).toBe(2)

  await page.getByRole('button', { name: 'Unmount extension editor' }).click()
  await expect(page.getByTestId('extension-root-editor')).toHaveCount(0)
  await expect.poll(async () => (await probeStats(page)).root.cleanups).toBe(initialStats.root.mounts)
  await expect.poll(async () => (await probeStats(page)).nested.cleanups).toBe(initialStats.nested.mounts)
  await expect.poll(async () => (await probeStats(page)).table.cleanups).toBe(initialStats.table.mounts)

  await page.getByRole('button', { name: 'Remount extension editor' }).click()
  await expect(page.getByTestId('extension-root-probe')).toBeVisible()
  const remountedProbe = page.getByTestId('extension-root-probe')
  const remountedEditorId = await remountedProbe.getAttribute('data-editor-id')
  expect(remountedEditorId).not.toBe(initialEditorId)
  expect(await remountedProbe.textContent()).not.toBe(initialRealm)
  await expect.poll(async () => (await probeStats(page)).root.mounts).toBe(initialStats.root.mounts + 2)
  await expect.poll(async () => (await probeStats(page)).root.cleanups).toBe(initialStats.root.cleanups + 2)
  await expect.poll(async () => (await probeStats(page)).nested.mounts).toBe(initialStats.nested.mounts + 6)
  await expect.poll(async () => (await probeStats(page)).nested.cleanups).toBe(initialStats.nested.cleanups + 6)
  await expect.poll(async () => (await probeStats(page)).table.mounts).toBe(initialStats.table.mounts + 4)
  await expect.poll(async () => (await probeStats(page)).table.cleanups).toBe(initialStats.table.cleanups + 4)
  const remountedNestedEditorIds = await page
    .getByTestId('extension-nested-probe')
    .evaluateAll((probes) => probes.map((probe) => probe.getAttribute('data-editor-id')))
  const remountedTableEditorIds = await page
    .getByTestId('extension-table-probe')
    .evaluateAll((probes) => probes.map((probe) => probe.getAttribute('data-editor-id')))
  expect(remountedNestedEditorIds.every((id) => !initialNestedEditorIds.includes(id))).toBe(true)
  expect(remountedTableEditorIds.every((id) => !initialTableEditorIds.includes(id))).toBe(true)
  await page.getByRole('button', { name: 'Capture extension public ref' }).click()
  expect(await page.getByLabel('Extension public ref id').textContent()).not.toBe(initialPublicRefId)

  const rootText = page.getByTestId('extension-root-editor').locator('p').filter({ hasText: 'Root history text.' }).first()
  await appendText(page, rootText, ' REMOUNTED')
  await expect(remountedProbe).toHaveAttribute('data-active-editor-id', remountedEditorId ?? '')
  await page.getByRole('button', { name: 'Read extension Markdown' }).click()
  await expect(page.getByLabel('Extension read Markdown')).toContainText('REMOUNTED')
  await page.getByRole('button', { name: 'Inspect stale extension editors' }).click()
  const staleEditors = JSON.parse((await page.getByLabel('Extension stale editor snapshot').textContent()) ?? '[]') as Array<{
    id: number
    text: string
  }>
  const staleRoot = staleEditors.find(({ id }) => String(id) === initialEditorId)
  expect(staleRoot?.text).not.toContain('REMOUNTED')

  await page.getByRole('button', { name: 'Unmount extension editor' }).click()
  await expect
    .poll(async () => {
      const stats = await probeStats(page)
      return stats.root.cleanups === stats.root.mounts
    })
    .toBe(true)
  await expect
    .poll(async () => {
      const stats = await probeStats(page)
      return stats.nested.cleanups === stats.nested.mounts
    })
    .toBe(true)
  await expect
    .poll(async () => {
      const stats = await probeStats(page)
      return stats.table.cleanups === stats.table.mounts
    })
    .toBe(true)
})
