# PRP Roadmap: Lexical 0.48 Adoption and Integrations

## Status

- **Roadmap status**: COMPLETE
- **Assurance profile**: Standard — the dependency migration is reversible and has no persisted-schema or deployment migration, while public editor behavior, nested-editor timing, browser interaction, and package compatibility require staged evidence. No Deep trigger is currently evidenced; escalate if a child exposes an unresolved high-impact public-compatibility or editor-concurrency boundary that cannot be isolated with focused tests.
- **Created at commit**: `9373742`
- **Planning baseline**: source tree at `9373742`; pre-existing untracked `reports/` content must be preserved. No prior `plans/` artifacts existed.
- **Last updated**: 2026-07-18

## Outcome

MDXEditor runs on a lockstep Lexical 0.48.0 package set, remains compatible at its documented React, Markdown, plugin, and editor-interaction boundaries, and adopts three high-value 0.48-era capabilities as independently verified changes:

1. correct selection-scoped Markdown export;
2. state-backed, mutation-safe Find/Replace behavior; and
3. extension-based root/nested composer and shared-history plumbing without changing the public plugin contract.

The initiative establishes compatibility evidence before changing dependencies, keeps optional rewrites out of the mechanical migration, and reuses the same consumer scenarios at each integration checkpoint.

## Why

- MDXEditor currently resolves Lexical 0.35.0, thirteen minor releases behind the assessed 0.48.0 target.
- A clean 0.48.0 rehearsal exposed TypeScript/package-resolution and custom-node incompatibilities that require source changes.
- The existing jsdom suite passes after a package swap but does not exercise the browser, nested-editor, selection, clipboard, IME, or decorator behavior most exposed to upstream changes.
- Lexical now provides APIs and reference implementations that can replace known weak or custom paths, but mixing them into the package upgrade would obscure regressions and rollback.

## Roadmap Completion Criteria

- [x] A version-independent compatibility suite characterizes the supported public behavior on Lexical 0.35.0 and runs in CI, including a representative real-browser surface.
- [x] All direct Lexical packages resolve to 0.48.0 together; lint, typecheck, jsdom tests, browser compatibility tests, declaration generation, API documentation, and the library build pass.
- [x] Representative Markdown created or edited on either side of the upgrade remains semantically readable on the other side, subject only to documented intentional 0.48 behavior/security changes.
- [x] Nested editors, custom decorators, lists, links, shortcuts, clipboard/history, and root/nested focus retain the Consumer Contract in representative browser exercises.
- [x] `getSelectionMarkdown()` serializes the selected content—not whole touched nodes—using the active editor's configured Markdown semantics, including supported custom constructs.
- [x] Find/Replace remains correct after document mutations and performs replacement through Lexical state rather than stale DOM-range assumptions.
- [x] Root and nested editors use the selected Lexical extension/composer/history architecture while existing MDXEditor plugin and imperative APIs remain compatible.
- [x] Every `CX-N` scenario is verified at its owning child and rerun after the final architectural migration.

## Explicitly Out of Scope

- Adopting `@lexical/mdast`. Its 0.48 API is experimental, extension-only, and not a self-contained replacement for MDXEditor's public visitor pipeline. Any adoption starts as a separate roadmap-level spike and, if viable, a separate roadmap.
- Replacing or removing the public `MdastImportVisitor`, `LexicalExportVisitor`, Gurx realm, or consumer plugin contracts.
- A general NodeState migration across custom nodes.
- Advertising Shadow DOM support; that requires a separate audit of MDXEditor's global DOM access and a product-level compatibility promise.
- General adoption of `DOMImportExtension` or `DOMRenderExtension` without a concrete consumer requirement.
- Yjs/collaboration, Prism/Shiki, and Lexical's stock table-node migration.
- Exhaustive real-device or every-IME certification. The roadmap requires representative Chromium, Firefox, and WebKit evidence; device-specific evidence must be graded separately when an appropriate environment is available.
- Unrelated formatting, visual design, or editor UX redesigns.

## Consumer Contract

- **Consumers**: React package integrators; people authoring Markdown/MDX; consumers of `MDXEditorMethods`; authors of MDXEditor plugins and custom Markdown visitors.
- **Public or supported boundaries**: the published `@mdxeditor/editor` package and declarations; `MDXEditor` props and `MDXEditorMethods`; Markdown input/output; documented plugins and toolbar flows; public import/export visitors and Gurx plugin registration; root and nested contenteditable interactions.
- **Current journey**: an integrator installs the package with React 18/19, renders `MDXEditor` with plugins and Markdown, edits through the root or nested editors, reads Markdown through callbacks or methods, optionally searches/replaces content, and may extend Markdown conversion with public visitor/plugin APIs.
- **Final observable promise**: the same journey works on Lexical 0.48.0 with semantically compatible Markdown, supported editor interactions, accurate selection Markdown, reliable Find/Replace, and no consumer-visible regression from the extension-framework migration.
- **Compatibility promise**: React 18/19 remains supported; all Lexical packages remain lockstep; public MDXEditor APIs and plugin/visitor contracts remain source-compatible unless a separately approved breaking change is planned; fail-closed URL sanitization and other security fixes are retained.
- **Not claimed**: byte-identical Markdown for syntax that MDXEditor intentionally canonicalizes; preservation of undocumented Lexical internals; complete mobile/IME certification; `@lexical/mdast` compatibility or adoption.

### End-to-End Acceptance Scenarios

| ID     | Given                                                                                                                                                  | When                                                                                                    | Then                                                                                                                                                                       | Evidence surface                                                                                        | Required evidence                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `CX-1` | A minimal TypeScript/React 18 or 19 consumer using documented package exports                                                                          | The consumer installs a packed build, typechecks, bundles, and renders the editor                       | Package exports, declarations, styles, and runtime initialization work without reaching into repository internals                                                          | Disposable minimal consumer using the packed artifact                                                   | DIRECT REQUIRED                                                                                                         |
| `CX-2` | Representative CommonMark, GFM, and MDX documents using built-in plugins and custom constructs                                                         | A consumer loads, edits, reads, replaces via `setMarkdown`, and reloads the resulting Markdown          | Supported constructs remain semantically equivalent and usable, including documents crossing the 0.35/0.48 boundary                                                        | Public `MDXEditor` props/methods in jsdom plus a real browser fixture; cross-version fixture comparison | DIRECT REQUIRED for public methods and browser rendering                                                                |
| `CX-3` | A document containing root text, directives/JSX children, table cells, and adjacent decorators                                                         | A user moves focus, types, deletes at boundaries, and performs undo/redo across root and nested editors | Focus, caret placement, parent synchronization, and shared history remain coherent without stale Markdown or update recursion                                              | Real browser interaction suite                                                                          | DIRECT REQUIRED                                                                                                         |
| `CX-4` | Documents containing lists/checklists, links/autolinks, Markdown shortcuts, clipboard content, and configured maximum length                           | A user performs the corresponding edit, copy/paste, cut/undo, and boundary actions                      | Supported behavior remains stable or follows an explicitly documented intentional 0.48 change; unsafe URLs fail closed                                                     | Real browser suite plus focused state/serialization tests                                               | DIRECT REQUIRED for interaction paths; PROXY ACCEPTABLE for platform clipboard limitations with the limitation recorded |
| `CX-5` | A consumer has a partial, backward, multi-block, nested-list, link, node, custom-node, or nested-editor selection                                      | The consumer calls `getSelectionMarkdown()`                                                             | The result represents only the selected content using the active editor's plugin visitors/options, while absent or collapsed selections retain the documented empty result | Public ref method exercised through rendered editors                                                    | DIRECT REQUIRED                                                                                                         |
| `CX-6` | Search is open on content that changes after indexing and includes matches across supported text containers                                            | A user navigates matches and performs replace or replace-all                                            | Highlights, cursor state, and replacements track current Lexical content; replace-all is one coherent editor update/history action                                         | Search UI/hooks exercised through a real rendered editor                                                | DIRECT REQUIRED                                                                                                         |
| `CX-7` | A consumer plugin registers custom nodes, Markdown visitors/extensions, composer children, and nested-editor behavior through supported MDXEditor APIs | The root/nested composer and shared-history internals use Lexical extensions                            | The plugin continues to initialize, edit, serialize, and undo without adopting Lexical extension internals itself                                                          | Minimal custom-plugin consumer plus representative built-in plugins                                     | DIRECT REQUIRED                                                                                                         |

## Evidence and Decisions

### Vetted Findings

- `package.json:47-71` and `package-lock.json:18-42` — all direct Lexical dependencies declare and resolve 0.35.0. **Roadmap impact**: R2 upgrades the full set atomically; mixed Lexical minor versions are forbidden.
- `package.json:97-100` — the public peer contract is React/React DOM 18 or 19. **Roadmap impact**: CX-1 exercises both supported major versions or records an explicit accepted proxy when dependency resolution prevents a dual matrix locally.
- `tsconfig.json:7` — the project uses legacy `moduleResolution: "node"`. The 0.48 rehearsal shows that conditional-export-aware resolution is required. **Roadmap impact**: R2 owns the compiler-resolution change and declaration revalidation.
- `vite.config.ts:16-29` — the package build rolls up declarations and treats dependencies and Lexical React subpaths as external. **Roadmap impact**: a passing `tsc --noEmit` is insufficient; R2 must verify the published declarations and package artifact.
- `vite.config.ts:59-63` and `package.json:23-24` — all current automated tests run under jsdom; no Playwright, Cypress, or equivalent browser harness is configured. **Roadmap impact**: R1 must produce a representative real-browser compatibility surface before R2 changes dependencies.
- `.github/workflows/ci.yml` — CI currently runs lint, typecheck, jsdom tests, and the Vite build in separate jobs. **Roadmap impact**: R1 integrates the new compatibility gate; R2 preserves every existing gate.
- `reports/lexical-upgrade-0.35.0-to-0.48.0-assessment-2026-07-18.md:67-128` — the clean rehearsal passed the existing tests but found module-resolution, `CodeBlockNode.importJSON`, horizontal-rule node, and declaration-generation blockers. **Roadmap impact**: these are the bounded mechanical scope of R2.
- `src/MDXEditor.tsx:173-176` and `src/MDXEditor.tsx:261-287` — `getSelectionMarkdown()` is a public imperative method and gathers the active editor's visitors, Markdown extensions/options, and JSX descriptors. **Roadmap impact**: R3 must preserve editor-local configuration and target selection-scoped parity with `getMarkdown()` semantics.
- `src/utils/lexicalHelpers.ts:162-207` — the current selection helper explicitly expands selected text to whole nodes/block parents. **Roadmap impact**: R3 owns a behavioral correction, not merely an internal refactor.
- `src/test/selection-markdown.test.tsx:9-36` — current tests cover only empty/no-selection and method existence. **Roadmap impact**: R1 establishes the baseline contract; R3 adds direct feature evidence.
- `src/plugins/core/NestedLexicalEditor.tsx:230-269` and `src/plugins/core/SharedHistoryPlugin.tsx:1-8` — nested editors import/export through the MDXEditor visitor pipeline and share external history through React plugins. **Roadmap impact**: R2 characterizes timing changes; R5 may change composer/history internals but must preserve the Markdown pipeline and CX-3.
- `src/MDXEditor.tsx:34-55`, `src/plugins/core/NestedLexicalEditor.tsx:216-354`, and `src/plugins/table/TableEditor.tsx:366-482` — root and nested editor construction is manually assembled around React composer context and `createEditor`. **Roadmap impact**: R5 is a separate architectural boundary after behavior is stable.
- `src/plugins/search/index.tsx:36-237` — search indexes DOM text, stores DOM `Range` objects, and maps them back to Lexical nodes for replacement. **Roadmap impact**: R4 owns a state-backed redesign and mutation-safety tests; it is not part of the package upgrade.
- `README.md:12-24`, `CONTRIBUTING.md:32-82`, and `src/index.ts:33-43` — MDXEditor is a published React Markdown editor with a documented extensible plugin/visitor architecture. **Roadmap impact**: compatibility is evaluated through package and plugin consumers, not only repository-internal tests.

### Settled Decisions and Invariants

- **Dependency target**: upgrade directly from 0.35.0 to 0.48.0 and keep every `lexical`/`@lexical/*` package on the exact same target version. **Evidence**: upgrade assessment and Lexical's cross-package release model.
- **Characterize before migration**: add stable compatibility evidence against 0.35.0 before changing dependency versions. Do not encode accidental internal node/caret structure when a public outcome can be asserted instead. **Evidence**: the 0.48 smoke tests pass despite acknowledged coverage gaps.
- **Mechanical isolation**: R2 contains only dependency/configuration compatibility, intentional upstream behavior alignment, and tests required to demonstrate that migration. Optional feature rewrites remain later children.
- **Security posture**: retain 0.48's fail-closed link sanitization and hardening. Compatibility pressure must not restore unsafe parsing.
- **Selection contract**: `getSelectionMarkdown()` is a selection-scoped equivalent of configured Markdown export for supported content, using the active editor's visitors/options rather than a standard-rich-text-only format. **Evidence**: the public method already gathers those editor-local export parameters before calling the current helper.
- **Selection isolation**: no global transformer mutation, module-global editor configuration, or last-editor-wins cache is permitted. Node selections remain eligible when they represent serializable content.
- **Public extensibility**: R5 may change internal composer/history construction but may not require consumer plugins to use Lexical extensions or replace MDXEditor's public Gurx/visitor contracts.
- **MDAST boundary**: `@lexical/mdast` adoption is not a child of this roadmap. The existing MDXEditor visitor/MDAST pipeline remains authoritative.
- **Verification ownership**: every child adds or updates tests for its outcome; no final “tests PRP” absorbs missing child evidence. Integration checkpoints rerun shared scenarios outside-in.
- **Single-writer sequencing**: R3 and R4 may be independently planned after R2 but are implemented sequentially. R5 starts only after both feature contracts are verified so its final checkpoint can prove it preserved them.

### Roadmap-Level Spikes

- None required before the first child. The R3 choice between adapting Lexical's selection converter and clipping/exporting through MDXEditor's existing MDAST pipeline is child-local: either result preserves the roadmap outcome, public contract, and decomposition.
- A possible `@lexical/mdast` spike is intentionally outside this roadmap because a positive result would create a separate multi-step migration initiative.

### Compatibility and Rollback Contract

- **Reversible boundary**: until a 0.48-based package is published, R2 can be reverted as one dependency/config/source change after preserving R1's tests. Later feature children remain separately revertible.
- **New data under rollback**: Markdown is the supported persisted interchange format; no new editor-state schema is introduced. Representative Markdown authored or serialized on 0.48 must remain importable by the 0.35 baseline when it uses the roadmap's supported constructs. Intentional canonical syntax differences are acceptable only when semantic equivalence is demonstrated.
- **Mixed-version behavior**: Lexical 0.35 and 0.48 are never mixed inside one editor instance. Compatibility concerns documents moving between released MDXEditor versions and downstream package consumers moving between package versions. Cross-version fixtures cover both directions.
- **Destructive boundary**: removal or signature changes to public visitor/plugin APIs would end easy rollback and are prohibited by this roadmap. Any such proposal requires a separately approved breaking-change plan.

### Validation Baseline

| Surface or command                             | Status                 | Observed result                                                                                                                                                                                  |
| ---------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run lint`                                 | Verified               | Passes at `9373742` on 2026-07-18.                                                                                                                                                               |
| `npm run typecheck`                            | Verified               | Passes with Lexical 0.35.0 at `9373742`.                                                                                                                                                         |
| `npm run test:once`                            | Verified               | 45 passed, 1 skipped, 1 todo; known jsdom/CodeMirror and accessibility warnings are present.                                                                                                     |
| `npm run build` on 0.35.0                      | Discovered but not run | Required by CI and by R2; no fresh roadmap-generation result recorded.                                                                                                                           |
| `npm run build:docs:api`                       | Discovered but not run | Required by CI; R2 must preserve it.                                                                                                                                                             |
| Representative real-browser suite              | Unavailable            | No current harness or command exists; R1 owns creation of the bounded compatibility surface.                                                                                                     |
| Temporary 0.48.0 `npm run test:once` rehearsal | Verified               | Same 45 passed, 1 skipped, 1 todo in the isolated rehearsal recorded by the upgrade assessment.                                                                                                  |
| Temporary 0.48.0 typecheck/build rehearsal     | Baseline failing       | Legacy module resolution creates false missing exports; bundler resolution exposes `CodeBlockNode` and horizontal-rule incompatibilities; declaration generation remains unverified until fixed. |

## Decomposition Strategy

R1 is a justified foundational child: it produces one stable compatibility contract and executable evidence set that every later child consumes. R2 is a narrow migration with a rollback boundary and no optional feature adoption. R3 and R4 are vertical public-capability slices with distinct entry points and validation loops. R5 is deliberately last because it changes root/nested lifecycle architecture and must demonstrate that the already-verified package, selection, search, and plugin contracts survive.

Tests are not centralized in a trailing child. R1 creates the shared characterization surface; each producing child owns focused tests for its capability; checkpoints rerun the integrated Consumer Contract.

## Dependency Map

- `R1` -> `R2`: R1 produces the 0.35 compatibility contract, real-browser harness, fixtures, and known baseline needed to distinguish regressions from intentional 0.48 changes.
- `R2` -> `R3`: R2 produces a compiling, buildable 0.48 editor and the final node/API types against which selection export is implemented.
- `R2` -> `R4`: R2 produces stable 0.48 selection/update/history behavior and a browser harness for the state-backed search implementation.
- `R3` -> `R5`: R3 produces direct selection-export tests, including nested-editor behavior, which R5 must preserve while changing composer internals.
- `R4` -> `R5`: R4 produces mutation-safe search behavior and browser tests that R5 must preserve across editor lifecycle changes.

## Outcome Coverage

| Required outcome, `CX-N`, or contract                                               | Producing step | Verification checkpoint       |
| ----------------------------------------------------------------------------------- | -------------- | ----------------------------- |
| Executable compatibility contract and browser evidence surface; foundational `CX-8` | R1             | After R1                      |
| Lexical 0.48 package/build compatibility; `CX-1`                                    | R2             | After R2 and final checkpoint |
| Markdown and editor interaction compatibility; `CX-2`, `CX-3`, `CX-4`               | R2             | After R2 and final checkpoint |
| Accurate selection Markdown; `CX-5`                                                 | R3             | After R3 and final checkpoint |
| Mutation-safe Find/Replace; `CX-6`                                                  | R4             | After R4 and final checkpoint |
| Extension-based internals with public plugin compatibility; `CX-7`                  | R5             | Final checkpoint              |
| Cross-version Markdown rollback contract                                            | R2             | After R2                      |
| All roadmap completion criteria integrated                                          | R5             | Final checkpoint              |

## Steps

### R1: Establish the Compatibility Contract and Browser Gate

- **Status**: VERIFIED
- **Outcome**: a bounded suite passes on Lexical 0.35.0 and directly characterizes the package's supported Markdown and editor-interaction behavior through jsdom and representative real browsers.
- **Why separate**: current tests are too weak to distinguish a safe upgrade from silent behavior drift; this evidence is independently useful and is the required input to every migration/integration child.
- **Depends on**: None.
- **Produces**: a stable compatibility scenario/fixture set, a real-browser test command integrated with CI, and a recorded 0.35 result consumed by R2-R5.
- **Consumer impact**: immediate consumer is the R2 implementer/verifier; enables `CX-1`-`CX-4` without claiming the upgrade itself.
- **External readiness inputs**: installable representative Chromium, Firefox, and WebKit engines in local/CI environments. Real mobile devices and language-specific IMEs are not required for this child.
- **Must preserve**: current public methods, plugin configuration, Markdown semantics, and existing tests; security-invalid behavior must not be enshrined as a compatibility promise.
- **In scope**: package/public-method fixtures; representative Markdown round trips; root/nested focus and history; decorator/list/link/shortcut/clipboard/selection boundaries; maximum-length boundary; the minimal real-browser harness and CI command; documented intentional-behavior classification rules.
- **Out of scope**: changing Lexical versions; fixing behavior only observed on 0.48; exhaustive browser/device certification; feature rewrites.
- **Validation boundary**: all existing gates and the new compatibility/browser commands pass against the untouched 0.35 package set, with captured fixture outputs and known environment limitations.
- **Remaining questions**: no blocking planning question. Execution must capture the canonical 0.35 output from the implemented full plugin set and classify any browser-specific interaction variance rather than weakening assertions.
- **Planning discoveries**: reuse Ladle's existing port-61000 host; expose one deterministic local-only story; use exact `@playwright/test@1.61.1` with Chromium, Firefox, and WebKit projects; let Playwright own the host lifecycle; treat a DOM `ClipboardEvent` as an explicit OS-clipboard proxy. The existing `ALL_PLUGINS` fixture is unsuitable because it includes network/backend content.
- **Child PRP**: `plans/001-lexical-compatibility-gate.md` — implementation-ready Standard PRP; research baseline and route spike are recorded in its Research Summary.
- **Completion evidence**: The Verification Record in `plans/001-lexical-compatibility-gate.md` directly verifies `CX-8`, `CX-2`, `CX-3`, `CX-4a`, `CX-4b`, and `CX-4c`. The untouched Lexical 0.35.0 baseline passes 3 focused jsdom tests and all 15 browser scenarios across Chromium, Firefox, and WebKit, plus the existing static, test, build, documentation, and patch-hygiene gates. R1 is `VERIFIED`.

### R2: Adopt Lexical 0.48 Without Feature Rewrites

- **Status**: VERIFIED
- **Outcome**: the published package uses a lockstep Lexical 0.48.0 set and passes the established compatibility, build, declaration, documentation, and security gates.
- **Why separate**: this is the migration and rollback boundary; keeping it mechanical makes failures attributable and permits reverting without removing later features.
- **Depends on**: R1's verified 0.35 compatibility fixtures, browser command, and baseline record.
- **Produces**: a stable 0.48 package/type/node baseline and documented intentional behavior changes consumed by R3-R5.
- **Consumer impact**: owns `CX-1`, `CX-2`, `CX-3`, and `CX-4`.
- **External readiness inputs**: R1 browser harness and the existing npm/CI toolchain; no deployment credentials.
- **Must preserve**: public React 18/19, Markdown, methods, visitors/plugins, nested-editor, and rollback contracts; fail-closed security behavior.
- **In scope**: lockstep dependency/lockfile update; conditional-export-aware TypeScript resolution; `CodeBlockNode.importJSON`; one consistent horizontal-rule node path; any other compile incompatibility discovered against 0.48; declaration/API-doc build; removal of `@lexical/clipboard` or `@lexical/plain-text` only if child research proves they are not part of the package/runtime contract; focused expectations for intentional upstream changes.
- **Out of scope**: selection serializer replacement, search redesign, extension composer/history migration, `@lexical/mdast`, NodeState refactors, general DOM-extension adoption.
- **Validation boundary**: R1's suite and all CI commands pass on 0.48; a packed minimal consumer passes; representative cross-version Markdown fixtures work in both directions; security URL cases fail closed.
- **Remaining questions**: no blocking planning question. Execution must classify any newly observed 0.48 canonical/security behavior against `CX-1`-`CX-4` rather than updating R1 expectations silently.
- **Planning discoveries**: keep the deprecated React horizontal-rule node/plugin internally consistent until R5 instead of partially adopting its extension replacement; broaden and validate `CodeBlockNode.importJSON`; harden the custom link-preview href without rewriting raw Markdown/callback data; verify the packed artifact with pinned React 18/19 apps; and replay 0.48-authored Markdown through published 4.0.4 with the complete Lexical graph overridden/asserted at 0.35.0.
- **Child PRP**: `plans/002-lexical-048-upgrade.md` — implementation-ready Standard PRP; cold contract audit closed the cross-version, URL-channel, and consumer-toolchain evidence gaps.
- **Completion evidence**: The Verification Record in `plans/002-lexical-048-upgrade.md` directly verifies `CX-1` through `CX-4`. The repository contains only Lexical 0.48.0; all 18 browser scenarios pass across Chromium, Firefox, and WebKit; packed React 18/19 consumers pass declarations, bundle, CSS, runtime, and public-ref checks; and published 4.0.4 with an exact Lexical 0.35 graph replays the 0.48 document without construct loss. R2 is `VERIFIED`.

### R3: Make Selection Markdown Match the Active Editor Contract

- **Status**: VERIFIED
- **Outcome**: `getSelectionMarkdown()` returns only the selected content with the same supported custom constructs and editor-local serialization configuration used by normal Markdown export.
- **Why separate**: this changes a public method's correctness and has its own consumer contract, custom-node coverage, and multi-editor isolation risks.
- **Depends on**: R2's verified 0.48 node/types baseline and the `CX-2`/`CX-3` compatibility evidence.
- **Produces**: accurate, editor-local selection serialization and a direct `CX-5` regression suite consumed by R5.
- **Consumer impact**: owns `CX-5`.
- **External readiness inputs**: R1's browser harness; no external service.
- **Must preserve**: empty result for absent/collapsed selections and source/diff mode; active nested-editor behavior; `toMarkdownOptions`, visitors, descriptors, and multi-editor isolation; normal full-document export.
- **In scope**: partial/backward/multi-block selections; formatting boundaries; nested/task lists; partial links; meaningful node selections; tables/thematic breaks; built-in custom nodes; consumer visitors; two simultaneous configurations; nested editor selections; removal of the whole-node handwritten serializer; upstream partial-link regression verification.
- **Out of scope**: clipboard serialization, live selection UX, `@lexical/mdast` adoption, normal full-document pipeline replacement.
- **Validation boundary**: `CX-5` passes through the public ref method in rendered editors, repeated calls do not mutate shared state, and selection/full-export consistency matches the settled contract.
- **Remaining questions**: no blocking planning question. Execution must fail loudly and replan if a supported custom node cannot survive Lexical's selected-JSON round trip or if source-editor mutation becomes necessary.
- **Planning discoveries**: use `$generateJSONFromSelectedNodes` to clip the active selection; create a no-config temporary editor inside the active editor read so it inherits the complete registered node/replacement map; reconstruct a valid selected tree; then reuse MDXEditor's existing visitors, extensions, options, and JSX descriptors. This path was proven with partial text/link, multi-block, custom decorator, repeated-read, and source-state evidence and avoids PR #949's parallel transformers/global caches.
- **Child PRP**: `plans/003-selection-markdown.md` — implementation-ready Standard PRP; the conclusive architecture spike is recorded at `plans/research/003-selection-markdown/spike-01-selection-export-pipeline.md`.
- **Completion evidence**: The Verification Record in `plans/003-selection-markdown.md` directly verifies `CX-5`. All six public-ref scenarios pass in Chromium, Firefox, and WebKit; focused state tests cover clipping, direction, meaningful node/custom serialization, options, non-mutation, repeatability, and loud failure. Direct thematic-break selection and a public `additionalLexicalNodes` replacement prove the node/registration boundary. Full unit/browser/build/package/cross-version/docs gates remain green. R3's selection/full-export invariant is now available to R5, which remains blocked on R4.

### R4: Make Find/Replace State-Backed and Mutation-Safe

- **Status**: VERIFIED
- **Outcome**: Find/Replace tracks current Lexical content and performs coherent replacement operations without relying on stale DOM-range-to-node mappings.
- **Why separate**: search has an independent UI/state boundary and can borrow upstream patterns without coupling its risk to dependency or composer migration.
- **Depends on**: R2's verified 0.48 update/selection behavior, R3's verified active-editor routing, and R1's browser harness.
- **Produces**: a Lexical-state position/index contract, mutation-safe highlights/navigation, coherent replace/replace-all history behavior, and direct `CX-6` tests consumed by R5.
- **Consumer impact**: owns `CX-6`.
- **External readiness inputs**: installed Chromium, Firefox, and WebKit directly report CSS Highlights support; no external service.
- **Must preserve**: existing public search controls and supported regex behavior unless a separately approved product decision changes them; editor content/formatting outside replacements; accessibility of the search UI.
- **In scope**: current-content indexing; mutation invalidation; navigation; replace and replace-all; one-update replace-all/history semantics; zero-length/invalid patterns; highlight cleanup; supported root content containers; explicit behavior at custom-decorator and nested-editor boundaries.
- **Out of scope**: unrelated toolbar redesign, new search syntax/modes without user direction, searching source/diff modes, cross-document search.
- **Validation boundary**: `CX-6` passes in a real rendered editor before and after document mutations, replacements preserve unaffected formatting/content, and undo behavior is deterministic.
- **Remaining questions**: no blocking planning question. Execution must pause if public DOM-range/cell compatibility requires DOM positions to remain mutation authority, or if active-editor focus cannot give Replace All one editor/history boundary.
- **Planning discoveries**: user selected active-editor-only search; root, nested JSX/directive, and table-cell editors are independent scopes. State node-key/original-offset positions become authoritative while DOM `Range`/`TextNodeIndex` values remain public projections. A conclusive spike replaced split formatted matches last-to-first in one update without stale keys or unrelated formatting loss; rendered one-step Undo/Redo remains required evidence.
- **Child PRP**: `plans/004-state-backed-search-replace.md` — implementation-ready Standard PRP; the conclusive state-position spike is recorded at `plans/research/004-state-backed-search/spike-01-state-position-replace-all.md`.
- **Completion evidence**: The Verification Record in `plans/004-state-backed-search-replace.md` directly verifies `CX-6a` through `CX-6c`. The public-hook suite passes all nine scenarios across Chromium, Firefox, and WebKit with active root/nested/table isolation, current ranges/highlights, mutation recovery, exact replacement output, and one-step history. Focused regressions cover stale actions, cross-block and linked-text replacement, normalized offsets, public cells/helpers, and same-node replacement safety. The full 65-unit/45-browser/build/package/cross-version/docs gate remains green.

### R5: Move Composer and Shared History Internals to Lexical Extensions

- **Status**: VERIFIED
- **Outcome**: root and nested editor lifecycle/history plumbing use the selected supported Lexical extension APIs while MDXEditor's public Gurx/plugin/visitor contract and all prior consumer behavior remain unchanged.
- **Why separate**: this is a core architectural migration with the broadest regression surface; it is safest after package, selection, and search behavior have direct tests.
- **Depends on**: verified R3 `CX-5` evidence and verified R4 `CX-6` evidence, in addition to R2's package/browser baseline.
- **Produces**: extension-based root/nested composer and shared-history internals plus a verified compatibility adapter for existing MDXEditor plugins, satisfying the final integration boundary.
- **Consumer impact**: owns `CX-7` and must preserve `CX-1`-`CX-6`.
- **External readiness inputs**: all earlier verification commands and fixtures; no external service.
- **Must preserve**: current Markdown visitor pipeline; public Gurx cells/signals and plugin registration; imperative methods; active-editor semantics; root/nested focus; shared undo/redo; consumer plugins are not required to know about Lexical extensions.
- **In scope**: root composer construction; nested directive/JSX/table editor construction; shared history; extension lifecycle cleanup; can-undo/can-redo integration only where it replaces existing internal signals without a public behavior change; development warnings/listener cleanup that naturally belong to the migrated lifecycle.
- **Out of scope**: `@lexical/mdast`; rewriting public plugins as Lexical extensions; public API removals; NodeState or DOM import/render migrations; unrelated editor feature changes.
- **Validation boundary**: `CX-7` passes through a minimal consumer plugin, all `CX-1`-`CX-6` evidence is rerun, and root/nested history/focus behavior has direct browser evidence with no update recursion warnings.
- **Remaining questions**: no blocking planning question. Execution must pause if complete consumer registrations are unavailable before editor construction, normal React children require a second React root or extension adoption, or correct disposal requires a public plugin lifecycle change.
- **Planning discoveries**: use one internal factory plus `LexicalExtensionEditorComposer`; keep React children extension-agnostic; and pin normal root/nested/sibling history, suppressed-root/nested-sibling history, and table-local then parent-save sequences. A conclusive exact-0.48 bridge spike proved context, parent/editability, shared state, Undo, and disposal; a second conclusive Strict Mode spike selected commit-phase realm setup with private exactly-once disposal and effect-owned child editors. Declare `@lexical/extension`/`@lexical/history` directly. `ReactPluginHostExtension`, a public extension API, and `@lexical/mdast` remain out of scope.
- **Child PRP**: `plans/005-extension-composer-history.md` — implementation-ready Standard PRP; the conclusive bridge spike is recorded at `plans/research/005-extension-composer-history/spike-01-extension-compatibility-bridge.md`.
- **Completion evidence**: The superseding Verification Record in `plans/005-extension-composer-history.md` directly verifies `CX-7a` through `CX-7c` after correcting initial imperative-ref timing, queued-method batching, table-local search/history isolation, and recursive nested-parent identity. Fresh evidence passed 14/14 focused units, 71 passed/1 skipped/1 todo full units, 12/12 affected, 57/57 full, and 9/9 post-hardening `CX-7` browser tests, React 18/19 packed consumers, lint, typecheck, declarations/build, and the 24-package Lexical lockstep assertion. No R5 issue remains; the roadmap is complete.

## Integration Checkpoints

### After R1

- **Integrated behavior to validate**: the compatibility suite observes stable public behavior on the untouched 0.35 baseline and is not coupled to implementation-only details.
- **Consumer scenarios**: foundational `CX-8` directly verifies the downstream gate and enables parent `CX-1`-`CX-4`; no upgraded outcome claimed yet.
- **Commands or observation**: existing lint/typecheck/jsdom gates plus the new browser command and fixture comparison command.
- **Evidence requirement**: DIRECT REQUIRED for rendered editor flows; environment-specific clipboard/IME behavior may use an explicit proxy with its limitation recorded.
- **Decision enabled**: R2 becomes READY FOR PRP.

### After R2

- **Integrated behavior to validate**: package/type/build compatibility, cross-version Markdown, root/nested editor interactions, and intentional 0.48 behavior/security changes.
- **Consumer scenarios**: `CX-1`, `CX-2`, `CX-3`, `CX-4`.
- **Commands or observation**: all CI gates; packed scratch consumer; R1 browser suite; bidirectional 0.35/0.48 fixtures; focused unsafe/safe URL cases.
- **Evidence requirement**: DIRECT REQUIRED except named platform clipboard limitations.
- **Decision enabled**: R3 and R4 become eligible for just-in-time PRP generation; the 0.48 upgrade can be released independently if desired.

### After R3

- **Integrated behavior to validate**: selection export is accurate across formatting, structural/custom nodes, multiple editor configurations, and nested editors without changing full-document export.
- **Consumer scenarios**: `CX-5`, with regression checks for `CX-2` and `CX-3`.
- **Commands or observation**: public-method browser/integration tests, selection matrix, repeated-call/multi-editor isolation checks.
- **Evidence requirement**: DIRECT REQUIRED.
- **Decision enabled**: R3's selection contract becomes an invariant for R5.

### After R4

- **Integrated behavior to validate**: search navigation, highlighting, replacement, mutation invalidation, and history behavior operate on current editor content.
- **Consumer scenarios**: `CX-6`, with regression checks for `CX-2` and `CX-3` where search touches nested/custom content.
- **Commands or observation**: real-browser search flows plus focused Lexical-state tests.
- **Evidence requirement**: DIRECT REQUIRED for the consumer flow; a highlight-rendering proxy is acceptable only if the chosen CI browser lacks CSS Highlights and the limitation is recorded.
- **Decision enabled**: R4's state/index contract becomes an invariant for R5.

### After R5 — Final Roadmap Checkpoint

- **Integrated behavior to validate**: the packed package, Markdown pipeline, root/nested interactions, selection export, Find/Replace, and custom consumer plugins all work with extension-based composer/history internals.
- **Consumer scenarios**: `CX-1` through `CX-7`.
- **Commands or observation**: full CI; packed React consumer; full browser compatibility suite; selection/search feature suites; minimal custom-plugin consumer; review of warnings and cleanup behavior.
- **Evidence requirement**: DIRECT REQUIRED for every scenario except explicitly accepted platform proxies already recorded in the parent contract.
- **Decision enabled**: roadmap can be marked COMPLETE and the extension migration can ship independently of any future `@lexical/mdast` initiative.

## Opportunity Register Outside Child PRPs

After R2, reapply the PRP router rather than expanding an active child:

- `SET_TEXT_FORMAT_COMMAND` for deterministic mixed-selection toolbar actions is likely a direct change with focused tests.
- `@lexical/a11y` development/test diagnostics are likely a direct tooling change after assessing signal and false positives.
- Custom autolink punctuation is likely a direct configuration change; a Unicode URL policy redesign is a separate PRP because it changes accepted input behavior.
- Performance improvements arrive automatically with 0.48; benchmark at R2/R5 checkpoints instead of creating an implementation PRP.
- Migrating the retained legacy React horizontal-rule node/plugin to `HorizontalRuleExtension` remains separate follow-up work after its Markdown-shortcut and selection behavior are characterized.
- Shadow DOM, NodeState, DOM import/render extensions, and `@lexical/mdast` remain separate initiatives when a concrete consumer outcome justifies them.

## Risks and Replanning Triggers

- R1 cannot build a representative browser surface without introducing an unbounded testing/platform project; split harness establishment from scenario coverage rather than weakening direct evidence silently.
- The 0.48 build exposes additional public type or declaration incompatibilities beyond the rehearsed blockers; reassess R2 scope and any public compatibility consequence before implementation expands.
- A security fix conflicts with previously accepted content. Preserve the secure behavior and request a product-level migration/validation decision.
- Cross-version fixtures show semantic Markdown loss rather than canonical syntax differences; block R2 release and assign ownership before proceeding.
- Accurate selection export cannot honor current consumer visitors/options without changing their public contract; pause R3 and revise the roadmap instead of shipping a standard-Markdown-only result under the existing method name.
- Active-editor-only search cannot retain stable nested/table focus through public toolbar actions or cannot provide one editor/history boundary; pause R4 and revisit the user-approved scope rather than silently aggregating editors.
- R5 requires consumer plugins to adopt Lexical extensions, changes public Gurx/visitor APIs, or couples to `@lexical/mdast`; stop and create a separate breaking-change roadmap.
- A later Lexical release supersedes 0.48.0 before R2 starts. Re-run the changelog/rehearsal and update this roadmap rather than silently changing the target.
- Representative browser verification reveals interacting failures across nested timing, clipboard, and composition that cannot be isolated under Standard assurance; escalate the affected child or roadmap to Deep with the evidenced trigger.

## Progress Log

### 2026-07-18

- Created roadmap `001` from the verified Lexical 0.35.0 → 0.48.0 assessment.
- Selected Standard assurance because the migration is reversible and the public/browser risks have bounded evidence surfaces.
- Initially marked R1 READY FOR PRP; R2-R5 remain blocked on concrete produced evidence.
- Kept `@lexical/mdast` adoption outside this roadmap based on its experimental extension-only API and MDXEditor's public custom visitor pipeline.
- Recorded current baseline: lint and typecheck pass; jsdom suite reports 45 passed, 1 skipped, 1 todo; no real-browser harness exists.
- Generated `plans/001-lexical-compatibility-gate.md`, selected Playwright over a second application host, and moved R1 to PRP READY. The child adds foundational `CX-8` for the executable gate while inheriting parent `CX-2`-`CX-4` for Markdown and interaction evidence.
- Started R1 execution against commit `9373742`; preflight reconfirmed the unchanged Lexical 0.35.0 baseline and preserved untracked `plans/` and `reports/` content.
- Completed the R1 implementation handoff: added the public-boundary fixture/harness, 3 focused jsdom tests, 5 scenarios across Chromium/Firefox/WebKit, deterministic Ladle lifecycle, CI browser job, and contributor documentation. Local integrated evidence is green on 0.35.0; R1 stays IN PROGRESS pending independent verification and no downstream step is unblocked.
- Verified R1 under the Standard assurance profile after closing four evidence gaps: typed-URL autolinking, shared history across root/nested/table/decorator contexts, positive list-transition assertions, and positive shortcut-undo paragraph recovery. The final compatibility gate passed 3 jsdom and 15 browser tests; R1 moved to VERIFIED and R2 became READY FOR PRP.
- Generated and contract-audited `plans/002-lexical-048-upgrade.md`. R2 is PRP READY with a lockstep 0.48 migration, conditional-export resolution, bounded custom-node fixes, fail-closed link-preview evidence, packed React 18/19 consumers, and direct 0.48→published-4.0.4/0.35 Markdown replay; optional feature integrations remain outside R2.
- Completed the R2 implementation handoff: the lockstep 0.48 graph, resolver/custom-node fixes, fail-closed preview link channel, React 18/19 packed consumers, direct published-0.35 replay, and all static/jsdom/browser/build/docs gates are green. The intentional 0.48 empty-list-item Backspace behavior is explicitly classified without data loss. R2 remains `IN PROGRESS` pending independent verification; R3 and R4 remain blocked.
- Verified R2 under the Standard assurance profile after fixing one package-harness isolation defect: `npm pack` now uses the same scratch cache as disposable installs. The fresh verifier reran the exact package and cross-version commands without an environment override, passed all 18 browser scenarios and every static/build/docs gate, and found no remaining engineering issue. R2 moved to `VERIFIED`; R3 and R4 moved to `READY FOR PRP`.
- Generated `plans/003-selection-markdown.md` and moved R3 to `PRP READY`. A conclusive scratch spike selected Lexical selected-JSON cloning plus a registration-inheriting temporary editor feeding the existing MDAST exporter; it preserved partial links, multi-block structure, custom payloads, repeated output, and source-state identity without adding a public parameter or adopting PR #949's transformer/cache design.
- Started R3 execution against commit `9373742`; preflight preserved the verified, uncommitted R1/R2 work and confirmed that R3's source targets have no overlapping edits.
- Completed the R3 implementation handoff: selection clipping now reuses the configured MDAST pipeline through an isolated registration-inheriting editor; focused state/custom/config tests pass; and the direct public-ref matrix passes 18/18 `CX-5` runs plus all 18 inherited browser scenarios across Chromium, Firefox, and WebKit. Static, package, cross-version, build, docs, formatting, and patch-hygiene gates are green. R3 remains `IN PROGRESS` pending independent Standard-assurance verification.
- Verified R3 under the Standard assurance profile after closing two evidence gaps: the browser now directly clicks the thematic break to create a meaningful node selection, and a replacement-specific consumer visitor proves that `additionalLexicalNodes` replacements survive selected-JSON reconstruction. The fresh verifier graded `CX-5` DIRECTLY VERIFIED after the complete 18-test matrix and a targeted 6/6 follow-up across Chromium, Firefox, and WebKit. R3 moved to `VERIFIED`; its selection/full-export invariant is ready for R5, which remains blocked on R4.
- Generated and cold-audited `plans/004-state-backed-search-replace.md`; R4 is `PRP READY` under Standard assurance. The user-selected active-editor-only contract, state-authoritative/DOM-projection design, one-update Replace All, raw public cell/helper compatibility, invalid/zero-length recovery, and direct three-engine `CX-6` evidence are pinned. A conclusive spike proved reverse state replacement across split formatting; browser Undo/Redo remains execution evidence. R5 stays blocked until R4 is implemented and verified.
- Started R4 execution against commit `9373742`; preflight preserved the verified, uncommitted R1-R3 work and confirmed that the search implementation/docs have no overlapping changes. R4 is `IN PROGRESS`; R5 remains blocked.
- Completed the R4 implementation handoff: active-editor Lexical positions now own matching/replacement; DOM ranges are current projections; Replace/Replace All are one-step undoable; and the public cell/helper/hook surface remains characterized. Five focused tests pass, direct `CX-6` passes 9/9 across Chromium, Firefox, and WebKit, and the full 62-unit/45-browser/build/package/cross-version/docs gate is green. R4 remains `IN PROGRESS` pending independent Standard-assurance verification; R5 remains blocked.
- Verified R4 under the Standard assurance profile after strengthening direct italic/link and mutation evidence exposed one complete-linked-text replacement defect. Same-node matches now splice authoritative text positions directly while cross-node matches retain Lexical range replacement. The fresh verifier passed the corrected 8-test focused suite and all 9 `CX-6` runs across Chromium, Firefox, and WebKit, including empty and length-changing same-node probes; the full 65-unit/45-browser/build/package/cross-version/docs gate is green. R4 moved to `VERIFIED`, and R5 moved to `READY FOR PRP` with the selection and search invariants available.
- Generated `plans/005-extension-composer-history.md` as a Standard R5 PRP and moved R5 to `PRP READY`. Two conclusive spikes selected the internal extension bridge and replay-safe commit-phase realm/disposal model. A cold contract audit closed lifecycle ownership and exact normal/suppressed/table Markdown plus Undo/Redo-availability sequences. Direct `CX-7` evidence runs in all three browsers; the final gate reruns `CX-1`–`CX-7`, package consumers, cross-version replay, build, and docs. Public extensions and `@lexical/mdast` remain separate; the roadmap stays `ACTIVE` until R5 is implemented and verified.
- Started R5 execution against commit `9373742`; preflight preserved the verified, intentionally uncommitted R1-R4 work and confirmed that the planned package/root overlap is the expected accumulated baseline. R5 is `IN PROGRESS`; the roadmap remains `ACTIVE`.
- Completed the R5 implementation handoff: extension-built root/nested/table editors, commit-phase realm ownership, private exactly-once disposal, shared/suppressed/local history adapters, and the extension-agnostic consumer boundary are implemented. Direct `CX-7` passes 9/9 across Chromium, Firefox, and WebKit; focused lint/type/build/lockstep checks and rebuilt packed React 18/19 consumers are green. R5 remains `IN PROGRESS` as `IMPLEMENTED — VERIFICATION PENDING`; the roadmap remains `ACTIVE` until a fresh verifier reruns the full inherited matrix.
- Verified R5 under the Standard assurance profile. The fresh verifier passed the 54/54 inherited public browser matrix, direct `CX-7` 9/9, and packed React 18/19 consumers, then found one public type regression and two direct-evidence gaps. `usedLexicalNodes$` is class-only again and the exact legacy downstream assignment compiles; public custom-import/init and root/nested/table Strict-remount probes now directly cover the missing behavior. The targeted follow-up passed production declarations/build and strengthened `CX-7a`/`CX-7c` 6/6 across Chromium, Firefox, and WebKit with clean teardown. R5 moved to `VERIFIED`; all roadmap completion criteria are satisfied and the roadmap moved to `COMPLETE`. Any future `@lexical/mdast` work remains a separate initiative.
- Reopened R5 after a cold whole-worktree review found three high-confidence compatibility gaps: Realm effect timing delays the public ref past a parent mount effect, table search baselining can mix local cell state into shared history, and recursive nested editors use the root rather than immediate containing editor as their extension parent. The roadmap returned to `ACTIVE`; the previous verification record remains historical evidence pending corrected implementation and fresh verification.
- Completed the reopened R5 implementation handoff without changing Realm construction or cleanup: a stable initial-commit methods facade delegates/queues to the committed Realm, table search baselines only an identical shared history state, and recursive nested editors use their immediate context parent. Focused unit evidence and the affected 12-test three-engine browser matrix pass; the complete gate is green with 70 unit tests, 57 browser tests, build/declarations, lockstep packages, packed React 18/19 consumers with direct parent layout/mount-effect ref checks, cross-version replay, API docs, and patch hygiene. R5 remains `IN PROGRESS` as `IMPLEMENTED — VERIFICATION PENDING`, and the roadmap remains `ACTIVE` until fresh verification supersedes the historical record.
- Fresh post-review verification superseded the historical R5 record. A cold read-only verifier directly passed `CX-7a`–`CX-7c`, 13/13 focused units, the 12/12 affected and 57/57 full three-engine browser matrices, React 18/19 packed consumers, and all static/build/lockstep gates; it found no remaining correctness issue. R5 is `VERIFIED`, every roadmap completion criterion is satisfied, and the roadmap is `COMPLETE`. The uncombined pre-ready `insertMarkdown`/`focus` test path is recorded as a non-blocking evidence limitation.
- Closed the final R5 evidence limitation before packaging the work. A new Strict Mode test exposed stale Markdown publication when queued `setMarkdown`, `focus`, and `insertMarkdown` replayed in one Lexical batch; the public facade now drains FIFO across microtasks without changing Realm construction or ready-state behavior. A targeted verifier independently passed 6/6 focused lifecycle tests and found no issue; full units are 71 passed/1 skipped/1 todo, packed React 18/19 consumers pass, and `CX-7` remains 9/9 across all engines. The roadmap remains `COMPLETE` with no accepted replay limitation.

### 2026-07-19

- Addressed the pre-PR hardening review without reopening the completed roadmap: interrupt cleanup now settles every process stop before resource cleanup and reports combined failures; Realm disposal preserves reverse-order/first-error semantics for every thrown value and retains both plugin-initialization and cleanup failures; the NFKD offset map distinguishes unchanged code points from equal-length compatibility expansions; empty replacement and the affected error paths now have durable tests; and the retained legacy horizontal-rule path is documented as a separate follow-up. Lint, typecheck, 78 passed/1 skipped/1 todo unit tests, declarations/build, and all 12 `CX-6` scenarios across Chromium, Firefox, and WebKit pass with port `61000` cleaned up.
