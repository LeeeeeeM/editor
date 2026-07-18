# Spike 02: Can a Commit-Phase Realm Session Own Extension Editors in Strict Mode?

## Status

CONCLUSIVE

## Question

Can R5 preserve plugin `init`/`postInit` ordering while ensuring Strict Mode never leaks a render-discarded editor or reuses an editor disposed by effect replay?

## Why It Blocks Planning

`RealmWithPlugins` currently constructs the realm and runs plugins in `useMemo`; extension editors add an explicit `dispose()` obligation. Creating them in render or disposing an editor from a replayed child effect would make lifecycle correctness ambiguous.

## Hypothesis and Decision Rule

Create a fresh realm session in a commit-phase effect, run every `init` and then every `postInit`, register the root editor with a private session disposer, and expose children only after setup. Each effect setup must own a distinct editor and each cleanup must dispose that editor exactly once. If Strict Mode reuses a disposed session or leaks either setup, replan R5.

## Minimal Experiment

- Render a session owner under React 19 Strict Mode in jsdom.
- In its effect, create a numbered realm/editor, run simulated init/post-init, publish the session, and return an exactly-once disposer.
- Record session setup, disposal, descendant plugin mount/cleanup, the visible session, and final disposal count across replay and unmount.

## Evidence

The scratch script reported this order:

```text
realm-init:1
root-post-init:1
realm-cleanup:1
dispose:1
realm-init:2
root-post-init:2
child-mount:2
child-cleanup:2:false
child-mount:2
visible:session-2
realm-cleanup:2
dispose:2
child-cleanup:2:true
disposed-count:2
```

The replay-only session never rendered children, the live session was not disposed during descendant effect replay, and both created editors were disposed once. On final unmount the session owner disposes before descendant passive cleanup, so focused tests must prove consumer unregister callbacks remain safe after editor disposal.

## Result

- **Outcome**: CONCLUSIVE.
- **Decision**: move realm/plugin initialization out of render into a commit-phase session owner; retain the all-init-then-all-post-init order; use a private cleanup registry rather than adding a public `RealmPlugin` cleanup callback; effect-create nested/table editors with the same one-setup/one-dispose ownership.
- **Consumer boundary**: a public plugin still initializes once per realm. Strict Mode may create an abandoned replay realm, as it already can, but only React composer-child mount/cleanup counters are asserted because `RealmPlugin` exposes no cleanup callback.
- **Required execution evidence**: actual extension-editor unregister-after-dispose safety, fresh public refs/editor identities, no duplicate listeners, and no runtime errors in focused tests and all three browsers.

## Cleanup

The scratch script in `/private/tmp/mdx-r5-strict-session-spike.mjs` was deleted. No dependency, port, browser, or service state changed.
