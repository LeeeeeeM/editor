# Lexical 0.35.0 → 0.48.0 upgrade assessment

Date: 2026-07-18

Status: research and upgrade rehearsal complete; implementation not started

## Executive summary

MDXEditor currently declares and resolves Lexical 0.35.0. The current stable Lexical release is 0.48.0, so the relevant upstream range is 0.36.0 through 0.48.0.

The upgrade is worthwhile, but it is not dependency-only. A clean rehearsal against 0.48.0 found two categories of required source/configuration changes:

1. TypeScript must resolve Lexical's conditional package exports. The current `moduleResolution: "node"` makes valid Lexical 0.48 exports appear missing. Use `bundler`, `node16`, or `nodenext` as appropriate for the project toolchain.
2. Two real source incompatibilities remain after fixing module resolution:
   - `CodeBlockNode.importJSON` is narrower than the new base-node contract.
   - The thematic-break visitor mixes the deprecated React `HorizontalRuleNode` subclass with the newer base node exported through the extension package.

The existing test suite still passes after swapping the packages to 0.48.0, but that is not strong evidence of behavioral compatibility. The riskiest areas are nested editors and update ordering, custom decorator nodes, lists, links/autolinks, Markdown shortcuts, clipboard/history behavior, and IME/browser handling. These are all areas in which MDXEditor has substantial custom logic and Lexical changed behavior during this release range.

The selection feature discussed in MDXEditor PR #949 is directly relevant. Lexical's new `$convertSelectionToMarkdownString` can replace the current handwritten selection serializer and fixes important correctness problems. The PR itself should not be reused unchanged: it mutates a global transformer array, unnecessarily rejects node selections, does not cover MDXEditor's custom nodes, has per-editor table configuration leakage, and adds no meaningful tests.

## Scope and method

This report maps the Lexical changelog from 0.35.0 to 0.48.0 against the packages and features used in this repository. It includes:

- the direct Lexical dependency inventory;
- a clean 0.48.0 install/typecheck/build/test rehearsal;
- behavior changes that can plausibly cause regressions in MDXEditor;
- new APIs and features worth integrating;
- an assessment of the selection-export idea from MDXEditor PR #949;
- a proposed upgrade and regression-test sequence.

The assessment intentionally excludes changes that are isolated to Lexical packages or features that MDXEditor does not use, except where they expose a useful replacement for existing custom functionality.

## Current dependency and usage inventory

`package.json` declares the following packages at `^0.35.0`, and the current lockfile resolves them to 0.35.0:

- `lexical`
- `@lexical/clipboard`
- `@lexical/link`
- `@lexical/list`
- `@lexical/markdown`
- `@lexical/plain-text`
- `@lexical/react`
- `@lexical/rich-text`
- `@lexical/selection`
- `@lexical/utils`

The repository uses these packages in functionality including:

- the root editor and manually assembled composer context;
- nested editors for directives, JSX children, and table cells;
- shared history between root and nested editors;
- custom nodes and decorator nodes;
- lists and checklists;
- links and a custom autolink implementation;
- Markdown shortcuts;
- selection inspection and selection-to-Markdown export;
- clipboard and drag/drop behavior;
- custom maximum-length enforcement;
- custom search/find-and-replace;
- custom table and thematic-break handling.

MDXEditor does not directly use `@lexical/table`, collaboration/Yjs, Prism/Shiki code highlighting, or Lexical's playground as runtime dependencies. Changes limited to those areas are generally out of scope.

## Verified upgrade rehearsal

### Baseline at 0.35.0

- `npm run typecheck`: passes.
- `npm run test:once`: 45 tests pass, 1 is skipped, and 1 is marked todo.

### Package swap to 0.48.0

- The same test suite passes: 45 passed, 1 skipped, 1 todo.
- Typechecking with the existing TypeScript configuration produces hundreds of false missing-export errors.
- Typechecking with `--moduleResolution bundler` reduces the failures to four occurrences representing two real incompatibilities.
- The ordinary build cannot complete declaration generation until the TypeScript resolution and source incompatibilities are fixed. The JavaScript transform proceeds, but the declaration/API-extraction phase fails.

The test result is encouraging only as a smoke test. The existing suite does not exercise enough browser selection, nested-editor, list, link, clipboard, IME, or custom-node behavior to rule out regressions.

## Required upgrade changes

### 1. Adopt conditional-export-aware TypeScript module resolution

Location: `tsconfig.json`

The project currently uses:

```json
"moduleResolution": "node"
```

Starting in the 0.46 line, Lexical's package types are exposed through conditional exports, including a TypeScript-version condition and an intentional fallback error type for old or incompatible resolvers. TypeScript 5.9.3 is new enough; the resolver setting is the problem.

Change the project to the module-resolution mode that matches the bundler/toolchain, most likely:

```json
"moduleResolution": "bundler"
```

After changing it, verify all declaration generation and the public API rollup, not only `tsc --noEmit`.

### 2. Broaden `CodeBlockNode.importJSON`

Location: `src/plugins/codeblock/CodeBlockNode.tsx`

Lexical 0.46's node configuration protocol broadens the base static `importJSON` contract. The custom method currently accepts only `SerializedCodeBlockNode`, making the custom class's static side incompatible with its base class. This also surfaces where the node class is passed as a Markdown transformer dependency and where it is registered in tests.

The clean fix should accept the base serialized-node shape required by Lexical, validate or default the custom fields, and preferably put field restoration in `updateFromJSON` if that produces a clearer contract. Avoid retaining the broad `as unknown as` cast used in PR #949 merely to silence the error.

### 3. Use one horizontal-rule node architecture consistently

Location: `src/plugins/thematic-break/LexicalThematicBreakVisitor.ts`

The Lexical extension work introduced a base `HorizontalRuleNode` in `@lexical/extension`, while `@lexical/react/LexicalHorizontalRuleNode` retains a deprecated React-oriented subclass/re-export path. The current visitor's node predicate and generic node type resolve to different sides of that split, so the type guard is not valid for the visitor's expected node type.

Choose a single architecture for the thematic-break plugin:

- migrate node registration and the visitor to the extension/base node; or
- deliberately stay on the deprecated React node for the initial upgrade, with imports and types consistently coming from that module.

The first option better aligns with Lexical's direction, but it should be tested for serialization, selection, keyboard deletion, clipboard, and React rendering behavior.

### 4. Reverify declaration bundling

Once the preceding issues are fixed, run the full package build and inspect the generated declarations. The rehearsal reached an API Extractor/declaration failure after the JavaScript build, so a passing source typecheck alone is not the completion criterion.

## Potential bug and behavior-change inventory

The entries below are limited to changes that intersect MDXEditor's current implementation. “Risk” describes the likelihood or impact of an unnoticed behavior change, not a claim that the current editor is already broken.

### Nested editors, parent delegation, and update ordering — high risk

Relevant MDXEditor areas include `src/MDXEditor.tsx`, `src/plugins/core/NestedLexicalEditor.tsx`, `src/plugins/core/SharedHistoryPlugin.tsx`, directives, JSX children, and table-cell editors.

Potentially observable changes:

- Parent-editor command delegation became asynchronous in 0.43. Code that assumes a nested editor command reaches the parent synchronously can observe different state or focus ordering.
- Lexical 0.47 defers `onUpdate` callbacks encountered during nested commits. MDXEditor's nested editors propagate Markdown and node state through update listeners, so callback timing and batching may change.
- Input/composition state became per-editor in 0.47. This corrects cross-editor ownership but can change which nested editor consumes events during rapid focus changes.
- Selection is now retained more consistently when an unfocused editor is updated. External `setMarkdown` operations and parent-driven nested-editor updates can therefore preserve a selection that older Lexical versions discarded.
- A recursion detector and `onWarn` handling were added around update loops. Existing parent/child synchronization feedback loops may now warn or stop sooner instead of appearing to settle.
- Root replacement, queued update tags, decorator navigation, and block-cursor behavior received fixes throughout the range. These can alter focus transfer and keyboard navigation around nested decorators.

Regression coverage should include:

- editing directives and JSX children, then immediately reading root Markdown;
- table-cell edits and focus transfer between the cell and root editor;
- shared undo/redo across root and nested editors;
- Backspace/Delete at both sides of nested decorators;
- commands dispatched from a nested editor and handled by the parent;
- rapid focus changes while composing text;
- absence of update-listener recursion or stale parent Markdown.

### Custom decorators, insertion, and selection — high risk

MDXEditor uses custom decorator nodes for code blocks, images, directives/admonitions, JSX/MDX constructs, frontmatter, tables, and thematic breaks.

Potentially observable changes:

- DOM rendering was generalized around `DOMSlot`. Assumptions about a decorator's exact DOM parent, insertion point, or reconciliation boundary should be checked.
- Lexical now removes empty inline elements more aggressively. Empty inline JSX/MDX expressions, placeholder-like nodes, and empty Markdown links such as `[](https://example.com)` may disappear or move differently.
- Selection adjustment when nodes are moved was corrected. Commands that move or replace custom nodes may leave the caret in a different, now more accurate position.
- `$insertNodes` changed line-break preservation, including retaining the first line break and managing `<br>` elements more consistently. MDXEditor calls it in the core import/insertion paths, image insertion, and link-dialog insertion (`src/plugins/core/index.ts`, `src/plugins/image/index.ts`, and `src/plugins/link-dialog/index.ts`).
- Typing at the root's final offset now reuses an empty trailing block instead of creating another one. This intersects with the core importer's trailing-paragraph normalization and should be checked after importing documents that end in a decorator or other non-paragraph block.
- Named-slot behavior received fixes for typing, Backspace, copy, hydration, and DOM import. Even without explicitly using named slots, custom inline/decorator boundaries use related selection and DOM-reconciliation paths.
- Triple-click selection extension moved into a separate extension. Confirm whether the editor currently receives the expected triple-click paragraph selection through its installed React plugins.
- Backspace at a block boundary was changed to preserve the current block in cases where older behavior removed or merged it.
- Block insertion into inline-only parents is normalized differently.
- Several releases correct keyboard navigation around decorators: a caret stuck before a leading inline decorator, Enter on a block-decorator node selection, start/end movement in decorator-only elements, ArrowUp/ArrowDown skipping decorators, block-cursor placement between decorators and shadow roots, and `deleteLine` removing an adjacent block decorator. These are improvements, but they change user-visible caret placement around nearly every MDXEditor custom block.

Test every custom node at its start/end boundary, when empty, during copy/paste, when selected as a node, and when adjacent to text, lists, links, and another decorator.

### Lists and checklists — high risk

Relevant code is concentrated in `src/plugins/lists` and in Markdown import/export visitors and transformers.

Potentially observable changes:

- Checklist attributes are now cleared more consistently when nesting or changing list type.
- Pasted checklist content from Joplin is recognized differently.
- A whitespace-only list item is treated as empty when Enter is pressed.
- Empty nested list parents are removed more consistently.
- Ordered-list numbering is preserved differently across block splits.
- Ctrl/Cmd+Backspace in an empty list can convert it to a paragraph.
- Tapping a checkbox on mobile toggles it.
- Nested-list HTML export was corrected.
- Backspace at the top of a list better preserves a preceding decorator node.
- Typing an ordered-list marker before an existing list may update the list's starting number.
- In 0.48, Backspace at the start of a list item outdents it or converts it to a paragraph, depending on nesting.
- Markdown marker and checklist round trips have changed.
- Markdown text transformers now use the first matching transformer, so transformer ordering is behaviorally significant.

Test unordered, ordered, and task lists at the top level and nested; list splitting/merging; empty and whitespace-only items; decorators immediately before lists; list start numbers; mobile checkbox input; and Markdown/HTML round trips.

### Links and autolinks — high risk, including security behavior

Relevant code includes the link plugin and `src/plugins/link/AutoLinkPlugin.tsx`.

Potentially observable changes:

- `LinkNode` URL sanitization now fails closed when a URL cannot be parsed. This is an upstream XSS hardening fix and may reject or neutralize values the editor previously preserved.
- Selective unlinking, toggling links with nested children, and collapsed-selection behavior were corrected. In particular, toggling a link at a collapsed selection can now remove it; retest the link dialog's remove and URL-update paths, which dispatch `TOGGLE_LINK_COMMAND` from `src/plugins/link-dialog/index.ts`.
- Markdown import prevents nested links more consistently.
- Adjacent equivalent links can merge while preserving the caret differently.
- Autolinking no longer occurs in code and avoids creating extra paragraphs in several cases.
- A manually unlinked value can become an autolink again after editing.
- Paste-to-wrap behavior skips content that is not simple text.
- Disabled autolinks no longer open.
- Lexical can now configure additional punctuation as an autolink boundary.

Lexical's playground also improved Unicode URL handling, but that fix does not automatically apply here: MDXEditor uses its own ASCII-oriented URL regular expression. Unicode domains, non-ASCII paths, trailing punctuation, and adjacent formatted text need explicit tests and possibly a local regex redesign.

Security expectation: retain the new fail-closed sanitization. If compatibility tests reveal rejected legacy URLs, handle them through a documented validation/migration policy rather than weakening the sanitizer.

### Markdown shortcuts and inline formatting — medium/high risk

Relevant code is in `src/plugins/markdown-shortcut` and the Markdown transformers used by plugins.

Potentially observable changes:

- Element shortcuts can trigger on Enter in additional cases.
- Shortcuts now respond after committed IME composition.
- Code spans have stronger precedence over formatting and text-match transformers.
- CommonMark backslash and delimiter-flanking rules were corrected.
- Unicode whitespace is recognized more consistently.
- Hard breaks, nested fenced blocks, backticks, and fence-like lines received parsing fixes.
- Existing inline formatting is retained differently when a matching marker is typed.
- Overlapping inline formats round-trip more accurately.
- Applying a Markdown shortcut now creates a more consistent undo-history entry.
- `formatText` toggle direction and `SET_TEXT_FORMAT_COMMAND` behavior changed in 0.47.

The main `getMarkdown()` path is driven by MDXEditor's custom visitors and is not automatically replaced by these transformer changes. Most immediate effects are in live Markdown shortcuts and any APIs that explicitly use `@lexical/markdown` conversion.

Test delimiter edge cases, Unicode whitespace, inline code mixed with emphasis, escaped markers, multiline/fenced code, IME-completed shortcuts, existing formatting, and a single-step undo after each shortcut.

### Clipboard, drag/drop, history, and maximum length — medium/high risk

Potentially observable changes:

- Selection extraction caching, copying between documents/windows, empty selections, and copying while unfocused were corrected.
- Same-block drag/drop and dragover behavior changed several times. Native text drop was restored in 0.48 after earlier changes, so only the final behavior should be tested.
- Lexical now records a history snapshot before cut and paste, changing undo grouping.
- Root cached-text updates were fixed, which may change when MDXEditor's custom maximum-length plugin observes a new length.

Lexical's own overflow/character-limit fixes do not automatically repair MDXEditor's custom trimming implementation in `src/plugins/maxlength`. Test typing, paste, IME, deletion, and undo exactly at and beyond the configured limit, including nested editors.

Clipboard tests should cover rich text, plain text, MDX custom nodes, partial formatted selections, node selections, cross-window copy where practical, and undo after cut/paste.

### HTML import/export and paste fidelity — medium risk/opportunity

Lexical's DOM conversion paths gained several fidelity improvements that can change imported or pasted editor state:

- `data-lexical-indent` is preserved through HTML import/export;
- list-item alignment is recovered through `setFormatFromDOM`;
- inline CSS declared in pasted `<style>` elements can be applied during conversion;
- imported `dir` attributes are retained more consistently.

These should improve content pasted from Word, Google Docs, and other rich-text sources, but the resulting Lexical/MDAST tree may differ from 0.35. Test indentation, alignment, directionality, and inline styles through paste, HTML conversion, and Markdown export. Decide explicitly which styling is preserved in Markdown and which is intentionally discarded.

### IME, mobile, and browser behavior — medium/high risk

The release range includes fixes for:

- Safari/macOS composition deletion;
- iOS duplicated text;
- Android zero-width spaces and keyboard suggestions;
- Korean IME input;
- Firefox composition-end handling;
- formatting during composition;
- Markdown shortcuts after composition.

These are generally fixes, but they change event timing and selection state. MDXEditor's nested contenteditables and embedded CodeMirror editors make cross-editor focus/composition behavior especially important. Browser-level verification should cover at least Safari, Firefox, Chrome/Android, and iOS Safari for supported environments.

### Package/API removals and hardening — medium risk

- Deprecated exports dating from Lexical 0.32.1 were removed in 0.46. The compile rehearsal did not reveal additional removed-export blockers beyond the horizontal-rule split and custom node typing issue.
- React 17 support was dropped in 0.47. MDXEditor already requires React 18 or 19, so this is not a blocker.
- `LexicalErrorBoundary` no longer relies on the `react-error-boundary` package, removing one upstream transitive dependency without requiring a source change in MDXEditor.
- `@lexical/clipboard` and `@lexical/plain-text` are declared direct dependencies but are not imported anywhere under `src`. Confirm whether they are intentionally exposed/required transitively; otherwise they are candidates for removal while aligning package versions.
- Regular-expression and prototype-pollution hardening landed across the range. Treat these as security fixes; unexpected rejection of malformed input is preferable to restoring unsafe legacy behavior.
- The URL sanitization change is a concrete behavior change and security fix, as described above.

## New features worth integrating

### 1. Replace handwritten selection serialization with `$convertSelectionToMarkdownString`

Priority: high

Lexical 0.45 added `$convertSelectionToMarkdownString`. It directly matches MDXEditor's public `getSelectionMarkdown()` feature and is the most immediately valuable integration in this upgrade.

The current implementation in `src/utils/lexicalHelpers.ts` starts with `selection.getNodes()`, promotes nodes to block parents, and manually serializes formats. This loses selection boundaries and cannot reliably represent:

- a selection that starts or ends in the middle of a text node;
- backward selections;
- formatting that begins or ends inside the selection;
- multi-paragraph selections;
- partial, nested, or task-list selections.

The upstream converter serializes the actual selection and has dedicated tests for these cases. It should become the basis of the clean implementation, subject to the MDX-specific contract and extension work described below.

### 2. Use Lexical's Find/Replace implementation as a reference

Priority: high-value spike

Lexical 0.47 added a substantially tested Find/Replace implementation to its playground. It is not a packaged drop-in plugin, but it is relevant to `src/plugins/search`.

MDXEditor's current search observes DOM mutations and maps DOM ranges back to Lexical positions. The upstream implementation offers useful patterns for:

- building an offset map from Lexical state;
- case-sensitive and regular-expression search;
- performing replace-all in one editor update;
- using CSS Highlights;
- testing navigation and replacement edge cases.

Port the design selectively rather than depending on playground internals. Compare its behavior with custom decorators and nested editors before replacing the current implementation.

### 3. Evaluate the extension framework for composer and history setup

Priority: medium/high architectural opportunity

The extension framework now includes `LexicalExtensionEditorComposer`, nested-editor extension support, and a corrected `SharedHistoryExtension`. `HistoryExtension` also supports `maxDepth` and undo/redo availability signals.

This maps directly to MDXEditor's manually assembled composer context and custom shared-history wiring. A migration could reduce custom integration code and standardize cleanup, but it touches the editor's core lifecycle and should be a separate step after the dependency upgrade is stable.

### 4. Spike `@lexical/mdast`

Priority: medium, exploratory

Lexical 0.47 introduced `@lexical/mdast`, followed by examples for HTML and custom MDAST constructs in 0.48. It is relevant because MDXEditor already maintains a rich Lexical ↔ MDAST visitor system.

It is not a drop-in replacement. MDXEditor's MDX JSX, expressions, directives, frontmatter, plugin visitors, and serialization options are broader than standard Markdown. A spike should compare extensibility, fidelity, error handling, and migration cost before any adoption decision.

### 5. Add `@lexical/a11y` checks to tests or development tooling

Priority: medium

Lexical 0.47 introduced accessibility validation helpers. These may catch invalid editor DOM structures introduced by custom decorators and nested editors. Integrate them first in tests or development diagnostics to assess signal and false-positive rate.

### 6. Reuse the new Markdown node-generation and selection utilities

Priority: medium

The release range adds or improves APIs including `$generateNodesFromMarkdownString` and the selection converter. These can simplify insertion/import paths that currently have to create a temporary editor state or manually coordinate transformers.

### 7. Improve custom autolink boundaries and Unicode handling

Priority: medium

Lexical's configurable punctuation boundaries can replace local edge-case handling. Separately, MDXEditor's custom URL matcher should be assessed for Unicode domains and paths; playground-only regex fixes do not flow into the local plugin automatically.

### 8. Adopt lifecycle and command utilities opportunistically

Priority: low/medium

Potentially useful additions include:

- `COMMAND_PRIORITY_BEFORE` for handlers that must run before ordinary priorities;
- `onWarn` for surfacing update recursion and editor warnings in development;
- DOM event helpers and listener cleanup functions returned by root/editable listeners;
- can-undo/can-redo signals from the history extension;
- `getDocument()` for code that must use the editor's owning document rather than the global document.

### 9. Support Shadow DOM embeddings deliberately

Priority: medium if web components are supported

Lexical 0.46 added Shadow DOM support for editor selection and DOM access, and 0.47 added `getDocument()`. This can unlock reliable MDXEditor use inside web components. Audit custom plugins for direct use of global `document`, `window.getSelection()`, or document-level listeners before advertising support; Lexical's core support does not automatically correct global DOM access in MDXEditor's plugins.

### 10. Evaluate `DOMImportExtension` and `DOMRenderExtension`

Priority: low/medium architectural opportunity

The new DOM import/render extension points, ordering controls, and `decorateDOM` behavior allow per-editor DOM overrides without requiring every variation to subclass a node. They may simplify consumer-specific paste/import rules or rendering customization. Keep this separate from the dependency upgrade unless an existing node incompatibility requires it.

### 11. Benchmark the automatic rendering and state-performance improvements

Priority: low implementation cost, potentially high benefit for large documents

The release range includes a copy-on-write NodeMap and key-to-DOM map, a faster `reconcileChildren` path with incremental suffix caching, DOM reuse when nodes move between parents, and deferred DOM selection reads. These improvements arrive with the upgrade rather than through a new MDXEditor API. Benchmark large MDX documents, decorator-heavy documents, and nested tables to confirm the expected gains and catch any custom code that depended on reconciliation timing or DOM replacement.

### 12. Strengthen custom-node cloning and evaluate NodeState

Priority: low/medium architectural opportunity

Lexical has hardened the `afterCloneFrom` pattern across built-in nodes, and NodeState now supports copy/reset behavior such as `resetOnCopy`. `ImageNode` and `CodeBlockNode` already implement `afterCloneFrom`; review the other state-carrying custom nodes to ensure that static `clone` plus `afterCloneFrom` preserves every mutable field.

NodeState may reduce serialization and cloning boilerplate, but converting nodes during the dependency upgrade would unnecessarily enlarge the change. Evaluate it afterward on one contained custom node first.

### 13. Use `SET_TEXT_FORMAT_COMMAND` for deterministic toolbar formatting

Priority: medium

Lexical 0.47 adds a set-style text-format command alongside corrected `formatText` toggle direction. A set operation can make toolbar behavior deterministic for mixed-format selections, where toggling otherwise depends on the selection's current aggregate state. Compare the current toolbar contract before adopting it, especially for partially bold/italic selections.

## Selection export and lessons from MDXEditor PR #949

Reference: [mdx-editor/editor#949](https://github.com/mdx-editor/editor/pull/949)

### Relevance

The feature is highly relevant to the upgrade. It addresses a real limitation in the public `getSelectionMarkdown()` method by using Lexical's selection-aware Markdown converter rather than serializing every node touched by the selection.

Its scope is narrow:

- It affects programmatic selection-to-Markdown export.
- It does not change the user's live selection mechanics.
- It does not replace clipboard serialization.
- It does not affect search.
- It does not change the normal full-document `getMarkdown()` path.

### Problems not to carry into the clean implementation

#### Global transformer mutation

The PR assigns Lexical's exported `TRANSFORMERS` array directly and then pushes plugin transformers into it. Every call therefore changes global module state. Repeated calls accumulate duplicate transformers, and one editor's plugins can leak into another editor.

Always create a new array:

```ts
const transformers = [...TRANSFORMERS]
```

Then append only the transformers for the editor instance involved in that call.

#### Unnecessary rejection of node selections

The PR accepts only a `RangeSelection`. Lexical's converter accepts a `BaseSelection`, which allows meaningful node selections such as a selected table or thematic break.

The empty/collapsed guard should preserve non-range selections:

```ts
if (!selection || ($isRangeSelection(selection) && selection.isCollapsed())) {
  return
}
```

#### No feature-level tests

The PR does not add tests for the new behavior. The existing selection-Markdown tests only cover no selection, empty selection, and method presence. Passing CI therefore does not demonstrate correct selection serialization.

#### Table configuration leaks between editor instances

The table transformer reads module-global cached extension data, so the most recently initialized editor can determine how another editor serializes a table. Build transformers from the active editor's realm/configuration and do not cache editor-specific values globally.

#### Incomplete coverage of MDXEditor's node model

The PR combines Lexical's standard Markdown transformers with table and thematic-break support. It still omits MDXEditor-specific constructs such as:

- custom code blocks;
- images;
- JSX elements and attributes;
- MDX expressions;
- directives and admonitions;
- frontmatter;
- generic HTML or consumer-provided import/export visitors.

Selections crossing those nodes can be incomplete, empty, or inconsistent with full-document serialization.

#### Different serialization contract from `getMarkdown()`

The upstream converter emits canonical Lexical-transformer Markdown. MDXEditor's `getMarkdown()` uses MDAST visitors and honors project/consumer serialization behavior such as `toMarkdownOptions` and custom visitors. The two methods can therefore disagree about equivalent content.

Before implementation, explicitly choose the contract:

1. **Standard rich-text selection Markdown:** document that the method supports only constructs represented by the configured Lexical Markdown transformers; or
2. **Selection-scoped equivalent of `getMarkdown()`:** extend the pipeline to all built-in custom nodes and consumer visitors/options, so selected content is serialized with the same semantics as a full document.

The second contract is more useful and intuitive, but it is materially more work.

#### Partial links need a regression test

There is a known edge case in which a selection entirely inside a link, excluding its first character, can serialize incorrectly or return an empty result. Add a project-level regression test and verify current upstream behavior before relying on the converter for links.

#### Upgrade casts and horizontal-rule mixing

The PR uses a broad cast around the custom code-block node and mixes old/new horizontal-rule paths. The clean implementation should resolve the underlying `importJSON` contract and choose one horizontal-rule node architecture rather than hiding the incompatibilities.

### Required selection-export test matrix

At minimum, add tests for:

- a partial selection within one text node;
- a backward selection;
- selection boundaries inside bold, italic, underline, strikethrough, and inline code;
- multiple paragraphs with partial first and last paragraphs;
- partial unordered, ordered, nested, and task lists;
- a partial link, including a selection wholly inside the link that excludes the first character;
- repeated calls, proving that transformer arrays do not grow or leak;
- a node-selected table and thematic break;
- selections crossing custom decorator nodes;
- code blocks, images, JSX, MDX expressions, directives/admonitions, frontmatter, and generic HTML;
- two simultaneous editor instances with different plugin configurations;
- a selection inside a nested editor/table cell;
- consistency with `toMarkdownOptions` and consumer visitors if that is part of the chosen contract.

Upstream selection-conversion tests are a useful starting reference: [LexicalMarkdown selection tests](https://github.com/facebook/lexical/blob/v0.48.0/packages/lexical-markdown/src/__tests__/unit/LexicalMarkdown.test.ts#L2573).

## Recommended upgrade sequence

Keep the dependency upgrade and architectural adoption separable so regressions can be attributed clearly.

1. Add browser-level regression coverage for the high-risk current behaviors before changing dependencies.
2. Upgrade all direct Lexical packages together to 0.48.0; do not mix minor versions.
3. Change TypeScript module resolution and verify source typechecking.
4. fix `CodeBlockNode.importJSON` and the horizontal-rule node mismatch without broad casts.
5. Run the full build, declaration generation, API extraction, unit tests, and examples.
6. Exercise nested editors, lists, links, clipboard, selection, IME, and custom decorators in supported browsers.
7. Add the clean `$convertSelectionToMarkdownString` integration with immutable, editor-local transformers and the agreed serialization contract.
8. Treat extension-framework adoption, Find/Replace redesign, `@lexical/mdast`, NodeState migration, and other architectural opportunities as follow-up changes.

This order avoids mixing necessary compatibility work with optional rewrites.

## Suggested regression suite for the upgrade PR

### Automated unit/integration tests

- all existing tests;
- full and partial selection-to-Markdown conversion;
- root/nested editor update ordering and shared history;
- custom-node JSON import/export and cloning;
- list editing and Markdown/HTML round trips;
- link sanitization and autolink boundaries;
- Markdown shortcut parsing, formatting, and undo;
- clipboard copy/cut/paste and history grouping;
- HTML import/export fidelity for indentation, alignment, direction, and inline styles;
- maximum-length behavior at the boundary;
- search highlighting and replace operations after editor updates;
- declaration build and public API extraction.

### Browser interaction tests

- keyboard navigation and deletion around every decorator node;
- root ↔ nested-editor focus transfer;
- table-cell editing and shared undo;
- drag/drop within one block and between blocks;
- composition input in root and nested editors;
- mobile checklist toggling;
- copy/paste while focused and unfocused;
- selection direction, triple-click selection, and node selection;
- Shadow DOM embedding if it is part of the supported integration surface.

### Performance checks

- benchmark editing and reconciliation for a large plain-text document;
- benchmark decorator-heavy MDX and deeply nested lists;
- benchmark tables with multiple active nested editors;
- compare update latency, DOM churn, and selection stability with the 0.35 baseline.

### Security tests

- malformed and dangerous link URLs fail closed;
- safe relative, absolute, mail, and anchor URLs preserve expected behavior;
- imported objects cannot alter prototypes;
- Markdown regex cases complete without pathological runtime.

## Changelog areas currently considered out of scope

These upstream areas do not currently map to MDXEditor's direct runtime use:

- Yjs/collaboration changes;
- Lexical table-plugin behavior that does not affect MDXEditor's custom table implementation;
- Shiki/Prism code-highlighting integrations;
- playground-only UI features other than useful implementation references;
- framework adapters not used by the repository.

Reassess them if the dependency inventory changes during implementation.

## Primary upstream references

- [Lexical changelog](https://github.com/facebook/lexical/blob/main/CHANGELOG.md)
- [Lexical 0.48.0 package](https://www.npmjs.com/package/lexical/v/0.48.0)
- [Lexical Extension framework and horizontal-rule split, #7706](https://github.com/facebook/lexical/pull/7706)
- [`$convertSelectionToMarkdownString`, #8395](https://github.com/facebook/lexical/pull/8395)
- [Conditional package type exports, #8628](https://github.com/facebook/lexical/pull/8628)
- [Node `$config()` protocol and serialization typing, #8645](https://github.com/facebook/lexical/pull/8645)
- [Asynchronous parent-editor command delegation, #8308](https://github.com/facebook/lexical/pull/8308)
- [Selection retention in an unfocused editor, #7941](https://github.com/facebook/lexical/pull/7941)
- [Deferred `onUpdate` during nested commits, #8672](https://github.com/facebook/lexical/pull/8672)
- [Per-editor input state, #8809](https://github.com/facebook/lexical/pull/8809)
- [Update recursion warnings, #8644](https://github.com/facebook/lexical/pull/8644)
- [DOMSlot rendering work, #8519](https://github.com/facebook/lexical/pull/8519)
- [Empty inline element removal, #8497](https://github.com/facebook/lexical/pull/8497)
- [Selection adjustment when moving nodes, #8501](https://github.com/facebook/lexical/pull/8501)
- [`$insertNodes` line-break behavior, #8615](https://github.com/facebook/lexical/pull/8615)
- [Reuse of an empty trailing root block, #8686](https://github.com/facebook/lexical/pull/8686)
- [Decorator caret/navigation fixes: #8558](https://github.com/facebook/lexical/pull/8558), [#8526](https://github.com/facebook/lexical/pull/8526), [#8577](https://github.com/facebook/lexical/pull/8577), [#8775](https://github.com/facebook/lexical/pull/8775), [#8758](https://github.com/facebook/lexical/pull/8758), [#8744](https://github.com/facebook/lexical/pull/8744), and [#8772](https://github.com/facebook/lexical/pull/8772)
- [Named slots, #8603](https://github.com/facebook/lexical/pull/8603)
- [Triple-click selection extension, #8520](https://github.com/facebook/lexical/pull/8520)
- [Backspace at block boundaries, #8493](https://github.com/facebook/lexical/pull/8493)
- [List-item Backspace behavior, #8829](https://github.com/facebook/lexical/pull/8829)
- [Fail-closed LinkNode URL sanitization, #8846](https://github.com/facebook/lexical/pull/8846)
- [Configurable autolink punctuation, #8378](https://github.com/facebook/lexical/pull/8378)
- [Text-format toggle direction, #8807](https://github.com/facebook/lexical/pull/8807)
- [History snapshot before cut/paste, #8649](https://github.com/facebook/lexical/pull/8649)
- [HTML fidelity: indent #8536](https://github.com/facebook/lexical/pull/8536), [list alignment #8460](https://github.com/facebook/lexical/pull/8460), [pasted style elements #8326](https://github.com/facebook/lexical/pull/8326), and [`dir` import #8412](https://github.com/facebook/lexical/pull/8412)
- [Playground Find/Replace implementation, #8779](https://github.com/facebook/lexical/pull/8779)
- [Extension composer/nested editor/shared history, #8202](https://github.com/facebook/lexical/pull/8202)
- [History maximum depth, #8537](https://github.com/facebook/lexical/pull/8537)
- [`@lexical/mdast`, #8794](https://github.com/facebook/lexical/pull/8794)
- [MDAST custom constructs examples, #8826](https://github.com/facebook/lexical/pull/8826)
- [`@lexical/a11y`, #8591](https://github.com/facebook/lexical/pull/8591)
- [Markdown node generation, #8789](https://github.com/facebook/lexical/pull/8789)
- [`COMMAND_PRIORITY_BEFORE`, #8375](https://github.com/facebook/lexical/pull/8375)
- [Shadow DOM support, #8694](https://github.com/facebook/lexical/pull/8694)
- [Editor `getDocument()`, #8788](https://github.com/facebook/lexical/pull/8788)
- [DOM event registration helpers, #8767](https://github.com/facebook/lexical/pull/8767)
- [Listener cleanup return values, #8219](https://github.com/facebook/lexical/pull/8219)
- [DOM import extensions, #8528](https://github.com/facebook/lexical/pull/8528)
- [Performance work: copy-on-write maps #8481](https://github.com/facebook/lexical/pull/8481), [reconciliation fast path #8482](https://github.com/facebook/lexical/pull/8482), [cross-parent DOM reuse #8441](https://github.com/facebook/lexical/pull/8441), and [deferred selection reads #8422](https://github.com/facebook/lexical/pull/8422)
- [Custom-node `afterCloneFrom`, #8229](https://github.com/facebook/lexical/pull/8229)
- [NodeState `resetOnCopy`, #8221](https://github.com/facebook/lexical/pull/8221)
- [Self-contained `LexicalErrorBoundary`, #8720](https://github.com/facebook/lexical/pull/8720)
