---
repo: /Users/petyo/w/mdx-editor/editor
---

# PRP: Extension-Based Composer and History Internals

## Goal

Build root, nested JSX/directive, and table-cell editors through Lexical 0.48 extension builder/composer APIs, replacing legacy React history plugins with `HistoryExtension`/`SharedHistoryExtension`.

Keep public React/ref, Gurx plugin/cell/signal, Markdown visitor, composer-child, selection, search, and editor behavior source-compatible. Consumer plugins need not understand Lexical extensions.

## Why

- Root and nested editors duplicate node/theme/parent/history/lifecycle assembly across manual `createEditor`, custom context, `LexicalNestedComposer`, and React history paths.
- Lexical 0.48 supplies an extension composer plus parent-editor and shared-history extensions that replace legacy nested-composer mutation.
- R1-R4 provide direct package, browser, selection, and search invariants for this architectural change.
- An internal adapter keeps the documented Gurx extension model authoritative.

## Success Criteria

- [x] Root, nested JSX/directive, and table-cell editors are created by stable internal Lexical extensions and rendered through the extension React composer context, with deterministic disposal on mounted-editor teardown.
- [x] Root/nested history uses `HistoryExtension`/`SharedHistoryExtension`; table cells retain their current local-history behavior; Undo/Redo commands, availability, focus routing, and `suppressSharedHistory` behavior remain observable-compatible.
- [x] Consumer `realmPlugin` registrations for nodes, Markdown import/export visitors, root/nested/table React composer children, cells/signals, and active-editor subscriptions work without consumer adoption of Lexical extensions.
- [x] Public `MDXEditor`, `MDXEditorMethods`, props, Gurx/plugin/visitor exports, Markdown results, root/nested focus, selection export, and Find/Replace behavior remain source- and runtime-compatible.
- [x] Direct `CX-7` evidence passes in Chromium, Firefox, and WebKit, and the complete `CX-1`–`CX-6`, package, cross-version, declaration, build, and documentation gates remain green.

## Assurance

- **Profile**: Standard
- **Rationale**: This reversible internal migration changes lifecycle and history across one public boundary. Purpose-built APIs, a conclusive spike, and focused/browser/package gates isolate outcomes; no Deep trigger is evidenced.
- **Load-bearing detail**: near-ceiling detail pins three browser contracts, four history modes, lifecycle pauses, and the final `CX-1`–`CX-7` gate.

## Roadmap Context

- **Parent roadmap**: `plans/roadmaps/001-lexical-048-adoption.md`
- **Roadmap step**: `R5` — move composer and shared-history internals to Lexical extensions.
- **Satisfied dependencies**: R2 directly verified the Lexical 0.48 package/type/browser and 0.35 rollback baseline; R3 directly verified active-editor selection export (`CX-5`); R4 directly verified active-editor state-backed search/history (`CX-6`).
- **Inherited decisions and invariants**: all Lexical packages remain lockstep; public Gurx/plugin/visitor and imperative APIs remain extension-agnostic; the MDAST visitor pipeline remains authoritative; root/nested/table focus and history behavior, selection export, and search scopes must not change.
- **Contract produced for later steps**: direct `CX-7` evidence plus a complete `CX-1`–`CX-7` final checkpoint that can complete the parent roadmap. `@lexical/mdast` remains a separate future initiative.

## Consumer Contract

### Consumer and Public Boundary

- **Consumer(s)**: React 18/19 package integrators; authors editing Markdown/MDX; consumers of `MDXEditorMethods`; authors of MDXEditor Gurx plugins, Lexical nodes, Markdown visitors, and React composer-child components.
- **Public or supported boundary**: the packed `@mdxeditor/editor` package; `MDXEditor` props/ref methods; Markdown input/output; `realmPlugin`; public core cells/signals/appenders; import/export visitor types; root/nested/table contenteditables; ordinary React components registered through composer-child appenders.
- **Entry point and prerequisites**: render `MDXEditor` with documented plugins or a consumer `realmPlugin`, optionally provide custom nodes/visitors/composer children and `suppressSharedHistory`, then edit/read/undo through public UI and methods.
- **Current observable behavior**: Gurx plugins register all nodes/visitors/React children before the core creates editors; the root uses a manual React context and external-history plugin, JSX/directive editors use `LexicalNestedComposer` plus that shared state, and table cells use their own `HistoryPlugin`.
- **Observable promise**: the same extension-agnostic consumer setup initializes, edits, serializes, focuses, searches, exports selections, and undoes/redoes identically while MDXEditor internally uses Lexical extensions and cleans up their registrations.
- **Must remain compatible with**: React 18/19; Lexical 0.48 lockstep; all `MDXEditorProps` including `readOnly`, `editorState`, `lexicalTheme`, `lexicalEditorNamespace`, `additionalLexicalNodes`, and `suppressSharedHistory`; all imperative methods; public Gurx/plugin/visitor exports; R2-R4 `CX-1`–`CX-6`; Markdown readable by published 4.0.4/Lexical 0.35.
- **Not claimed**: a public MDXEditor extension API, consumer migration to Lexical extensions, `@lexical/mdast`, public plugin rewrites, NodeState/DOM extension adoption, new history UX, changed collaboration policy, or byte-identical Markdown where existing canonicalization applies.

### Acceptance Scenarios

<!-- prettier-ignore -->
| ID | Given | When | Then | Exact exercise and prerequisites | Required evidence |
|---|---|---|---|---|---|
| `CX-7a` | A consumer `realmPlugin` registers a replacement/custom Lexical node, Markdown import/export visitors/extensions, a Gurx cell/subscription, and ordinary React children for root, nested, and table editors | A React 18 or 19 consumer renders Markdown containing root, JSX/directive, and table content, edits each surface, and reads through public methods/callbacks | The plugin initializes once per editor realm, each React child receives the correct composer editor, custom content imports/exports, edits persist, and the consumer imports no MDXEditor extension implementation | In the three-browser public fixture, use only exported MDXEditor/Gurx/plugin surfaces and normal `@lexical/react` plugin hooks; assert mount/editor identities and exact Markdown. Extend the packed consumers to typecheck, bundle, render, and read a minimal custom `realmPlugin` | DIRECT REQUIRED |
| `CX-7b` | The public toolbar controls an editor containing root, nested JSX/directive, and table-cell edits, with a second fixture configured with `suppressSharedHistory` | The author moves focus, types, invokes Undo/Redo, changes `readOnly`, and repeats actions in each editor | Normal root/nested shared history and table-local history preserve current ordering and availability; active-editor focus remains correct; the suppressed root has no history while nested external and table-local history retain the current behavior; read-only propagation remains coherent | In Chromium, Firefox, and WebKit, extend the existing `CX-3` journey with explicit command-availability and suppressed-history assertions through visible public controls; assert Markdown after every boundary and no update recursion warning | DIRECT REQUIRED |
| `CX-7c` | An editor with the consumer plugin and nested/table content is mounted under React Strict Mode | The consumer mounts, unmounts, remounts, calls public methods, and edits after remount | The new editor is usable, stale editors do not receive updates or remain active, extension registrations and React children are not duplicated, and no page/console error, listener warning, or retained editor-owned process occurs | In all three engines, toggle the public fixture through two mount cycles; assert fresh realm/editor/ref identities and exact React composer-child mount/cleanup counters (not a nonexistent `RealmPlugin` cleanup); verify Markdown, runtime errors, and server cleanup | DIRECT REQUIRED |

### Authoritative History Sequences

Use distinct atomic markers and compare public Markdown only when it changes; shared stacks may first reapply an already-visible state. Controls reflect `CAN_UNDO_COMMAND`/`CAN_REDO_COMMAND` on the active editor.

- **Normal shared**: from initial `I`, edit root (`R`), nested sibling A (`A`), then sibling B (`B`). With B active, visible Undo states are `R+A`, `R`, `I`; Redo restores `R`, `R+A`, `R+A+B`. Availability is `U:on/R:off` after `B`, both on between endpoints, `U:off/R:on` at `I`, then `U:on/R:off` after full Redo. This pins one root/nested/sibling stack.
- **Suppressed root**: from `I`, edit active root (`R`) while both controls are off and dispatch is a no-op, then nested siblings (`A`, `B`). Nested Undo yields `R+A`, then `R`; Redo restores `R+A`, then `R+A+B`; root `R` never changes. Availability is `U:on/R:off` after `B`, both on after the first visible Undo/Redo, `U:off/R:on` at `R`, and `U:on/R:off` after full Redo. This pins sibling sharing without root history.
- **Table local then parent**: after cell edit `T`, availability is `U:on/R:off`; cell Undo restores its initial rendered value with `U:off/R:on`, and Redo restores `T` with `U:on/R:off`. Blur/save publishes `T` as one root change with `U:on/R:off`; focused-root Undo restores pre-save Markdown with `U:off/R:on`, and Redo restores `T` with `U:on/R:off`. Cell-local commands never traverse root/nested history.

## Research Summary

### Vetted Repository Findings

- `src/RealmWithPlugins.tsx` runs plugin init/post-init during render; `corePlugin.postInit` then builds/publishes root from the complete registry. **Impact**: preserve all-init-then-all-post-init and root availability to later post-init hooks, but move the whole session to commit phase with private cleanup ownership.
- `src/MDXEditor.tsx` manually provides root context; nested/table editors separately use `createEditor`, `LexicalNestedComposer`, and shared/local React history plugins. **Impact**: replace construction/context/history while preserving React child placement, MDAST synchronization, focus/navigation, and table save behavior.
- Public docs/exports include Gurx cells/signals, `realmPlugin`, visitors, nodes, and composer-child appenders; existing browser suites pin Markdown, focus/history, selection, and search. **Impact**: keep the factory private, add direct `CX-7`, and rerun inherited scenarios.
- `@lexical/extension` and `@lexical/history` are transitive while the build externalizes declared dependencies. **Impact**: declare both at `^0.48.0` and retain lockstep/package gates.

### External Constraints

- Lexical React 0.48 `LexicalExtensionEditorComposer` renders an already extension-built editor through the normal `LexicalComposerContext`, leaves lifecycle ownership to the caller, and requires `ReactProviderExtension` plus `ReactExtension` — [official 0.48 source](https://github.com/facebook/lexical/blob/v0.48.0/packages/lexical-react/src/LexicalExtensionEditorComposer.tsx).
- Lexical Extension 0.48 `NestedEditorExtension` sets `parentEditor`, inherits theme, and can mirror parent editability; `buildEditorFromExtensions` returns a `LexicalEditorWithDispose` — [nested extension](https://github.com/facebook/lexical/blob/v0.48.0/packages/lexical-extension/src/NestedEditorExtension.ts), [builder](https://github.com/facebook/lexical/blob/v0.48.0/packages/lexical-extension/src/LexicalBuilder.ts).
- Lexical History 0.48 `HistoryExtension` exposes the history state and undo/redo signals; `SharedHistoryExtension` redirects nested history to the parent extension when available — [official 0.48 history source](https://github.com/facebook/lexical/blob/v0.48.0/packages/lexical-history/src/index.ts).

### Settled Decisions and Rejected Alternatives

- **Decision**: add one internal factory receiving the complete nodes, theme, namespace, editability, parent, and history mode and returning a disposable editor — **Rationale**: the spike proves the common bridge; one factory prevents divergent configurations.
- **Decision**: `RealmWithPlugins` creates a fresh session in a commit-phase effect, runs all init then all post-init, exposes children only after setup, and invokes private exactly-once disposers on cleanup. Nested/table owners likewise create and dispose one editor per effect setup. **Rationale**: the Strict Mode spike proves replay does not render or leak the discarded session and never reuses a disposed editor; no public `RealmPlugin` cleanup is added.
- **Decision**: render existing root/nested/table React plugin components under `LexicalExtensionEditorComposer`; keep `RichTextPlugin`, content-editable wrappers, toolbars/dialogs, and Gurx appenders as ordinary React children — **Rationale**: preserves the supported component contract while moving only editor construction/lifecycle to extensions.
- **Decision**: root history uses the existing `historyState$`; normal nested editors use `SharedHistoryExtension`; when root history is suppressed, nested editors continue consuming the external state as they do today; table cells retain local `HistoryExtension` — **Evidence/rationale**: source characterization preserves `suppressSharedHistory` and table behavior rather than silently redefining collaboration/history policy.
- **Decision**: add `@lexical/extension` and `@lexical/history` as direct lockstep dependencies — **Rationale**: production imports must not rely on `@lexical/react` transitive dependencies and the Vite build externalizes declared packages.
- **Rejected**: expose MDXEditor's internal extensions or require consumer plugins to become Lexical extensions — **Reason**: violates the roadmap's public extensibility invariant and would turn R5 into a breaking migration.
- **Rejected**: `ReactPluginHostExtension` — **Reason**: it is intended for editors not already hosted by React and adds a second React-root/portal lifecycle that MDXEditor does not need.
- **Rejected**: migrate Markdown conversion to `@lexical/mdast` or rewrite Gurx plugins — **Reason**: separate architecture/public-contract initiatives explicitly outside this roadmap.

### Spike Evidence

- `plans/research/005-extension-composer-history/spike-01-extension-compatibility-bridge.md` — **Question**: can extension-built root/nested editors preserve ordinary React children and shared history? — **Result/decision**: CONCLUSIVE; exact editor context, parent identity, editability, shared state, nested Undo, cross-editor Undo, and disposal worked — **Limits**: MDXEditor synchronization, table navigation, Strict Mode, and real browsers remain direct execution evidence.
- `plans/research/005-extension-composer-history/spike-02-strict-realm-session.md` — **Question**: can a commit-phase realm session own extension editors under Strict Mode? — **Result/decision**: CONCLUSIVE; replay created/disposed an abandoned session, rendered only the live session, and disposed both editors exactly once — **Limit**: actual Lexical unregister-after-dispose remains focused execution evidence.

### Research and Validation Coverage

- **Depth/confidence**: Standard/HIGH. Inspected the verified R2-R4 contracts; public exports/docs; realm and root/nested/table lifecycles; history commands/state; exact 0.48 builder, React, nested, and history sources; and package/test surfaces. Collaboration/Yjs, source/diff internals, `@lexical/mdast`, device farms, and unrelated rewrites remain outside scope.
- **Current baseline**: `npm run typecheck` and `git diff --check` pass. R4 records 65 passed/1 skipped/1 todo units, 45/45 browser tests, build, a 24-package Lexical lockstep graph, React 18/19 packed consumers, 0.35 replay, and API docs. The exact-0.48 spike passed its React context, parent/editability, shared-history, Undo, and disposal probes.

## Execution Contract

- **Planned at commit**: `9373742`
- **Planning baseline**: verified, intentionally uncommitted R1-R4 work plus `plans/`, `reports/`, browser/package harnesses, and the new R5 spike record must be preserved. R5 generation must not overwrite overlapping changes in `src/MDXEditor.tsx`, `package.json`, or `package-lock.json`; those are verified R2/R3 inputs to extend carefully.

### Expected Changes

- `package.json`, `package-lock.json` — add direct lockstep `@lexical/extension` and `@lexical/history` dependencies.
- `src/plugins/core/lexicalExtensions.ts` (or a comparably scoped internal file) — stable extension definitions/factory for root, shared nested, suppressed-root nested, and table-local history modes.
- `src/RealmWithPlugins.tsx`, `src/plugins/core/index.ts`, `src/MDXEditor.tsx` — commit-phase realm ownership, private cleanup registration, root creation/publication, extension composer rendering, and teardown.
- `src/plugins/core/NestedLexicalEditor.tsx`, `src/plugins/table/TableEditor.tsx` — extension-build nested/table editors while preserving MDAST synchronization, focus/navigation commands, React children, and teardown.
- `src/plugins/core/SharedHistoryPlugin.tsx` — remove after all callers use extension history.
- `src/test/extension-composer.test.tsx` — focused construction, node registry, history-mode, prop, lifecycle, and cleanup tests.
- `src/test/fixtures/ExtensionCompatibilityHarness.tsx`, `src/examples/extension-compatibility.tsx`, `tests/browser/extension-compatibility.spec.ts` — public extension-agnostic `CX-7a`–`CX-7c` evidence.
- `tests/package-consumer/shared/src/main.tsx`, `docs/extending-the-editor.md` — exercise/document that custom Gurx plugins remain the public model.

### Explicitly Out of Scope

- Exporting internal Lexical extensions, changing consumer plugin signatures, or requiring plugins/composer children to use extension APIs.
- `@lexical/mdast`, visitor removal/replacement, NodeState, DOM import/render extensions, Yjs/collaboration redesign, stock table-node migration, or unrelated plugin conversion.
- New Undo/Redo UI, history-depth policy, cross-document history, changed `suppressSharedHistory` semantics, or table behavior redesign.
- Public API removals, Markdown schema changes, React/Node support changes, or any Lexical version beyond 0.48.0.

### Scope Expansion Rule

Additional lifecycle/test/documentation files may change only when direct `CX-7` or inherited `CX-1`–`CX-6` evidence requires them for the same extension-internal compatibility contract. Record each path and reason in Execution Notes. Pause before any public extension export, Gurx/visitor contract change, collaboration/history policy change, MDAST migration, or behavior change not already pinned by the scenarios.

### Pause and Reassess If

- A consumer composer child cannot receive the normal Lexical React context without adopting an extension API or a second React root.
- Complete consumer node/replacement registrations are unavailable before extension construction, or root publication must move in a way that changes initial Markdown, ref readiness, or plugin initialization order.
- Nested/table extension construction cannot preserve parent synchronization, active-editor focus, read-only propagation, or the characterized history modes.
- Correct disposal requires changing the public `RealmPlugin` interface or causes duplicate registration under React Strict Mode.
- Any inherited `CX-1`–`CX-6` failure requires a public API/Markdown behavior change rather than a bounded internal correction.

## Context

### Key Files

- `src/RealmWithPlugins.tsx`, `src/plugins/core/index.ts`, `src/MDXEditor.tsx` — plugin ordering, root construction/publication, React context, public props/ref methods, and teardown.
- `src/plugins/core/NestedLexicalEditor.tsx`, `src/plugins/table/TableEditor.tsx` — child construction, MDAST synchronization, focus/navigation, history, and consumer children.
- `src/plugins/toolbar/components/UndoRedo.tsx` — public command/availability behavior; it must not adopt internal extension signals.
- `src/test/fixtures/LexicalCompatibilityHarness.tsx`, `tests/browser/lexical-compatibility.spec.ts` — inherited root/nested/table/history journey.
- `plans/research/005-extension-composer-history/spike-01-extension-compatibility-bridge.md` — selected bridge evidence.

### Gotchas

- `LexicalExtensionEditorComposer` does not own the supplied editor; every mounted root/nested/table editor needs exactly-once `dispose()` cleanup after React/plugin children unmount.
- Extension arguments must be stable. Recreating them during render recreates editor state and registrations; derive them once from the post-init node/theme/namespace/history snapshot.
- `NestedEditorExtension` must receive the real parent editor during construction. Relying on later private `_parentEditor` mutation would retain the architecture R5 exists to remove.
- `ReactExtension` renders a default `ContentEditable`; configure its content editable to `null` because MDXEditor already owns wrappers, placeholders, refs, styling, and `RichTextPlugin`.
- Consumer node replacements must be present when the builder constructs each editor. Adding classes after construction is not a supported fallback.
- Do not replace command-driven Undo/Redo with public extension signals. `UndoRedo` and consumer command listeners are existing observable APIs; extension history must continue dispatching their availability commands.
- Preserve current history modes: normal root/nested editors share external state; suppressed root history does not imply silently removing nested/table history; table cells retain local history before parent synchronization.
- The existing `editorState` value path is intentionally not broadened during R5; only preserve its current initialization/null behavior unless a separate decision changes it.

## Implementation Blueprint

### Data Models

```ts
type EditorHistoryMode = 'root-shared' | 'nested-shared' | 'nested-external' | 'table-local'

interface ExtensionEditorConfig {
  name: string
  namespace: string
  nodes: CreateEditorArgs['nodes']
  theme: EditorThemeClasses
  editable: boolean
  parentEditor?: LexicalEditor
  historyMode: EditorHistoryMode
  historyState?: HistoryState
}
```

The exact internal names are reversible; the four history/lifecycle modes and their observable behavior are not.

### Tasks

```yaml
Task 1: Add the internal extension editor factory and direct dependencies
  MODIFY package.json, package-lock.json:
    - Declare @lexical/extension and @lexical/history at ^0.48.0 and keep the entire installed graph lockstep.
  CREATE src/plugins/core/lexicalExtensions.ts:
    - Build stable disposable editors from complete nodes/theme/namespace/editability/error configuration.
    - Include ReactProviderExtension and ReactExtension with no default ContentEditable.
    - Configure root-shared, nested-shared, nested-external, and table-local history modes without exporting them publicly.
  CREATE src/test/extension-composer.test.tsx:
    - Pin editor config, node replacements, normal React context, parent/editability inheritance, each history mode, command availability, and exactly-once disposal.
  PATTERN: plans/research/005-extension-composer-history/spike-01-extension-compatibility-bridge.md
  ENABLES: CX-7a, CX-7b, CX-7c
  VERIFY:
    - COMMAND: npm run test:once -- src/test/extension-composer.test.tsx
    - EXPECTED: Focused extension construction/history/lifecycle tests pass with no leaked listener or duplicate registration assertion.

Task 2: Migrate the root editor and preserve Gurx/public initialization
  MODIFY src/RealmWithPlugins.tsx:
    - Create each realm session in a commit-phase effect, run all init then all post-init, and render children only for the live session.
    - Add a private exactly-once cleanup registry; do not add a RealmPlugin cleanup callback or other public lifecycle API.
  MODIFY src/plugins/core/index.ts:
    - Replace createEditor and legacy SharedHistoryPlugin registration with the extension factory after all plugin init registrations.
    - Register root disposal with its realm session; preserve initial Markdown, editorState null behavior, autoFocus, readOnly, root/active publication, namespace/theme/nodes, and subscriptions.
  MODIFY src/MDXEditor.tsx:
    - Replace the custom LexicalProvider with LexicalExtensionEditorComposer around the unchanged RichTextEditor/plugin child tree.
    - Never render or publish a stale/disposed session during replay or remount.
  DELETE src/plugins/core/SharedHistoryPlugin.tsx:
    - Remove only after root/nested callers use extension history.
  ENABLES: CX-7a, CX-7b, CX-7c
  VERIFY:
    - COMMAND: npm run typecheck && npm run test:once -- src/test/core.test.tsx src/test/extension-composer.test.tsx
    - EXPECTED: Root methods, Markdown initialization, prop behavior, plugin registration order, history commands, and lifecycle tests pass.

Task 3: Migrate nested JSX/directive and table-cell editors
  MODIFY src/plugins/core/NestedLexicalEditor.tsx:
    - Effect-create one disposable extension child per setup; replace LexicalNestedComposer/SharedHistoryPlugin with LexicalExtensionEditorComposer.
    - Preserve block/inline import, parent export, focus/blur/selection/backspace commands, active-editor routing, consumer children, and current external-history behavior when root history is suppressed.
  MODIFY src/plugins/table/TableEditor.tsx:
    - Effect-create one disposable extension child per setup; replace LexicalNestedComposer/HistoryPlugin with LexicalExtensionEditorComposer.
    - Preserve MDAST cell save, Tab/Enter/blur navigation, parent update commands, focus, consumer children, and local history.
  ENABLES: CX-7a, CX-7b, CX-7c
  VERIFY:
    - COMMAND: npm run test:browser -- --project=chromium --grep 'CX-3|CX-7'
    - EXPECTED: Root/nested/table focus, synchronization, history modes, custom consumer children, and remount behavior pass in Chromium without page/console errors.
    - PROCESS-LIFECYCLE: Playwright owns Ladle, port 61000, Chromium, traces, and teardown; selected test progress is visible, exit 0 with no listener is success, and any assertion/runtime/server/cleanup error is failure.

Task 4: Add direct extension-agnostic consumer evidence
  CREATE src/test/fixtures/ExtensionCompatibilityHarness.tsx:
    - Define a consumer realmPlugin using public node/visitor/Gurx/composer-child registration surfaces and root/JSX/directive/table content.
    - Expose visible mount/cleanup/editor identity, history availability, Markdown, callback, active-editor, read-only, suppressed-history, and remount observations.
  CREATE src/examples/extension-compatibility.tsx:
    - Host the deterministic public fixture in Ladle.
  CREATE tests/browser/extension-compatibility.spec.ts:
    - Exercise CX-7a-CX-7c through visible controls and public refs in Chromium, Firefox, and WebKit; call no internal extension helper.
    - Reuse existing focus/selection helpers but assert the new custom plugin, history-mode, Strict Mode, and cleanup outcomes directly.
  MODIFY tests/package-consumer/shared/src/main.tsx:
    - Add a minimal documented realmPlugin consumer and assert it typechecks, bundles, renders, and reads Markdown in both packed React consumers.
  ENABLES: CX-7a, CX-7b, CX-7c
  VERIFY:
    - COMMAND: npm run test:browser -- --grep CX-7
    - EXPECTED: Nine direct CX-7 runs pass across Chromium, Firefox, and WebKit with no runtime error.
    - FAILURE-LOCAL: npm run test:browser -- --project=chromium --grep CX-7; npm run test:browser -- --project=firefox --grep CX-7; npm run test:browser -- --project=webkit --grep CX-7
    - PROCESS-LIFECYCLE: Playwright owns Ladle/61000/browser artifacts and teardown on both terminal paths; nine completed tests plus exit 0 and no listener/process is success.

Task 5: Document the compatibility boundary and run the final roadmap checkpoint
  MODIFY docs/extending-the-editor.md:
    - State that Lexical extensions are internal construction details; Gurx realmPlugin, visitors, nodes, and ordinary React composer children remain the supported consumer model.
  RUN full gates:
    - Rerun CX-1-CX-7, the full unit/browser matrix, declarations/build, lockstep graph, packed React 18/19 consumers, 0.35 replay, and API docs.
  ENABLES: CX-7a, CX-7b, CX-7c
  VERIFY:
    - COMMAND: npm run lint && npm run typecheck && npm run test:once && npm run test:browser && npm run build && npm run test:lexical-versions && npm run test:package && npm run test:cross-version && npm run build:docs:api
    - EXPECTED: Every phase exits 0; all CX-1-CX-7 evidence remains green; packed consumers use declared 0.48 dependencies and no public extension import.
    - FAILURE-LOCAL: npm run lint; npm run typecheck; npm run test:once -- src/test/extension-composer.test.tsx; npm run test:browser -- --grep CX-7; npm run test:browser -- --project=chromium --grep 'CX-3|CX-5|CX-6'; npm run build; npm run test:lexical-versions; npm run test:package -- --react=18; npm run test:package -- --react=19; npm run test:cross-version; npm run build:docs:api
    - PROCESS-LIFECYCLE: Playwright owns Ladle/61000/browsers; package scripts own disposable apps, isolated caches, tarballs, Chromium pages, preview servers, and allocated loopback ports in finally blocks. The first nonzero phase is failure; success requires final exit 0 and no owned process/listener/scratch state.
```

### Integration Points

- `src/plugins/core/index.ts` and `src/index.ts` preserve every Gurx/plugin/node/visitor/composer-child export; the internal factory is not exported.
- `LexicalExtensionEditorComposer` supplies the existing React context boundary; nested/table wrappers keep parent synchronization around the shared factory.
- `historyState$` retains its external identity, and `UndoRedo.tsx` continues to observe public Lexical commands rather than extension signals.
- Existing compatibility/selection/search fixtures remain the `CX-1`–`CX-6` regression boundary; the new fixture and packed consumer directly own `CX-7`.

## Validation

```bash
npm run lint && npm run typecheck && npm run test:once && npm run test:browser && npm run build && npm run test:lexical-versions && npm run test:package && npm run test:cross-version && npm run build:docs:api

npm run test:once -- src/test/extension-composer.test.tsx
npm run test:browser -- --grep CX-7
npm run test:browser -- --project=chromium --grep 'CX-3|CX-5|CX-6|CX-7'

npx prettier --check package.json src/plugins/core/lexicalExtensions.ts src/plugins/core/index.ts src/MDXEditor.tsx src/plugins/core/NestedLexicalEditor.tsx src/plugins/table/TableEditor.tsx src/test/extension-composer.test.tsx src/test/fixtures/ExtensionCompatibilityHarness.tsx src/examples/extension-compatibility.tsx tests/browser/extension-compatibility.spec.ts tests/package-consumer/shared/src/main.tsx docs/extending-the-editor.md
git diff --check
```

`CX-7a`–`CX-7c` own the new promise; `CX-1`–`CX-6` remain the regression authority and cannot be replaced by factory tests. A browser launch denial before page creation is environmental and must be rerun where permitted.

## Unknowns & Risks

- Extension definitions capture the complete node/replacement registry once. Any execution change that makes plugin registration dynamic after editor construction is a public architecture expansion and must pause.
- Root creation moves from render-time realm setup to a commit-phase session while preserving plugin order; Strict Mode tests must directly detect duplicate registrations and unsafe unregister-after-dispose.
- `suppressSharedHistory` has asymmetric current behavior: it removes root history, while nested editors still register against the external state and table cells retain local history. R5 preserves and characterizes this; changing it requires a separate collaboration/history decision.
- Extension history signals are implementation details. Command availability must remain the observable contract because toolbar and consumer listeners already depend on `CAN_UNDO_COMMAND`/`CAN_REDO_COMMAND`.
- Table-cell history is local until the cell saves to the parent table node. Converting it to shared history would change ordering and is prohibited even if technically simpler.
- The parent roadmap's final completion depends on rerunning every earlier public scenario after this broad internal migration; a green `CX-7` alone is insufficient.

**Confidence: 8/10**. The bridges are proven and gates executable; remaining risk is lifecycle timing and table/suppressed-history semantics.

## Execution Notes

- **Started**: 2026-07-18 at commit `9373742` on the verified, intentionally uncommitted R1-R4 worktree.
- **Preserved baseline**: all existing source, package, browser, plan, report, and harness changes listed by preflight belong to R1-R4 or the user and remain in place. R5 extends the expected overlaps in `package.json`, `package-lock.json`, `src/MDXEditor.tsx`, and `src/test/core.test.tsx` without reverting them.
- **Implemented architecture**: root, JSX/directive, and table editors now use one private `buildEditorFromExtensions` factory plus `LexicalExtensionEditorComposer`; `HistoryExtension`/`SharedHistoryExtension` own the four pinned history modes; realm and child-editor setup/disposal are commit-phase and exactly once.
- **Compatibility adapters discovered during direct browser execution**: initial imports use `HISTORIC_TAG`; cross-editor selection focus records an explicit shared-history boundary; focus replays command-based availability after the active toolbar listener attaches; and `corePlugin.init` creates a fresh external `HistoryState` for every Realm/Strict replay session. These preserve the authoritative normal, suppressed-root, table-local/parent, remount, and command-availability sequences rather than adopting extension signals publicly.
- **Recorded scope additions**: `src/realmSession.ts` owns private realm cleanup; `scripts/assert-lexical-versions.mjs` recognizes the two new direct dependencies; and `scripts/package-consumer-utils.mjs` requires the packed public `realmPlugin` child to render. Verification restored the public `usedLexicalNodes$` value to its legacy class-only type and kept replacement descriptors on the supported `additionalLexicalNodes` paths.
- **Implementation evidence**: lint, typecheck, the 23 focused core/extension tests, the 24-package 0.48 lockstep assertion, production build, all nine direct `CX-7` runs across Chromium/Firefox/WebKit, patch hygiene, and rebuilt packed React 18/19 declarations/bundles/runtime/ref/plugin-child checks pass. The known CodeMirror jsdom geometry warning and stale Browserslist notice remain non-failing baseline warnings.
- **Status**: `VERIFIED`; fresh post-review verification directly confirms the three corrections and the complete integrated gate. The earlier Verification Record is retained below as historical evidence.
- **Post-verification review findings**: preserve initial-commit `MDXEditorMethods` readiness without returning Realm/plugin initialization to render; prevent table-local search replacement from writing into the Realm shared history; and give recursive nested editors their immediate containing editor as the extension parent.
- **Post-review implementation**: Realm creation, plugin ordering, and session disposal remain unchanged and commit-owned. `MDXEditor` now attaches a stable public methods facade on the initial commit, delegates to the live Realm after it mounts, and replays early mutating calls in order. Extension editors record their actual `HistoryExtension` state privately so search baselining skips table-local editors. Recursive `NestedLexicalEditor` construction now receives `parentEditor` from `NestedEditorsContext` while its history mode continues to follow the root sharing policy.
- **Post-review direct evidence**: a parent layout/passive-effect unit exercise proves initial ref readiness, queued `setMarkdown`, live-session delegation, unmount nulling, and unchanged Strict cleanup; focused history identity tests distinguish shared/nested/table states; the public browser fixture proves a recursive nested editor's parent is another nested editor; and table Replace All proves local Undo/Redo followed by exactly one parent save Undo/Redo. The affected 12-test matrix passes across Chromium, Firefox, and WebKit.
- **Post-review integrated evidence**: lint, typecheck, 70 passed/1 skipped/1 todo unit tests, 57/57 browser tests, production declarations/build, the 24-package Lexical 0.48 lockstep assertion, packed React 18/19 declaration/bundle/style/runtime/ref checks—including parent layout/mount-effect readiness and an early `setMarkdown` replay—0.48-to-published-4.0.4/0.35 Markdown replay, API docs, and patch hygiene pass. The first sandboxed cross-version Chromium launch was denied a macOS Mach port before page creation; the identical permitted rerun passed. Existing CodeMirror geometry, TypeDoc version/reference, Browserslist, bundle-size, and npm-config notices remain non-blocking baseline warnings.
- **Post-verification hardening**: closing the final evidence limitation exposed a real batching defect: synchronous replay of queued `setMarkdown`, `focus`, and `insertMarkdown` updated the DOM but could leave `markdown$` stale because the insertion landed inside `setMarkdown`'s mute window. The stable public facade now drains queued calls FIFO across microtask boundaries, keeps new calls on the tail during replay, prevents parallel Strict drains, and aborts stale methods without changing Realm ownership or normal ready-state calls.

## Historical Verification Record (Superseded)

- **Verified**: 2026-07-18 under the Standard assurance profile.
- **Fresh verifier**: `/root/r5_verification`, started without inherited conversation context and restricted to read-only inspection and test execution.
- **Consumer acceptance pass**: the full inherited public browser matrix passed 54/54 across Chromium, Firefox, and WebKit; direct `CX-7` passed 9/9; and packed React 18 and React 19 consumers passed declarations, bundle, CSS, runtime, public-ref, and plugin-child checks.
- **PRP compliance pass**: the extension architecture, history modes, public extension-agnostic plugin boundary, and inherited `CX-1`–`CX-6` behavior match the PRP. The initial pass identified missing direct proof for a custom import visitor/plugin initialization and for nested/table Strict-remount lifecycle identity; the fixture and `CX-7` tests were strengthened rather than accepting proxy evidence.
- **Engineering review pass**: the internal factory/composer/history architecture is bounded and no public extension API leaks. Review found one real source-compatibility regression: widening `usedLexicalNodes$` from `Klass<LexicalNode>[]` to `AdditionalLexicalNode[]` broke an exact legacy downstream assignment. The cell is class-only again, while replacement descriptors remain supported through `additionalLexicalNodes`.

| Scenario | Grade             | Direct evidence                                                                                                                                                                                                                                               |
| -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CX-7a`  | DIRECTLY VERIFIED | A public consumer plugin registers a custom node class, priority import visitor, export visitor, cells/signals, and root/nested/table composer children. Initialization count is exactly one per Realm; the scenario passed in Chromium, Firefox, and WebKit. |
| `CX-7b`  | DIRECTLY VERIFIED | Normal shared root/nested/sibling history, suppressed-root behavior, table-local history followed by parent save, focus routing, Markdown, and command availability passed in all three engines.                                                              |
| `CX-7c`  | DIRECTLY VERIFIED | Strict replay/remount proves root/nested/table identity replacement, exact mount/cleanup counts, fresh public-ref and active-editor identity, stale-editor inactivity, remount editing, and final cleanup in all three engines.                               |

- **Post-fix targeted rerun**: production build and declarations passed; the exact legacy `Klass<LexicalNode>[] = realm.getValue(usedLexicalNodes$)` consumer reproduction compiled; and strengthened `CX-7a`/`CX-7c` passed 6/6 across Chromium, Firefox, and WebKit. The unaffected `CX-7b` result from the full run remains direct evidence.
- **Inherited evidence**: `CX-1`–`CX-6` remained green in the 54/54 three-engine browser run. The verified R1–R4 records retain their focused unit, package, cross-version, build, and documentation evidence; R5's production build/declarations and packed React consumers passed again at this final checkpoint.
- **Hygiene and cleanup**: lint, typecheck, formatting/patch hygiene, the lockstep dependency assertion, and production/package gates are green. Disposable verifier state was removed, browser teardown completed, and port `61000` has no listener. Existing CodeMirror geometry and Browserslist notices remain non-blocking baseline warnings.
- **Structural validation**: the PRP validator passes with only its existing non-blocking compactness warnings.
- **Recommendation**: `VERIFIED`. No remaining R5 issue or roadmap blocker was found.

## Verification Record

- **Verified**: 2026-07-18 under the Standard assurance profile.
- **Fresh verifier**: `/root/r5_postreview_verification`, started without inherited conversation context and restricted to read-only inspection and test execution.
- **Consumer acceptance pass**: `CX-7a`, `CX-7b`, and `CX-7c` are `DIRECTLY VERIFIED`. The affected public matrix passed 12/12 across Chromium, Firefox, and WebKit; packed React 18/19 consumers directly confirmed initial parent layout/passive-effect ref readiness; and the focused Strict Mode exercise directly confirms pre-ready getters plus FIFO `setMarkdown` → `focus` → `insertMarkdown` replay.
- **PRP compliance pass**: all five success criteria and Tasks 1–5 are satisfied. The extension factory remains private, all four history modes match the contract, Realm setup/cleanup remains commit-owned, and no public plugin/visitor signature, Markdown schema, collaboration policy, or `@lexical/mdast` adoption entered scope.
- **Engineering review pass**: no significant R5-introduced issue remains. The verifier confirmed stale-session detach protection, FIFO imperative-call queuing, exact shared/local history identity, table-search isolation, recursive immediate-parent ancestry, inherited editability/theme, and idempotent listener/timer/editor cleanup.

| Scenario | Grade             | Direct evidence                                                                                                                                                                                                                                   |
| -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CX-7a`  | DIRECTLY VERIFIED | Public custom node/import/export visitors, Gurx state, root/nested/table composer children, one initialization per Realm, Markdown editing, read-only propagation, recursive immediate-parent identity, and React 18/19 package consumers passed. |
| `CX-7b`  | DIRECTLY VERIFIED | Normal shared, suppressed-root, table-local, and parent-save history journeys passed in all engines; table Replace All retained local Undo/Redo and exactly one root save Undo/Redo boundary.                                                     |
| `CX-7c`  | DIRECTLY VERIFIED | Strict replay, unmount, and remount passed with fresh Realm/editor/ref identities, balanced cleanup, stale-editor inactivity, usable remounted editing, and no runtime errors.                                                                    |

- **Fresh reproduced evidence**: 14/14 focused units; 71 passed/1 skipped/1 todo full units; 12/12 affected, 57/57 full, and 9/9 post-hardening `CX-7` browser tests; React 18/19 packed consumers; lint, typecheck, declarations/build, the 24-package Lexical 0.48 lockstep assertion, patch hygiene, and clean port-61000 teardown. The first sandboxed browser launch was denied before page creation by macOS restrictions; the identical permitted rerun passed.
- **Reused unchanged integrated evidence**: cross-version Markdown replay and API documentation build from the post-review Execution Notes.
- **Targeted hardening follow-up**: `/root/r5_postreview_verification` independently passed the 6/6 extension-composer tests and confirmed FIFO microtask ordering, calls added during a drain, same/different-method reattachment, stale detach/unmount, exactly-once focus callbacks, and unchanged immediate ready-state behavior. The prior replay limitation is closed with no remaining finding (95% confidence).
- **Baseline notices**: existing CodeMirror geometry, Browserslist, JSX-transform, TypeDoc/reference, npm-config, and bundle-size notices remain non-failing.
- **Recommendation**: `VERIFIED`. No remaining R5 issue or roadmap blocker was found.
