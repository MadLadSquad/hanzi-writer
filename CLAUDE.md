# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Hanzi Writer is a dependency-free TypeScript library for Chinese character stroke-order animations and stroke-order quizzes. This checkout is a fork of `chanind/hanzi-writer`; every push to `master` publishes `dist/hanzi-writer.min.js` to a Cloudflare R2 bucket (`.github/workflows/publish-r2.yml`), and that workflow only publishes if typecheck, lint, tests and build all pass.

## Commands

Uses yarn (`yarn.lock`).

```sh
yarn install
yarn test                                   # jest (jsdom), coverage is always on
yarn test src/__tests__/Quiz-test.ts        # single file
yarn test -t "some test name"               # single test by name
yarn test -u                                # update snapshots (src/**/__snapshots__)
yarn typecheck                              # tsc --noEmit
yarn lint-test                              # eslint src  (yarn lint-fix to autofix)
yarn prettier                               # format src (single quotes, width 90, trailing commas)
yarn build                                  # rollup -> dist/ (cjs, esm, iife, minified iife, .d.ts)
```

Manual testing: `demo/index.html` loads `../dist/hanzi-writer.js`, so run `yarn build` first, then open it in a browser.

## Architecture

**Entry point:** `src/HanziWriter.ts` is the public API and the rollup input. It picks a renderer (`svg` default, or `canvas`, or a user `rendererOverride`), creates a render target, and loads character data via `LoadingManager` (default loader fetches JSON from the `hanzi-writer-data` jsDelivr CDN; tests use the `hanzi-writer-data` dev dependency directly). Most public methods go through `_withData()`, which waits for the character to finish loading. Public types are re-exported from `src/typings/types.ts`.

**State + mutations (the core pattern):**
- `RenderState` holds a single immutable `RenderStateObject` (options/colors, `character.{main,outline,highlight}` per-stroke opacity/displayPortion, and `userStrokes`). `updateState()` deep-merges a partial change and fires `onStateChange(next, prev)`, which `HanziWriter` wires to the renderer's `render(state)`.
- All changes are expressed as `Mutation`s (`src/Mutation.ts`): a dotted **scope** string (e.g. `character.main.strokes.3`) plus target values, optionally tweened over a duration via requestAnimationFrame. `Mutation.Delay` is a pausable timeout.
- `RenderState.run(mutations)` runs a chain sequentially and returns a promise resolving `{ canceled }`. Starting a chain **cancels any running chain whose scopes overlap** (prefix match on the dotted path; `''` matches everything). Mutations with `force: true` jump to their end values when canceled. This scope rule is how animations, quizzes and color changes avoid fighting each other.
- `characterActions.ts` and `quizActions.ts` are pure builders that return `GenericMutation[]`; behavior changes usually belong there rather than in the renderers.

**Rendering:** `src/renderers/{svg,canvas}` each export `{ HanziWriterRenderer, createRenderTarget }`. Renderers are stateless with respect to animation: they just draw whatever `RenderStateObject` they are handed. Character paths live in a 1024-unit coordinate space with the y-axis flipped; `Positioner` maps between that and screen pixels (`convertExternalPoint`).

**Input:** `RenderTargetBase` turns Pointer Events into pointer start/move/end callbacks (single active pointer for palm rejection, coalesced samples, pressure, timestamps, cancel vs. lift). `HanziWriter._setupListeners` forwards these to `Quiz`. Optional `BoundEvent` methods exist so custom render targets don't have to implement them.

**Quiz flow:** `Quiz` accumulates points into a `models/UserStroke`, then on stroke end calls `strokeMatches` (cosine similarity, start/end distance, Fréchet distance against the expected `Stroke`, scaled by `leniency`) and runs the matching `quizActions`. With `variableDrawingWidth`, `userStrokeWidth.ts` computes a per-point width scale from stylus pressure and drawing speed; these `widthScales` are stored alongside the points in `userStrokes` and must stay index-aligned with them.

## Testing notes

- `jest-setup.js` enables `jest-fetch-mock` and installs `@sinonjs/fake-timers` as a global `clock` (`shouldAdvanceTime`), so tests advance time with `clock.tick(ms)`; `src/testUtils.ts` `resolvePromises()` flushes pending microtasks between ticks.
- `jest-jsdom-env.js` exposes the jsdom instance as a global `jsdom` so tests can manipulate it; canvas is provided by `jest-canvas-mock`.
- Use `performanceNow()` / `requestAnimationFrame` from `src/utils.ts` rather than the globals, so timing stays consistent with the fake clock.

## Constraints

- Output targets ES2022 with no transpiling for old browsers (the `target` in `tsconfig.json`, compiled by `@rollup/plugin-typescript`; `rollup-plugin-dts` bundles the `.d.ts`); quiz drawing relies on Pointer Events. Don't add polyfills or legacy-browser workarounds.
- The library has no runtime dependencies; keep it that way.
- `typescript` stays on 6.x until `typescript-eslint` supports TypeScript 7 (it needs the classic JS compiler API, which TS 7 does not ship). The source already typechecks under TS 7.
- Jest runs on Babel 8 through the direct `babel-jest` dev dependency (`jest.transform` in `package.json`). Jest's own nested copy uses Babel 7, so don't remove either.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
