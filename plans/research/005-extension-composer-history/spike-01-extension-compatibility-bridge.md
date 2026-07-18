# Spike 01: Can Extension-Built Editors Preserve the Existing React and Shared-History Bridge?

## Status

CONCLUSIVE

## Question

Can Lexical 0.48 build root and nested editors through extensions while ordinary React composer children still receive the expected editor context and nested editors share the root history without consumer plugins adopting Lexical extensions?

## Why It Blocks Planning

R5 may replace internal editor construction only if existing Gurx registrations such as `addComposerChild$`, `addNestedEditorChild$`, and `addTableCellEditorChild$` can continue rendering ordinary React plugin components. The same architecture must provide a real parent-editor relationship and one shared history state for root and nested editors; otherwise R5 would require a public plugin-contract change or a different decomposition.

## Hypotheses and Decision Rule

- If `LexicalExtensionEditorComposer` provides the normal React composer context for extension-built root/nested editors and `NestedEditorExtension` plus `SharedHistoryExtension` shares history and undo behavior, use an internal compatibility bridge and preserve the public Gurx API.
- If React children cannot consume the normal context or history cannot cross editors, do not finalize the planned migration; replan R5 instead of exposing Lexical extensions publicly.
- If the result is mixed, mark the spike inconclusive and do not guess.

## Minimal Experiment

- **Environment and exact versions**: repository install at Lexical/@lexical 0.48.0, React 19.2.1, Node 24.18.0, jsdom.
- **Setup**: build a root editor from `ReactProviderExtension`, configured `ReactExtension`, and configured `HistoryExtension`; build a nested editor from the same React bridge plus configured `NestedEditorExtension` and `SharedHistoryExtension`.
- **Action**: render ordinary React children under `LexicalExtensionEditorComposer`; compare captured editor identities, parent linkage, history-state identity, editability, and nested/cross-editor Undo results after tagged updates.
- **Observation to capture**: React context identities, `_parentEditor`, shared `HistoryState`, text before/after Undo, and editor disposal.
- **Safety and side-effect constraints**: disposable script and `node_modules` symlink under `/private/tmp`; no repository source or dependency mutation.

## Evidence

- **Command run**: `node /private/tmp/mdx-r5-extension-spike.SsWECe/spike.mjs`
- **Relevant output summary**: React children captured the exact root and nested editors; the nested editor referenced the root parent and inherited editability; both `HistoryExtension` outputs referenced the supplied shared state; Undo changed nested text from `nested-two` to `nested-one`, and later crossed to root from `root-two` to `root-one`.
- **Exact installed sources**: `node_modules/@lexical/react/src/LexicalExtensionEditorComposer.tsx`, `node_modules/@lexical/extension/src/NestedEditorExtension.ts`, and `node_modules/@lexical/history/src/index.ts`.

## Result

- **Outcome**: CONCLUSIVE
- **Observed behavior**: extension-built editors retain the standard React composer context, explicit parent relationship, shared history identity, inherited editability, and nested/cross-editor Undo behavior. `dispose()` is available for deterministic cleanup.
- **Decision**: build root, nested JSX/directive, and table-cell editors through stable internal extension definitions; render current React children under `LexicalExtensionEditorComposer`; configure root/local history and nested shared history internally; preserve Gurx/plugin/visitor APIs unchanged.
- **Rejected alternatives**: requiring consumers to author Lexical extensions; retaining manual `createEditor` plus legacy composer/history plugins as the final R5 architecture; using `ReactPluginHostExtension`, which is intended for editors not already rendered through React and would add a second React root/portal lifecycle.
- **Representativeness limits**: the spike proves the bridge primitives and history lifecycle in jsdom, not MDXEditor's Markdown synchronization, focus/blur commands, table navigation, Strict Mode, or browser behavior. R5 requires focused lifecycle tests and the complete public three-browser matrix.

## Planning Impact

- **Roadmap or PRP sections/tasks/tests changed by this result**: R5 can remain one bounded PRP. Its implementation blueprint can use one internal extension factory/bridge for root and nested editor construction, with editor disposal and separate table-history behavior explicitly characterized.
- **Consumer Contract or evidence change**: `CX-7` remains DIRECT REQUIRED through a minimal extension-agnostic consumer plugin; the inherited `CX-1`–`CX-6` matrix remains the regression boundary.
- **Remaining uncertainty**: exact helper/file placement and whether table cells use local `HistoryExtension` or shared history are reversible implementation details, but current table Undo/navigation behavior must remain directly tested.

## Cleanup

- **Disposable artifacts removed**: `/private/tmp/mdx-r5-extension-spike.SsWECe` after recording.
- **Repository and external state checked**: only this spike record is retained; no dependency, service, port, or external state was changed.
