# Celestial — Claude notes

Celestial is a card game: Phaser 3 client (`client/`), Node websocket server
(`server/`), shared game logic (`shared/`).

## How Kai wants Claude to work

- **Comments are succinct one-liners.** Never leave multi-line hedging or
  disclaimer comments in code ("NOTE this might break if..."). If code looks
  buggy: fix it, or ask Kai — a comment is not the place to park uncertainty.
- **Don't leave workarounds in call sites.** If a caller has to fight an API
  (e.g. manually re-wiring interactivity), that's a bug in the API — fix it at
  the source so the workaround can be deleted.

## Code audits

An "audit" is what a senior software engineer does when assessing a file: read
it critically and judge its quality, don't run a mechanical checklist.

- **Bugs**: review the logic for real defects — race conditions, leaks, state
  that doesn't reset, edge cases, subtly wrong math or timing
- **Organization**: is the file the right size and shape? A file may need to be
  broken up, a class split, responsibilities moved elsewhere, or duplicated
  logic unified — or it may be fine as it is
- **Clarity**: can a newcomer follow it? Naming, dead code, comments that
  contradict the code, config that's hard to tweak
- Style rules (e.g. UPPER_CASE constants, config dicts per element) are
  situational — apply them where they help, not everywhere by default. Some
  files are better without them.
- Findings that change behavior get proposed to Kai first, not silently fixed
- Verify refactors with `npx tsc --noEmit` from `client/` (expect pre-existing
  errors from node_modules types only)

### Audited

| File | Date | Notes |
| --- | --- | --- |
| `client/src/scene/matchRegions/roundResultRegion.ts` | 2026-07-15 | Full audit: FadeGroup type + shared fadeInGroups helper, per-sunbeam/leaf/gust config dicts, dead fadeLoopGroups removed, IMG_WIDTH/HEIGHT named, sound bug fixed (played once per group instead of once per cycle) |
| `client/src/scene/baseScene.ts` | 2026-07-15 | Spot fix only, not a full audit: playSound now no-ops while the tab is hidden (queued sounds all fired at once on refocus) |
| `client/src/lib/cardImage.ts` | 2026-07-15 | Full audit, all findings fixed: dead FullSizeCardImage removed; interactivity API (setOnClick enables the subject's input; text/stat elements interactive only on interactive cards; storeScene workaround deleted); setCard no longer draws a title over a cardback and clears stale tint/glow/cost; destroy() kills tweens on its objects |

### Next up (proposed order)

1. `client/src/scene/matchRegions/matchResults.ts` — 749 lines, sibling of the
   just-audited roundResultRegion; likely shares animation patterns that should
   align with the new toast structure
2. `client/src/scene/matchRegions/animator.ts` — 646 lines, high churn, heart
   of match animation
3. `client/src/scene/matchScene.ts` — 741 lines, hub that wires all match
   regions together
4. `server/src/network/websocketServer.ts` — 1209 lines, biggest file in the
   repo and high churn; server-side so audit separately from client passes

Skipped on purpose: `client/src/loader/assetLists.ts` (highest churn but pure
data lists — little structure to audit).
