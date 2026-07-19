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
| `client/src/lib/cardImage.ts` | 2026-07-15 | Full audit, all findings fixed: dead FullSizeCardImage removed; interactivity API (setOnClick enables the subject's input; text/stat elements interactive only on interactive cards; storeScene workaround deleted); setCard no longer draws a title over a cardback and clears stale tint/glow/cost; destroy() kills tweens on its objects; moveToTopOnHover keeps its intended reversal (cards right of the hovered one flip so the nearest is on top) but now snapshots/restores the order via parent data with an owner check, so interleaved enter/exit between cards can't scramble the hand |
| `client/src/scene/matchRegions/matchResults.ts` | 2026-07-19 | Full audit: mid-file imports moved to top, dead footerButtons field removed, ResultsRegionTutorial.missionID is now a constructor param; unlock cardback now enabled via setOnClick in the scale-in tween's onComplete (internals-poking deleted, clicks genuinely gated until scale-in ends); scrollablePanel field renamed contentSizer |
| `client/src/scene/matchRegions/animator.ts` | 2026-07-19 | Full audit: unreachable return in getSound removed, dead Deck/Discard husks in getCard collapsed to default, createCard gained a shadow param (transform no longer pokes imageShadow), missing state/owner types added, "TODO what" resolved. Shuffle slide distances named as visually-tuned constants (bottom deliberately uses cardHeight/2); stale bug-claim TODO in getCard Zone.Story removed — story.cards holds only unresolved acts, so index2 aligns |

| `client/src/scene/matchScene.ts` | 2026-07-19 | Full audit: dead ws field + ClientWS import removed, dead restart() methods deleted (here and journeyMatchScene — Play Again uses ScenePlugin restart), params typed via exported MatchSceneParams interface, three signalOpponent* methods collapsed to signalOpponentEvent(s), View.scene typed MatchScene, stale "delete it" comment fixed (states stay buffered for recap rewind), dead commented region lines removed |

| `server/src/network/websocketServer.ts` | 2026-07-19 | Full audit. Fixed: claimMissionRewards now row-locks (double-claim coin race, same pattern as purchaseItem); deck-name logging no longer throws on invalid card ids; TypedWebSocket dispatch (shared) contains handler throws/rejections so a crafted message can't crash the server process; ActiveGame class→interface. Known/left: guest sign-in trusts uuid by design (provider-account gate holds), sendInitialUserData trusts inventory/missions (existing TODO), setCosmeticSet ownership unvalidated (existing TODO), initPvp queue race (existing TODO). Pre-existing server tsc errors throughout db/ + websocketServer (drizzle insert/update types collapse — likely the old TypeScript version, drizzle needs a newer one) and pveSpecialMatch.ts ctor arity — none from this audit |

### Next up (proposed order)

(queue empty — client lib/utils/scenes/menus and matchRegions queue complete;
server matches (match.ts, pvpMatch.ts) are the natural next candidates)

Skipped on purpose: `client/src/loader/assetLists.ts` (highest churn but pure
data lists — little structure to audit).
