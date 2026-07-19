# Spike 01: Can state positions replace multiple split-node matches in one update?

## Status

CONCLUSIVE

## Question

Can Lexical node-key/text-offset positions replace multiple non-overlapping matches, including a match split across differently formatted text nodes, in one reverse-order editor update without changing formatting outside the matches?

## Why It Blocks Planning

R4 requires `replaceAll` to stop replaying stale DOM `Range` objects through separate asynchronous updates. If node-key positions become stale during an earlier replacement in the same update, the PRP needs a different position model or multiple update/history operations.

## Hypotheses and Decision Rule

- If reverse-order replacements retain the lower match positions and preserve unmatched formatting, plan one Lexical update using state positions.
- If an earlier reverse replacement invalidates a remaining key/offset or changes unmatched formatting, require a different state model before PRP finalization.
- This headless spike does not decide the user-visible root/nested search scope or prove browser history grouping.

## Minimal Experiment

- **Environment and exact versions**: repository Node runtime; `lexical` and `@lexical/history` 0.48.0.
- **Setup**: a headless editor containing `alpha beta alpha KEEP`; the first `alpha` spans unformatted `al` and bold `pha`, while unmatched `KEEP` is bold.
- **Action**: build an ordered character-to-node-key/offset index in an editor-state read, find both `/alpha/gi` matches, then replace them with `X` from last to first inside one discrete update tagged `HISTORY_PUSH_TAG`.
- **Observation to capture**: replacement result, surviving node formats, stale-key errors, and whether headless history can establish a meaningful undo baseline.
- **Safety and side-effect constraints**: disposable script only under `/private/tmp`; no repository source or dependency changes.

## Evidence

- **Command**: `node /private/tmp/mdx-r4-state-replace-spike.mjs`.
- **Observed result**: both matches were replaced in one update, producing `X beta X KEEP`; no key became stale; the unmatched `KEEP` node remained bold. The replacement normalized the matched formatted span to the anchor's unformatted text, which is consistent with `RangeSelection.insertText` behavior and does not affect content outside the replacement.
- **History limitation**: the headless editor did not produce a useful undo stack (`undoDepth: 0`), so the real shared-history behavior remains a required rendered-browser exercise rather than a claim from this spike.

## Result

- **Outcome**: CONCLUSIVE.
- **Observed behavior**: reverse-order state positions are stable for multiple matches in one editor update, including a match spanning adjacent text nodes with different formats; unmatched formatting remains intact.
- **Decision**: R4 may use immutable match records containing editor identity plus start/end Lexical node keys and text offsets, apply `replaceAll` from last to first in one update for the selected editor, and project DOM `Range` objects only after reconciliation for the existing public hook/highlight surface.
- **Rejected alternatives**: retaining DOM `Range` objects as replacement authority; scheduling one editor update per match.
- **Representativeness limits**: browser DOM projection, shared-history undo/redo, nested/editor-scope policy, table/nested registration, invalid regex recovery, and live mutation invalidation still require direct implementation tests.

## Planning Impact

- **PRP tasks**: separate state match indexing/replacement from DOM-range projection; require one-update replace-all plus one-step browser undo evidence.
- **Consumer Contract**: no public hook shape change is needed; documented `Range` results can remain projections while state positions are authoritative.
- **Remaining uncertainty**: root-versus-active/nested search scope is a product-visible choice because the existing root DOM walk includes descendant nested editors, while a coherent one-update replace-all can target only one Lexical editor.

## Cleanup

- Disposable script removed after recording this result.
- Repository source and dependency state were not changed; only this research record was added.
