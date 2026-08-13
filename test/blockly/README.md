# Blockly code generation snapshots

Regression net for the Blockly editor. Every registered block is turned into JavaScript and
compared against a committed snapshot.

The point is **not** to assert that the generated code is good — it is to notice when it *changes*.
That is what makes the planned migration (vendored Blockly → `blockly@13` as ESM, block definitions
JS → TypeScript) verifiable: every step of it must leave these files untouched, and any diff is the
precise list of blocks whose output moved.

Blockly comes from `src-editor/node_modules/blockly` — the same package the editor bundles, so the
harness can never test a different version than the editor ships. The editor imports the ES modules
and copies the namespace onto `window.Blockly` (`blockly-plugins/bridge.ts`); jsdom gets the UMD
builds of that same package, whose script-tag branch performs exactly that assignment. One test
compares the two surfaces directly, so the difference cannot go unnoticed.

## Usage

```bash
npm run test:blockly           # check against the committed snapshots
npm run test:blockly:update    # regenerate them, then review the diff
```

`npm test` runs the check as well, since mocha picks up `test/testBlocklyGenerator.js`.

Regenerate only when a change to the generated code is intended. The diff is the review.

## Layout

| File | Role |
|------|------|
| `env.js` | Loads Blockly and the ioBroker blocks into jsdom. **The only file that knows *how* Blockly is loaded.** |
| `corpus.js` | Collects the test cases. Nothing is hand-written: every block already ships toolbox XML. |
| `snapshot.js` | Generates the code and groups it per source file. |
| `update.js` | Writes `golden/`. |
| `fixtures/*.xml` | Hand-written workspaces for cases the toolbox cannot reach (see below). |
| `golden/*.txt` | The committed snapshots, one per block source file. |

The grouping mirrors the block sources (`golden/action.txt` ← `own/blocks_action.js`), so converting
one file during the migration can only ever change that file's snapshot.

## Corpus

Four sources, in order of preference:

1. `Blockly.<Category>.blocks[type]` — the ioBroker categories (System, Action, Sendto, …)
2. the `#toolbox` element in `src-editor/index.html` — the standard categories
3. a bare `<block type="x"/>` for everything registered but in no toolbox
4. `fixtures/*.xml` — whole workspaces

The toolbox snippets are used because they are richer than a bare block: they carry the shadow
blocks and mutations a block is normally used with.

## Adding coverage

The toolbox only ever shows a block in its **default** state, so a branch behind a mutation or a
dropdown is invisible to sources 1–3. `fixtures/exec_with_statement.xml` exists because of exactly
that: the `exec` toolbox entry has `with_statement="false"`, so half of its generator was uncovered.

To cover such a branch, export the workspace from the editor and drop the XML into `fixtures/`.
No registration needed.

## What this harness reproduces

The editor's boot sequence has side effects the blocks depend on. `env.js` mirrors them:

- **globals** — `window.systemLang`, `window.MSG`, `window.main` (the object cache `field_oid.js`
  resolves state names through) and `window.scripts.blocklyWorkspace` (which `blocks_timeout.js` and
  `blocks_trigger.js` build their dropdowns from)
- **the generator registry migration** from `blockly-plugins/index.ts` — most ioBroker blocks still
  register as `Blockly.JavaScript.<type>` instead of `Blockly.JavaScript.forBlock.<type>`, and
  without that step the generator does not find them at all
- **`Blockly.Msg` is restored before every generation** — `blocks_system.js` and `blocks_trigger.js`
  permanently set `Blockly.Msg.VARIABLES_DEFAULT_NAME = 'value'`, so without a reset a block's
  output would depend on which blocks ran before it

## Converting a block file to TypeScript

See [blocks/README.md](../../src-editor/src/Components/blockly-plugins/blocks/README.md) for the
porting guide and the status of every file, and [BLOCKLY_TS.md](../../BLOCKLY_TS.md) for the same
topic from the point of view of an adapter that ships its own blocks.

The part that concerns this harness: if a block's snapshot reads `(no code)` or only shows its
trivial default, the corpus does not really exercise it. Write a fixture and capture the baseline
**before** converting, otherwise the conversion is unguarded. That is why
`fixtures/logic_switch_case_mutated.xml` exists: the toolbox entry of the switch block has neither a
mutation nor a condition, so its generator returned an empty string and the whole case loop was
uncovered.

## Known gaps

- Blocks provided by the npm field plugins (`comment`, `colour_*`, `text_multiline`) are listed but
  not generated. Their definition and generator come from `initBlockly()`, are already TypeScript,
  and are therefore not part of the JS → TS migration.
- Mutator containers and their items have no generator by design and are listed as such. They stay
  in the snapshot so that a block disappearing still shows up as a diff.
