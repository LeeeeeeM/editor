import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { Cell, useCellValue } from '@mdxeditor/gurx'
import type * as Mdast from 'mdast'
import type { MdxJsxFlowElement } from 'mdast-util-mdx'
import React from 'react'
import { $getRoot, SerializedTextNode, TextNode, type LexicalEditor } from 'lexical'
import {
  activeEditor$,
  addComposerChild$,
  addExportVisitor$,
  addImportVisitor$,
  addLexicalNode$,
  addNestedEditorChild$,
  addTableCellEditorChild$,
  JsxComponentDescriptor,
  LexicalExportVisitor,
  MdastImportVisitor,
  MDXEditor,
  MDXEditorMethods,
  NestedLexicalEditor,
  realmPlugin,
  tablePlugin,
  jsxPlugin,
  toolbarPlugin,
  UndoRedo
} from '../..'

const extensionCompatibilityMarkdown = `Custom consumer text.

Root history text.

<Grid>
Nested A text.
<Grid>
Deep nested text.
</Grid>
</Grid>

<Grid>
Nested B text.
</Grid>

| Name |
| ---- |
| Table text |
`

class ConsumerTextNode extends TextNode {
  static getType() {
    return 'extension-consumer-text'
  }

  static clone(node: ConsumerTextNode) {
    return new ConsumerTextNode(node.__text, node.__key)
  }

  static importJSON(serializedNode: SerializedTextNode) {
    return new ConsumerTextNode(serializedNode.text).updateFromJSON(serializedNode)
  }
}

const ConsumerTextVisitor: LexicalExportVisitor<ConsumerTextNode, Mdast.Text> = {
  priority: 1000,
  testLexicalNode: (node): node is ConsumerTextNode => node instanceof ConsumerTextNode,
  visitLexicalNode: ({ lexicalNode, mdastParent, actions }) => {
    const value = lexicalNode.getTextContent()
    actions.appendToParent(mdastParent, {
      type: 'text',
      value: value === 'Custom consumer text.' ? `consumer:${value}` : value
    })
  }
}

const ConsumerTextImportVisitor: MdastImportVisitor<Mdast.Text> = {
  priority: 1000,
  testNode: (node) => node.type === 'text' && node.value === 'Custom consumer text.',
  visitNode: ({ mdastNode, actions }) => {
    const node = new ConsumerTextNode(mdastNode.value)
    node.setFormat(actions.getParentFormatting())
    const style = actions.getParentStyle()
    if (style !== '') {
      node.setStyle(style)
    }
    actions.addAndStepInto(node)
  }
}

const consumerRealmId$ = Cell('uninitialized')
const consumerRealmInitCount$ = Cell(0)
const consumerRealmInitCounts = new WeakMap<object, number>()
let nextRealmId = 0

type Surface = 'root' | 'nested' | 'table'
interface ProbeContextValue {
  mount: (surface: Surface, editor: LexicalEditor) => void
  cleanup: (surface: Surface, editor: LexicalEditor) => void
  editorId: (editor: LexicalEditor) => number
}

const ProbeContext = React.createContext<ProbeContextValue | null>(null)

function ComposerProbe({ surface }: { surface: Surface }) {
  const [editor] = useLexicalComposerContext()
  const realmId = useCellValue(consumerRealmId$)
  const realmInitCount = useCellValue(consumerRealmInitCount$)
  const activeEditor = useCellValue(activeEditor$)
  const context = React.useContext(ProbeContext)!

  React.useEffect(() => {
    context.mount(surface, editor)
    return () => {
      context.cleanup(surface, editor)
    }
  }, [context, editor, surface])

  return (
    <output
      data-testid={`extension-${surface}-probe`}
      data-editor-id={context.editorId(editor)}
      data-parent-editor-id={editor._parentEditor ? context.editorId(editor._parentEditor) : undefined}
      data-active-editor-id={activeEditor ? context.editorId(activeEditor) : undefined}
      data-plugin-init-count={realmInitCount}
    >
      {surface}:{realmId}
    </output>
  )
}

const RootProbe = () => <ComposerProbe surface="root" />
const NestedProbe = () => <ComposerProbe surface="nested" />
const TableProbe = () => <ComposerProbe surface="table" />

const consumerPlugin = realmPlugin({
  init(realm) {
    const initCount = (consumerRealmInitCounts.get(realm) ?? 0) + 1
    consumerRealmInitCounts.set(realm, initCount)
    realm.pub(consumerRealmId$, `realm-${++nextRealmId}`)
    realm.pub(consumerRealmInitCount$, initCount)
    realm.pub(addLexicalNode$, ConsumerTextNode)
    realm.pub(addImportVisitor$, ConsumerTextImportVisitor)
    realm.pub(addExportVisitor$, ConsumerTextVisitor)
    realm.pub(addComposerChild$, RootProbe)
    realm.pub(addNestedEditorChild$, NestedProbe)
    realm.pub(addTableCellEditorChild$, TableProbe)
  }
})

const NestedGridEditor = () => (
  <div data-testid="extension-nested-editor">
    <NestedLexicalEditor<MdxJsxFlowElement>
      block
      getContent={(node) => node.children}
      getUpdatedMdastNode={(node, children) => ({ ...node, children: children as MdxJsxFlowElement['children'] })}
    />
  </div>
)

const jsxComponentDescriptors: JsxComponentDescriptor[] = [
  {
    name: 'Grid',
    kind: 'flow',
    props: [],
    hasChildren: true,
    Editor: NestedGridEditor
  }
]

type ProbeStats = Record<Surface, { mounts: number; cleanups: number }>
const emptyProbeStats = (): ProbeStats => ({
  root: { mounts: 0, cleanups: 0 },
  nested: { mounts: 0, cleanups: 0 },
  table: { mounts: 0, cleanups: 0 }
})

export const ExtensionCompatibilityHarness = () => {
  const editorRef = React.useRef<MDXEditorMethods>(null)
  const editorIds = React.useRef(new WeakMap<LexicalEditor, number>())
  const nextEditorId = React.useRef(0)
  const staleEditors = React.useRef(new Map<number, LexicalEditor>())
  const publicRefIds = React.useRef(new WeakMap<object, number>())
  const nextPublicRefId = React.useRef(0)
  const [mounted, setMounted] = React.useState(true)
  const [generation, setGeneration] = React.useState(1)
  const [strictMode, setStrictMode] = React.useState(false)
  const [suppressed, setSuppressed] = React.useState(false)
  const [readOnly, setReadOnly] = React.useState(false)
  const [currentMarkdown, setCurrentMarkdown] = React.useState(extensionCompatibilityMarkdown.trim())
  const [readMarkdown, setReadMarkdown] = React.useState('')
  const [error, setError] = React.useState('')
  const [probeStats, setProbeStats] = React.useState<ProbeStats>(emptyProbeStats)
  const [publicRefId, setPublicRefId] = React.useState<number | null>(null)
  const [staleEditorSnapshot, setStaleEditorSnapshot] = React.useState<{ id: number; text: string }[]>([])
  const [layoutRefReady, setLayoutRefReady] = React.useState(false)
  const [effectRefReady, setEffectRefReady] = React.useState(false)

  React.useLayoutEffect(() => {
    setLayoutRefReady(mounted && editorRef.current !== null)
  }, [generation, mounted, strictMode, suppressed])
  React.useEffect(() => {
    setEffectRefReady(mounted && editorRef.current !== null)
  }, [generation, mounted, strictMode, suppressed])

  const editorId = React.useCallback((editor: LexicalEditor) => {
    let id = editorIds.current.get(editor)
    if (!id) {
      id = ++nextEditorId.current
      editorIds.current.set(editor, id)
    }
    return id
  }, [])
  const mount = React.useCallback(
    (surface: Surface, editor: LexicalEditor) => {
      editorId(editor)
      setProbeStats((stats) => ({
        ...stats,
        [surface]: { ...stats[surface], mounts: stats[surface].mounts + 1 }
      }))
    },
    [editorId]
  )
  const cleanup = React.useCallback(
    (surface: Surface, editor: LexicalEditor) => {
      staleEditors.current.set(editorId(editor), editor)
      setProbeStats((stats) => ({
        ...stats,
        [surface]: { ...stats[surface], cleanups: stats[surface].cleanups + 1 }
      }))
    },
    [editorId]
  )
  const probeContext = React.useMemo(() => ({ mount, cleanup, editorId }), [cleanup, editorId, mount])
  const plugins = React.useMemo(
    () => [consumerPlugin(), jsxPlugin({ jsxComponentDescriptors }), tablePlugin(), toolbarPlugin({ toolbarContents: () => <UndoRedo /> })],
    []
  )

  const remountInMode = (nextSuppressed: boolean) => {
    setSuppressed(nextSuppressed)
    setGeneration((value) => value + 1)
    setMounted(true)
    setCurrentMarkdown(extensionCompatibilityMarkdown.trim())
    setReadMarkdown('')
  }

  const editor = mounted ? (
    <section data-testid="extension-root-editor">
      <MDXEditor
        key={`${generation}-${suppressed}-${strictMode}`}
        ref={editorRef}
        markdown={extensionCompatibilityMarkdown}
        plugins={plugins}
        readOnly={readOnly}
        suppressSharedHistory={suppressed}
        onChange={(markdown) => {
          setCurrentMarkdown(markdown)
        }}
        onError={({ error: nextError }) => {
          setError(nextError)
        }}
      />
    </section>
  ) : null

  return (
    <ProbeContext.Provider value={probeContext}>
      <main>
        <h1>Extension compatibility fixture ready</h1>
        <div role="group" aria-label="Extension controls">
          <button
            type="button"
            onClick={() => {
              setReadMarkdown(editorRef.current?.getMarkdown() ?? '')
            }}
          >
            Read extension Markdown
          </button>
          <button
            type="button"
            onClick={() => {
              setReadOnly((value) => !value)
            }}
          >
            Toggle extension read only
          </button>
          <button
            type="button"
            onClick={() => {
              setMounted(false)
            }}
          >
            Unmount extension editor
          </button>
          <button
            type="button"
            onClick={() => {
              remountInMode(suppressed)
            }}
            disabled={mounted}
          >
            Remount extension editor
          </button>
          <button
            type="button"
            onClick={() => {
              remountInMode(false)
            }}
          >
            Use normal history
          </button>
          <button
            type="button"
            onClick={() => {
              remountInMode(true)
            }}
          >
            Use suppressed root history
          </button>
          <button
            type="button"
            onClick={() => {
              setStrictMode(true)
              setGeneration((value) => value + 1)
            }}
            disabled={strictMode}
          >
            Enable extension Strict Mode
          </button>
          <button
            type="button"
            onClick={() => {
              const methods = editorRef.current
              if (!methods) {
                setPublicRefId(null)
                return
              }
              let id = publicRefIds.current.get(methods)
              if (!id) {
                id = ++nextPublicRefId.current
                publicRefIds.current.set(methods, id)
              }
              setPublicRefId(id)
            }}
          >
            Capture extension public ref
          </button>
          <button
            type="button"
            onClick={() => {
              setStaleEditorSnapshot(
                [...staleEditors.current].map(([id, staleEditor]) => ({
                  id,
                  text: staleEditor.getEditorState().read(() => $getRoot().getTextContent())
                }))
              )
            }}
          >
            Inspect stale extension editors
          </button>
        </div>

        <output aria-label="Extension mode">{suppressed ? 'suppressed' : 'normal'}</output>
        <output aria-label="Extension React mode">{strictMode ? 'strict' : 'standard'}</output>
        <output aria-label="Extension generation">{generation}</output>
        <output aria-label="Extension public ref id">{publicRefId ?? ''}</output>
        <output aria-label="Extension layout ref ready">{String(layoutRefReady)}</output>
        <output aria-label="Extension effect ref ready">{String(effectRefReady)}</output>
        <pre aria-label="Extension probe stats">{JSON.stringify(probeStats)}</pre>
        <pre aria-label="Extension stale editor snapshot">{JSON.stringify(staleEditorSnapshot)}</pre>
        <pre aria-label="Extension current Markdown">{currentMarkdown}</pre>
        <pre aria-label="Extension read Markdown">{readMarkdown}</pre>
        <pre aria-label="Extension error">{error}</pre>

        {strictMode ? <React.StrictMode>{editor}</React.StrictMode> : editor}
      </main>
    </ProbeContext.Provider>
  )
}
