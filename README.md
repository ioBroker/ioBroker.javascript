![Logo](admin/javascript.png)
# Javascript Script Engine

![Number of Installations](http://iobroker.live/badges/javascript-installed.svg)
![Number of Installations](http://iobroker.live/badges/javascript-stable.svg)
[![NPM version](http://img.shields.io/npm/v/iobroker.javascript.svg)](https://www.npmjs.com/package/iobroker.javascript)

![Test and Release](https://github.com/ioBroker/ioBroker.javascript/workflows/Test%20and%20Release/badge.svg)
[![Translation status](https://weblate.iobroker.net/widgets/adapters/-/javascript/svg-badge.svg)](https://weblate.iobroker.net/engage/adapters/?utm_source=widget)
[![Downloads](https://img.shields.io/npm/dm/iobroker.javascript.svg)](https://www.npmjs.com/package/iobroker.javascript)
**This adapter uses Sentry libraries to automatically report exceptions and code errors to the developers.** For more details and for information how to disable the error reporting see [Sentry-Plugin Documentation](https://github.com/ioBroker/plugin-sentry#plugin-sentry)! Sentry reporting is used starting with js-controller 3.0.

Executes Javascript, Typescript Scripts.

## Documentation

- 🇺🇸 [Function documentation](docs/en/javascript.md)
- 🇺🇸 [Upgrade guide](docs/en/upgrade-guide.md)
- 🇩🇪 [Benutzung](docs/de/usage.md)
- Blockly
  - 🇺🇸 Here you can find the description of [blockly](docs/en/blockly.md). 
  - 🇩🇪 Hier kann man die Beschreibung von [Blockly](docs/de/blockly.md) finden. 
  - 🇷🇺 Описание по [blockly](docs/ru/blockly.md) можно найти [здесь](docs/ru/blockly.md).

<!--
  ### **WORK IN PROGRESS**
-->

## Changelog
### **WORK IN PROGRESS**
* (@GermanBluefox) The folder icons in the script tree were drawn at less than half the size of the script icons next to them: they spaced themselves with a padding, and since `CssBaseline` sets `box-sizing: border-box` that padding was subtracted from their 20px instead of being added to them. They use a margin now, like the script icons always did (#2360)
* (@GermanBluefox) The log below the editor could not be resized while a script was open: the editor area guessed its height from the height the tabs and the toolbar were expected to have, hung over the bottom edge of its pane and covered the 8px splitter with the horizontal scrollbar of the editor, which swallowed the mouse click. The three parts now share the height as a flex column (#2351)
* (@GermanBluefox) The script list cut off long names, although there was still free space next to them: the space for the buttons at the end of a row was a fixed 185px, which is more than the three buttons occupy, and it did not account for the icon column
* (@GermanBluefox) Fixed the Blockly comment block: the text was written in white on the yellow block and could not be read, the editor opened somewhere else on the page instead of over the block, and on a smartphone or tablet it did not open at all and left the whole workspace unusable until the page was reloaded (#2348)
* (@GermanBluefox) Fixed the script mirror for folder names containing regular expression characters: a folder called e.g. `Lampen (Flur` aborted the synchronization with a `SyntaxError`, a folder called e.g. `[ab]` silently synchronized the scripts of another folder (#2239)
* (@GermanBluefox) The Blockly block "http (POST)" got a "content type" selector, so an API that insists on `Content-Type: application/json` no longer needs an `exec` block. "automatic" is the default and behaves exactly as before, "own" allows any other type (#1983)
* (@GermanBluefox) `getSchedules()` returned the schedules of the time wizard of **all** scripts, even without the argument `true`. Now only the schedules of the own script are returned (#2164)
* (@GermanBluefox) `clearSchedule()` did not accept the objects that `getSchedules()` returns for schedules of the time wizard, so such a schedule stayed in the script and in the schedule counter (#2164)
* (@GermanBluefox) `clearSchedule()` can now clear the CRON jobs of other scripts too, as documented for `getSchedules(true)` (#2164)
* (@GermanBluefox) `getSchedules()` no longer lists the already canceled schedules of the own script in an `onStop` callback (#2164)

### 10.1.2 (2026-08-24)
* (@GermanBluefox) Added new rule blocks
* (@krobipd) Fixed saving of Blockly scripts under Blockly 13: a script containing a named timeout, interval or schedule could not be saved anymore - the save button did not appear (#2349)
* (@krobipd) Fixed saving of Blockly scripts containing a function with a return value and no statements (#1958)
* (@krobipd) The Blockly regression tests now also cover saving: every block is serialized the way the editor does it and reloaded to the same code
* (@krobipd) When a block fails while the script is regenerated after a change, the editor now shows the error instead of silently never offering the save button; a failing export shows its error too

### 10.1.1 (2026-08-24)
* (@GermanBluefox) The credentials of the central storage (Basic settings -> Credentials) are available in the scripts as `SECRETS`, e.g. `SECRETS.CameraPassword.key`. The values are decrypted, read-only and are updated live when a credential is edited in the admin UI
* (@GermanBluefox) The editor knows the credentials that exist: after `SECRETS.` it offers their names, and after the next dot exactly the fields the selected credential has
* (@GermanBluefox) Added the Blockly block "credential", which reads one field of the central credential storage
* (@GermanBluefox) The instance settings list the available credentials with their fields and the expression a script uses for them

### 10.1.0 (2026-08-16)
* (@GermanBluefox) Turned `strict` off again for the scripts, as TypeScript 6 enables it by default
* (@GermanBluefox) Added the tab "TypeScript" to the settings, where the compiler options for the scripts can be configured
* (@GermanBluefox) Added snapshot tests for the Blockly code generation (`npm run test:blockly`)
* (@GermanBluefox) Removed two leftover `.only` markers that had disabled almost the whole test suite
* (@GermanBluefox) Pinned the line endings of transformed TypeScript sources to LF, so a compiler update cannot rewrite every script
* (@GermanBluefox) Moved the micro benchmarks into `npm run test:performance`, as they measure relative speed against timeouts and cannot block a build
* (@GermanBluefox) Updated Blockly from 11.1.1 to 13.2.1. The generated code is unchanged
* (@GermanBluefox) `updateBlockly.js` now copies from the installed npm package instead of cloning the git master branch, so the shipped Blockly version is reproducible
* (@GermanBluefox) Blockly is now bundled from the npm package instead of being loaded as vendored script tags. Custom blocks of other adapters keep working unchanged
* (@GermanBluefox) Removed 828 kB of vendored Blockly code from the repository
* (@GermanBluefox) Converted all block definitions from JavaScript to TypeScript. The generated code is unchanged
* (@GermanBluefox) Fixed the object blocks under Blockly 13: the attribute rows were no longer right-aligned, and editing the attributes of an "object" block threw
* (@GermanBluefox) Dropped the dead field editor code of the CRON and script fields, which had been written against Blockly 1.x
* (@GermanBluefox) Fixed the multi-and/multi-or blocks under Blockly 13, which threw when their conditions were edited
* (@GermanBluefox) Removed a phantom block type "Convert" that a stray assignment in the conversion blocks had registered
* (@GermanBluefox) Added `BLOCKLY_TS.md` for adapter developers: what Blockly 13 changed for custom blocks and how to write them in TypeScript
* (@GermanBluefox) Moved the Blockly translations into `words.json` and typed the lookup helpers
* (@GermanBluefox) Redesign of Rules
* (@GermanBluefox) Added a wizard to the rule editor that builds a rule step by step - trigger, condition and action are configured in place, and the last step shows the finished rule
* (@GermanBluefox) The wizard opens by itself for a newly created rule - once, and not for a duplicated one. Afterwards it stays available in the block palette
* (@GermanBluefox) Fixed the type declarations of 3rd party libraries: they were placed under the name the library has on disk while their `package.json` went to the name the scripts import, so TypeScript never connected the two and everything imported from such a library was `any` (#2341)
* (@GermanBluefox) Stopped wrapping a library's declarations in `declare module`, which cut a barrel file off from what it re-exports. Declarations that are not a module themselves are still wrapped
* (@GermanBluefox) Fixed following the imports inside a declaration file: only the first import of a file was followed, and only if it was on the first line. For rxjs 6 that loaded 6 of its ~800 declaration files
* (@GermanBluefox) Side effect imports (`import "./x";`) inside a declaration file are now followed as well. `@iobroker/types` consists of nothing else, so the `ioBroker.*` types were missing in scripts and in the editor
* (@GermanBluefox) A definition file that cannot be read no longer discards all type declarations of its package
* (@GermanBluefox) Added regression tests for the type declarations of 3rd party libraries, which compile against them and insist that wrong code is rejected
* (@GermanBluefox) `createState` now stringifies `common.def` of an object, json or array state, as js-controller expects it and as `setState` already does with the value. Creating such a state with an initial value no longer warns "Default value has to be stringified" (#2307)
* (@GermanBluefox) Documented that an object in the second position of `createState` is always the `common`, and how to give a state a non-primitive initial value
* (@GermanBluefox) Restored the check of the mirror path in the instance configuration. It was lost when the admin configuration moved to `jsonConfig.json`, so a forbidden path was accepted without a word and only refused later in the log (#2296)
* (@GermanBluefox) The mirror path field now explains what the directory has to be, and suggests one
* (@GermanBluefox) Scripts are no longer deleted from the database when the mirror directory as a whole becomes unreachable, e.g. because a share is not mounted
* (@GermanBluefox) Libraries that name their declarations through an `exports` map are typed now. Their legacy `types` field is often a stub pointing at a file that does not exist - rxjs 7 is one - which left everything imported from them as `any` (#928)
* (@GermanBluefox) The declarations of a library are laid out around its entry point, so `moduleResolution: node10` finds it even when they live in a subdirectory
* (@GermanBluefox) The manifest handed to TypeScript describes that layout instead of the one on disk. An `exports` map pointing at paths that do not exist there made TypeScript refuse the library altogether
* (@GermanBluefox) The package.json of a library is read from disk instead of through Node, which refuses it when the library does not export it
* (@GermanBluefox) Fixed the mirror tests on macOS. They asserted on the first event a watcher reported, while `fs.watch` there works at directory granularity and sends an event for the watched directory before the one for the file. They now wait for the change they are about, and say what arrived instead if it never comes
* (@GermanBluefox) Made the mirror tests independent of how long a watch takes to arm. The change under test is repeated while waiting, so it cannot be made before the watcher is listening - the same commit produced a green and a red macOS job over that
* (@GermanBluefox) Added a wizard to the rule editor that builds a rule step by step - trigger, condition and action are configured in place, and the last step shows the finished rule

### 10.0.0 (2026-08-04)
* (@GermanBluefox) TypeScript 6 support
* (@GermanBluefox) GUI was migrated to React 19 and MUI 9
* (@GermanBluefox) Showed the host name in the instance selection dialog

### 9.3.1 (2026-06-18)
* (@GermanBluefox) Added the possibility to execute one-way scripts without saving it

## License
The MIT License (MIT)

Copyright (c) 2014-2026 bluefox <dogafox@gmail.com>,

Copyright (c) 2014      hobbyquaker

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
