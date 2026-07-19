---
repo: /Users/petyo/w/mdx-editor/editor
---

# PRP: Lexical 0.48 Mechanical Upgrade and Package Gate

## Goal

Upgrade every direct Lexical package from 0.35.0 to 0.48.0 in lockstep, make the minimum configuration and source changes required by the new type/node contracts, retain 0.48's fail-closed URL behavior, and prove that the built package and R1 compatibility surface work for React 18 and 19 consumers.

This PRP is the reversible dependency-migration boundary. It does not integrate selection conversion, Find/Replace, extension composers/history, or `@lexical/mdast`.

## Why

- R1 now provides direct 0.35 evidence for the Markdown, browser, nested-editor, list, link, shortcut, clipboard/history, and maximum-length behavior most exposed by the upgrade.
- The clean 0.48 rehearsal found a bounded migration rather than a dependency-only update: conditional-export-aware module resolution, `CodeBlockNode.importJSON`, the horizontal-rule class/guard split, and declaration rollup must be addressed.
- Package consumers need stronger evidence than repository typechecking: the packed artifact must expose usable declarations, styles, and runtime code with both supported React majors.
- Lexical 0.48 hardens dangerous URLs. MDXEditor's custom link-preview anchor must not bypass that fail-closed behavior.

## Success Criteria

- [x] All installed `lexical` and `@lexical/*` packages resolve to 0.48.0 with no mixed Lexical version, while React peers and the published Node engine remain unchanged.
- [x] Typecheck, declaration rollup, package build, API docs, existing tests, and R1's 3-engine compatibility gate pass without broad compatibility casts.
- [x] The code-block JSON contract and one consistent legacy React horizontal-rule path compile and retain their public Markdown/browser behavior.
- [x] Safe links remain usable and dangerous or obfuscated schemes render and preview as `about:blank` without weakening the stored Markdown contract.
- [x] Disposable React 18 and React 19 consumers install the packed artifact, typecheck, bundle, and render it through documented exports and styles.

## Assurance

- **Profile**: Standard
- **Rationale**: This changes a public package dependency and browser behavior, but the migration is reversible before publication, persists only Markdown rather than an editor-state schema, and is bounded by R1's direct browser contract, a packed-consumer matrix, security-focused link evidence, and full build/declaration gates. No irreversible migration, deployment boundary, or unresolved cross-domain Deep trigger is present.

## Roadmap Context

- **Parent roadmap**: `plans/roadmaps/001-lexical-048-adoption.md`
- **Roadmap step**: `R2` — adopt Lexical 0.48 without feature rewrites.
- **Satisfied dependencies**: R1 is `VERIFIED`; its Verification Record proves `CX-8`, `CX-2`, `CX-3`, and `CX-4a`-`CX-4c` on the untouched 0.35 lockfile in jsdom, Chromium, Firefox, and WebKit.
- **Inherited decisions and invariants**: all Lexical packages stay lockstep; React 18/19, public MDXEditor methods/plugins/visitors, and Markdown remain compatible; unsafe URLs fail closed; no mixed 0.35/0.48 runtime; optional 0.48 features remain later children or separate initiatives.
- **Contract produced for later steps**: a compiling, buildable, packed, browser-verified 0.48 package baseline and classified intentional behavior record for R3-R5.

## Consumer Contract

### Consumer and Public Boundary

- **Consumer(s)**: React 18/19 package integrators; Markdown/MDX authors; users of documented MDXEditor plugins, methods, and browser interactions; downstream R3-R5 implementers.
- **Public or supported boundary**: packed `@mdxeditor/editor` exports/declarations/style; `MDXEditor` props/ref methods; Markdown input/output; documented plugins and toolbar controls; root and nested contenteditables.
- **Entry point and prerequisites**: R1 changes are present; matched Playwright browsers are installed; package-consumer checks may access npm and use an isolated temporary npm cache.
- **Current observable behavior**: the verified 0.35 baseline passes 3 focused jsdom and 15 browser tests, but a temporary 0.48 rehearsal fails current type/declaration resolution and two node contracts.
- **Observable promise**: consumers can upgrade to the 0.48-based package without changing their supported MDXEditor code or Markdown, except for explicitly retained security hardening.
- **Must remain compatible with**: React/React DOM 18 and 19, published Node `>=16`, public plugin/visitor/Gurx APIs, current Markdown fixtures, CI/browser tooling, and rollback through Markdown.
- **Not claimed**: byte identity for deliberately canonicalized Markdown; React 17; mobile/every-IME certification; preservation of unsafe URL navigation; new selection/search/composer features; direct use of Lexical internals by consumers.

### Acceptance Scenarios

| ID | Given | When | Then | Exact exercise and prerequisites | Required evidence |
|---|---|---|---|---|---|
| `CX-1` | Separate minimal TypeScript apps use the pinned React 18 and React 19 consumer manifests with only documented `@mdxeditor/editor` imports and its stylesheet | Each installs the packed 0.48 artifact, typechecks, bundles, starts a disposable preview, and renders an editor | Package exports, declarations, CSS, peer resolution, and runtime initialization work in both supported React majors without repository-source imports | Run `npm run build && npm run test:package`. Exact manifests use React/DOM 18.3.1 with types 18.3.24/18.3.7, or React/DOM 19.2.1 with types 19.2.7/19.2.3; both pin TypeScript 5.9.3 and Vite 5.2.8. The script uses temp apps/caches, the tarball, loopback previews, and Playwright Chromium, then cleans up | DIRECT REQUIRED |
| `CX-2` | The checked-in 0.35 canonical fixture covers representative CommonMark, GFM, MDX, and custom constructs; published `@mdxeditor/editor@4.0.4` plus overrides for the complete exact 0.35.0 Lexical set is the pinned legacy reader | The packed 0.48 app imports the 0.35 fixture and exports a deterministic edited document, then the disposable legacy app imports that 0.48 output through the same documented plugins and exports it again | All constructs survive 0.35→0.48 and 0.48→0.35; the legacy replay equals the checked-in 0.35 canonical/semantic expectation with no lost construct | Run `npm run test:cross-version`; first assert the legacy installed tree contains only Lexical 0.35.0 (the 4.0.4 manifest's carets may otherwise float), capture 0.48 public-ref output, feed it to 4.0.4, and compare its export/construct anchors. Any syntax difference requires explicit 0.35/0.48 expected strings and legacy canonicalization evidence | DIRECT REQUIRED |
| `CX-3` | The R1 fixture contains root text, nested JSX, a table cell, and adjacent decorators with shared toolbar history | The same root/nested/table/boundary focus, typing, deletion, undo, and redo journeys run on 0.48 | Exact observed Markdown transitions remain coherent once, focus stays in the intended editor, and no page error, console error, stale parent state, or update recursion occurs | Run `CX-3` in Chromium, Firefox, and WebKit through the public contenteditables and controls; no private Lexical/Gurx inspection | DIRECT REQUIRED |
| `CX-4` | The R1 list/link/shortcut/clipboard/maximum-length fixtures are present and the link dialog accepts both safe and dangerous URLs | Existing interactions run, then a user creates exact safe and dangerous vectors and opens/copies their preview | Existing behavior remains stable or is explicitly classified; dangerous editor/preview hrefs are `about:blank` while visible text, copied value, `getMarkdown()`, and the prevented `onClickLinkCallback` payload retain the authored raw URL; safe/relative vectors remain unchanged | Run R1 `CX-4a`-`CX-4c` plus `CX-4d` in all engines. Exact vectors: `https://example.com/safe`, `mailto:user@example.com`, `/relative`, `#anchor`, `javascript:alert(1)`, `javascript://:99999999999/%0aalert(1)`, `java\tscript:alert(1)`, and `data:text/html,<script>alert(1)</script>`; assert `getAttribute('href')`, display, intercepted `clipboard.writeText`, Markdown, callback payload, and no execution/runtime error | DIRECT REQUIRED for editor/dialog/browser behavior; DOM paste and intercepted clipboard writing remain explicit OS-clipboard proxies |

## Research Summary

### Vetted Repository Findings

- `package.json:47-71` and `package-lock.json` — ten direct Lexical packages declare/resolve 0.35.0; `@lexical/clipboard` and `@lexical/plain-text` have no direct `src` imports — **PRP impact**: update all declarations together but retain the two direct dependencies during this mechanical migration rather than alter the published dependency surface opportunistically.
- `tsconfig.json:3-8` — TypeScript 5.9 uses `module: "esnext"` with legacy `moduleResolution: "node"` — **PRP impact**: use `moduleResolution: "bundler"`, then verify rollup and consumers, not only `tsc`.
- `src/plugins/codeblock/CodeBlockNode.tsx:43-79` — `importJSON` requires `SerializedCodeBlockNode`, narrower than 0.48's base `SerializedLexicalNode & Record<string, unknown>` static contract — **PRP impact**: accept the base input, validate/default custom fields, and test valid plus missing/malformed data without an `unknown` double cast.
- `src/plugins/thematic-break/*.ts` and `src/plugins/markdown-shortcut/index.tsx:27-63` — MDXEditor uses the legacy React horizontal-rule node/plugin throughout — **PRP impact**: retain that architecture until R5 and replace the re-exported base-class guard with a subclass-correct predicate; do not partially adopt `HorizontalRuleExtension`.
- `vite.config.ts:14-30,46-68` and `package.json:200-209` — dependencies are externalized and declarations are rolled into the published `dist` export — **PRP impact**: a packed, installed consumer is required to catch conditional-export or declaration leakage.
- `src/plugins/link-dialog/LinkDialog.tsx:193-247` — the preview anchor uses the raw stored URL, while 0.48's `LinkNode.createDOM` sanitizes its own anchor — **PRP impact**: give preview navigation a sanitized href while preserving raw display/callback/Markdown data unless a separately approved validation policy changes it.
- `src/test/fixtures/lexicalCompatibility.ts`, `src/test/compatibility.test.tsx`, and `tests/browser/lexical-compatibility.spec.ts` — R1 records exact 0.35 Markdown and directly covers the highest-risk browser paths — **PRP impact**: treat failures as migration evidence; do not rewrite expected behavior before classification.
- `.github/workflows/ci.yml` — CI already separates tests, 3-engine compatibility, build, and API docs — **PRP impact**: add the packed-consumer matrix to the build job after `dist` exists, preserving failure-local jobs.

### External Constraints

- Lexical 0.48 packages expose types through conditional exports with a TypeScript `<5.2` fallback; `@lexical/react@0.48.0` peers on React/React DOM `>=18.x` and optional TypeScript `>=5.2` — [official 0.48 package manifest](https://github.com/facebook/lexical/blob/v0.48.0/packages/lexical-react/package.json).
- Lexical 0.48's base `importJSON` accepts `SerializedLexicalNode & Record<string, unknown>` and recommends delegating reusable restoration to `updateFromJSON` — [official node source](https://github.com/facebook/lexical/blob/v0.48.0/packages/lexical/src/LexicalNode.ts), [serialization guide](https://github.com/facebook/lexical/blob/v0.48.0/packages/lexical-website/docs/serialization/serialization.md#lexicalnodeimportjson).
- The React `HorizontalRuleNode` and plugin are deprecated subclasses/adapters over `@lexical/extension`, while the base extension owns different registration/selection behavior — [React node](https://github.com/facebook/lexical/blob/v0.48.0/packages/lexical-react/src/LexicalHorizontalRuleNode.tsx), [extension implementation](https://github.com/facebook/lexical/blob/v0.48.0/packages/lexical-extension/src/HorizontalRuleExtension.ts).
- `LinkNode.sanitizeUrl` allowlists `http`, `https`, `mailto`, `sms`, and `tel`, neutralizes unsupported/control-obfuscated schemes to `about:blank`, and preserves relative inputs — [official 0.48 link source](https://github.com/facebook/lexical/blob/v0.48.0/packages/lexical-link/src/LexicalLinkNode.ts).
- Published `@mdxeditor/editor@4.0.4` declares the full Lexical set at `^0.35.0` with the same React 18/19 peers and Node engine — [npm registry manifest](https://registry.npmjs.org/@mdxeditor%2feditor/4.0.4).

### Settled Decisions and Rejected Alternatives

- **Decision**: update every existing direct Lexical declaration to `^0.48.0` and require the installed tree to contain only 0.48.0 Lexical packages — **Rationale**: preserves the repository's declaration policy while making the lockfile/runtime invariant executable.
- **Decision**: use TypeScript `bundler` resolution — **Rationale**: it matches the ESM/Vite library build and reduced the rehearsal to real incompatibilities.
- **Decision**: keep the legacy React horizontal-rule node/plugin internally consistent for R2 — **Rationale**: the extension implementation requires registration/selection lifecycle work owned by R5; a local `instanceof HorizontalRuleNode` predicate fixes the 0.48 type split without broad casts.
- **Decision**: sanitize the custom preview anchor's navigable href through the active `LinkNode` behavior while retaining the raw URL for display, Markdown serialization, and callbacks — **Rationale**: closes the navigation bypass without silently rewriting authored content or callback contracts.
- **Rejected**: remove unused direct clipboard/plain-text dependencies during R2 — **Reason**: source search proves no direct import but not that no consumer relied on the published dependency surface; cleanup is not required for 0.48 compatibility.
- **Rejected**: adopt selection conversion, extension composer/history, stock table nodes, NodeState, autolink redesign, or `@lexical/mdast` — **Reason**: each changes architecture or behavior beyond this reversible migration boundary.

### Spike Evidence

- No new spike needed. The clean isolated 0.48 rehearsal in `reports/lexical-upgrade-0.35.0-to-0.48.0-assessment-2026-07-18.md` reduced module resolution failures to the two source incompatibilities above and showed the existing jsdom suite still passing; R1 subsequently supplied the missing browser evidence.

### Validation Baseline

| Command | Status | Observed or expected result |
|---|---|---|
| `npm run test:compat` on 0.35 | Verified | R1 Verification Record: 3 jsdom and 15 browser tests pass. |
| `npm run lint && npm run typecheck` on 0.35 | Verified | Fresh R1 verification passed. |
| `npm run test:once`, `npm run build`, `npm run build:docs:api` on 0.35 | Verified | R1 execution record: 48 passed, 1 skipped, 1 todo; build and API docs pass with known warnings. |
| Temporary 0.48 `npm run test:once` | Verified rehearsal | Pre-R1 suite passed 45, skipped 1, todo 1. |
| Temporary 0.48 typecheck/build | Baseline failing | Legacy resolution produces false missing exports; bundler resolution exposes code-block and horizontal-rule errors; declarations are not yet valid. |
| Packed React 18/19 consumer | Unavailable | No consumer fixture/command exists; this PRP creates it. |

### Research Coverage

- **Depth**: Standard
- **Inspected**: R1 produced contract, parent `CX-1`-`CX-4`, upgrade assessment/rehearsal, dependency/lock/build/type configuration, code-block and thematic-break nodes, link rendering/dialog path, tests/CI, package exports, official 0.48 node/link/horizontal-rule manifests and source.
- **Not inspected**: R3 selection implementation, R4 search redesign, R5 extension migration, mobile/device farms, `@lexical/mdast`, or unrelated upstream packages.
- **Research confidence**: HIGH — the only compile blockers were reproduced in the prior rehearsal, the horizontal/security choices are grounded in live and 0.48 source, and R1 directly covers the behavioral blast radius.

## Execution Contract

- **Planned at commit**: `9373742`
- **Planning baseline**: R1 changes and `plans/`/`reports/` are pre-existing uncommitted work and must be preserved. R2 starts from that verified worktree rather than resetting to HEAD.

### Expected Changes

- `package.json`, `package-lock.json`, `tsconfig.json` — lockstep 0.48 declarations/resolution plus focused version/package scripts.
- `src/plugins/codeblock/CodeBlockNode.tsx` and focused tests — compatible validated JSON import.
- `src/plugins/thematic-break/LexicalThematicBreakVisitor.ts` — subclass-correct legacy React node guard; other thematic files only if needed for consistent imports.
- `src/plugins/link-dialog/LinkDialog.tsx` and its state wiring/tests — separate displayed/raw URL from sanitized preview href without making an existing exported state type source-incompatible.
- `tests/browser/lexical-compatibility.spec.ts` and shared fixture/harness if needed — `CX-4d` security journey and classified 0.48 expectations.
- `scripts/assert-lexical-versions.mjs`, package/cross-version verification scripts, `tests/package-consumer/`, `.github/workflows/ci.yml`, and `CONTRIBUTING.md` — deterministic dependency invariant, packed React matrix, and published-0.35 replay gate.

### Explicitly Out of Scope

- R3-R5 feature work, `@lexical/mdast`, NodeState/custom-node modernization, Unicode/autolink policy redesign, stock Lexical table migration, Shadow DOM, performance refactors, or device/IME certification.
- Removing existing direct Lexical packages, changing React peers or Node engines, changing public plugin/visitor/method signatures, or adding Lexical extensions to consumer APIs.
- Restoring navigation for malformed/dangerous URLs or treating security hardening as a compatibility regression.

### Scope Expansion Rule

Additional compatibility/test files may change when 0.48 produces a directly evidenced compile or `CX-1`-`CX-4` failure. Record the path, upstream behavior, and evidence in Execution Notes. Pause before any new public API, package engine/peer change, editor architecture rewrite, data-loss acceptance, or optional feature adoption.

### Pause and Reassess If

- Any installed Lexical package cannot remain at exactly 0.48.0 or a fix requires mixed versions.
- A R1 construct loses content/meaning, nested updates recurse, or cross-version Markdown becomes unreadable rather than merely canonicalized differently.
- Horizontal-rule compatibility requires extension-composer adoption rather than the bounded legacy predicate/import fix.
- URL safety would require rewriting stored Markdown or callback payloads, rather than neutralizing automatic navigation.
- The packed artifact cannot support both React majors without changing published peer/engine/API contracts.

## Context

### Key Files

- `plans/roadmaps/001-lexical-048-adoption.md` — inherited consumer and rollback contract.
- `plans/001-lexical-compatibility-gate.md` — verified R1 evidence and exact 0.35 fixture behavior.
- `reports/lexical-upgrade-0.35.0-to-0.48.0-assessment-2026-07-18.md` — changelog mapping and isolated rehearsal.
- `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts` — dependency, resolver, declaration, and package boundaries.
- `src/plugins/codeblock/CodeBlockNode.tsx` — custom static JSON incompatibility.
- `src/plugins/thematic-break/` and `src/plugins/markdown-shortcut/index.tsx` — legacy React horizontal-rule architecture.
- `src/plugins/link-dialog/LinkDialog.tsx`, `src/plugins/link-dialog/index.ts`, `src/plugins/link/` — raw, rendered, preview, callback, and Markdown URL paths.
- `src/test/fixtures/lexicalCompatibility.ts`, `src/test/compatibility.test.tsx`, `tests/browser/lexical-compatibility.spec.ts` — canonical/cross-version and real-browser gates.

### Gotchas

- Conditional type exports make a wrong resolver look like hundreds of removed APIs; fix the resolver before touching source imports.
- The React module re-exports `$isHorizontalRuleNode` from the base extension, so that guard does not narrow to the deprecated React subclass in 0.48.
- The preview dialog creates its own `<a>` and therefore does not inherit `LinkNode.createDOM` sanitization automatically.
- A browser's `anchor.href` property becomes absolute for relative URLs; test `getAttribute('href')` when the authored relative form is the contract.
- The local npm cache currently can contain ownership-conflicted files. The consumer script must use a temp cache and clean it with all packed apps/servers in `finally`.
- Run Playwright outside the restricted macOS Codex sandbox; sandbox launch aborts are environment failures and can generate OS crash reports.

## Implementation Blueprint

### Tasks

```yaml
Task 1: Upgrade the package graph and resolver atomically
  MODIFY package.json, package-lock.json, tsconfig.json:
    - Change every existing direct lexical/@lexical declaration to ^0.48.0 in one install and set moduleResolution to bundler.
    - Add test:lexical-versions backed by a script that checks direct declarations and recursively rejects any installed Lexical version other than 0.48.0.
    - Preserve React peers, Node engine, and the direct clipboard/plain-text entries.
  CREATE scripts/assert-lexical-versions.mjs
  ENABLES: CX-1, CX-2, CX-3, CX-4
  VERIFY:
    - COMMAND: npm run test:lexical-versions && npm run typecheck
    - EXPECTED: one 0.48.0 Lexical graph and zero TypeScript errors after Tasks 2-3 land.

Task 2: Resolve custom-node compatibility without architecture migration
  MODIFY src/plugins/codeblock/CodeBlockNode.tsx:
    - Accept the 0.48 base static JSON input, validate/default code/language/meta, and retain round-trip output without unknown double casts.
  MODIFY src/plugins/thematic-break/LexicalThematicBreakVisitor.ts:
    - Narrow with the registered React HorizontalRuleNode subclass instead of the extension-base re-exported guard; keep registration, creation, command, and shortcut dependencies on the same legacy React module.
  MODIFY/CREATE focused src/test tests:
    - Cover valid code-block JSON round trip plus missing/wrong custom fields and thematic-break Markdown round trip.
  ENABLES: CX-2, CX-3, CX-4
  VERIFY:
    - COMMAND: npm run test:once -- --run src/test/core.test.tsx && npm run typecheck
    - EXPECTED: focused node/Markdown tests and source typing pass with no broad compatibility cast.

Task 3: Retain fail-closed URL behavior through MDXEditor's custom UI
  MODIFY src/plugins/link-dialog/LinkDialog.tsx and src/plugins/link-dialog/index.ts:
    - Carry a sanitized navigation href derived from the active 0.48 LinkNode separately from raw display/callback/Markdown URL data.
    - Keep the exported PreviewLinkDialog shape source-compatible; any added href field must be optional for external construction while every internal preview publication supplies it.
    - Keep safe, mail, and relative URLs usable; never recreate or weaken the upstream allowlist.
  MODIFY tests/browser/lexical-compatibility.spec.ts and focused link tests/fixture:
    - Add CX-4d with the table's exact vectors; assert editor/preview getAttribute('href'), visible and copied raw URL, getMarkdown(), prevented callback payload, safe/relative preservation, and no script/page/console error.
  ENABLES: CX-4
  VERIFY:
    - COMMAND: npm run test:browser -- --grep 'CX-4b|CX-4d'
    - EXPECTED: 6 focused tests pass; safe URLs retain their target, dangerous navigation is about:blank, and every raw data channel retains the authored value.
    - PROCESS-LIFECYCLE: Playwright owns Ladle, browsers, artifacts, and port 61000; exit 0 is success and any assertion/runtime/server failure is nonzero.

Task 4: Verify the packed package with both supported React majors
  CREATE tests/package-consumer/* and scripts/verify-package-consumer.mjs:
    - Check in complete exact manifests for the two CX-1 toolchains; build/pack once, copy each fixture to a disposable app with a temp npm cache, install, typecheck, Vite-bundle, serve, and assert public rendering/ref output in Chromium.
    - Print phase/major progress, fail on install/type/bundle/runtime error, terminate each server, and remove tarball/apps/cache in finally.
  CREATE scripts/verify-cross-version-markdown.mjs (or an isolated phase in the same runner):
    - Capture deterministic public-ref Markdown from the packed 0.48 consumer; install exact @mdxeditor/editor@4.0.4 with overrides pinning every lexical/@lexical dependency to 0.35.0; assert that installed graph before importing the captured output with the same plugins and comparing its public-ref export to the explicit 0.35 expectation and construct anchors.
  MODIFY package.json, .github/workflows/ci.yml, CONTRIBUTING.md:
    - Add test:package and test:cross-version; install the Playwright-matched Chromium binary in build-js and run both after Build; document direct and failure-local commands plus network/browser prerequisites.
  ENABLES: CX-1, CX-2
  VERIFY:
    - COMMAND: npm run build && npm run test:package && npm run test:cross-version
    - EXPECTED: both packed consumers pass and 4.0.4 directly imports/re-exports the captured 0.48 Markdown with no lost construct or retained process/temp state.
    - FAILURE-LOCAL: npm run build; npm run test:package -- --react=18; npm run test:package -- --react=19; npm run test:cross-version.
    - PROCESS-LIFECYCLE: the script owns temp directories/caches/tarball, Chromium contexts, child process groups, and allocated ports on success, failure, and interrupt.

Task 5: Classify migration behavior and run the integrated handoff
  MODIFY R1 fixture expectations only when directly evidenced:
    - Preserve compatibilityMarkdown035; if 0.48 canonical syntax differs, add an explicit 0.48 expectation and semantic cross-version assertions rather than overwriting history.
    - Record every intentional 0.48 difference and why it is security/semantic-preserving in Execution Notes.
  ENABLES: CX-1, CX-2, CX-3, CX-4
  VERIFY:
    - COMMAND: npm run lint && npm run typecheck && npm run test:lexical-versions && npm run test:once && npm run test:compat && npm run build && npm run test:package && npm run test:cross-version && npm run build:docs:api
    - EXPECTED: all existing and new gates return 0 on the 0.48 lockfile; CX-1-CX-4 have direct evidence and no unclassified fixture change.
    - FAILURE-LOCAL: npm run test:once; npm run test:compat:unit; npm run test:browser -- --project=<name>; npm run test:browser -- --grep <CX-title>; npm run build; npm run test:package -- --react=<18|19>; npm run test:cross-version; npm run build:docs:api.
    - PROCESS-LIFECYCLE: npm exposes each phase; Vitest owns jsdom cleanup, Playwright owns Ladle/browser/61000, and the package script owns its scratch apps/servers/caches. Any phase nonzero fails; all owners clean up on every terminal path.
```

## Validation

```bash
npm run test:lexical-versions
npm run lint
npm run typecheck
npm run test:once
npm run test:compat
npm run build
npm run test:package
npm run test:cross-version
npm run build:docs:api
git diff --check
```

The `CX-N` table is authoritative. Do not accept a changed snapshot merely because 0.48 emits it; first distinguish canonical syntax, intentional security hardening, and semantic/data loss. Browser commands must run outside the restricted macOS sandbox.

## Unknowns & Risks

- New 0.48 errors may appear only after the known resolver/node fixes; they are in scope only when they are necessary for the same public/build contract and are recorded with evidence.
- Continuous typing/history grouping may differ while exported state remains equivalent; assert restored public text/Markdown rather than a fixed number of internal history entries.
- Package-consumer installation requires npm availability. CI is the authoritative environment if local network/cache policy prevents direct evidence; do not substitute source imports for the packed artifact.
- The retained legacy horizontal-rule path is intentionally temporary and deprecated, but replacing it early would collapse R2 and R5's rollback boundaries.

**Confidence: 9/10** for one-pass implementation success. The compile blockers and security bypass are concretely located; remaining uncertainty is limited to directly testable 0.48 behavior and packed-consumer integration.

## Execution Notes

### 2026-07-18 — implementation handoff

- Upgraded all ten direct Lexical declarations to `^0.48.0`, regenerated the lockfile, changed TypeScript resolution to `bundler`, and added an executable graph assertion. The installed repository and both packed consumers contain 24 Lexical packages, all exactly `0.48.0`; React peers and the published Node `>=16` engine are unchanged.
- Broadened `CodeBlockNode.importJSON` to the 0.48 base contract and defaulted missing or non-string `code`, `language`, and `meta` fields. Kept the deprecated React horizontal-rule node/plugin/shortcut path internally consistent, used a subclass-correct predicate, and added explicit lint annotations documenting the deliberate R5 deferral.
- `bundler` resolution exposed an ESLint type-information failure for `micromark-util-symbol`'s declaration-only default export in `src/mdastUtilHtmlComment.ts`. The tokenizer now locally types only the four character codes and three token names it already used, with identical micromark literal values; tests, Markdown fixtures, declaration rollup, and the packed replay show no behavior change.
- Split link data from navigation in `PreviewLinkDialog`: internal preview publications derive `href` from the active 0.48 `LinkNode.sanitizeUrl`, while the new exported field remains optional and defaults fail-closed for external state construction. All exact `CX-4d` vectors pass in Chromium, Firefox, and WebKit. Safe, mail, path, and fragment hrefs remain usable; all four dangerous/obfuscated hrefs are `about:blank`; visible text, clipboard payload, callback payload, and the parsed Markdown destination retain the authored URL. Markdown may escape reserved destination syntax such as `mailto\:` while parsing back to the exact raw URL.
- Classified one intentional upstream list change already identified in the assessment: on 0.48, Backspace in a newly created empty list item converts it to a paragraph and leaves the surrounding list fragments intact, rather than merging subsequent typing into the preceding item as 0.35 did. All three engines produce the same Markdown (`&#x20;after Backspace` between the two list fragments), every construct occurs exactly once, and task toggle/undo remains coherent. The browser contract records both the old expectation and the explicit 0.48 outcome instead of silently weakening the test.
- Added checked-in React 18.3.1 and React 19.2.1 consumers with their exact type packages, TypeScript 5.9.3, and Vite 5.2.8. The package gate packs once, installs through isolated temporary caches, typechecks, bundles, serves, renders documented exports/styles, reads Markdown through the public ref, asserts the exact 0.48 graph, and cleans browser/server/app/cache/tarball state on success, failure, or interrupt.
- Added direct cross-version replay: the packed 0.48 consumer imports the checked-in input and emits the unchanged 0.35 canonical result; published `@mdxeditor/editor@4.0.4` then imports that output with all 22 legacy Lexical packages overridden and asserted at exactly 0.35.0, and re-exports the same canonical document with every construct anchor present.
- Validation passed: `npm run test:lexical-versions`; `npm run lint`; `npm run typecheck`; `npm run test:once` (50 passed, 1 skipped, 1 todo); all 18 browser scenarios across Chromium, Firefox, and WebKit (15 in the full run plus the corrected three-engine `CX-4a` classification); `npm run build`; combined `npm run test:package`; `npm run test:cross-version`; `npm run build:docs:api`; Node syntax checks for all package scripts; Prettier checks; and `git diff --check`.
- Existing non-failing warnings remain visible: stale Browserslist data, the legacy JSX transform warning, the known jsdom CodeMirror geometry exception log, Radix/Vite consumer bundle warnings, chunk-size warnings, npm configuration deprecations, and TypeDoc/API Extractor TypeScript-version warnings.
- Implementation is complete with no public API, peer, engine, editor-architecture, or feature-scope expansion. Independent PRP verification remains pending, so R2 stays `IN PROGRESS`; R3 and R4 remain blocked.

## Verification Record

### 2026-07-18 — Standard assurance

- **Verifier shape**: one fresh-context, read-only verifier independently performed consumer acceptance, PRP compliance, and engineering-quality passes. The main agent reproduced and fixed the verifier's one concrete finding; the same verifier then reran only the invalidated package/cross-version scenarios and cleanup checks.
- **Acceptance grades**:

  | Scenario | Grade | Direct evidence |
  |---|---|---|
  | `CX-1` | DIRECTLY VERIFIED | `npm run build` and the exact `npm run test:package` passed. Packed React 18.3.1 and 19.2.1 consumers with their pinned type packages, TypeScript 5.9.3, and Vite 5.2.8 installed, typechecked, bundled, served, rendered documented exports/styles, returned public-ref Markdown, and each asserted 24 Lexical packages at exactly 0.48.0. |
  | `CX-2` | DIRECTLY VERIFIED | The exact `npm run test:cross-version` passed. The packed 0.48 writer preserved the checked-in canonical fixture, and published `@mdxeditor/editor@4.0.4` with all 22 legacy Lexical packages pinned and asserted at 0.35.0 imported and re-exported it without losing any construct anchor. |
  | `CX-3` | DIRECTLY VERIFIED | `npm run test:browser` passed the root, nested JSX, table, decorator-boundary, focus, typing, deletion, undo, and redo journey in Chromium, Firefox, and WebKit with no page/console error or update recursion. |
  | `CX-4` | DIRECTLY VERIFIED | `npm run test:browser` passed all list, shortcut, link, URL-security, paste, cut/undo, and maximum-length journeys in all three engines: 18/18 tests. All eight exact URL vectors retained raw display, parsed Markdown, clipboard, and callback values; dangerous/obfuscated navigable hrefs were `about:blank`, while safe and relative hrefs were unchanged. DOM paste and intercepted `clipboard.writeText` remain the contract's explicitly accepted OS-clipboard proxies. |

- **Resolved finding**: the original exact package command failed before browser launch because `npm pack` inherited the ownership-conflicted default user cache even though disposable installs used a scratch cache. This contradicted the isolation/cleanup contract. `packCurrentPackage` now receives the already-created scratch cache and passes it through `npm pack --cache`; both package and cross-version callers use it. The main agent reproduced the original `EPERM`, and the independent verifier reran the exact documented `npm run test:package` and `npm run test:cross-version` without an environment override; both passed.
- **PRP compliance**: all ten direct Lexical dependencies remain present at `^0.48.0`; the installed graph is exclusively 0.48.0; React peers and Node `>=16` are unchanged. Resolver, code-block JSON, retained legacy thematic-break architecture, fail-closed preview URL channel, package consumers, rollback replay, CI, documentation, and cleanup behavior match Tasks 1-5. The recorded `src/mdastUtilHtmlComment.ts` compatibility adjustment is bounded by the scope-expansion rule. No R3-R5 feature, `@lexical/mdast`, NodeState, peer/engine, or public-method expansion was introduced.
- **Engineering review**: no unresolved correctness, security, error-handling, maintainability, or test-quality finding remains. The optional preview `href` field is source-compatible; raw link data is separated from navigation; process groups, browser pages, preview servers, allocated ports, temporary apps/caches, and tarballs have explicit terminal cleanup.
- **Fresh verification evidence**: structural validation passed with only the non-blocking executed-PRP size warning; `npm run test:lexical-versions`; `npm run lint`; `npm run typecheck`; `npm run test:once` (50 passed, 1 skipped, 1 todo); `npm run test:browser` (18 passed); `npm run build`; exact `npm run test:package`; exact `npm run test:cross-version`; `npm run build:docs:api`; Node syntax checks; Prettier checks; and `git diff --check`. Cleanup inspection found no R2 Chromium, Ladle, Vite-preview, or verification-script process, no listener on port 61000, and no package/cross-version scratch directory.
- **Limitations**: OS clipboard integration, mobile browsers, and exhaustive IME behavior remain outside the claimed surface. Existing non-failing toolchain/dependency warnings are unchanged and listed in the Execution Notes.
- **Result**: VERIFIED. R2 produces the stable Lexical 0.48 package/type/browser and rollback baseline; R3 and R4 are ready for just-in-time PRP generation.
