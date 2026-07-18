# Spike 01: Preserve MDXEditor serialization for selected content

## Status

CONCLUSIVE

## Question

Can selection-scoped export use Lexical's selection cloning while still serializing through MDXEditor's existing MDAST visitors, JSX descriptors, `toMarkdownExtensions`, and `toMarkdownOptions`, without mutating the source editor?

## Why It Blocks Planning

R3 must choose between Lexical's `$convertSelectionToMarkdownString` transformer path and a selection-clipping path that reuses MDXEditor's established exporter. The choice determines implementation scope, custom-node support, multi-editor isolation, and the direct `CX-5` evidence strategy.

## Hypotheses and Decision Rule

- If Lexical's selection JSON can clip partial text/link content, preserve multi-block and custom-node payloads, and replay through MDXEditor's existing visitor exporter without a source-editor update, choose selection cloning plus the existing MDAST pipeline.
- If selected structure or custom nodes cannot survive that replay, use an adapted `$convertSelectionToMarkdownString` pipeline only if it can honor the same visitor/options contract without global caches or a second public serialization configuration.
- If neither path preserves the contract, mark the spike inconclusive and replan R3.

## Minimal Experiment

- **Environment and exact versions**: repository lockfile at commit `9373742`; `lexical`, `@lexical/clipboard`, `@lexical/link`, and `@lexical/markdown` 0.48.0; Node 24.18.0; Vite Node from the installed Vitest toolchain.
- **Setup**: disposable scripts in `/private/tmp` created a source Lexical editor, captured selected JSON with `$generateJSONFromSelectedNodes`, reconstructed the selected nodes in an isolated temporary editor, and invoked MDXEditor's `exportMarkdownFromLexical` with its existing root, paragraph, text, link, and representative custom-node visitors.
- **Action**: export a partial text range, a partial link excluding its first character, a forward multi-block range, and a custom decorator `NodeSelection`; repeat the partial-link export and observe source-editor state identity/update listeners.
- **Observation to capture**: clipped Markdown, preserved structure/custom payload, stable repeated output, and zero source-editor updates.
- **Safety and side-effect constraints**: no repository source or dependency mutation; temporary editor only; no browser, service, port, or external state.

## Evidence

- **Commands run**:
  - `node /private/tmp/r3-selection-spike.mjs`
  - `node_modules/.bin/vite-node /private/tmp/r3-selection-mdast-spike.ts`
  - `node /private/tmp/r3-inherited-editor-spike.mjs`
- **Relevant output summary**:
  - partial text `alpha bravo charlie` at offsets 6–11 serialized as `bravo`;
  - partial link `linked text` at offsets 1–6 serialized as `[inked](https://example.com)`;
  - a range from the first paragraph into the second preserved two Markdown blocks and the complete intervening link;
  - a selected custom decorator retained its JSON payload and serialized through the representative custom visitor as a fenced block;
  - two identical partial-link calls returned identical output;
  - every source-editor check reported preserved editor-state identity and `sourceUpdateCount: 0`.
  - a no-config `createEditor()` created inside the active editor read inherited its registered custom-node map; `$generateNodesFromSerializedNodes` reconstructed the selected node as the custom class with payload intact while preserving source-state identity.
- **Artifacts or source locations**:
  - `node_modules/@lexical/clipboard/src/clipboard.ts:500-696` — official selection JSON clipping, ancestor extraction, custom-node JSON, and node regeneration.
  - `src/exportMarkdownFromLexical.ts:112-221` and `src/exportMarkdownFromLexical.ts:426-439` — MDXEditor's visitor and MDAST-to-Markdown pipeline used by the prototype.
  - Disposable scripts were removed after recording this result.

## Result

- **Outcome**: CONCLUSIVE
- **Observed behavior**: Lexical's selection JSON is a suitable clipping boundary. An isolated temporary editor can reconstruct selected nodes and feed them to MDXEditor's existing exporter, including partial links and custom serialized nodes, while the source editor remains read-only.
- **Decision**: R3 will use Lexical's selection JSON/cloning primitives to create an isolated selected tree, create the temporary editor without explicit configuration inside the active editor read so it inherits that editor's registered node map, normalize top-level inline fragments into a paragraph container, and serialize that tree through the existing MDXEditor visitors/options/descriptors. The active editor remains the source, so root and nested selections retain current routing without a new public parameter or private registry access.
- **Rejected alternatives**:
  - `$convertSelectionToMarkdownString` plus custom transformers — it introduces a parallel configuration model and cannot automatically honor MDXEditor consumer visitors, JSX descriptors, or MDAST extensions.
  - mutating or temporarily replacing the source editor state — repeated getter calls must not publish updates, alter history, or disturb selection.
  - module-level transformer/extension caches — they violate multi-editor isolation and reproduce PR #949's ordering/global-state defects.
- **Representativeness limits**: the spike proved the architecture with text, links, multi-block structure, and a representative custom decorator. Execution must directly cover built-in lists/tasks, tables, thematic breaks, code blocks, images, directives/JSX, consumer node replacements, active nested editors, two simultaneous configurations, and browser-created backward selections.

## Planning Impact

- **Roadmap or PRP sections/tasks/tests changed by this result**: the R3 blueprint can fix one implementation path rather than carrying a conditional architecture choice; it must add selected-tree reconstruction, inline-root normalization, and visitor/options reuse before the public/browser matrix.
- **Consumer Contract or evidence changed**: parent `CX-5` remains unchanged and requires direct public-ref evidence. Repeated-call/source-state and two-editor isolation checks are mandatory rather than implementation-only assertions.
- **Remaining uncertainty**: exact private helper decomposition is a reversible execution detail. The selected architecture preserves plugin nodes and `additionalLexicalNodes` replacements through the inherited registration map and preserves the public `getSelectionAsMarkdown(editor, exportParams)` call shape.

## Cleanup

- **Disposable artifacts removed**: `/private/tmp/r3-selection-spike.mjs`, `/private/tmp/r3-selection-mdast-spike.ts`, `/private/tmp/r3-inherited-editor-spike.mjs`, and `/private/tmp/node_modules` after evidence capture.
- **Repository and external state checked**: only this spike record was added; no source, package, browser, port, or external state changed.
