# Porting this adapter's own block definitions to TypeScript

The ioBroker block definitions used to be classic `<script>` files under
`src-editor/public/google-blockly/own/`, written against a global `Blockly` object. They were
moved to bundled TypeScript modules under `src-editor/src/Components/blockly-plugins/blocks/`.

Converted and not yet converted files run side by side — a file can be ported at any time, on its
own, in its own pull request.

## Status

`blocks/order.json` is the authoritative list. It defines both **the order the files run in** and
**which of them are already TypeScript** — `bridge.ts` and the test harness read the same file, so
they cannot disagree.

| # | File | Lines | State |
|---|------|------:|-------|
| 1 | `blocks_words` | 708 | **module** |
| 2 | `blocks_procedures` | 686 | **module** |
| 3 | `blocks_logic` | 459 | **module** |
| 4 | `blocks_switch` | 257 | **module** |
| 5 | `blocks_text` | 104 | **module** |
| 6 | `blocks_number` | 30 | **module** |
| 7 | `field_oid` | 642 | **module** |
| 8 | `field_cron` | 158 | **module** |
| 9 | `field_script` | 159 | **module** |
| 10 | `blocks_system` | 1409 | **module** |
| 11 | `blocks_action` | 765 | **module** |
| 12 | `blocks_sendto` | 702 | **module** |
| 13 | `blocks_time` | 639 | **module** |
| 14 | `blocks_convert` | 480 | **module** |
| 15 | `blocks_trigger` | 1791 | **module** |
| 16 | `blocks_timeout` | 551 | **module** |
| 17 | `blocks_object` | 402 | **module** |

**All 17 files, all 9943 lines.** `public/google-blockly/own/` now only holds the ioBroker word files.

## Why this order does not matter

A converted module exports `install()` and registers **inside** that function, never at import time.
`bridge.ts` walks `order.json` and either calls `install()` or loads the legacy script, so the
execution order stays exactly what it always was, whatever is converted. If modules registered at
import time, they would all run before every legacy file and the order would silently change.

## Recipe

### 1. Check the coverage first

```bash
cat test/blockly/golden/<group>.txt
```

If a block reads `(no code)` or only shows its trivial default, the snapshot is not really guarding
it. Write a fixture, and **capture the baseline while the legacy file is still in place**:

```bash
# test/blockly/fixtures/<name>.xml  – export the workspace from the editor, or write the XML
npm run test:blockly:update
git diff test/blockly/golden          # this is the behaviour you must preserve
```

This is not optional busywork. `blocks_switch.js` generated an empty string from its toolbox entry —
converting its 257 lines without a fixture first would have been unguarded. Mutators and dropdown
options are the usual blind spots: the toolbox only ever shows a block in its default state.

### 2. Write the module

`blocks/<id>.ts`, exporting `install()`:

```ts
import { Blocks, FieldDropdown, type Block } from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';

export function install(): void {
    const translate = window.Blockly.Translate;

    Blocks['my_block'] = {
        init: function (this: Block): void {
            /* ... */
        },
    };

    javascriptGenerator.forBlock['my_block'] = function (block: Block): [string, Order] {
        /* ... */
    };
}
```

Rules of thumb:

- Import Blockly **typed from the npm package**, not through the global. It is the same instance —
  `bridge.ts` copies that namespace onto `window.Blockly`, so writing to the imported `Blocks` writes
  into `window.Blockly.Blocks`.
- Take only the ioBroker helpers off the global (`Blockly.Translate`, `Blockly.Words`,
  `Blockly.CustomBlocks`, the category objects), and read them **inside** `install()` — they are
  installed by `blocks_words.js`, which runs first.
- Anything a legacy file or an adapter still reads off the global has to stay there. `field_cron.ts`
  exports a typed `FieldCRON` *and* assigns `window.Blockly.FieldCRON`, because `blocks_trigger.js`
  does `new Blockly.FieldCRON(...)`.
- Old registrations (`Blockly.JavaScript.<type> = ...`) become `javascriptGenerator.forBlock[...]`.
- Shared code goes in `blocks/helpers.ts`.

### 3. Flip all four switches together

1. `blocks/<id>.ts` exists
2. `order.json` says `"module"`
3. `bridge.ts` has the importer in `BLOCK_MODULES`
4. the `.js` under `public/google-blockly/own/` is deleted

The test *"has every block source where order.json says it is"* fails if any of these is missing —
a half-finished conversion would otherwise drop or double-register blocks silently.

### 4. Verify

```bash
npm run test:blockly                              # snapshots must be unchanged
cd src-editor && npx tsc -p tsconfig.json --noEmit
cd src-editor && npx vite build
```

A snapshot diff means behaviour changed. That is only acceptable if it is intended — then say so in
the commit message. The only intended diff so far: `blocks_convert.js` registered a phantom block
type `Convert` through a stray `Blockly.Blocks.Convert = {}`, which the conversion dropped.

## What to expect

TypeScript refuses code the JavaScript accepted, and that is the point — every conversion so far
turned up something:

- **`Blockly.icons.MutatorIcon.reconnect()` was removed in Blockly 13.** Every mutator that rebuilds
  its inputs in `compose()` called it and would throw when edited. `helpers.ts` reimplements it.
- **`Blockly.ALIGN_RIGHT` is gone** (now `inputs.Align.RIGHT`); passing the old `undefined` silently
  left rows left-aligned.
- **Dead code from Blockly 1.x.** `field_cron.js`, `field_script.js` and `field_oid.js` all carried
  the same four editor methods calling `goog.asserts`, `goog.dom`, `Blockly.addClass_`, `Blockly.unbindEvent_` — nothing
  has called them for many major versions. Delete rather than convert, and say so in the file header.
- **Typing the global pays back.** Making `window.Blockly.FieldOID` a real type instead of a
  hand-written stub turned a cast in `BlocklyEditor.tsx` into a lint error, because it had become
  unnecessary.
- **`valueToCode()` throws for a missing input**, unlike `getInput()` which returns null. Where the
  original wrapped a `valueToCode` call in `try/catch`, that was load-bearing - the input only
  exists in certain mutation states. Check `getInput()` first instead of dropping the guard.
- **Copy-paste leftovers.** `sendto_otherscript.updateShape_` looped over `itemCount_`, a property
  only `sendto_custom` ever sets - the loop ran zero times. Check whether a block really owns the
  state its copied methods read.
- **Nullability.** `getInput()`, `previousConnection`, `outputConnection` and `getConstants()` are
  all nullable and were used unchecked throughout.

None of these are visible to the snapshot tests — they are editor-only paths. Note them in the file
header when you fix one.

## Globals other files still depend on

`blocks_words.ts` is the base every other block file builds on, and it shows the pattern for any
file that owns something the others read:

- **`Blockly.Words`** — 543 entries. `blocks_time.js` adds 17 `.format` properties to entries
  defined there, and other files add entries of their own, so the table is handed out as a mutable
  copy while the imported JSON stays pristine.
- **`Blockly.Translate`** — used by every block file and by adapter block files.
- **`getHelp`** — the legacy file declared it as a plain function, which landed on `window` only
  because it was a classic script. 6 files still call it 62 times from their `init()`.

The module exports `translate` and `getHelp` typed **and** assigns `window.Blockly.Translate` and
`window.getHelp`. Removing that assignment makes 9 snapshot tests fail with
`getHelp is not defined`, so the dependency is genuinely covered.

Two things worth copying when you convert a file with a lot of data in it:

1. **Extract data, do not retype it.** The 543 translations were pulled out of the running legacy
   file into `words.json` by script. The snapshots only see generated code, so a typo in a
   translation would have been invisible.
2. **Compare the result against the original once**, before deleting the `.js`. For the words table
   that was a deep-equal of both tables plus a spot check of `Translate` and `getHelp` including
   their fallbacks.

## Related

- `../../../../../test/blockly/README.md` — how the snapshot harness works and how to extend it
- `../../../../../BLOCKLY_TS.md` — the same topic for adapters that ship their own blocks
- `../bridge.ts` — how Blockly gets onto `window`
