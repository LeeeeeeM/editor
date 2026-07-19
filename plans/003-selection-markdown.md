---
repo: /Users/petyo/w/mdx-editor/editor
---

# PRP: Selection-Scoped Markdown Through the Active Editor Pipeline

## Goal

Make `MDXEditorMethods.getSelectionMarkdown()` and `getSelectionAsMarkdown(editor, exportParams)` return only the active Lexical editor's selected content while preserving MDXEditor's MDAST visitors, Markdown extensions/options, JSX descriptors, custom-node registrations, and root/nested routing.

Replace the handwritten whole-node serializer with a selection-cloning boundary backed by Lexical 0.48's clipboard primitives and an isolated temporary editor. Do not introduce a second transformer configuration, mutate the source editor, or adopt `@lexical/mdast`.

## Why

- The current helper expands partial ranges to whole paragraphs/list items, so consumers can receive content they did not select.
- The handwritten serializer ignores its `exportParams`, loses built-in/custom constructs, flattens nested/task lists, and implements only a subset of MDXEditor's formatting semantics.
- PR #949 identified a useful upstream selection API but implemented a parallel `@lexical/markdown` transformer path with global/cache and plugin-order risks. R3 should retain one consumer-visible Markdown contract instead.
- Accurate selection export is an invariant needed before R5 changes root/nested composer internals.

## Success Criteria

- [x] Partial, backward, multi-block, formatted, linked, nested-list, and task-list selections return only the selected fragment with valid Markdown structure.
- [x] Meaningful node and custom-construct selections serialize through the same registered visitors, extensions, options, and descriptors as full-document export.
- [x] Root and active nested-editor selections route correctly; absent/collapsed selections and source/diff mode return `''`.
- [x] Two simultaneously rendered editors retain independent visitor/options configuration, and repeated calls do not change source state, selection, history, callbacks, or shared arrays.
- [x] The public method/helper signatures and full-document Markdown behavior remain source-compatible, and direct browser evidence passes in Chromium, Firefox, and WebKit.

## Assurance

- **Profile**: Standard
- **Rationale**: This corrects a public imperative method and touches shared Markdown export, custom-node reconstruction, and active nested-editor routing. The change is reversible, introduces no persisted schema or deployment boundary, and the architecture was resolved by a child-local scratch spike. Direct public-ref browser coverage plus focused state tests bound the remaining risk; no Deep trigger is evidenced. The near-exceptional document size is load-bearing because one inherited public scenario spans range direction, structural/atomic nodes, custom configuration, nested routing, non-mutation, three browser engines, and shared full-export/package regression gates.

## Roadmap Context

- **Parent roadmap**: `plans/roadmaps/001-lexical-048-adoption.md`
- **Roadmap step**: `R3` — make selection Markdown match the active editor contract.
- **Satisfied dependencies**: R2 is `VERIFIED`; its Verification Record proves a lockstep Lexical 0.48.0 graph, full package/build gates, React 18/19 consumers, cross-version Markdown, and 18 browser tests across Chromium, Firefox, and WebKit for parent `CX-1` through `CX-4`.
- **Inherited decisions and invariants**: public plugin/visitor/ref contracts remain source-compatible; full-document export stays on MDXEditor's MDAST visitor pipeline; `activeEditor$` chooses root versus nested content; fail-closed URL behavior remains; `@lexical/mdast`, search, and composer/history migration stay separate.
- **Contract produced for later steps**: directly verified parent `CX-5` behavior and a selection/full-export consistency invariant consumed by R5.

## Consumer Contract

### Consumer and Public Boundary

- **Consumer(s)**: React integrators using `MDXEditorMethods`; authors selecting Markdown/MDX in root or nested editors; plugin authors registering Lexical nodes, export visitors, Markdown extensions/options, and JSX descriptors.
- **Public or supported boundary**: `MDXEditor` props/plugins, `MDXEditorMethods.getSelectionMarkdown()`, and the exported `getSelectionAsMarkdown(editor, exportParams)` helper.
- **Entry point and prerequisites**: a rendered Lexical 0.48 MDXEditor in rich-text mode with a non-collapsed browser selection or meaningful node selection; supported plugins/configuration are registered on that editor.
- **Current observable behavior**: absent/collapsed/source/diff cases return empty, but partial text expands to whole blocks, custom export configuration is ignored, nested/task lists are malformed, and many custom/decorator nodes degrade to text or disappear.
- **Observable promise**: the returned fragment contains only the active editor's selected content, expressed with that editor's normal Markdown semantics and supported custom constructs, without observable mutation.
- **Must remain compatible with**: `MDXEditorMethods`, direct helper callers, React 18/19, the verified R2 package/browser contract, public `LexicalExportVisitor`/plugin configuration, `additionalLexicalNodes`, root/nested active-editor semantics, and normal `getMarkdown()` output.
- **Not claimed**: clipboard integration, a live selection UI, byte-identical syntax beyond configured MDAST canonicalization, partial editing inside atomic decorator payloads, source/diff selection export, mobile/every-IME certification, or `@lexical/mdast` adoption.

### Acceptance Scenarios

<!-- prettier-ignore -->
| ID | Given | When | Then | Exact exercise and prerequisites | Required evidence |
|---|---|---|---|---|---|
| `CX-5` | A rendered editor has partial, backward, multi-block, nested/task-list, partial-link, node, built-in custom-node, consumer-visitor, or active nested-editor selection; a second editor may use different export options | The consumer invokes `getSelectionMarkdown()` through the public ref one or more times | Each result represents only that editor's selected fragment with its visitors, extensions, options, descriptors, and custom registrations; absent/collapsed/source/diff cases return `''`; repeated calls leave full Markdown, selection, history, callbacks, and the other editor unchanged | In Chromium, Firefox, and WebKit, use DOM `Range`/`Selection.setBaseAndExtent`, direct clicks for the selectable thematic break, and rendered nested content. Cover partial plain/bold/italic/code text; the upstream partial-link case excluding the first character; equivalent forward/backward multi-block ranges; nested ordered and task-list slices; a range spanning table/thematic break/code/image/directive/JSX/frontmatter representatives; a consumer text visitor plus distinct `toMarkdownOptions` in two simultaneous editors; a nested directive/JSX editor; two repeated reads; collapsed/no-selection and source/diff controls. Invoke only the public ref button and compare the returned fragment plus public `getMarkdown()`/observable change count | DIRECT REQUIRED |

## Research Summary

### Vetted Repository Findings

- `src/MDXEditor.tsx:172-176,261-287` — the public method already routes through `activeEditor$` and gathers visitors, `toMarkdownExtensions`, `toMarkdownOptions`, JSX descriptors, and JSX availability — **PRP impact**: preserve this entry point and make the helper actually consume every supplied parameter.
- `src/utils/lexicalHelpers.ts:162-278` — the current public helper rejects every non-range selection, promotes selected leaves to whole blocks, hand-serializes a small format/node subset, ignores `_exportParams`, and trims the result — **PRP impact**: replace the implementation, retain its source-compatible signature, and explicitly cover node selection plus selected whitespace/structural boundary normalization.
- `src/exportMarkdownFromLexical.ts:100-221,390-439` — full export walks registered visitors into MDAST and applies editor-local extensions/options, but sorts the supplied visitor array in place — **PRP impact**: selected content must re-enter this pipeline, and visitor ordering must use a copy so repeated calls do not mutate shared realm configuration.
- `src/plugins/core/index.ts:108-118,251-288,326-360,940-1015` — root/active editor, registered nodes/visitors, extensions/options, and `additionalLexicalNodes` compose the live editor contract — **PRP impact**: the selected scratch editor must inherit the active editor's complete registration map, including node replacements, without adding a public configuration requirement.
- `src/plugins/core/NestedLexicalEditor.tsx:216-354` — nested editors use the same registered nodes/visitors and become active on focus/selection change — **PRP impact**: clone from the active nested state and return its fragment, not the outer directive/JSX wrapper.
- `src/plugins/table/TableNode.tsx:49-96`, `src/plugins/directives/DirectiveNode.tsx:27-70`, and `src/plugins/jsx/LexicalJsxNode.tsx:28-66` — built-in atomic/custom nodes preserve MDAST payloads through `exportJSON`/`importJSON` — **PRP impact**: Lexical selection JSON can retain these payloads for the existing export visitors.
- `src/test/selection-markdown.test.tsx:9-36` — current coverage checks only method existence and empty results — **PRP impact**: replace comments/manual reliance with selection, configuration, node, mutation, and failure-focused tests.
- `src/test/fixtures/LexicalCompatibilityHarness.tsx:83-179`, `tests/browser/lexical-compatibility.spec.ts:1-105`, and `playwright.config.ts` — R1 established a deterministic public-ref story and three-browser lifecycle on port 61000 — **PRP impact**: add a dedicated selection fixture/story/spec to the same harness rather than create another host.
- `reports/pr-949-review.md:15-48` — PR #949 correctly identifies partial selection loss but its transformer approach drops custom nodes, mutates shared transformers, caches table extensions globally/order-dependently, and diverges from configured MDAST output — **PRP impact**: do not copy its transformer/cache architecture; retain the upstream partial-link regression case.

### External Constraints

- Lexical 0.48's `$generateJSONFromSelectedNodes` slices selected text, retains qualifying ancestors through `extractWithChild`, supports `NodeSelection`, and serializes registered custom nodes; `$generateNodesFromSerializedNodes` reconstructs them through registered `importJSON` — [official 0.48 clipboard source](https://github.com/facebook/lexical/blob/v0.48.0/packages/lexical-clipboard/src/clipboard.ts).
- Creating a no-config child editor while an editor context is active inherits the active editor's registered node map; this lets a temporary editor reconstruct plugin nodes and replacements without private registry access — [official 0.48 editor source](https://github.com/facebook/lexical/blob/v0.48.0/packages/lexical/src/LexicalEditor.ts).
- `$convertSelectionToMarkdownString` is transformer-configured and its element transformers receive an optional selection; it does not consume MDXEditor's MDAST visitor/options contract — [official Markdown API](https://lexical.dev/docs/api/modules/lexical_markdown), [official 0.48 Markdown export source](https://github.com/facebook/lexical/blob/v0.48.0/packages/lexical-markdown/src/MarkdownExport.ts).

### Settled Decisions and Rejected Alternatives

- **Decision**: capture selected JSON in a read of the active source editor, create a no-config temporary editor inside that read so it inherits registrations, reconstruct/attach the selected nodes there, and run the existing MDAST exporter — **Evidence/rationale**: `plans/research/003-selection-markdown/spike-01-selection-export-pipeline.md` directly proved partial text/link, multi-block, custom node, repeatability, custom registration inheritance, and zero source updates.
- **Decision**: wrap consecutive top-level inline reconstructed nodes in temporary paragraphs and append block nodes directly to the temporary root — **Rationale**: Lexical selection JSON intentionally strips unneeded ancestors for single inline ranges, while MDXEditor's root exporter requires a valid block-capable tree.
- **Decision**: perform scratch reconstruction/export inside a guarded temporary update with transforms skipped, capture any thrown error, and rethrow after the update — **Rationale**: selected-node construction requires write context, but serialization errors must not become console-only partial/empty output.
- **Decision**: remove serializer-added terminal newline(s) without blanket `trim()` of user-selected inline content — **Rationale**: the result is a fragment, while selected leading/trailing content must not be silently broadened or discarded.
- **Rejected**: `$convertSelectionToMarkdownString` plus table/thematic/custom transformers — **Reason**: it creates a second public serialization configuration and repeats PR #949's custom-node and multi-editor risks.
- **Rejected**: temporarily setting or editing the source editor state — **Reason**: an imperative getter must not publish updates, affect history, move selection, or trigger parent/nested synchronization.
- **Rejected**: private `_nodes` access, module-level caches, or a new required node-registration parameter — **Reason**: the no-config temporary editor inherits the active registration map and preserves the existing public helper call shape.

### Spike Evidence

- `plans/research/003-selection-markdown/spike-01-selection-export-pipeline.md` — **Question**: can Lexical selection clipping feed the existing MDAST exporter without source mutation? — **Result/decision**: CONCLUSIVE; selected JSON plus a registration-inheriting temporary editor produced correct partial text/link, multi-block, and custom-node Markdown with stable repeated output and no source update — **Limits**: execution must still cover the full built-in/custom matrix, node replacements, options isolation, browser-created backward selection, and nested editors.

### Validation Baseline

| Command                                                                                         | Status             | Observed or expected result                                                                                                                      |
| ----------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run test:once -- src/test/selection-markdown.test.tsx`                                     | Verified           | Existing baseline passes 3 tests; they cover only empty/method-exists behavior.                                                                  |
| `npm run test:browser`                                                                          | Verified inherited | R2 Verification Record: 18 tests pass across Chromium, Firefox, and WebKit; current selection assertion covers only collapsed empty output.      |
| `npm run lint`, `npm run typecheck`, `npm run test:once`                                        | Verified inherited | R2 verification passed; unit baseline was 50 passed, 1 skipped, 1 todo.                                                                          |
| `npm run build`, `npm run build:docs:api`, `npm run test:package`, `npm run test:cross-version` | Verified inherited | R2 package/declaration, React 18/19, and 0.35 replay gates pass.                                                                                 |
| Scratch selection/MDAST prototype                                                               | Verified           | Partial text/link, multi-block, custom decorator, repeated calls, and inherited custom-node registration all passed with source state unchanged. |

### Research Coverage

- **Depth**: Standard
- **Inspected**: parent R3 contract and R2 verification summary; public ref/helper; active/root editor and registration/config cells; normal MDAST exporter; representative built-in node JSON/visitors; nested editor lifecycle; existing unit/browser fixtures; PR #949 findings; installed and official Lexical 0.48 clipboard/editor/Markdown source.
- **Not inspected**: R4 search, R5 extension migration, clipboard behavior, mobile/device farms, exhaustive IME behavior, `@lexical/mdast`, or unrelated plugins.
- **Research confidence**: HIGH — the architecture and custom-registration inheritance were empirically proven; remaining cases are deterministic variations on the same public boundary and existing browser harness.

## Execution Contract

- **Planned at commit**: `9373742`
- **Planning baseline**: the worktree contains verified, uncommitted R1/R2 implementation plus existing `plans/` and `reports/`; preserve all of it. R3 planning adds only this PRP and its spike record before execution.

### Expected Changes

- `src/utils/lexicalHelpers.ts` — replace the handwritten selection serializer with selected-JSON capture, isolated reconstruction, fragment normalization, and existing-pipeline export.
- `src/exportMarkdownFromLexical.ts` — copy before visitor sorting and add only the internal factoring needed to serialize the temporary selected tree without changing normal export output.
- `src/MDXEditor.tsx` — documentation or wiring only if needed; retain the public method signature and current active-editor/config lookup.
- `src/test/selection-markdown.test.tsx` — focused helper/public-ref state, node, config, error, and non-mutation tests.
- `src/test/fixtures/SelectionMarkdownHarness.tsx` and `src/examples/get-selection-markdown.tsx` — deterministic public selection fixture on the existing Ladle host.
- `tests/browser/selection-markdown.spec.ts` — direct `CX-5` matrix in Chromium, Firefox, and WebKit.
- API documentation generated by `npm run build:docs:api` only if checked-in output changes under the repository's existing convention.

### Explicitly Out of Scope

- Clipboard/copy command integration, live selection preview UI, search/replace, composer/history extensions, `@lexical/mdast`, NodeState migration, Shadow DOM certification, or unrelated editor UX.
- Replacing the full-document MDAST visitor pipeline, adding transformer configuration to plugins, changing public visitor/helper/ref signatures, or requiring consumers to expose Lexical internals.
- Partial extraction from inside atomic decorator payloads; selecting an atomic node serializes that supported node as a whole, while selections inside its nested Lexical editor serialize only the nested active content.
- Changing source/diff behavior from the documented empty result or changing normal `getMarkdown()` canonical output.

### Scope Expansion Rule

Additional selection fixture or built-in-node files may change only when direct `CX-5` evidence exposes a selection serialization defect in that node's existing JSON/visitor contract. Record the path and evidence in Execution Notes. Pause before any public API requirement, visitor-contract break, full-export behavior change, source-state mutation, or adoption of a second serialization architecture.

### Pause and Reassess If

- A supported built-in or representative consumer node cannot round-trip selected JSON through its registered `exportJSON`/`importJSON` without losing content.
- The temporary editor cannot inherit `additionalLexicalNodes` replacements in the real rendered path without private registry access or a new public argument.
- Correct partial selection requires changing existing consumer visitors or narrowing parent `CX-5` to stock Markdown.
- A getter call emits source-editor updates, changes selection/history/full Markdown, or triggers nested-parent synchronization.
- Selection/full-export consistency requires replacing the established MDAST pipeline or adopting `@lexical/mdast`.

## Context

### Key Files

- `plans/roadmaps/001-lexical-048-adoption.md` — parent `CX-5`, R3 boundaries, and R5 handoff.
- `plans/002-lexical-048-upgrade.md` — verified Lexical 0.48/package/browser dependency contract.
- `plans/research/003-selection-markdown/spike-01-selection-export-pipeline.md` — selected architecture and reproducible evidence.
- `src/MDXEditor.tsx` — public imperative method and editor-local configuration lookup.
- `src/utils/lexicalHelpers.ts` — broken current implementation and public helper signature.
- `src/exportMarkdownFromLexical.ts` — canonical visitor/MDAST/extension/options exporter.
- `src/plugins/core/index.ts` and `src/plugins/core/NestedLexicalEditor.tsx` — active-editor routing, node registration, and nested lifecycle.
- `src/plugins/core/LexicalTextVisitor.ts` and `src/plugins/lists/LexicalListItemVisitor.ts` — formatting and structural behavior that must receive reconstructed clipped nodes.
- `src/plugins/table/TableNode.tsx`, `src/plugins/directives/DirectiveNode.tsx`, `src/plugins/jsx/LexicalJsxNode.tsx` — representative atomic/custom JSON contracts.
- `src/test/fixtures/LexicalCompatibilityHarness.tsx`, `tests/browser/lexical-compatibility.spec.ts`, and `playwright.config.ts` — browser fixture/process conventions.

### Gotchas

- `$generateNodesFromSerializedNodes` creates nodes and cannot run in a read-only context; use a separate temporary editor update, never a source update.
- Call `createEditor()` with no explicit config while the source editor read is active; passing a new config builds a default registry and loses plugin/custom nodes.
- Single inline selections may serialize as top-level text/link nodes with no paragraph ancestor; group consecutive inline nodes before appending to the temporary root.
- The temporary editor's default error handler logs. Catch reconstruction/export errors inside its update and rethrow outside so failure cannot masquerade as empty Markdown.
- `visitors.sort(...)` mutates the realm-owned array. Sort a copy before both full and selected exports.
- A backward DOM selection must produce the same document-order fragment as its forward equivalent; do not order output by anchor/focus direction.
- Selected JSX may require its import statement. Preserve the existing descriptor/import-registration logic and exclude unrelated imports.
- Browser selection changes must be dispatched after `setBaseAndExtent`; wait for active nested-editor routing before invoking the ref.

## Implementation Blueprint

### Tasks

```yaml
Task 1: Replace whole-node selection serialization with an isolated selected tree
  MODIFY src/utils/lexicalHelpers.ts:
    - Preserve getSelectionAsMarkdown(editor, exportParams) as the public call shape.
    - In a source editor read, reject null, collapsed RangeSelection, and empty selections; capture selected JSON with $generateJSONFromSelectedNodes.
    - Create a no-config temporary editor while the source editor context is active so all registered classes and replacements are inherited.
    - In a guarded temporary update with transforms skipped, reconstruct selected nodes, group consecutive top-level inline nodes into paragraphs, attach block nodes directly, and export via exportMarkdownFromLexical with the supplied parameters.
    - Return a fragment without serializer-added terminal newline while preserving selected inline content; capture and rethrow reconstruction/export failures.
    - Do not publish, update, focus, or set state on the source editor.
  MODIFY src/exportMarkdownFromLexical.ts:
    - Sort a copy of visitors and factor only the reusable internal export entry needed by the selected tree.
    - Preserve byte-for-byte normal full-document output for existing fixtures.
  PATTERN: node_modules/@lexical/clipboard/src/clipboard.ts:500-696; src/exportMarkdownFromLexical.ts:112-221,426-439
  ENABLES: CX-5
  VERIFY:
    - COMMAND: npm run test:once -- src/test/selection-markdown.test.tsx
    - EXPECTED: Focused partial/structural/node/custom/config/non-mutation cases pass with no console-only failure.

Task 2: Characterize the complete helper and editor-local contract
  MODIFY src/test/selection-markdown.test.tsx:
    - Cover partial offsets and selected leading/trailing content, mixed formatting, forward/backward multi-block ranges, partial links excluding the first character, nested/task lists, and NodeSelection.
    - Cover table, thematic break, code block, image, directive, JSX, frontmatter, and a consumer visitor/additional-node replacement with registered JSON import/export.
    - Assert editor-local toMarkdownOptions/extensions/descriptors, two-editor isolation, stable repeated output, unchanged source EditorState/selection/full export/history signals, and synchronous failure rather than silent content loss.
    - Retain empty/null/collapsed behavior and source-compatible direct helper invocation.
  MODIFY src/MDXEditor.tsx only if documentation/wiring is needed:
    - Preserve activeEditor$ routing and every existing realm export parameter.
  PATTERN: src/test/core.test.tsx; plans/research/003-selection-markdown/spike-01-selection-export-pipeline.md
  ENABLES: CX-5
  VERIFY:
    - COMMAND: npm run test:once -- src/test/selection-markdown.test.tsx
    - EXPECTED: All focused cases pass and getStateAsMarkdown/full fixtures remain unchanged.

Task 3: Add direct public-ref browser evidence
  CREATE src/test/fixtures/SelectionMarkdownHarness.tsx:
    - Render deterministic root/nested/custom content, a public ref read button/output, full-Markdown output, observable change count, source/diff controls, and two simultaneous independently configured editors.
    - Register a representative consumer export visitor/node through public plugin APIs; do not expose a private serialization shortcut.
  MODIFY src/examples/get-selection-markdown.tsx:
    - Host the deterministic selection contract story on the existing Ladle application while retaining a usable example.
  CREATE tests/browser/selection-markdown.spec.ts:
    - Exercise every matrix row named in CX-5 through browser DOM selection/clicks and the public ref button.
    - Assert exact fragments, forward/backward equality, custom/config isolation, nested routing, repeated-read non-mutation, full Markdown stability, empty mode behavior, and no page/console errors.
  PATTERN: src/test/fixtures/LexicalCompatibilityHarness.tsx; tests/browser/lexical-compatibility.spec.ts
  ENABLES: CX-5
  VERIFY:
    - COMMAND: npm run test:browser -- --grep CX-5
    - EXPECTED: Every R3 scenario passes in Chromium, Firefox, and WebKit.
    - FAILURE-LOCAL: npm run test:browser -- --project=chromium --grep CX-5; npm run test:browser -- --project=firefox --grep CX-5; npm run test:browser -- --project=webkit --grep CX-5
    - PROCESS-LIFECYCLE: Playwright starts Ladle on 127.0.0.1:61000, reports each project/test as progress, exits 0 only after all selected tests pass, retains traces/screenshots/video on failure, and owns graceful service/port cleanup on success or failure.

Task 4: Prove integration and package stability
  MODIFY documentation/API comments only where the corrected fragment semantics need clarification:
    - State active-editor behavior, empty source/diff/collapsed result, and configured Markdown semantics without exposing the temporary-editor implementation.
  RUN full repository gates:
    - Re-run existing CX-2/CX-3 compatibility evidence because selected export shares the normal visitor pipeline and nested-editor routing.
    - Rebuild declarations/API docs and the packed React consumers; replay the cross-version fixture to prove normal getMarkdown() output is unchanged.
  ENABLES: CX-5
  VERIFY:
    - COMMAND: npm run lint && npm run typecheck && npm run test:once && npm run test:browser && npm run build && npm run test:lexical-versions && npm run test:package && npm run test:cross-version && npm run build:docs:api
    - EXPECTED: Every command exits 0; all CX-5 tests pass in three engines; normal compatibility, package, and cross-version outputs remain green.
    - FAILURE-LOCAL: npm run lint; npm run typecheck; npm run test:once -- src/test/selection-markdown.test.tsx; npm run test:compat:unit; npm run test:browser -- --grep CX-5; npm run test:browser -- --project=chromium --grep CX-3; npm run build; npm run test:lexical-versions; npm run test:package -- --react=18; npm run test:package -- --react=19; npm run test:cross-version; npm run build:docs:api
    - PROCESS-LIFECYCLE: Playwright owns Ladle/port 61000 and browser artifacts. Package/cross-version scripts own temporary apps, npm caches, tarballs, preview servers, Chromium pages, and loopback ports in finally blocks. Success is exit 0 from the integrated command; failure is the first nonzero phase with its named local command; no process, port, or scratch directory may remain afterward.
```

### Integration Points

```yaml
PUBLIC_METHOD:
  - src/MDXEditor.tsx — retain activeEditor$ and editor-local export parameter lookup.

SELECTION_CLONE:
  - src/utils/lexicalHelpers.ts — bridge Lexical selected JSON into an isolated valid tree.

MARKDOWN_PIPELINE:
  - src/exportMarkdownFromLexical.ts — one visitor/MDAST/options implementation for full and selected export.

CUSTOMIZATION:
  - src/plugins/core/index.ts — inherited registered nodes, visitors, extensions, options, and descriptors; no new consumer setup.

BROWSER_EVIDENCE:
  - src/examples/get-selection-markdown.tsx — Ladle route.
  - tests/browser/selection-markdown.spec.ts — public-ref CX-5 verification in all configured engines.
```

## Validation

```bash
  # Focused implementation and public-contract checks
npm run test:once -- src/test/selection-markdown.test.tsx
npm run test:browser -- --grep CX-5

  # Static and complete unit/browser regression gates
npm run lint
npm run typecheck
npm run test:once
npm run test:browser

  # Published artifact, full Markdown compatibility, and docs
npm run build
npm run test:lexical-versions
npm run test:package
npm run test:cross-version
npm run build:docs:api

  # Patch hygiene
npx prettier --check src/utils/lexicalHelpers.ts src/exportMarkdownFromLexical.ts src/MDXEditor.tsx src/test/selection-markdown.test.tsx src/test/fixtures/SelectionMarkdownHarness.tsx src/examples/get-selection-markdown.tsx tests/browser/selection-markdown.spec.ts plans/003-selection-markdown.md plans/research/003-selection-markdown/spike-01-selection-export-pipeline.md
git diff --check
```

The `CX-5` row is authoritative. Focused state tests support edge diagnosis, but verification must select real rendered content and invoke the public ref in Chromium, Firefox, and WebKit. Browser and package processes use the ownership/cleanup rules in Tasks 3-4; leftover Ladle/preview processes, port 61000 listeners, or disposable consumer directories fail cleanup.

## Unknowns & Risks

- A consumer node that does not implement Lexical's supported `exportJSON`/`importJSON` contract cannot be reconstructed faithfully. R3 directly verifies a representative compliant consumer node/replacement and fails loudly for malformed registration; it does not promise compatibility for unserializable nodes.
- Temporary editor creation adds per-call allocation. Selection export is an explicit consumer action, and the scratch editor has no DOM/listeners after the call; repeated-call tests guard correctness. Performance optimization may cache only per editor with explicit lifecycle cleanup and must not introduce global/shared configuration.
- Atomic nodes are all-or-nothing at the outer editor boundary. Nested Lexical editors remain independently selectable through `activeEditor$`; tests distinguish these cases.
- MDAST canonicalization can add structural markers/imports required to make the selected fragment valid. Tests assert configured semantic output rather than reusing the source bytes.

**Confidence: 9/10** for one-pass implementation success. The load-bearing architecture, partial-link behavior, custom payload, registration inheritance, and source non-mutation were observed in scratch; the remaining risk is breadth across the built-in browser matrix rather than an unresolved design choice.

## Execution Notes

### 2026-07-18 — implementation handoff

- Replaced the handwritten whole-node serializer with the planned selected-JSON boundary. The helper captures the active RangeSelection or NodeSelection without a source update, creates a no-config temporary editor inside that read to inherit registered nodes/replacements, reconstructs a valid selected tree with top-level inline normalization, and sends it through the existing MDAST visitor/extensions/options/descriptors pipeline. Reconstruction/export errors are caught inside the temporary update and rethrown synchronously.
- Changed `exportLexicalTreeToMdast` to sort a copy of the visitor array. Repeated selection and full-document exports therefore cannot reorder realm-owned or consumer-owned visitor configuration. Public helper/ref signatures and the normal full-export path are unchanged; the public method documentation now states active root/nested and configured-serialization behavior.
- Expanded the focused suite from 3 empty/method checks to 10 tests covering clipped whitespace, bold/link ranges including the PR #949 first-character exclusion, forward/backward multi-block equivalence, structural NodeSelection, editor-local list options, a registered consumer decorator/visitor, visitor-array/source-state/selection/update-listener non-mutation, repeatability, loud missing-visitor failure, and collapsed selection.
- Added a deterministic public-ref Ladle fixture and six `CX-5` browser scenarios. The final fixture covers plain/bold/italic/code/link ranges, backward multi-block selection, nested ordered/task lists, full ranges containing frontmatter/table/thematic break/code/image/directive/JSX, a high-priority consumer text visitor plus distinct list options in a simultaneous editor, repeated reads and callback/full-Markdown stability, active nested JSX routing, and collapsed/source/diff empty results. A local `/favicon.svg` image replaces the initial network placeholder so WebKit's console-error gate is deterministic.
- Validation passed: `npm run lint`; `npm run typecheck`; `npm run test:once` (57 passed, 1 skipped, 1 todo); `npm run test:browser` (36/36 across Chromium, Firefox, and WebKit, including all prior `CX-2`–`CX-4` scenarios and 18 `CX-5` runs); `npm run build`; `npm run test:lexical-versions` (24 packages at 0.48.0); `npm run test:package` (packed React 18 and 19 consumers); `npm run test:cross-version`; `npm run build:docs:api`; targeted Prettier checks; and `git diff --check`.
- The first sandboxed Playwright and package-consumer launches were denied by macOS `MachPortRendezvousServer` permissions before a page opened. The exact commands passed outside the restricted process sandbox. Existing non-failing stale Browserslist, legacy JSX transform, jsdom CodeMirror geometry, Radix bundle directive, chunk-size, and TypeDoc/API Extractor TypeScript-version warnings remain visible; no browser console-error allowlist was added.
- Implementation and main-agent integration verification are complete. Independent Standard-assurance verification remains pending, so R3 stays `IN PROGRESS`; R5 remains blocked on verified R3 and R4.

## Verification Record

### 2026-07-18 — Standard assurance

- **Verifier shape**: one fresh-context, read-only verifier independently performed consumer acceptance, PRP compliance, and engineering-quality passes. The main agent reproduced and closed two concrete evidence gaps; the same verifier then inspected only those patches and reran the invalidated scenarios across all three engines.
- **Acceptance grade**:

  | Scenario | Grade             | Direct evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
  | -------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `CX-5`   | DIRECTLY VERIFIED | The public-ref suite passed all six scenarios in Chromium, Firefox, and WebKit: 18/18 before the evidence correction and 18/18 after it. It covers partial/formatted/code/link selections, forward/backward multi-block ranges, nested/task lists, aggregate built-in/custom constructs, active nested-editor routing, empty modes, repeated reads, full-Markdown/callback stability, and two-editor option isolation. A direct click on the rendered thematic break creates a meaningful Lexical `NodeSelection` and returns `***`; a replacement-specific consumer visitor proves that a `TextNode` replacement supplied through `MDXEditorProps.additionalLexicalNodes` survives selected-JSON reconstruction and preserves editor-local list options. |

- **Resolved findings**: the initial browser matrix included the thematic break only through Select All, so it did not directly exercise the PRP-required browser-created node selection. It also registered a custom class directly in the focused helper test and a text visitor in the fixture, but did not prove the public `additionalLexicalNodes` replacement path. The fixture now configures a `TextNode` replacement class plus replacement-specific visitor through public props/plugins; the browser spec directly clicks `<hr>` and asserts `***`, then asserts replacement-specific partial and list output. The main-agent rerun passed 18/18 `CX-5` tests, and the verifier's targeted rerun passed both affected scenarios in all three engines: 6/6.
- **PRP compliance**: Tasks 1-4 and all five success criteria are satisfied. Selection capture/reconstruction uses the registration-inheriting temporary editor and existing MDAST exporter; visitor sorting no longer mutates shared configuration; focused tests cover clipping, direction, node/custom serialization, options, repeatability, non-mutation, errors, and collapsed selection; and the public browser fixture covers root/nested routing, custom configuration, structural/atomic content, and empty modes. No clipboard, search, composer/history, `@lexical/mdast`, public API, or full-export architecture expansion was introduced.
- **Engineering review**: no unresolved correctness, regression, security, error-handling, maintainability, or test-quality finding remains. Source editor state, selection, callbacks, history signals, full Markdown, and visitor arrays remain unchanged by reads; unsupported selected nodes fail synchronously instead of disappearing; temporary reconstruction retains registered classes and replacements without private registry access or global caches.
- **Fresh verification evidence**: structural validation passed with the three documented non-blocking size warnings; focused selection unit tests passed 10/10; `npm run lint`; `npm run typecheck`; full unit suite (57 passed, 1 skipped, 1 todo); `npm run test:browser` (36/36); `npm run build`; `npm run test:lexical-versions` (24 packages at 0.48.0); packed React 18/19 consumers; cross-version replay; API docs; targeted Prettier; and `git diff --check`. After the evidence-only fixture/spec correction, typecheck, focused unit tests, targeted Prettier, patch hygiene, and the complete three-engine `CX-5` matrix passed again. Cleanup inspection found no listener on port 61000, owned browser/Ladle process, or package/cross-version scratch directory.
- **Environment note**: restricted macOS browser launches were denied at `MachPortRendezvousServer` before any page opened. The exact Playwright commands passed outside that process sandbox; this was not a product or browser-page crash. Existing non-failing toolchain warnings remain as recorded in Execution Notes.
- **Limitations**: clipboard integration, mobile/device-specific behavior, exhaustive IME behavior, partial extraction inside atomic decorator payloads, and source/diff selection export remain outside the claimed surface.
- **Result**: VERIFIED. R3 produces a directly tested selection/full-export consistency invariant for R5. R5 remains independently blocked until R4 verifies `CX-6`.
