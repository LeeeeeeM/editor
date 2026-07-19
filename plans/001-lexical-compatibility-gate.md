---
repo: /Users/petyo/w/mdx-editor/editor
---

# PRP: Lexical Compatibility Contract and Browser Gate

## Goal

Create the version-independent compatibility surface required before MDXEditor moves from Lexical 0.35.0 to 0.48.0: deterministic Markdown fixtures, focused jsdom characterization, and a real-browser suite running in Chromium, Firefox, and WebKit through the public `MDXEditor` boundary. Integrate the browser gate into CI and record the untouched 0.35 behavior in checked-in expectations.

This PRP establishes evidence only. It must not update any Lexical package or fix behavior discovered during the later 0.48 migration.

## Why

- The existing 45 passing jsdom tests do not exercise the browser timing, DOM selection, nested-editor focus, clipboard, decorator, or history paths most exposed by the upgrade.
- R2 needs a repeatable 0.35 baseline so it can distinguish upstream behavior changes from MDXEditor regressions.
- Later selection, search, and composer/history PRPs need one shared browser runner rather than inventing separate harnesses.
- A checked-in canonical Markdown result makes the compatibility promise reviewable and reusable for cross-version comparisons.

## Success Criteria

- [x] `npm run test:compat` runs a focused public-boundary jsdom suite followed by Playwright in Chromium, Firefox, and WebKit, and passes on the unchanged Lexical 0.35.0 lockfile.
- [x] The compatibility fixture covers representative CommonMark, GFM, and MDX constructs with a checked-in canonical 0.35 export result.
- [x] Browser exercises directly cover root and nested editing, table/decorator boundaries, shared undo/redo, lists, links, Markdown shortcuts, DOM clipboard events, and maximum length.
- [x] CI installs the Playwright-matched browser binaries, runs all three browser projects with one worker, and retains trace/screenshot/video/report artifacts on failure.
- [x] Existing gates remain green, and contributor documentation covers browser installation, focused diagnosis, artifacts, and service ownership.

## Assurance

- **Profile**: Standard
- **Rationale**: The changes are test/tooling-only and reversible, but they define the regression contract for a public editor dependency migration and add three browser runtimes plus nested-editor interactions to CI. The observable scope is bounded and no persisted data, deployment migration, or security-policy change is involved.

## Roadmap Context

- **Parent roadmap**: `plans/roadmaps/001-lexical-048-adoption.md`
- **Roadmap step**: `R1` — establish the compatibility contract and browser gate on Lexical 0.35.0.
- **Satisfied dependencies**: None; repository baseline is commit `9373742` with Lexical 0.35.0 resolved and the existing gates passing.
- **Inherited decisions and invariants**: keep all direct Lexical packages lockstep at 0.35.0; use representative Chromium, Firefox, and WebKit; preserve public methods, plugins, visitors, and Markdown semantics; do not encode security-invalid behavior as compatibility; do not claim exhaustive device/IME coverage.
- **Contract produced for later steps**: child `CX-8` supplies one deterministic compatibility command and failure-local commands; inherited `CX-2`, `CX-3`, and `CX-4` gain executable 0.35 browser/jsdom evidence that R2-R5 can rerun.

## Consumer Contract

### Consumer and Public Boundary

- **Consumer(s)**: the R2 dependency-upgrade implementer/verifier first; later R3-R5 implementers also consume the same command and fixtures.
- **Public or supported boundary**: npm scripts `test:compat`, `test:compat:unit`, `test:browser`, and `test:browser:chromium`; the `MDXEditor` React component, its documented props/ref methods, documented plugins, rendered contenteditables, and toolbar controls exercised by the fixture.
- **Entry point and prerequisites**: run `npm ci`, then `npm exec playwright install --with-deps chromium firefox webkit` on a supported CI/Linux host or `npm exec playwright install chromium firefox webkit` locally; execute commands from the repository root on the lockfile's 0.35 baseline.
- **Current observable behavior**: lint, typecheck, and 45 jsdom tests pass, with 1 skipped and 1 todo; there is no browser-test command or CI browser job.
- **Observable promise**: an upgrade implementer can run one gate and determine whether representative public Markdown and interaction behavior still matches the recorded 0.35 baseline, with failures attributed to unit or browser/project phases.
- **Must remain compatible with**: the current npm/Ladle/Vite/Vitest workflow; the package's React 18/19 public contract; all direct Lexical packages resolving to 0.35.0 for this child.
- **Not claimed**: that Lexical 0.48 already passes; byte identity for non-canonical Markdown; OS-native clipboard integration; mobile browsers; every IME; correct partial-selection Markdown (owned by R3); security-invalid URL preservation.

### Acceptance Scenarios

`CX-2` through `CX-4` inherit the same IDs and promises from the parent roadmap. `CX-8` is this foundational child's downstream-consumer contract.

| ID | Given | When | Then | Exact exercise and prerequisites | Required evidence |
|---|---|---|---|---|---|
| `CX-8` | An R2 implementer has a fresh checkout at the recorded 0.35 lockfile with the matched Playwright browsers installed | They run `npm run test:compat` | The focused jsdom compatibility tests and all Chromium, Firefox, and WebKit projects finish successfully; a failure identifies its phase/project and preserves browser diagnostics | Run the composite command from the repository root; diagnose with `npm run test:compat:unit`, `npm run test:browser -- --project=<name>`, or `npm run test:browser -- --grep <title>` | DIRECT REQUIRED — the command and per-project result are the produced contract |
| `CX-2` | The deterministic fixture contains headings, formatting, quote, safe link/autolink, lists/tasks, table, thematic break, frontmatter, fenced code, admonition, and nested JSX | A consumer renders it, calls `getMarkdown()`, calls `setMarkdown()` with an alternate value, resets the original, and reloads the canonical export | Each supported construct remains editable and the observed Markdown equals the checked-in 0.35 canonical expectation after editor updates settle | Vitest renders public `MDXEditor`; each Playwright project opens `/?story=lexical-compatibility--compatibility&mode=preview` and uses the fixture's accessible get/set/reset controls | DIRECT REQUIRED — public component/ref behavior in jsdom and real browsers |
| `CX-3` | The browser fixture contains root text, a nested JSX editor, a table cell, and an adjacent thematic-break decorator with Undo/Redo controls | A user types in root, nested JSX, and the table; moves across the decorator boundary; then undoes and redoes the edits | Focused content changes exactly once, parent Markdown reflects the active nested edit, boundary deletion does not remove unrelated content, and undo/redo restores the observed Markdown sequence without recursion or page errors | Repeat in Chromium, Firefox, and WebKit using contenteditable interaction and accessible toolbar controls; collect browser console/page errors as test failures | DIRECT REQUIRED — browser focus, DOM selection, nested synchronization, and history are not represented by jsdom alone |
| `CX-4a` | The fixture has unordered, ordered, and task-list items | A user presses Enter at an item end, Backspace on the resulting empty item, indents/outdents one item, and toggles a task | Exported Markdown retains the intended sibling/nesting/check state and unrelated list content; undo restores the prior Markdown | In each Playwright browser project, open the compatibility fixture and exercise keyboard plus rendered checkbox/list controls | DIRECT REQUIRED |
| `CX-4b` | The fixture has a safe link plus an editable plain-text paragraph and a collapsed caret | A user creates and removes a safe link, types `# ` at an empty paragraph start, undoes the shortcut, and requests selection Markdown with the collapsed caret | Link text and safe URL serialize as expected, removing the link preserves text, the shortcut creates a heading and undo restores a paragraph, and collapsed selection Markdown is empty | Repeat in every project through the public toolbar/dialog, keyboard, and fixture's selection-export button | DIRECT REQUIRED; partial-selection correctness is deliberately not asserted |
| `CX-4c` | The page has the main editor and a separate labeled editor capped at 10 text characters | A browser paste event inserts plain text in the main editor, a cut is undone, and the user types beyond the capped editor's limit | Pasted text appears once, undo restores cut content, and the capped editor never exports more than 10 text characters | Dispatch a real DOM `ClipboardEvent` with `text/plain` data for the cross-browser paste path; use keyboard cut/undo; repeat in every project | DIRECT REQUIRED for MDXEditor handling; the synthetic DOM clipboard event is an explicit proxy for OS clipboard integration |

## Research Summary

### Vetted Repository Findings

- `package.json:16-27,47-55,71` — scripts have no browser runner and all direct Lexical packages resolve to 0.35.0 — **PRP impact**: add compatibility commands without touching Lexical declarations.
- `package.json:97-100,107,147-171` — React 18/19 are peers; Ladle/Vite/Vitest are dev tooling and the package engine is Node `>=16` — **PRP impact**: keep peer/engine fields and run browser tooling under CI Node LTS.
- `.ladle/config.mjs:1-4` — all `src/examples/*.tsx` files are auto-discovered — **PRP impact**: a thin `lexical-compatibility.tsx` export creates the deterministic browser route without another app/server.
- `vite.config.ts:70-74`, `src/test/setup.ts:1-5`, `src/test/core.test.tsx:31-36`, and `.github/workflows/ci.yml:13-40` — existing jsdom tests use the public-ref pattern and CI uses Node LTS — **PRP impact**: extend those patterns with focused characterization and an independent browser job.
- `src/MDXEditor.tsx:228-289` and `src/test/selection-markdown.test.tsx:9-36` — public ref methods exist, but selection tests cover only absent/empty selection — **PRP impact**: automate collapsed selection without reaching into the realm; partial correctness remains R3.
- `src/plugins/core/NestedLexicalEditor.tsx:215-280`, `src/examples/nested-jsx-elements.tsx:16-55,95-115`, and `src/examples/maxlength.tsx:1-6` — nested synchronization/history and maximum-length patterns exist — **PRP impact**: adapt them into direct browser characterization.
- `src/examples/_boilerplate.tsx:72-90` — `ALL_PLUGINS` includes network/backend content — **PRP impact**: create a local-only plugin list.

### External Constraints

- `@playwright/test 1.61.1` — every Playwright release requires its matching browser binaries; install through Playwright rather than system browsers — https://playwright.dev/docs/browsers
- Playwright Test projects — configure distinct Chromium, Firefox, and WebKit projects from one suite — https://playwright.dev/docs/test-projects
- Playwright `webServer` — it can own the Ladle command, wait on a URL, reuse a local server outside CI, and terminate it after the run — https://playwright.dev/docs/test-webserver
- Playwright CI — install browsers with `playwright install --with-deps`, prefer one worker in CI, and retain the HTML report/artifacts — https://playwright.dev/docs/ci

### Settled Decisions and Rejected Alternatives

- **Decision**: use exact `@playwright/test@1.61.1` and stock desktop projects — **Rationale**: first-party matched Chromium/Firefox/WebKit management meets the parent contract.
- **Decision**: reuse Ladle at `127.0.0.1:61000` via Playwright `webServer` — **Evidence/rationale**: the repository already maintains its rendering/plugin environment and discovers examples automatically.
- **Decision**: create one deterministic local-only harness — **Rationale**: examples include network/backend content and unstable demonstration selectors.
- **Decision**: check in fixture input and canonical 0.35 export strings in TypeScript — **Evidence/rationale**: Vitest and Ladle can share them, and exact output gives R2 a reviewable baseline.
- **Decision**: treat DOM `ClipboardEvent` paste as an explicit OS-clipboard proxy — **Rationale**: headless engines differ in OS permissions, while the event still exercises browser/Lexical handling.
- **Rejected**: a standalone Vite/React test application — **Reason**: duplicates configuration and adds a second long-lived host with no extra consumer evidence.
- **Rejected**: `ALL_PLUGINS`, site-demo, or wholesale `impex.test.tsx` reuse — **Reason**: network dependencies and stale skipped coverage are not a deterministic contract.
- **Rejected**: fixing partial selection, search, or composer behavior — **Reason**: those belong to R3-R5; R1 records valid 0.35 behavior only.

### Spike Evidence

- Local Ladle inspection on 2026-07-18 — **Question**: can the current host provide a deterministic direct story URL and be owned by a browser runner? — **Result/decision**: `npm run dev -- --host 127.0.0.1 --port 61000 --noWatch` became ready, Ladle generated IDs from filename/export names (for example `site-demo--basics`), and `mode=preview` removes navigation; use `/?story=lexical-compatibility--compatibility&mode=preview`. — **Limits**: no Playwright dependency/browsers are installed yet, so the future test suite itself remains to be implemented and verified.

### Validation Baseline

| Command | Status | Observed or expected result |
|---|---|---|
| `npm run lint` | Verified | Exit 0 on commit `9373742`. |
| `npm run typecheck` | Verified | Exit 0 on commit `9373742`. |
| `npm run test:once` | Verified | 45 passed, 1 skipped, 1 todo; known non-fatal React/CodeMirror/Radix warnings. |
| `npm run build` | Discovered but not run in R1 research | Existing CI command; final R1 validation must pass. |
| `npm run build:docs:api` | Discovered but not run in R1 research | Existing CI command; final R1 validation must pass. |
| `npm run dev -- --host 127.0.0.1 --port 61000 --noWatch` | Verified | Ladle reached ready state on the documented port; process was terminated after inspection. |
| `npm run test:browser` | Unavailable | No dependency, config, tests, or browser binaries exist; this PRP creates them. |

### Research Coverage

- **Depth**: Standard
- **Inspected**: package/lock versions, CI, Ladle/Vite/Vitest configuration, public methods, core Markdown tests, skipped import/export inventory, selection tests, nested editor and history patterns, maximum-length example, deterministic story routing, Playwright primary documentation.
- **Not inspected**: 0.48 implementation, mobile/IME/device farms, search, extension migration, or every example; these are later/out-of-scope surfaces.
- **Research confidence**: HIGH — the host, route convention, current public boundary, CI shape, and required browser tooling are directly evidenced; only reversible test implementation details remain.

## Execution Contract

- **Planned at commit**: `9373742`
- **Planning baseline**: source files are unchanged; `plans/` and `reports/` are pre-existing untracked user content and must be preserved. This PRP and its parent roadmap are the only planned edits within `plans/`.

### Expected Changes

- Runner/config: `package.json`, `package-lock.json`, `playwright.config.ts`, and `.gitignore` add exact Playwright tooling, scripts, projects, lifecycle, and local artifacts without changing Lexical or package engines.
- Fixture/unit: `src/test/fixtures/lexicalCompatibility.ts`, `LexicalCompatibilityHarness.tsx`, and `src/test/compatibility.test.tsx` add shared strings, local-only editors/plugins, and jsdom characterization.
- Browser: `src/examples/lexical-compatibility.tsx` and `tests/browser/lexical-compatibility.spec.ts` add the thin story and `CX-2`-`CX-4` exercises.
- Integration: `.github/workflows/ci.yml` and `CONTRIBUTING.md` add the CI job, prerequisites, diagnosis, lifecycle, and artifact documentation.

### Explicitly Out of Scope

- Any change to Lexical dependency versions, import paths, nodes, editor implementation, public methods, or production plugin behavior.
- Correct partial-selection serialization, Find/Replace, extension composer/history, or `@lexical/mdast`.
- React peer/Node engine changes or new malformed/unsafe URL promises.
- Visual/accessibility/performance certification, mobile/device farms, exhaustive IME testing, or making existing stories stable APIs.

### Scope Expansion Rule

Additional test/configuration files may be changed when necessary to satisfy the same compatibility scenarios without changing product code or the public contract. Record each added path and rationale in Execution Notes. Pause for user direction if evidence requires a production behavior change, a different browser platform, a public API/engine change, or splitting the compatibility contract into another roadmap step.

### Pause and Reassess If

- The 0.35 baseline is data-losing/security-invalid/contradicts docs, or a scenario requires private Lexical/Gurx/CSS-module details; do not bless that behavior.
- Playwright cannot reliably own Ladle/port 61000 or would require production configuration.
- Browser variance makes the observable Markdown/state promise inconsistent across Chromium, Firefox, and WebKit; capture the exact variance and request a classification decision rather than weakening the assertion.
- Playwright would require a package-engine/CI-platform change, or R1 would modify production behavior assigned to R2-R5.

## Context

### Key Files

- `plans/roadmaps/001-lexical-048-adoption.md` — parent outcomes, inherited `CX-2`-`CX-4`, scope, and R2 handoff.
- `package.json`, `.ladle/config.mjs`, `vite.ladle.config.ts`, and `vite.config.ts` — dependency/command baseline plus existing host and test configuration.
- `src/test/core.test.tsx` and `src/test/selection-markdown.test.tsx` — public-ref analogue and selection gap.
- `src/examples/nested-jsx-elements.tsx`, `src/examples/_boilerplate.tsx`, and `src/plugins/core/NestedLexicalEditor.tsx` — nested/history pattern, plugin inventory, and interaction risk surface.
- `.github/workflows/ci.yml` — SHA-pinned action and Node/npm convention.

### Gotchas

- Pin Playwright and install matching binaries; keep `127.0.0.1` consistent across host/config/tests.
- Ladle serves its shell for arbitrary paths, so each test must assert the story's ready marker, not only server readiness.
- Reuse an existing server only outside CI; Playwright must own cleanup and CI must fail on port collision.
- Wait on exported Markdown/state, never sleeps; scope multiple contenteditables to fixture wrappers.
- Avoid network content and HTML snapshots. Assert Markdown, focus containment, controls, and page/console errors.
- Normalize only line endings; retain the documented OS-clipboard proxy limitation.

## Implementation Blueprint

### Data Models

The fixture module exports named immutable strings: `compatibilityMarkdown`, `compatibilityMarkdown035`, and `alternateCompatibilityMarkdown`. `compatibilityMarkdown035` is the exact canonical output observed after the 0.35 editor settles, normalized only for line endings. The harness exposes labeled output regions for current Markdown and selection Markdown plus stable wrapper IDs for root, nested JSX, table, and capped editors.

### Tasks

```yaml
Task 1: Add the browser runner and deterministic lifecycle
  MODIFY package.json:
    - Add exact devDependency @playwright/test@1.61.1; update package-lock.json through npm.
    - Add test:compat:unit, test:browser:serve, test:browser, test:browser:chromium, and composite test:compat scripts.
    - Make test:compat run unit characterization first and browser tests second so the failing phase is visible.
    - Do not alter Lexical declarations, React peers, or engines.
  CREATE playwright.config.ts:
    - Set testDir to tests/browser and baseURL to http://127.0.0.1:61000.
    - Define chromium, firefox, and webkit projects with Playwright desktop device defaults.
    - Use one worker in CI, zero retries, a line reporter plus non-opening HTML report, and retain trace/video/screenshot on failure.
    - Own `npm run test:browser:serve` through webServer; wait on the direct compatibility URL; reuse only outside CI; allow 120 seconds for readiness; terminate with SIGTERM and a bounded grace period.
  MODIFY .gitignore:
    - Ignore playwright-report/, test-results/, and any configured local blob-report directory.
  PATTERN: package.json:16-27; .ladle/config.mjs:1-4; Playwright webServer/projects references.
  ENABLES: CX-8
  VERIFY:
    - COMMAND: npm ls lexical @lexical/react @lexical/markdown @playwright/test
    - EXPECTED: Lexical entries remain 0.35.0 and @playwright/test resolves exactly 1.61.1.
    - COMMAND: npm run test:browser -- --list
    - EXPECTED: Tests are collected once for each of chromium, firefox, and webkit without starting an orphan server.
    - PROCESS-LIFECYCLE: Playwright prints host/test progress; exit 0 is success, any test/server failure is nonzero; Playwright owns the Ladle process group and port 61000, retains configured diagnostics, and terminates the host on success, failure, or interrupt.

Task 2: Define the shared 0.35 fixture and jsdom characterization
  CREATE src/test/fixtures/lexicalCompatibility.ts:
    - Export deterministic representative source, alternate, and observed canonical 0.35 Markdown strings.
    - Cover only locally renderable CommonMark/GFM/MDX constructs named by CX-2; include stable text anchors for browser locators.
  CREATE src/test/fixtures/LexicalCompatibilityHarness.tsx:
    - Build a local-only plugin list for headings, quote, lists/tasks, links/dialog, table, thematic break, frontmatter, fenced code, admonition, JSX Grid, Markdown shortcuts, and a minimal Undo/Redo toolbar.
    - Adapt the Grid descriptor/NestedLexicalEditor pattern from nested-jsx-elements.tsx and label its wrapper.
    - Render the primary editor plus a separate maxLengthPlugin(10) probe; expose accessible Get Markdown, Get Selection Markdown, Set Alternate, and Reset controls and labeled outputs using public refs.
    - Add fixture-scoped data-testid wrappers only where roles/labels cannot distinguish contenteditables.
    - Surface onChange/current output without exposing Lexical or realm internals.
  CREATE src/test/compatibility.test.tsx:
    - Verify initial canonical export, set/reset behavior after observable updates, supported construct anchors, and empty collapsed selection through public methods.
    - Use Testing Library/act semantics and existing setup cleanup; do not use fixed timers or full DOM snapshots.
  PATTERN: src/test/core.test.tsx:31-36; src/examples/nested-jsx-elements.tsx:16-55,95-115; src/examples/maxlength.tsx:1-6.
  ENABLES: CX-2, CX-4b, CX-8
  VERIFY:
    - COMMAND: npm run test:compat:unit
    - EXPECTED: Focused compatibility tests pass on the exact 0.35 canonical expectation with no unhandled React errors.

Task 3: Expose the compatibility story and implement direct browser evidence
  CREATE src/examples/lexical-compatibility.tsx:
    - Export `Compatibility` as a thin render of LexicalCompatibilityHarness.
    - Add a visible heading/ready marker so tests prove the requested story loaded, not merely Ladle's SPA shell.
  CREATE tests/browser/lexical-compatibility.spec.ts:
    - Navigate every test to /?story=lexical-compatibility--compatibility&mode=preview and assert the ready marker.
    - Register pageerror and unexpected console.error listeners that fail the test while allowing an explicit, minimal list of already-vetted benign warnings only if still unavoidable.
    - Implement separate titled tests for CX-2, CX-3, CX-4a, CX-4b, and CX-4c so --grep isolates each behavior.
    - Assert Markdown outputs and focus containment after observable state changes; never sleep or inspect Lexical/Gurx internals.
    - For CX-3, capture the exported Markdown sequence after root, nested, and table edits, boundary action, undo, and redo; assert each intended transition exactly once.
    - For CX-4c, construct a text/plain DataTransfer/ClipboardEvent in the page for paste, label the test as the DOM-event proxy, and use keyboard cut/undo separately.
  PATTERN: .ladle/config.mjs:1-4; src/examples/nested-jsx-elements.tsx; tests use Playwright role/label/test-id locator guidance.
  ENABLES: CX-2, CX-3, CX-4a, CX-4b, CX-4c, CX-8
  VERIFY:
    - COMMAND: npm run test:browser:chromium
    - EXPECTED: All compatibility test titles pass in Chromium and Ladle exits, leaving port 61000 free.
    - COMMAND: npm run test:browser -- --project=firefox
    - EXPECTED: The same tests pass in Firefox.
    - COMMAND: npm run test:browser -- --project=webkit
    - EXPECTED: The same tests pass in WebKit.
    - PROCESS-LIFECYCLE: The line reporter and piped Ladle output show progress; exit 0 after all selected tests is success, any assertion/page/server error is failure; Playwright closes pages/contexts, stops Ladle, and owns artifacts and port cleanup.

Task 4: Put the browser contract in CI
  MODIFY .github/workflows/ci.yml:
    - Add an independent Browser compatibility job following the repository's SHA-pinned checkout/setup-node conventions and Node lts/*.
    - Run npm ci, npm exec playwright install --with-deps chromium firefox webkit, then npm run test:browser with CI workers fixed at one.
    - Set a bounded job timeout that includes browser installation and tests.
    - Upload playwright-report and test-results when the test step fails or the job is not cancelled; use the repository's pinned-action convention and do not grant write permissions.
  PATTERN: .github/workflows/ci.yml:13-40; https://playwright.dev/docs/ci.
  ENABLES: CX-8
  VERIFY:
    - COMMAND: npm run test:browser
    - EXPECTED: Local equivalent of the CI test phase passes all three projects; workflow syntax remains valid under repository lint/tooling.
    - FAILURE-LOCAL: Browser installation: npm exec playwright install chromium firefox webkit; suite: npm run test:browser -- --project=<name>; scenario: npm run test:browser -- --project=<name> --grep <title>.
    - PROCESS-LIFECYCLE: GitHub's step logs show install and line-reporter progress; nonzero install/test status fails the job; Playwright stops Ladle and the ephemeral runner cleans browser processes/files after success, failure, cancellation, or timeout.

Task 5: Document and run the integrated handoff gate
  MODIFY CONTRIBUTING.md:
    - Document one-time local browser installation, test:compat, focused unit/browser/project/grep commands, port 61000 ownership, and failure artifact paths.
    - State that DOM ClipboardEvent coverage is not OS clipboard certification and that mobile/every-IME coverage is outside this gate.
  PATTERN: CONTRIBUTING.md:19-37.
  ENABLES: CX-8
  VERIFY:
    - COMMAND: npm run test:compat
    - EXPECTED: Focused jsdom characterization and every browser project pass on Lexical 0.35.0; the command returns 0 and no Ladle process retains port 61000.
    - FAILURE-LOCAL: Unit phase: npm run test:compat:unit; browser phase: npm run test:browser; project phase: npm run test:browser -- --project=<name>; scenario phase: add --grep <title>.
    - PROCESS-LIFECYCLE: npm exposes each child command's progress and returns the first nonzero phase; Vitest owns jsdom cleanup, Playwright owns browsers/Ladle/port/artifacts, and no manual cleanup is required after either terminal state.
```

## Validation

```bash
  # Dependency/baseline identity
npm ls lexical @lexical/react @lexical/markdown @playwright/test

  # Static and existing test gates
npm run lint
npm run typecheck
npm run test:once

  # New focused and integrated compatibility gates
npm run test:compat:unit
npm run test:browser -- --project=chromium
npm run test:browser -- --project=firefox
npm run test:browser -- --project=webkit
npm run test:compat

  # Existing production/declaration gates
npm run build
npm run build:docs:api

  # Planning/patch hygiene during implementation handoff
git diff --check
```

`npm run test:compat` is the clean integrated `CX-8` gate. Use the focused commands above for failure localization without replaying passing browser projects. After each browser command, confirm the command has returned and a subsequent focused run can bind port 61000; Playwright owns explicit service cleanup.

The `CX-N` table is authoritative. DOM/state helper assertions may support scenarios, but they do not replace the public `MDXEditor` ref, rendered contenteditable, toolbar/dialog, and exported-Markdown observations required there.

## Unknowns & Risks

- The exact canonical 0.35 output must be captured from the implemented full plugin set; the fixture source is designed to be canonical, but execution must check in the observed result rather than assume byte identity.
- Some browser keyboard behavior differs by platform. Tests must use Playwright's `ControlOrMeta` where appropriate and assert exported behavior, not platform-specific key labels.
- WebKit/Firefox may expose different contenteditable focus descendants. Assert containment within the labeled editor boundary rather than exact active-element tag structure.
- DOM clipboard construction support could vary. If one project cannot construct a standards-shaped `ClipboardEvent`/`DataTransfer`, this is a Pause and Reassess condition; do not silently skip the project or substitute an internal command.
- Strict failure on every console error can surface existing third-party development warnings. Any allowlist must be exact, justified in the test, and must not include Lexical invariant/update-recursion errors.
- Three browser projects increase CI time. Keep one deterministic fixture and scenario-focused tests; do not add sharding or retries until measured evidence justifies them.

**Confidence: 9/10** for one-pass implementation success. The remaining uncertainty is browser-specific interaction detail inside the intentionally bounded suite, not architecture or public behavior.

## Execution Notes

### 2026-07-18 — implementation handoff

- Implemented the planned test/tooling surface without changing production editor code, public APIs, package engines, or any Lexical declaration/resolution. `@playwright/test` is pinned to `1.61.1`; every inspected Lexical package still resolves to `0.35.0`.
- Added the shared fixture, public-ref harness, focused jsdom characterization, thin Ladle story, and five titled Playwright scenarios. The observed 0.35 canonical export uses `*` for unordered/task lists, `*text*` for emphasis, and `***` for the thematic break; those spellings are recorded explicitly rather than normalized away.
- Added two fixture-only plain paragraphs: `Link candidate text.` gives link creation/removal and cut/undo a deterministic unformatted selection target, while `Decorator boundary paragraph.` makes the thematic-break boundary action directly observable. These do not expand the product contract.
- Firefox constructs `ClipboardEvent` and `DataTransfer` but replaces initializer-provided `clipboardData` with an empty object. The browser test now detects that exact condition and defines the same real `DataTransfer` on the real DOM event before dispatch; it rechecks `text/plain`, never calls a Lexical command, and remains explicitly documented as an OS-clipboard proxy.
- Added an independent SHA-pinned CI job with Node LTS, matched browser installation, one CI worker, a bounded timeout, and failure artifact upload. Contributor docs record Node 18+ for browser tooling while leaving the library's published engine unchanged, plus focused commands, port ownership, artifacts, and coverage limits.
- Validation passed: dependency identity; `npm run lint`; `npm run typecheck`; `npm run test:once` (48 passed, 1 skipped, 1 todo); focused Chromium, Firefox, and WebKit projects (5 each); `npm run test:compat` (3 focused jsdom and 15 browser tests); `npm run build`; `npm run build:docs:api`; Prettier check; workflow YAML parse; and `git diff --check`. Port `61000` had no listener and no Ladle/Playwright test process remained after the integrated run.
- Existing non-failing warnings remain visible: stale Browserslist data, the legacy JSX transform warning, the known jsdom CodeMirror geometry exception log, and TypeDoc/API Extractor TypeScript-version warnings. No warning was added to a browser console-error allowlist; browser page errors and every `console.error` still fail the scenarios.
- Implementation is complete; independent PRP verification and an actual GitHub Actions run remain pending. R1 therefore stays `IN PROGRESS`, and R2 remains blocked.

## Verification Record

### 2026-07-18 — Standard assurance

- **Verifier shape**: one fresh-context, read-only verifier independently reviewed the acceptance evidence, PRP compliance, and engineering quality. The main verifier reproduced and resolved every reported evidence gap, reran the affected scenarios, and requested a targeted fresh-context follow-up audit.
- **Acceptance grades**:

  | Scenario | Grade | Direct evidence |
  |---|---|---|
  | `CX-8` | DIRECTLY VERIFIED | `npm run test:compat` passed 3 focused jsdom tests and all 15 Playwright tests across Chromium, Firefox, and WebKit, with phase/project-local output and retained diagnostics on failure. |
  | `CX-2` | DIRECTLY VERIFIED | The public fixture rendered and round-tripped the canonical Markdown, exercised get/set/reset and code editing, typed a plain URL, observed the rendered autolink, and verified its exported Markdown in all three engines. |
  | `CX-3` | DIRECTLY VERIFIED | Public contenteditable interactions and the shared Undo/Redo toolbar restored root, nested JSX, table, and decorator-boundary states, with exact text/Markdown observations and no page or console errors in all three engines. |
  | `CX-4a` | DIRECTLY VERIFIED | The suite observes the intermediate Tab indent, Shift+Tab restoration, Enter-created list item, Backspace merge, final list structure, task toggle, and task undo in all three engines. |
  | `CX-4b` | DIRECTLY VERIFIED | Safe-link creation/removal, `# ` heading creation, undo back to a paragraph, the canonical escaped `\\# Shortcut paragraph` export, and empty collapsed-selection export passed in all three engines. |
  | `CX-4c` | DIRECTLY VERIFIED | Cut/undo, single DOM `ClipboardEvent` paste handling, and the exact 10-character cap passed in all three engines. The synthetic event remains the explicitly accepted proxy for OS clipboard integration. |

- **Fresh verification evidence**: `npm run test:browser -- --grep 'CX-2|CX-3|CX-4a|CX-4b'` passed 12/12; the final source-of-truth `npm run test:compat` passed 3/3 jsdom and 15/15 browser tests; `npm run lint`, `npm run typecheck`, and `git diff --check` returned zero. Execution evidence for dependency identity, the full existing test suite, builds, API docs, workflow parsing, formatting, and process/port cleanup remains valid because the verification fixes touched only the browser scenario file.
- **Resolved findings**: added a true typed-URL autolink journey; exercised shared toolbar history independently in root, nested, table, and decorator contexts; added positive intermediate list assertions; and proved that shortcut undo restores a paragraph. The follow-up verifier graded all four closures directly verified and found no remaining targeted issue.
- **Environment incident**: the verifier's first browser launch ran inside the restricted macOS Codex sandbox and generated four OS diagnostic reports. Chromium failed at `MachPortRendezvousServer` with permission denied, while Firefox/WebKit aborted during application startup. The same command outside that sandbox passed; subsequent outside-sandbox runs produced no new crash reports. This was a browser-process launch restriction, not an MDXEditor page crash.
- **Result**: VERIFIED. R1's 0.35 compatibility contract is ready for consumption, and parent roadmap R2 may move to `READY FOR PRP`.
