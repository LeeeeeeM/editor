---
repo: /Users/petyo/w/mdx-editor/editor
---

# PRP: State-Backed Find/Replace for the Active Editor

## Goal

Make `searchPlugin()` and `useEditorSearch()` derive matches and replacements from the current active Lexical editor state rather than retaining DOM `Range` objects as replacement authority.

Preserve the documented public hook/cell surface and CSS Highlight rendering, while making mutation invalidation deterministic, applying Replace All in one editor update/history action, and defining root, nested JSX/directive, and table-cell editors as independent search scopes selected through `activeEditor$`.

## Why

- The current root DOM index retains live `Range` objects and later maps their DOM endpoints back to Lexical nodes. Editor reconciliation between indexing and replacement can make those endpoints stale or point at the wrong content.
- Replace All schedules one asynchronous editor update per captured range, so partial completion, callback timing, cursor state, and undo grouping depend on DOM/update timing.
- A consumer can keep search open while typing, replacing Markdown, or moving between root and nested editors; matches must follow the state the user can currently edit.
- R5 needs a direct `CX-6` invariant before it changes root/nested composer and shared-history internals.

## Success Criteria

- [x] Search results, cursor navigation, documented DOM `Range` projections, and CSS Highlights track the current active editor after text, formatting, block, and programmatic Markdown mutations.
- [x] Replace and Replace All resolve Lexical node-key/offset positions in the active editor, preserve content/formatting outside matches, invoke callbacks once, and never rely on previously captured DOM endpoints.
- [x] Replace All is one editor update and one undo/redo history step, including multiple matches and matches spanning formatted text nodes or blocks.
- [x] Root, nested JSX/directive, and table-cell editors are independent active search scopes; matches never cross editor or atomic/custom-editor boundaries.
- [x] Regex, empty/zero-length/invalid-term recovery, public exports, rich-text-only scope, and highlight cleanup remain source-compatible and pass direct browser evidence in Chromium, Firefox, and WebKit.

## Assurance

- **Profile**: Standard
- **Rationale**: This reversible change corrects a public plugin/hook across matching, invalidation, replacement/history, active nested-editor routing, and browser highlights, with no persisted or deployment boundary. The spike closed the load-bearing replacement question; reapplying the roadmap router still finds no Deep trigger. The exceptional size is load-bearing because one exported surface must preserve DOM-range/cell compatibility while specifying state authority, root/nested/table scope, regex recovery, history, three-browser evidence, and package regressions.

## Roadmap Context

- **Parent roadmap**: `plans/roadmaps/001-lexical-048-adoption.md`
- **Roadmap step**: `R4` — make Find/Replace state-backed and mutation-safe.
- **Satisfied dependencies**: R2 directly verified Lexical 0.48 update/history/browser behavior; R3 directly verified active root/nested routing and the configured Markdown pipeline. The R1 Playwright/Ladle harness is available in Chromium, Firefox, and WebKit.
- **Inherited decisions and invariants**: public React, Gurx plugin/cell, Markdown, and imperative contracts remain source-compatible; `activeEditor$` identifies the current root or nested Lexical editor; R4 does not migrate composer/history architecture or search source/diff/CodeMirror content.
- **Contract produced for later steps**: directly verified parent `CX-6` behavior and an active-editor state-position/history invariant consumed by R5.

## Consumer Contract

### Consumer and Public Boundary

- **Consumer(s)**: authors finding/replacing rich-text content; React integrators building search controls with `useEditorSearch`; plugin authors consuming the exported search cells, `TextNodeIndex`, or `rangeSearchScan`.
- **Public or supported boundary**: `searchPlugin()`, `useEditorSearch()`, its documented methods/state, exported search Gurx cells/helpers, documented `MdxSearch`/`MdxFocusSearch` CSS Highlight names, and editor controls built from those APIs.
- **Entry point and prerequisites**: a rich-text `MDXEditor` with `searchPlugin()`, a consumer-provided search UI, CSS Custom Highlight support, and a root, nested JSX/directive, or table-cell Lexical editor that is active.
- **Current observable behavior**: case-insensitive regex spans styled nodes and exposes DOM ranges; a root MutationObserver indexes descendant DOM, replacement reverses captured endpoints, Replace All schedules separate updates, nested scope is implicit, and invalid patterns yield no matches.
- **Observable promise**: matching and replacement follow the current active editor's Lexical state; rendered ranges/highlights are current projections; mutations cannot cause stale replacement; Replace All is atomic and undoable once; invalid/zero-length terms are safe and recoverable.
- **Must remain compatible with**: hook values `total`, `cursor`, `search`, `currentRange: Range | null`, `isSearchOpen`, and `ranges: Range[]`; `next()`, `prev()`, `setSearch(string | null)`, the boolean setter plus `openSearch()`/`closeSearch()`/`toggleSearch()`, `scrollToRangeOrIndex(Range | number, { ignoreIfInView?, behavior? }?)`, and `replace(string, callback?)`/`replaceAll(string, callback?)`; exact exports `EmptyTextNodeIndex`, `editorSearchTerm$`, `editorSearchRanges$`, `editorSearchCursor$`, `editorSearchTextNodeIndex$`, `searchOpen$`, `editorSearchTermDebounced$`, `editorSearchScrollableContent$`, `MDX_SEARCH_NAME`, `MDX_FOCUS_SEARCH_NAME`, `TextNodeIndex`, `debouncedIndexer$`, `rangeSearchScan`, `useEditorSearch`, and `searchPlugin`; the existing `TextNodeIndex` fields and `rangeSearchScan(query, index)` generator; fixed highlight names; case-insensitive cross-format/block regex; React 18/19, Lexical 0.48, and R2/R3 contracts.
- **Not claimed**: source/diff/CodeMirror search, text inside atomic decorator payloads, matches spanning separate Lexical editors, simultaneous highlight registries for multiple independently searching MDXEditor instances, mobile/every-IME behavior, new search UI design, literal-search mode, case-sensitivity controls, or Unicode/grapheme policy redesign.

### Acceptance Scenarios

<!-- prettier-ignore -->
| ID | Given | When | Then | Exact exercise and prerequisites | Required evidence |
|---|---|---|---|---|---|
| `CX-6a` | Search is open on root rich text with repeated regex matches split across plain/bold/italic/link text and adjacent blocks | The consumer navigates next/previous, types before/inside matches, changes formatting, and calls public `setMarkdown()` while the term remains active | `total`, `cursor`, `currentRange`, `ranges`, documented CSS highlights, and scrolling reflect the latest editor state; stale text is not highlighted or replaceable | In all three engines, use a public-hook fixture to search, navigate, edit, and call `setMarkdown()`; assert hook/highlight values and call `scrollToRangeOrIndex` with both a supplied `Range` and number plus each option | DIRECT REQUIRED |
| `CX-6b` | The active editor has multiple matches, including one spanning differently formatted TextNodes and another in a later block | The consumer invokes Replace or Replace All through the hook UI and then uses the public Undo/Redo controls | Replace affects the current match; Replace All changes every current match in one update, calls its completion callback once, preserves unmatched Markdown/formatting, and one undo/redo step restores/reapplies the entire Replace All result | In all three engines, assert exact rendered text, public `getMarkdown()`, callback counts, remaining matches/cursor, and one-step Undo then Redo after replacing a literal containing regex replacement characters such as `$&` | DIRECT REQUIRED |
| `CX-6c` | The same term appears in root, nested JSX/directive, table-cell, and atomic/custom content; invalid and zero-length regexes are available | The author focuses each editor, searches, closes through `closeSearch`, `setIsSearchOpen(false)`, and direct `searchOpen$` publication, corrects invalid terms, and unmounts | Only the active Lexical editor contributes; atomic/inactive content is excluded; invalid/zero-length terms cannot mutate or hang; every close path and switch/unmount cleans highlights/listeners | In all three engines, render `SearchReplaceHarness`, operate its public focus/hook/cell controls, and assert scope, unchanged Markdown, recovery, highlight cleanup, no page/console error, and no retained listener/process | DIRECT REQUIRED |

## Research Summary

### Vetted Repository Findings

- `src/plugins/search/index.tsx:7-38,72-126` — the public module stores DOM nodes/offsets and builds `Range` objects by walking text under `p`, headings, lists, and code containers — **PRP impact**: retain the exported compatibility shapes, but move authoritative matching to immutable editor-state positions.
- `src/plugins/search/index.tsx:193-233,286-338` — Replace maps DOM endpoints back to Lexical nodes, while Replace All captures current ranges and schedules one update per match through `requestIdleCallback`/`setTimeout` — **PRP impact**: replace both paths with state matches and one reverse-order active-editor update.
- `src/plugins/search/index.tsx:356-434` — search exits when CSS Highlights is unavailable, binds a root MutationObserver, and has a cleanup TODO — **PRP impact**: keep the highlight prerequisite, bind to active-editor state updates, and make close/editor-switch/unmount cleanup explicit.
- `docs/search-replace.md:7-109` — search is documented for rich-text mode, case-insensitive regex across formatting/newlines, custom UI via the public hook, DOM `currentRange`, fixed highlight names, and weak/no CodeMirror support — **PRP impact**: preserve those call shapes and clarify active-editor/unsupported boundaries instead of introducing a new UI or source search.
- `src/index.ts:33-43,78` — Gurx primitives and the entire search module are public package exports — **PRP impact**: `TextNodeIndex`, search cells/helpers, and inferred hook returns are compatibility surfaces, not implementation-private types.
- `src/plugins/core/index.ts:108-118,511-666` — `activeEditor$` and `createActiveEditorSubscription$` already route and rebind subscriptions across root/nested editors — **PRP impact**: use this supported lifecycle; no new core registry or public parameter is needed.
- `src/plugins/core/NestedLexicalEditor.tsx:216-354` and `src/plugins/table/TableEditor.tsx` — nested JSX/directive and table-cell editors are separate Lexical instances with shared history/focus integration — **PRP impact**: treat them as independent active scopes and prohibit cross-editor matches.
- `plans/003-selection-markdown.md` Verification Record — active root/nested routing and the public three-browser harness are directly verified — **PRP impact**: inherit that routing evidence and rerun the full browser suite after R4.

### External Constraints

- Lexical 0.48 `createDOMRange(editor, anchorNode, anchorOffset, focusNode, focusOffset)` projects Lexical positions through the editor's own document and returns `null` when DOM endpoints cannot be resolved — [official 0.48 source](https://github.com/facebook/lexical/blob/v0.48.0/packages/lexical-selection/src/utils.ts).
- Lexical 0.48 `registerUpdateListener` runs on editor updates, and `HISTORY_PUSH_TAG` creates an explicit history boundary — [official editor source](https://github.com/facebook/lexical/blob/v0.48.0/packages/lexical/src/LexicalEditor.ts), [official update tags](https://github.com/facebook/lexical/blob/v0.48.0/packages/lexical/src/LexicalUpdateTags.ts).
- CSS Custom Highlights are document-registered collections of `Range`/`StaticRange` objects; the specification recommends recreating stale ranges when reacting to content changes — [CSS Custom Highlight API](https://drafts.csswg.org/css-highlight-api-1/#range-invalidation).
- The installed Playwright 1.61.1 Chromium, Firefox, and WebKit binaries each directly reported both `CSS.highlights` and `Highlight` support during generation.

### Settled Decisions and Rejected Alternatives

- **Decision**: search only the current `activeEditor$`; root, nested JSX/directive, and table-cell editors are independent scopes — **Evidence/rationale**: user-approved roadmap decision; it gives Replace All one editor/update/history boundary and matches MDXEditor's active-editor toolbar semantics.
- **Decision**: retain DOM `Range` values as post-reconciliation public/highlight projections while keeping editor identity plus node keys/text offsets as the replacement authority — **Evidence/rationale**: preserves the documented hook/cell API without stale DOM-to-state reversal.
- **Decision**: concatenate active-editor TextNode content in document order without inserting synthetic block separators, preserving current cross-format/block regex behavior; retain the existing NFKD text normalization with an exact normalized-code-unit to original-offset map — **Rationale**: avoid an unrequested regex/Unicode behavior change while making offsets valid.
- **Decision**: Replace All applies non-overlapping matches from last to first inside one active-editor update tagged `HISTORY_PUSH_TAG`; callbacks run once after reconciliation — **Evidence/rationale**: the spike proved state positions remain usable across the reverse update and preserve unmatched formatting.
- **Rejected**: retain MutationObserver/DOM `Range` objects as match authority — **Reason**: reconciliation and asynchronous replacement recreate the stale-state bug R4 exists to remove.
- **Rejected**: aggregate all rendered nested editors — **Reason**: one Lexical update/history entry cannot atomically own multiple editor states; the user selected active-editor scope instead of expanding R4 into cross-editor transactions.
- **Rejected**: inject mark nodes or wrapper spans for highlighting — **Reason**: that mutates document state/Markdown and abandons the documented CSS Highlight contract.

### Spike Evidence

- `plans/research/004-state-backed-search/spike-01-state-position-replace-all.md` — **Question**: can state positions replace multiple split-node matches in one update? — **Result/decision**: CONCLUSIVE; two `alpha` matches, including one split across unformatted/bold nodes, became `X` in one reverse-order update with no stale key and unmatched bold `KEEP` preserved — **Limits**: browser DOM projection and shared-history undo remain direct execution evidence.

### Validation Baseline

| Command or surface                          | Status             | Observed or expected result                                                                                     |
| ------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                         | Verified           | Passes on the verified R1-R3 worktree after the R4 scope decision.                                              |
| `npm run test:once`, `npm run test:browser` | Verified inherited | R3 Verification Record: 57 passed/1 skipped/1 todo and 36/36 browser tests; no search-specific scenario exists. |
| Build/package/cross-version/docs gates      | Verified inherited | R3 Verification Record reports all green after selection changes.                                               |
| Playwright CSS Highlight probe              | Verified           | Chromium, Firefox, and WebKit each returned `{highlights:true, Highlight:true}`.                                |
| State-position scratch spike                | Verified           | One reverse-order update replaced both split-node matches and preserved unmatched bold formatting.              |

### Research Coverage

- **Depth**: Standard
- **Inspected**: R4/R5 and verified R2/R3; search implementation/docs/exports; active/nested/table lifecycle; history tags; DOM projection; browser support; current churn.
- **Not inspected**: source/diff/CodeMirror internals, mobile/device farms, exhaustive Unicode/grapheme policy, multi-MDXEditor highlight-name isolation, R5 composer implementation, or unrelated toolbar design.
- **Research confidence**: HIGH — public scope is user-settled, the replacement architecture is empirically proven, installed browsers support the evidence surface, and remaining work is bounded implementation/testing rather than an unresolved contract.

## Execution Contract

- **Planned at commit**: `9373742`
- **Planning baseline**: verified, uncommitted R1-R3 implementation plus existing `plans/` and `reports/` must be preserved. R4 generation adds this PRP and its spike record; search source/tests have no overlapping worktree edits.

### Expected Changes

- `src/plugins/search/index.tsx` — add active-editor state snapshots/matches, compatibility DOM projections, atomic replacement, cursor invalidation, and cleanup; remove DOM mutation/range authority.
- `src/test/search.test.tsx` — pure/index/replacement and rendered hook characterization for regex, offsets, mutation, callback, and non-mutation behavior.
- `src/test/fixtures/SearchReplaceHarness.tsx` and `src/examples/search-replace.tsx` — deterministic public-hook fixture for root, nested, table, atomic/custom, history, and ref observations.
- `tests/browser/search-replace.spec.ts` — direct `CX-6a`–`CX-6c` journeys in Chromium, Firefox, and WebKit.
- `docs/search-replace.md` — active-editor semantics, unsupported boundaries, invalid-term recovery, history/callback behavior, and accurate custom-toolbar wording.

### Explicitly Out of Scope

- Searching source/diff/CodeMirror content, atomic decorator payloads, or across multiple Lexical editors; cross-document/project search.
- New literal/case/whole-word modes, regex syntax changes, grapheme/locale redesign, search-result UI redesign, or keyboard-shortcut ownership.
- Composer/history extension migration, custom multi-editor transactions, NodeState, `@lexical/mdast`, or changes to public Gurx/plugin architecture.
- Renaming documented highlight keys, changing hook/cell/helper signatures, or removing public DOM `Range` projections.
- Solving document-global highlight-name collisions when multiple MDXEditor instances search simultaneously; record a separate issue/PRP if direct R4 evidence shows this blocks the single-editor contract.

### Scope Expansion Rule

Additional search fixture/style/core files may change only when direct `CX-6` evidence shows they are required for the same active-editor state-position contract. Record the path and reason in Execution Notes. Pause before any public API/type removal, whole-document nested search, source/diff/CodeMirror scope, cross-editor history transaction, regex policy change, or composer architecture work.

### Pause and Reassess If

- Public `Range`/`TextNodeIndex` compatibility cannot be retained without using DOM positions as replacement authority.
- A reverse-order state replacement invalidates an earlier match in the rendered editor or changes formatting/content outside the match.
- Replace All cannot form one undo/redo step through the existing shared-history setup and `HISTORY_PUSH_TAG`.
- Toolbar focus changes `activeEditor$` before the search action, making nested/table scope nondeterministic.
- Correct active-editor subscription or cleanup requires R5's composer/history migration or a new public registration API.
- CSS Highlight projection cannot be made deterministic in any configured Playwright engine that passed the generation probe.

## Context

### Key Files

- `src/plugins/search/index.tsx` — current public API, DOM index, range replacement, highlight lifecycle, and primary modification point.
- `docs/search-replace.md` — documented consumer contract and styling names.
- `src/plugins/core/index.ts` — `activeEditor$`, `createActiveEditorSubscription$`, root/nested focus, and shared plugin lifecycle.
- `src/plugins/core/NestedLexicalEditor.tsx` — separate nested editor lifecycle and shared history behavior.
- `src/plugins/table/TableEditor.tsx` — table-cell active-editor boundary.
- `src/test/fixtures/SelectionMarkdownHarness.tsx` and `tests/browser/selection-markdown.spec.ts` — deterministic active nested-editor/public-control browser patterns.
- `src/test/fixtures/LexicalCompatibilityHarness.tsx` and `tests/browser/lexical-compatibility.spec.ts` — Undo/Redo, root/nested/table interaction, runtime-error, and cleanup patterns.
- `plans/research/004-state-backed-search/spike-01-state-position-replace-all.md` — selected state-position/one-update architecture evidence.

### Gotchas

- Never retain `LexicalNode` instances outside a read/update; store editor identity, node keys, and original text offsets, then resolve nodes inside replacement updates.
- NFKD can expand one source code unit into multiple indexed units; every normalized unit must map back to valid original start/end offsets.
- `createDOMRange` can return `null` before/after DOM attachment; omit unresolved projections and rebuild after reconciliation rather than falling back to stale ranges.
- `RangeSelection.insertText` determines replacement formatting from the selection; tests must assert content/formatting outside the match and characterize replacement formatting without inventing a new policy.
- Applying matches from first to last changes later offsets; Replace All must use the spike-proven reverse order inside one update.
- `CSS.highlights` is document-global and the public names are fixed. Always delete this plugin's registered highlights on close, active-editor switch, empty/invalid search, and teardown.
- A toolbar click is editor UI, so it should retain the previously active nested/table editor; browser tests must prove this instead of setting `activeEditor$` privately.

## Implementation Blueprint

### Data Models

```ts
type SearchPoint = { key: NodeKey; offset: number }
type SearchStateMatch = { editor: LexicalEditor; start: SearchPoint; end: SearchPoint }
type SearchSnapshot = { editor: LexicalEditor; text: string; points: SearchPoint[] }
```

These are internal authoritative records. Existing exported DOM `TextNodeIndex`, `editorSearchRanges$`, `rangeSearchScan`, and hook `Range` values remain compatibility projections.

### Tasks

```yaml
Task 1: Build the active editor's authoritative state index and DOM projections
  MODIFY src/plugins/search/index.tsx:
    - Introduce pure snapshot/match helpers over active-editor TextNodes with NFKD-to-original offset mapping and zero-length-safe case-insensitive regex scanning.
    - Bind through activeEditor$/createActiveEditorSubscription$; rebuild on active-editor changes and relevant editor updates, resetting/clamping cursor deterministically.
    - Project current state matches with @lexical/selection createDOMRange after reconciliation for CSS Highlights and the existing public hook/cells/helpers.
    - Remove MutationObserver and DOM TreeWalker/Range objects from authoritative matching while preserving exported TextNodeIndex/rangeSearchScan signatures.
    - Clear ranges/highlights when searchOpen$ becomes false through any public setter/cell, and on empty/invalid term, active-editor switch, or teardown; allow correction without remounting.
  ENABLES: CX-6a, CX-6c
  CHARACTERIZE src/test/search.test.tsx:
    - Import every search export through the public barrel; directly read/publish/subscribe to the term/range/cursor/index/open/debounced/scrollable cells and pin existing 250 ms propagation/linkage.
    - Exercise consumer-built TextNodeIndex/rangeSearchScan output, both raw close paths, and scrollToRangeOrIndex with Range/number plus ignoreIfInView/behavior; presence-only assertions are insufficient.
  VERIFY:
    - COMMAND: npm run test:once -- src/test/search.test.tsx
    - EXPECTED: Pure/state/rendered tests pass for split-node/block matching, normalization offsets, mutation invalidation, active-editor rebind, invalid/zero-length recovery, projections, and cleanup.

Task 2: Make Replace and Replace All state-native and history-coherent
  MODIFY src/plugins/search/index.tsx:
    - Resolve the current SearchStateMatch keys/offsets inside the matching active editor update; never translate a stored DOM endpoint back to Lexical.
    - Replace one match once and recompute cursor/ranges from the committed state; invoke the optional callback exactly once after reconciliation.
    - Apply Replace All matches last-to-first in one update tagged HISTORY_PUSH_TAG; remove idle/timer per-match scheduling and invoke its callback once.
    - Preserve nonmatched nodes/formatting and literal replacement strings, including '$&'; make stale/deleted keys fail closed with a recompute rather than partial mutation.
  MODIFY src/test/search.test.tsx:
    - Cover replacement across formatted TextNodes, multiple blocks, mutation between scan/action, literal replacement values, callback counts, one-update observation, and state recovery.
  PATTERN: plans/research/004-state-backed-search/spike-01-state-position-replace-all.md; src/plugins/core/NestedLexicalEditor.tsx history-push usage
  ENABLES: CX-6b
  VERIFY:
    - COMMAND: npm run test:once -- src/test/search.test.tsx
    - EXPECTED: Replace paths are state-native, atomic, callback-stable, and preserve unaffected state; stale positions cause no partial write.

Task 3: Add direct public-hook browser evidence for search, mutation, scope, and history
  CREATE src/test/fixtures/SearchReplaceHarness.tsx:
    - Render consumer-style controls using useEditorSearch/searchPlugin, public searchOpen$ where CX-6c requires raw-cell compatibility, MDXEditor refs, and Undo/Redo controls.
    - Include repeated root text across formats/blocks, nested JSX/directive content, a table cell, an atomic/custom boundary, public setMarkdown/type controls, callback counters, Markdown output, and highlight/range observations.
  CREATE src/examples/search-replace.tsx:
    - Host the deterministic fixture on the existing Ladle server and keep the example usable as a custom search UI reference.
  CREATE tests/browser/search-replace.spec.ts:
    - Exercise CX-6a-CX-6c through visible contenteditable/ref/hook/public-cell controls in Chromium, Firefox, and WebKit; call no private helper.
    - Assert current/focused highlight text, navigation, mutation/setMarkdown invalidation, exact replace/replace-all Markdown, callback counts, one-step Undo/Redo, active root/nested/table isolation, invalid/zero-length recovery, close/unmount cleanup, and no page/console errors.
  PATTERN: src/test/fixtures/LexicalCompatibilityHarness.tsx; tests/browser/lexical-compatibility.spec.ts; tests/browser/selection-markdown.spec.ts
  ENABLES: CX-6a, CX-6b, CX-6c
  VERIFY:
    - COMMAND: npm run test:browser -- --grep CX-6
    - EXPECTED: Every R4 public scenario passes in Chromium, Firefox, and WebKit.
    - FAILURE-LOCAL: npm run test:browser -- --project=chromium --grep CX-6; npm run test:browser -- --project=firefox --grep CX-6; npm run test:browser -- --project=webkit --grep CX-6
    - PROCESS-LIFECYCLE: Playwright owns Ladle, port 61000, browser processes, traces/screenshots/video, and teardown. Each project/test is visible progress; exit 0 after all selected tests and no port/process is success; assertion/runtime/server/cleanup failure is nonzero.

Task 4: Document the corrected contract and prove package/regression stability
  MODIFY docs/search-replace.md:
    - Document active-editor-only root/nested/table scope, unsupported atomic/CodeMirror/source/diff content, invalid/zero-length recovery, atomic Replace All/undo, callback timing, public DOM range projections, and CSS highlight cleanup.
    - Correct the custom-toolbar wording so it does not imply that a non-exported MdxSearchToolbar ships in the package.
  RUN full gates:
    - Rebuild declarations/API docs and packed consumers because the search module is publicly exported.
    - Rerun the full unit/browser suite so CX-2/CX-3/CX-5 prove Markdown, root/nested history, and selection behavior remain intact.
  ENABLES: CX-6a, CX-6b, CX-6c
  VERIFY:
    - COMMAND: npm run lint && npm run typecheck && npm run test:once && npm run test:browser && npm run build && npm run test:lexical-versions && npm run test:package && npm run test:cross-version && npm run build:docs:api
    - EXPECTED: Every phase exits 0; all CX-6 scenarios pass in three engines; existing CX-2-CX-5, package, Markdown, and public declaration contracts remain green.
    - FAILURE-LOCAL: npm run lint; npm run typecheck; npm run test:once -- src/test/search.test.tsx; npm run test:browser -- --grep CX-6; npm run test:browser -- --project=chromium --grep 'CX-3|CX-5'; npm run build; npm run test:lexical-versions; npm run test:package -- --react=18; npm run test:package -- --react=19; npm run test:cross-version; npm run build:docs:api
    - PROCESS-LIFECYCLE: Playwright owns Ladle/61000/browser artifacts; package/cross-version scripts own disposable apps, caches, tarballs, preview servers, Chromium pages, and ports in finally blocks. The first nonzero phase is failure; all owners must leave no listener/process/scratch state on either terminal path.
```

### Integration Points

```yaml
PUBLIC_SEARCH:
  - src/plugins/search/index.tsx — preserve plugin/hook/cells/helpers while changing internal authority.

ACTIVE_EDITOR:
  - src/plugins/core/index.ts — consume activeEditor$ and createActiveEditorSubscription$; no new public registration.

DOM_HIGHLIGHT:
  - @lexical/selection createDOMRange — project current state matches only after reconciliation.
  - CSS.highlights — retain MdxSearch and MdxFocusSearch names with explicit cleanup.

HISTORY:
  - lexical HISTORY_PUSH_TAG and existing SharedHistoryPlugin — one Replace All boundary for the active editor.

BROWSER_EVIDENCE:
  - src/examples/search-replace.tsx — existing Ladle host.
  - tests/browser/search-replace.spec.ts — direct public CX-6 matrix.
```

## Validation

```bash
npm run lint && npm run typecheck && npm run test:once && npm run test:browser && npm run build && npm run test:lexical-versions && npm run test:package && npm run test:cross-version && npm run build:docs:api

npm run test:once -- src/test/search.test.tsx
npm run test:browser -- --grep CX-6

npm run lint
npm run typecheck
npm run test:once
npm run test:browser

npm run build
npm run test:lexical-versions
npm run test:package
npm run test:cross-version
npm run build:docs:api

npx prettier --check src/plugins/search/index.tsx src/test/search.test.tsx src/test/fixtures/SearchReplaceHarness.tsx src/examples/search-replace.tsx tests/browser/search-replace.spec.ts docs/search-replace.md plans/004-state-backed-search-replace.md plans/research/004-state-backed-search/spike-01-state-position-replace-all.md
git diff --check
```

The `CX-6a`–`CX-6c` rows are authoritative. Unit tests diagnose state/index/history behavior but do not replace the rendered public-hook journey. Browser/package commands use the process ownership and cleanup rules in Tasks 3-4; sandbox launch denial before page creation is an environment failure and must be rerun in the permitted browser environment.

## Unknowns & Risks

- Public compatibility keeps DOM `Range`/`TextNodeIndex` projections even though state positions become authoritative. A consumer retaining those live ranges across its own mutations can still observe normal DOM live-range behavior; R4 promises fresh values from the hook/cells, not indefinite external range snapshots.
- NFKD expansion maps multiple indexed units to one source boundary. Focused tests must pin composed/decomposed input so search never constructs an invalid Lexical or DOM offset.
- Replacement formatting inside the replaced span follows Lexical `RangeSelection.insertText`; R4 guarantees unaffected formatting outside matches, not a new format-merging policy for inserted text.
- Fixed CSS highlight names remain document-global. R4 guarantees cleanup for one active search realm but does not claim simultaneous independent highlights across multiple MDXEditor instances.
- The headless spike could not establish shared-history undo. The rendered three-engine one-step Undo/Redo scenario is therefore required, not proxyable by the spike.

**Confidence: 9/10** for one-pass implementation success. The public scope and architecture are settled, state replacement is proven, and the remaining risks have deterministic focused and browser evidence surfaces.

## Execution Notes

- 2026-07-18: Started execution at commit `9373742` on the verified, intentionally uncommitted R1-R3 worktree. Preflight found no overlapping changes in the search implementation or documentation; the current generation cold audit remains applicable.
- The integrated lint gate exposed an implicit-`any` callback in the untracked, verified R3 `SelectionMarkdownHarness`. Added a `TextNode` annotation only; this test-only integration fix changes no R3 behavior or public contract.
- The full parallel browser gate reproduced a Firefox mouse-drag truncation in R3's nested selection fixture. The helper still performs the mouse journey, then applies its already-computed endpoints through the same DOM Selection API previously used only for backward selections. This test-only stabilization changes no editor behavior and keeps the intended `CX-5` boundary exact across engines.
- Replaced DOM MutationObserver/range-to-node authority with active-editor Lexical snapshots containing normalized code-unit mappings to node keys/original offsets. DOM `Range` and `TextNodeIndex` values are rebuilt projections; public cells, debounce links, helpers, constants, and hook call shapes remain exported and characterized.
- Replace and Replace All resolve current state positions, apply matches last-to-first in one tagged update, and call the completion callback once. When shared history currently belongs to another initialized editor, its entry is preserved below an explicit active-editor baseline so the search action itself is the next single undo/redo step.
- Added five focused tests and a public Ladle fixture with three `CX-6` journeys. Direct evidence covers typing, formatting, `setMarkdown`, highlights/ranges/navigation/scrolling, literal replacement, callback and update counts, one-step Undo/Redo, root/JSX/directive/table scope, atomic exclusion, invalid/zero-length recovery, all close paths, active-editor switch, unmount cleanup, and browser runtime errors.
- Validation ledger: focused `src/test/search.test.tsx` 5/5; focused `CX-6` 9/9 across Chromium, Firefox, and WebKit; final `npm run lint && npm run typecheck && npm run test:once && npm run test:browser && npm run build && npm run test:lexical-versions && npm run test:package && npm run test:cross-version && npm run build:docs:api` passed with 62 unit tests (1 skipped, 1 todo), 45/45 browser scenarios, 24 Lexical packages at 0.48.0, packed React 18/19 consumers, and the published 4.0.4/0.35 replay. Formatting, PRP validation, and patch hygiene are checked at handoff.
- Implementation is complete with no public API, regex policy, multi-editor transaction, source/diff/CodeMirror, or composer-architecture expansion. Independent Standard-assurance verification remains pending, so R4 stays `IN PROGRESS` and R5 stays blocked.

## Verification Record

### 2026-07-18 — Standard assurance

- **Verifier shape**: one fresh-context, read-only verifier independently performed consumer acceptance, PRP compliance, and engineering-quality passes. The main agent reproduced the verifier's evidence gaps, strengthened the tests, fixed the production issue exposed by that evidence, and reran the complete invalidated validation surface. The same verifier then reviewed only those changes and repeated the affected public scenarios and edge probes.
- **Acceptance grade**:

  | Scenario | Grade             | Direct evidence                                                                                                                                                                                                                                                                                                                                                                                                                      |
  | -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | `CX-6a`  | DIRECTLY VERIFIED | The public-hook journey passes in Chromium, Firefox, and WebKit with plain, split-bold, italic, and linked matches. It directly proves navigation, current/all DOM ranges, both highlight registries, both scrolling call shapes/options, typing before and inside an existing match, a confirmed formatting mutation, programmatic `setMarkdown()`, and current result recovery.                                                    |
  | `CX-6b`  | DIRECTLY VERIFIED | All three engines directly prove single Replace and Replace All, exact rendered/Markdown output, literal `$&`, cursor/range state, callback and update counts, unaffected nested/atomic content, and one-step Undo/Redo. Focused and browser probes additionally cover stale scan/action failure, cross-block replacement, complete linked-text replacement, multiple length-changing same-node replacements, and empty replacement. |
  | `CX-6c`  | DIRECTLY VERIFIED | All three engines directly prove independent root, JSX, directive, and table-cell search scopes; atomic exclusion; invalid/zero-length recovery without mutation or hang; every documented close path; active-editor switching; unmount cleanup; and absence of browser runtime errors.                                                                                                                                              |

- **Resolved findings**: the initial automated `CX-6a` evidence did not contain italic/link matches or directly type inside an existing match, and it formatted nonmatching text. The verifier also found missing focused stale-action/cross-block regressions and incomplete exact Replace assertions. Expanding the fixture exposed a real Lexical failure when Replace All targeted the complete sole `TextNode` inside a link after Undo: `RangeSelection.insertText` recursively reached a detached text node. Same-node matches now use reverse-order `TextNode.spliceText`, preserving format/style/link ancestry for nonempty replacements and removing an empty result; cross-node matches retain `RangeSelection.insertText`. The fixture and tests now cover every missing case.
- **PRP compliance**: Tasks 1-4 and all five success criteria are satisfied. Lexical editor identity plus node-key/original-offset positions remain authoritative; public DOM `Range`/`TextNodeIndex` values are projections; Replace All is one tagged update/history action; active-editor cleanup is explicit; and every public hook/cell/helper export and documented rich-text/regex boundary remains compatible. No source/diff/CodeMirror, cross-editor transaction, composer/history migration, new search syntax, highlight-name redesign, or public API expansion was introduced. The two recorded R3 test-only fixes remain bounded and behavior-neutral.
- **Engineering review**: no unresolved correctness, regression, security, error-handling, maintainability, or test-quality finding remains. The verifier directly confirmed reverse offsets with longer and empty replacements, clean empty-link removal, format/link preservation, stale-action fail-closed behavior, cross-block replacement, and process/listener cleanup.
- **Fresh verification evidence**: structural validation passed with the three documented non-blocking size warnings; the verifier independently passed focused search tests and the original 9/9 `CX-6` matrix before identifying evidence gaps. After correction, the main agent passed typecheck, focused search tests 8/8, and `CX-6` 9/9; the verifier independently repeated 8/8 and 9/9 plus direct all-engine edge probes. The final integrated `npm run lint && npm run typecheck && npm run test:once && npm run test:browser && npm run build && npm run test:lexical-versions && npm run test:package && npm run test:cross-version && npm run build:docs:api` passed with 65 unit tests (1 skipped, 1 todo), 45/45 browser scenarios, 24 Lexical packages at 0.48.0, packed React 18/19 consumers, and the published 4.0.4/Lexical 0.35 replay. Prettier and `git diff --check` pass; no port 61000 listener or owned browser/Ladle process remains.
- **Environment note**: restricted macOS browser launches were denied before page creation. The exact Playwright commands passed in the permitted browser environment; this was not a product or browser-page crash. Existing non-failing toolchain warnings remain as recorded in Execution Notes.
- **Limitations**: source/diff/CodeMirror content, atomic decorator payloads, cross-editor matches/transactions, simultaneous highlights across multiple MDXEditor instances, mobile/device-specific behavior, exhaustive IME behavior, and new regex/Unicode product policy remain outside the claimed surface.
- **Result**: VERIFIED. R4 produces the directly tested active-editor state-position/search-history invariant required by R5.
