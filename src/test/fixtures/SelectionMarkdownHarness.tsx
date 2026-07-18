import { $isTextNode, SerializedTextNode, TextNode } from 'lexical'
import type * as Mdast from 'mdast'
import type { MdxJsxFlowElement } from 'mdast-util-mdx'
import React from 'react'
import {
  addExportVisitor$,
  AdmonitionDirectiveDescriptor,
  codeBlockPlugin,
  directivesPlugin,
  diffSourcePlugin,
  frontmatterPlugin,
  headingsPlugin,
  imagePlugin,
  JsxComponentDescriptor,
  jsxPlugin,
  LexicalExportVisitor,
  linkPlugin,
  listsPlugin,
  MDXEditor,
  MDXEditorMethods,
  NestedLexicalEditor,
  realmPlugin,
  tablePlugin,
  thematicBreakPlugin,
  useCodeBlockEditorContext
} from '../..'
import type { CodeBlockEditorDescriptor, CodeBlockEditorProps } from '../..'

export const selectionMarkdownFixture = `---
fixture: selection
---

# Selection Markdown Fixture

Plain alpha bravo charlie.

Formatting **boldword** and *italicword* and \`codeword\`.

Partial [linked text](https://example.com/selection).

First block alpha.

Second block bravo.

1. Ordered alpha
   1. Nested ordered beta
2. Ordered gamma

* [ ] Task pending
* [x] Task complete

Atomic start marker.

| Name | Value |
| ---- | ----- |
| Table | Stable |

***

\`\`\`js
const selected = true
\`\`\`

![Selection image](/favicon.svg "Selection title")

:::note
Directive selection content.
:::

<Grid>
Nested JSX selection content with **nested bold**.
</Grid>

Atomic end marker.
`

const secondaryMarkdownFixture = `Secondary plain text.

* Secondary item
`

const NestedGridEditor = () => (
  <div data-testid="selection-nested-editor" style={{ border: '1px solid #999', padding: 8 }}>
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
    source: './selection-components',
    props: [],
    hasChildren: true,
    Editor: NestedGridEditor
  }
]

const SelectionCodeBlockEditor: React.FC<CodeBlockEditorProps> = ({ code }) => {
  const codeBlockEditor = useCodeBlockEditorContext()
  return (
    <textarea
      aria-label="Selection code block"
      defaultValue={code}
      onChange={(event) => {
        codeBlockEditor.setCode(event.target.value)
      }}
      onKeyDown={(event) => {
        event.nativeEvent.stopImmediatePropagation()
      }}
    />
  )
}

const codeBlockEditorDescriptor: CodeBlockEditorDescriptor = {
  priority: 0,
  match: () => true,
  Editor: SelectionCodeBlockEditor
}

const UppercaseTextVisitor: LexicalExportVisitor<TextNode, Mdast.Text> = {
  priority: 100,
  testLexicalNode: $isTextNode,
  visitLexicalNode: ({ lexicalNode, mdastParent, actions }) => {
    actions.appendToParent(mdastParent, { type: 'text', value: lexicalNode.getTextContent().toUpperCase() })
  }
}

class SelectionReplacementTextNode extends TextNode {
  static getType(): string {
    return 'selection-replacement-text'
  }

  static clone(node: SelectionReplacementTextNode): SelectionReplacementTextNode {
    return new SelectionReplacementTextNode(node.__text, node.__key)
  }

  static importJSON(serializedNode: SerializedTextNode): SelectionReplacementTextNode {
    return new SelectionReplacementTextNode(serializedNode.text).updateFromJSON(serializedNode)
  }
}

const ReplacementTextVisitor: LexicalExportVisitor<SelectionReplacementTextNode, Mdast.Text> = {
  priority: 110,
  testLexicalNode: (node): node is SelectionReplacementTextNode => node instanceof SelectionReplacementTextNode,
  visitLexicalNode: ({ lexicalNode, mdastParent, actions }) => {
    actions.appendToParent(mdastParent, {
      type: 'text',
      value: `replacement:${lexicalNode.getTextContent().toUpperCase()}`
    })
  }
}

const uppercaseSelectionPlugin = realmPlugin({
  init(realm) {
    realm.pub(addExportVisitor$, [ReplacementTextVisitor, UppercaseTextVisitor])
  }
})

const preserveSelection = (event: React.MouseEvent<HTMLButtonElement>) => {
  event.preventDefault()
}

export const SelectionMarkdownHarness = () => {
  const primaryRef = React.useRef<MDXEditorMethods>(null)
  const secondaryRef = React.useRef<MDXEditorMethods>(null)
  const sourceRef = React.useRef<MDXEditorMethods>(null)
  const diffRef = React.useRef<MDXEditorMethods>(null)
  const [primarySelection, setPrimarySelection] = React.useState('')
  const [secondarySelection, setSecondarySelection] = React.useState('')
  const [primaryMarkdown, setPrimaryMarkdown] = React.useState('')
  const [secondaryFullMarkdown, setSecondaryFullMarkdown] = React.useState('')
  const [sourceSelection, setSourceSelection] = React.useState('not-read')
  const [diffSelection, setDiffSelection] = React.useState('not-read')
  const [primaryChanges, setPrimaryChanges] = React.useState(0)
  const [secondaryChanges, setSecondaryChanges] = React.useState(0)
  const [error, setError] = React.useState('')

  const primaryPlugins = React.useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      linkPlugin(),
      tablePlugin(),
      thematicBreakPlugin(),
      codeBlockPlugin({ codeBlockEditorDescriptors: [codeBlockEditorDescriptor] }),
      imagePlugin({ disableImageResize: true }),
      frontmatterPlugin(),
      directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
      jsxPlugin({ jsxComponentDescriptors }),
      diffSourcePlugin({ diffMarkdown: '# Previous selection fixture' })
    ],
    []
  )

  const secondaryPlugins = React.useMemo(() => [listsPlugin(), uppercaseSelectionPlugin()], [])

  return (
    <main>
      <h1>Selection Markdown fixture ready</h1>

      <div role="group" aria-label="Primary selection controls">
        <button
          type="button"
          onMouseDown={preserveSelection}
          onClick={() => {
            setPrimarySelection(primaryRef.current?.getSelectionMarkdown() ?? '')
          }}
        >
          Read primary selection
        </button>
        <button
          type="button"
          onMouseDown={preserveSelection}
          onClick={() => {
            setPrimaryMarkdown(primaryRef.current?.getMarkdown() ?? '')
          }}
        >
          Read primary Markdown
        </button>
      </div>

      <section aria-label="Primary selection editor" data-testid="selection-primary-editor">
        <MDXEditor
          ref={primaryRef}
          markdown={selectionMarkdownFixture}
          plugins={primaryPlugins}
          onChange={() => {
            setPrimaryChanges((count) => count + 1)
          }}
          onError={({ error: nextError }) => {
            setError(nextError)
          }}
        />
      </section>

      <pre aria-label="Primary selection result">{primarySelection}</pre>
      <pre aria-label="Primary full Markdown">{primaryMarkdown}</pre>
      <output aria-label="Primary change count">{primaryChanges}</output>

      <div role="group" aria-label="Secondary selection controls">
        <button
          type="button"
          onMouseDown={preserveSelection}
          onClick={() => {
            setSecondarySelection(secondaryRef.current?.getSelectionMarkdown() ?? '')
          }}
        >
          Read secondary selection
        </button>
        <button
          type="button"
          onMouseDown={preserveSelection}
          onClick={() => {
            setSecondaryFullMarkdown(secondaryRef.current?.getMarkdown() ?? '')
          }}
        >
          Read secondary Markdown
        </button>
      </div>

      <section aria-label="Secondary selection editor" data-testid="selection-secondary-editor">
        <MDXEditor
          ref={secondaryRef}
          markdown={secondaryMarkdownFixture}
          plugins={secondaryPlugins}
          additionalLexicalNodes={[
            SelectionReplacementTextNode,
            {
              replace: TextNode,
              with: (node: TextNode) => new SelectionReplacementTextNode(node.getTextContent()),
              withKlass: SelectionReplacementTextNode
            }
          ]}
          toMarkdownOptions={{ bullet: '+' }}
          onChange={() => {
            setSecondaryChanges((count) => count + 1)
          }}
          onError={({ error: nextError }) => {
            setError(nextError)
          }}
        />
      </section>

      <pre aria-label="Secondary selection result">{secondarySelection}</pre>
      <pre aria-label="Secondary full Markdown">{secondaryFullMarkdown}</pre>
      <output aria-label="Secondary change count">{secondaryChanges}</output>

      <section aria-label="Source mode selection editor">
        <MDXEditor ref={sourceRef} markdown="Source mode content." plugins={[diffSourcePlugin({ viewMode: 'source' })]} />
        <button
          type="button"
          onClick={() => {
            setSourceSelection(sourceRef.current?.getSelectionMarkdown() ?? '')
          }}
        >
          Read source selection
        </button>
        <pre aria-label="Source selection result">{sourceSelection}</pre>
      </section>

      <section aria-label="Diff mode selection editor">
        <MDXEditor
          ref={diffRef}
          markdown="Current diff content."
          plugins={[diffSourcePlugin({ viewMode: 'diff', diffMarkdown: 'Previous diff content.' })]}
        />
        <button
          type="button"
          onClick={() => {
            setDiffSelection(diffRef.current?.getSelectionMarkdown() ?? '')
          }}
        >
          Read diff selection
        </button>
        <pre aria-label="Diff selection result">{diffSelection}</pre>
      </section>

      <pre aria-label="Selection error">{error}</pre>
    </main>
  )
}
