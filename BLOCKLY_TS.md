# Blockly blocks in your adapter — what changed, and how to move to TypeScript

For maintainers of adapters that ship their own Blockly blocks (`ioBroker.sayit`, `ioBroker.iot`,
`ioBroker.telegram`, …) — that is, any adapter with `"blockly": true` in `io-package.json` and an
`admin/blockly.js`.

## The short version

**Nothing you need to do right now.** The javascript adapter switched from a vendored copy of
Blockly 11 to Blockly 13 from npm, and the global `Blockly` object your file writes into is now
created by the editor itself. It is the same object as before, so an unchanged `admin/blockly.js`
keeps working.

Two things are worth checking, and one is worth doing eventually:

1. **Check** whether your file uses one of the handful of APIs Blockly 13 removed — see below.
2. **Check** whether it relies on `goog` for anything beyond `goog.provide` / `goog.require`.
3. **Eventually**, move it to TypeScript. That is optional, and it does not change how the editor
   loads your file.

## How your file is loaded

Unchanged. The editor collects every adapter whose `io-package.json` has

```json
{ "common": { "blockly": true } }
```

and loads `admin/blockly.js` of each one as a classic script — **after** it has installed the global
and its own blocks. So when your file runs, `window.Blockly` exists, all standard blocks are
registered, and the ioBroker helpers listed below are available.

## What Blockly 13 removed

These are the calls that appeared in the javascript adapter's own blocks and broke. If your file
uses any of them, it throws or silently does nothing:

| Removed                                                             | Replacement                                                                                          |
|---------------------------------------------------------------------|------------------------------------------------------------------------------------------------------|
| `Blockly.ALIGN_RIGHT`                                               | `Blockly.inputs.Align.RIGHT` — the old constant is `undefined`, so `setAlign()` silently did nothing |
| `Blockly.icons.MutatorIcon.reconnect(conn, block, input)`           | gone without replacement; reimplement it (below)                                                     |
| `block.getVars()`                                                   | `block.getVarModels()` — returns models, so use `.name` where you used the string                    |
| `workspace.getVariablesOfType(type)`                                | `workspace.getVariableMap().getVariablesOfType(type)`                                                |
| `Blockly.Field.prototype.text_`                                     | `getValue()` / `getText()`                                                                           |
| `Blockly.BlockSvg.SEP_SPACE_X`                                      | gone; the renderer constants replaced it                                                             |
| `goog.dom.*`, `goog.asserts.*`, `goog.userAgent.*`                  | gone for many major versions — such code has been dead for years                                     |
| `Blockly.addClass_`, `Blockly.removeClass_`, `Blockly.unbindEvent_` | same, gone long ago                                                                                  |

`MutatorIcon.reconnect` is small enough to carry yourself:

```js
function reconnectChild(connectionChild, block, inputName) {
    if (!connectionChild || !connectionChild.getSourceBlock().workspace) {
        return false;
    }
    const input = block.getInput(inputName);
    const connectionParent = input && input.connection;
    if (!connectionParent) {
        return false;
    }
    const currentParent = connectionChild.targetBlock();
    if ((!currentParent || currentParent === block) && connectionParent.targetConnection !== connectionChild) {
        if (connectionParent.isConnected()) {
            connectionParent.disconnect();
        }
        connectionParent.connect(connectionChild);
        return true;
    }
    return false;
}
```

### A trap that is not new, but bites during any rewrite

`Blockly.JavaScript.valueToCode(block, 'X', order)` **throws** when the input `X` does not exist,
while `block.getInput('X')` simply returns `null`. If your block adds an input only in certain
mutation states, guard the call — a `try/catch` around `valueToCode` in old code is usually there
for exactly this reason and must not be dropped:

```js
const value = block.getInput('END')
    ? Blockly.JavaScript.valueToCode(block, 'END', Blockly.JavaScript.ORDER_ATOMIC)
    : null;
```

## What still works exactly as before

- `Blockly.Blocks['my_block'] = { init: function () { … } }`
- `Blockly.JavaScript.forBlock['my_block'] = function (block) { … }`
- **and the old form** `Blockly.JavaScript['my_block'] = function (block) { … }` — the editor moves
  those over to `forBlock` once all adapter block files have been loaded

  > Editors older than this release migrated *before* loading adapter files, so a block registered
  > the old way was never moved and failed with _"JavaScript generator does not know how to generate
  > code for block type"_. Prefer `forBlock` directly — it works on every version.
- `goog.provide(…)` / `goog.require(…)` — a no-op stand-in is installed before your file runs, so
  the usual `if (typeof goog !== 'undefined')` guard is no longer needed, but stays harmless
- `Blockly.Words['my_word'] = { en: '…', de: '…', … }` together with `Blockly.Translate('my_word')`
- registering your own toolbox category:
  ```js
  Blockly.CustomBlocks = Blockly.CustomBlocks || [];
  Blockly.CustomBlocks.push('Sayit');
  Blockly.Sayit = { HUE: 250, blocks: {} };
  Blockly.Sayit.blocks['sayit_say'] = '<block type="sayit_say"></block>';
  ```
  The category name needs its own `Blockly.Words['Sayit']` entry — that is the label in the toolbox.

## ioBroker extras on the global

Besides Blockly itself, the editor provides these:

|                                                               |                                                                  |
|---------------------------------------------------------------|------------------------------------------------------------------|
| `Blockly.Translate(word, lang?)`                              | look a word up in `Blockly.Words`                                |
| `getHelp(word)`                                               | build the documentation link of a block                          |
| `Blockly.FieldOID`                                            | the object-ID field with its select dialog, icons and live value |
| `Blockly.FieldCRON`                                           | the CRON field with the CRON dialog                              |
| `Blockly.FieldScript`                                         | the script field with the script dialog                          |
| `Blockly.b64EncodeUnicode` / `Blockly.b64DecodeUnicode`       | what `FieldScript` stores its value with                         |
| `Blockly.Timeouts.getAllTimeouts(ws)` / `getAllIntervals(ws)` | the timers in a workspace, as dropdown options                   |
| `main.objects`, `main.instances`, `main.selectIdDialog(…)`    | the editor's object cache and dialogs                            |

## Moving your file to TypeScript

Entirely optional. `admin/blockly.js` stays a classic script either way, because that is what the
editor loads — what you gain is type checking while writing it.

The approach the javascript adapter uses for its own blocks:

1. Add `blockly` as a **dev** dependency. Only its types are used; the code comes from the editor.
   ```bash
   npm i -D blockly@^13
   ```
2. Write `src/blockly.ts`, taking the **types** from the package and the **runtime** from the global:
   ```ts
   import type { Block } from 'blockly/core';

   const Blockly = (window as any).Blockly;

   Blockly.Words['sayit_say'] = { en: 'say', de: 'sage', ru: 'сказать' /* … */ };

   Blockly.Blocks['sayit_say'] = {
       init: function (this: Block): void {
           this.appendValueInput('TEXT').appendField(Blockly.Translate('sayit_say'));
           this.setPreviousStatement(true, null);
           this.setNextStatement(true, null);
           this.setColour(Blockly.Sayit.HUE);
       },
   };

   Blockly.JavaScript.forBlock['sayit_say'] = function (block: Block): string {
       const text = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC);

       return `sendTo('sayit.0', 'say', ${text});\n`;
   };
   ```
   Do **not** write `import * as Blockly from 'blockly/core'` for the runtime. Your bundle would
   then carry a second, private copy of Blockly, and everything you register in it would be
   invisible to the editor. This is the single most likely way to break the migration.
3. Bundle it to a classic script and emit it as `admin/blockly.js`:
   ```bash
   esbuild src/blockly.ts --bundle --format=iife --outfile=admin/blockly.js
   ```

## Testing your blocks

The javascript adapter tests its own blocks by loading them into jsdom and comparing the generated
code against committed snapshots. The harness lives in `test/blockly/` of this repository and its
README explains the setup; the same approach works for an adapter — load Blockly's UMD build and
your `admin/blockly.js`, feed in workspace XML, assert on the generated code.

The one habit worth copying: **write the test before you rewrite anything**, and make sure it covers
the mutation states and dropdown options your block actually has. A block's toolbox entry only ever
shows it in its default state, and that is where nearly every coverage gap turned out to be.

## Questions

Open an issue in [ioBroker.javascript](https://github.com/ioBroker/ioBroker.javascript/issues) if
something your adapter relies on is missing from the global. The goal is that no adapter has to
change anything.

---

The porting of the javascript adapter's *own* block definitions is a separate matter and documented
in `src-editor/src/Components/blockly-plugins/blocks/README.md`.
