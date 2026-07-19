# PR #949 review findings

PR: https://github.com/mdx-editor/editor/pull/949 — "Raise lexical version and use it to improve text selection" (doxman, 2026-07-18, open)

Status: not planned for merge. Findings recorded for reference.

## What the PR does

- Upgrades all `lexical` / `@lexical/*` packages from 0.35.0 to 0.48.0, adds `@lexical/extension`.
- Replaces the hand-rolled `getSelectionAsMarkdown` in `src/utils/lexicalHelpers.ts` with Lexical's `$convertSelectionToMarkdownString` (added in lexical 0.45).
- Adds custom `ElementTransformer`s for tables (`src/plugins/table/transformer.ts`) and thematic breaks (`src/plugins/thematic-break/transformer.ts`), fed to the converter when the respective plugins are active.
- Registers `'table'` as a named active plugin; table plugin subscribes to `toMarkdownExtensions$` and caches them in a module-level variable for the transformer.
- Collateral changes: `tsconfig.json` `moduleResolution: "node"` → `"bundler"`, typecast workarounds in `mdastUtilHtmlComment.ts` and `CodeBlockNode.tsx`, partial migration of horizontal-rule imports from deprecated `@lexical/react` modules to `@lexical/extension`.

The selection improvement is legitimate: the old implementation treated partially selected nodes as fully selected, garbled nested lists, dropped checklist markers, and silently ignored its `exportParams` argument (`_exportParams` was unused).

## Bugs in the new code

1. **Shared-array mutation** (`src/utils/lexicalHelpers.ts`): `const transformers: Transformer[] = TRANSFORMERS` then `transformers.push(...)` mutates the `TRANSFORMERS` array exported by `@lexical/markdown`. Every copy operation appends the table/thematic-break transformers again — unbounded growth of a shared library export, leaking MDXEditor transformers into any other consumer. Must be `[...TRANSFORMERS]`.
2. **Module-level global cache** (`src/plugins/table/transformer.ts`): `setTableTransformerExtensions` stores extensions in a module singleton. Multiple MDXEditor instances on one page clobber each other's table export config; no cleanup on unmount. Benign only while all instances use identical config.
3. **Custom decorator nodes silently dropped from selection export**: the stock lexical transformers don't know about MDXEditor's `CodeBlockNode`, `ImageNode`, directives, JSX, or frontmatter. The PR only covers tables and thematic breaks, so copying a selection containing e.g. a code block or image omits it entirely. The old implementation at least emitted text content as a fallback.
4. **The table transformer's extension cache is order-dependent and can stay empty** (`src/plugins/table/index.ts` + `transformer.ts`): Gurx `realm.sub` does not replay a cell's current value — it only fires on subsequent publishes. `tablePlugin.init` publishes its own `gfmTableToMarkdown` extension into `toMarkdownExtensions$` (an `Appender` cell) *before* registering the subscription, so the sub only ever fires if a plugin initialized *after* `tablePlugin` appends another toMarkdown extension. If `tablePlugin` is last in the user's plugin array (or no later plugin registers one), `cachedExtensions` stays `[]`, and `toMarkdown(mdastTable, { extensions: [] })` throws ("cannot handle unknown node `table`" — gfm table serialization *requires* the extension), the `catch` logs and returns `null`, and the table is silently dropped from the copied selection — the exact node type the transformer was written to support. Working configurations work by accident of plugin ordering. Fix would be reading the cell value at export time (or `realm.getValue` at subscription setup), not a fire-on-change cache.
5. **Errors swallowed to silent data loss**: `TABLE_TRANSFORMER.export`'s `try/catch` turns any serialization failure into `console.error` + `null`, i.e. content silently missing from the clipboard with no user-visible signal. This is also what masks finding 4.

## API and build concerns

6. **Public API break**: `getSelectionAsMarkdown(editor, exportParams)` → `(editor, activePlugins: string[])` changes the signature of a public `@group Utils` export. The old param was dead weight, but the break should be release-noted (or the new param made optional/derived).
7. **`moduleResolution: "bundler"`** affects the whole build and declaration output. Commit b34e0f7 recently repaired the declaration rollup — the `.d.ts` output must be explicitly re-verified on this branch.
8. **Mixed horizontal-rule module identities**: `$isHorizontalRuleNode` is imported from `@lexical/extension` in `LexicalThematicBreakVisitor.ts` but from the deprecated `@lexical/react/LexicalHorizontalRuleNode` in `transformer.ts`, while node registration uses the react class. If the re-export ever stops aliasing the same class, instanceof-style checks split across module identities. Unify on one source.

## Process concerns

9. **No test changes** for a 13-minor-version upgrade bundled with a feature. Per `reports/lexical-0.35-to-0.48.md`, the upgrade's real cost is behavioral and none of it is exercised here:
   - Backspace-at-block-start semantics (v0.45 breaking), list-item backspace outdent (v0.48)
   - Decorator caret navigation changes (v0.45–0.47) — affects code blocks, tables, images, directives, JSX
   - Markdown shortcuts on Enter / IME composition commit (v0.45)
   - `LinkNode.sanitizeUrl()` failing closed on unparseable URLs (v0.48)
   - Async nested-editor delegation (v0.43) and deferred `onUpdate` during nested commits (v0.47) — directly relevant because table cells and `NestedLexicalEditor` run on `LexicalNestedComposer` and markdown export runs in an update listener
   Recommendation: split the upgrade and the selection feature into separate PRs so regressions are attributable, and run the regression pass from the upgrade report.
10. **Known edge case flagged by the author, unfixed**: a partially selected link that excludes its first character (with nothing else selected) returns an empty string. Deferred to upstream lexical.

## Additional notes

- Copy-selection output now comes from lexical's transformer pipeline, a parallel serialization path to MDXEditor's mdast visitor pipeline — the two can disagree (e.g. `***` vs configured thematic-break marker, table pipe alignment options).
- **`@lexical/mdast` (lexical 0.47 #8794, 0.48 #8826) points at a better long-term approach.** The same lexical release this PR upgrades to introduced an official micromark/mdast bridge — the same architecture MDXEditor's import/export layer is built on. The PR instead invests further in the `@lexical/markdown` transformer pipeline (custom `ElementTransformer`s for tables and thematic breaks, extension caching), i.e. new code on the pipeline `@lexical/mdast` is positioned to supersede. A selection export built on the mdast path could reuse MDXEditor's existing export visitors and `toMarkdown` extensions directly — eliminating the dual-pipeline divergence and the transformer/cache machinery (findings 2–5 and the divergence note above) rather than patching around them. Worth evaluating before accepting any variant of this feature. See `reports/lexical-0.35-to-0.48.md`, section 2, item 1.
- `editor.getEditorState().read(fn, { editor })` is required because `$convertSelectionToMarkdownString` needs active-editor context inside a plain read (0.46+ API).
- `CodeBlockNode.importJSON` now takes `SerializedLexicalNode & Record<string, unknown>` with an `as unknown as` cast — works, but loses type safety; revisit when doing the upgrade properly.
- The PR bumps `@lexical/clipboard` and `@lexical/plain-text` but keeps them as direct dependencies even though nothing in `src/` imports them (see the upgrade report) — an upgrade PR is the natural place to drop them.
