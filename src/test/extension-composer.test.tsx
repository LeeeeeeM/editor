import { getExtensionDependencyFromEditor } from '@lexical/extension'
import { createEmptyHistoryState, HistoryExtension } from '@lexical/history'
import { LexicalExtensionEditorComposer } from '@lexical/react/LexicalExtensionEditorComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useRealm, type Realm } from '@mdxeditor/gurx'
import { render, waitFor } from '@testing-library/react'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  HISTORY_PUSH_TAG,
  TextNode,
  UNDO_COMMAND,
  type LexicalEditorWithDispose
} from 'lexical'
import React from 'react'
import { describe, expect, it } from 'vitest'
import { RealmWithPlugins, type RealmPlugin } from '../RealmWithPlugins'
import { registerRealmCleanup } from '../realmSession'
import { createExtensionEditor, editorUsesHistoryState } from '../plugins/core/lexicalExtensions'
import { MDXEditor, type MDXEditorMethods } from '../MDXEditor'

class ConsumerTextNode extends TextNode {
  static getType() {
    return 'consumer-text'
  }

  static clone(node: ConsumerTextNode) {
    return new ConsumerTextNode(node.__text, node.__key)
  }
}

function replaceText(text: string) {
  $getRoot()
    .clear()
    .append($createParagraphNode().append($createTextNode(text)))
}

function readText(editor: LexicalEditorWithDispose) {
  return editor.getEditorState().read(() => $getRoot().getTextContent())
}

describe('extension editor construction', () => {
  it('provides normal React context and preserves consumer node registrations', async () => {
    const editor = createExtensionEditor({
      name: 'test-root-context',
      namespace: 'test-root-context',
      nodes: [ConsumerTextNode],
      historyMode: 'none',
      initialEditorState: () => {
        replaceText('root')
      }
    })
    let contextEditor: LexicalEditorWithDispose | undefined
    const CaptureEditor = () => {
      const [capturedEditor] = useLexicalComposerContext()
      contextEditor = capturedEditor as LexicalEditorWithDispose
      return null
    }

    const view = render(
      <LexicalExtensionEditorComposer initialEditor={editor}>
        <CaptureEditor />
      </LexicalExtensionEditorComposer>
    )

    expect(contextEditor).toBe(editor)
    expect(editor.hasNodes([ConsumerTextNode])).toBe(true)
    await waitFor(() => {
      expect(readText(editor)).toBe('root')
    })
    view.unmount()
    editor.dispose()
  })

  it('shares normal nested history and inherits parent editability', async () => {
    const historyState = createEmptyHistoryState()
    const root = createExtensionEditor({
      name: 'test-shared-root',
      namespace: 'test-shared-root',
      nodes: [],
      historyMode: 'root-shared',
      historyState,
      initialEditorState: () => {
        replaceText('root-one')
      }
    })
    const nested = createExtensionEditor({
      name: 'test-shared-nested',
      namespace: 'test-shared-nested',
      nodes: [],
      parentEditor: root,
      historyMode: 'nested-shared',
      initialEditorState: () => {
        replaceText('nested-one')
      }
    })

    expect(nested._parentEditor).toBe(root)
    expect(getExtensionDependencyFromEditor(root, HistoryExtension).output.historyState.value).toBe(historyState)
    expect(getExtensionDependencyFromEditor(nested, HistoryExtension).output.historyState.value).toBe(historyState)
    expect(editorUsesHistoryState(root, historyState)).toBe(true)
    expect(editorUsesHistoryState(nested, historyState)).toBe(true)

    await waitFor(() => {
      expect(readText(nested)).toBe('nested-one')
    })
    expect(historyState.current).toBeNull()
    expect(historyState.undoStack).toEqual([])
    expect(historyState.redoStack).toEqual([])
    nested.update(
      () => {
        replaceText('nested-one')
      },
      { discrete: true, tag: HISTORY_PUSH_TAG }
    )
    expect(historyState.current?.editor).toBe(nested)
    expect(historyState.undoStack).toEqual([])
    nested.update(
      () => {
        replaceText('nested-two')
      },
      { discrete: true, tag: HISTORY_PUSH_TAG }
    )
    expect(historyState.undoStack).toHaveLength(1)
    nested.dispatchCommand(UNDO_COMMAND, undefined)
    await waitFor(() => {
      expect(readText(nested)).toBe('nested-one')
    })

    root.setEditable(false)
    expect(nested.isEditable()).toBe(false)
    nested.dispose()
    expect(() => {
      nested.dispose()
    }).not.toThrow()
    root.dispose()
  })

  it('keeps suppressed nested history external and table history local', () => {
    const externalHistory = createEmptyHistoryState()
    const parent = createExtensionEditor({
      name: 'test-no-history-root',
      namespace: 'test-no-history-root',
      nodes: [],
      historyMode: 'none'
    })
    const nested = createExtensionEditor({
      name: 'test-external-nested',
      namespace: 'test-external-nested',
      nodes: [],
      parentEditor: parent,
      historyMode: 'nested-external',
      historyState: externalHistory
    })
    const table = createExtensionEditor({
      name: 'test-local-table',
      namespace: 'test-local-table',
      nodes: [],
      parentEditor: parent,
      historyMode: 'table-local'
    })

    expect(getExtensionDependencyFromEditor(nested, HistoryExtension).output.historyState.value).toBe(externalHistory)
    const tableHistory = getExtensionDependencyFromEditor(table, HistoryExtension).output.historyState.value
    expect(tableHistory).not.toBe(externalHistory)
    expect(editorUsesHistoryState(table, externalHistory)).toBe(false)
    expect(editorUsesHistoryState(table, tableHistory)).toBe(true)
    expect(tableHistory.current).toBeNull()
    expect(tableHistory.undoStack).toEqual([])

    table.dispose()
    nested.dispose()
    parent.dispose()
  })
})

describe('realm session lifecycle', () => {
  it('keeps public methods available to parent layout and mount effects without render-time Realm setup', async () => {
    const editorRef = React.createRef<MDXEditorMethods>()
    let layoutRef: MDXEditorMethods | null = null
    let effectRef: MDXEditorMethods | null = null

    const Parent = () => {
      React.useLayoutEffect(() => {
        layoutRef = editorRef.current
        editorRef.current?.setMarkdown('updated from parent layout effect')
      }, [])
      React.useEffect(() => {
        effectRef = editorRef.current
      }, [])
      return <MDXEditor ref={editorRef} markdown="initial markdown" />
    }

    const view = render(<Parent />)
    expect(layoutRef).not.toBeNull()
    expect(effectRef).not.toBeNull()
    await waitFor(() => {
      expect(editorRef.current?.getMarkdown()).toBe('updated from parent layout effect')
    })
    view.unmount()
    expect(editorRef.current).toBeNull()
  })

  it('replays pre-ready focus and insertion in order onto the live Strict Mode session', async () => {
    const editorRef = React.createRef<MDXEditorMethods>()
    const queued = { current: false }
    let markdownBeforeReady = ''
    let markdownAfterQueuedSet = ''
    let htmlBeforeReady = 'not-read'
    let selectionBeforeReady = 'not-read'
    let focusCallbacks = 0

    const Parent = () => {
      React.useLayoutEffect(() => {
        if (queued.current) {
          return
        }
        queued.current = true

        const methods = editorRef.current
        expect(methods).not.toBeNull()
        expect(document.querySelector('[contenteditable="true"]')).toBeNull()
        markdownBeforeReady = methods!.getMarkdown()
        htmlBeforeReady = methods!.getContentEditableHTML()
        selectionBeforeReady = methods!.getSelectionMarkdown()
        methods!.setMarkdown('queued base')
        markdownAfterQueuedSet = methods!.getMarkdown()
        methods!.focus(
          () => {
            focusCallbacks++
          },
          { defaultSelection: 'rootEnd' }
        )
        methods!.insertMarkdown('TAIL')
      }, [])

      return <MDXEditor ref={editorRef} markdown=" initial markdown " />
    }

    const view = render(
      <React.StrictMode>
        <Parent />
      </React.StrictMode>
    )

    expect(markdownBeforeReady).toBe('initial markdown')
    expect(markdownAfterQueuedSet).toBe('queued base')
    expect(htmlBeforeReady).toBe('')
    expect(selectionBeforeReady).toBe('')
    await waitFor(() => {
      expect(editorRef.current?.getMarkdown()).toBe('queued baseTAIL')
      expect(focusCallbacks).toBe(1)
    })

    view.unmount()
    expect(editorRef.current).toBeNull()
  })

  it('disposes every Strict Mode session once and permits descendant unregister after disposal', async () => {
    const editors = new WeakMap<Realm, LexicalEditorWithDispose>()
    let setups = 0
    let disposals = 0
    let childMounts = 0
    let childCleanups = 0
    const plugin: RealmPlugin = {
      postInit(realm) {
        setups++
        const editor = createExtensionEditor({
          name: `strict-session-${setups}`,
          namespace: `strict-session-${setups}`,
          nodes: [],
          historyMode: 'none'
        })
        editors.set(realm, editor)
        registerRealmCleanup(realm, () => {
          disposals++
          editor.dispose()
        })
      }
    }
    const ConsumerChild = () => {
      const realm = useRealm()
      const editor = editors.get(realm)!
      React.useEffect(() => {
        childMounts++
        const unregister = editor.registerUpdateListener(() => undefined)
        return () => {
          childCleanups++
          unregister()
        }
      }, [editor])
      return <div>ready</div>
    }

    const view = render(
      <React.StrictMode>
        <RealmWithPlugins plugins={[plugin]}>
          <ConsumerChild />
        </RealmWithPlugins>
      </React.StrictMode>
    )

    await waitFor(() => {
      expect(view.getByText('ready')).toBeInTheDocument()
    })
    expect(setups).toBeGreaterThanOrEqual(2)
    expect(disposals).toBe(setups - 1)
    expect(childMounts).toBe(2)
    expect(childCleanups).toBe(1)

    view.unmount()
    expect(disposals).toBe(setups)
    expect(childCleanups).toBe(childMounts)
  })
})
