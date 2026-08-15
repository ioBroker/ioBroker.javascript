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
* (@GermanBluefox) Fixed the type declarations of 3rd party libraries: they were placed under the name the library has on disk while their `package.json` went to the name the scripts import, so TypeScript never connected the two and everything imported from such a library was `any` (#2341)
* (@GermanBluefox) Stopped wrapping a library's declarations in `declare module`, which cut a barrel file off from what it re-exports. Declarations that are not a module themselves are still wrapped
* (@GermanBluefox) Fixed following the imports inside a declaration file: only the first import of a file was followed, and only if it was on the first line. For rxjs 6 that loaded 6 of its ~800 declaration files
* (@GermanBluefox) Side effect imports (`import "./x";`) inside a declaration file are now followed as well. `@iobroker/types` consists of nothing else, so the `ioBroker.*` types were missing in scripts and in the editor
* (@GermanBluefox) A definition file that cannot be read no longer discards all type declarations of its package
* (@GermanBluefox) Added regression tests for the type declarations of 3rd party libraries, which compile against them and insist that wrong code is rejected
* (@GermanBluefox) `createState` now stringifies `common.def` of an object, json or array state, as js-controller expects it and as `setState` already does with the value. Creating such a state with an initial value no longer warns "Default value has to be stringified" (#2307)

### 10.0.0 (2026-08-04)
* (@GermanBluefox) TypeScript 6 support
* (@GermanBluefox) GUI was migrated to React 19 and MUI 9
* (@GermanBluefox) Showed the host name in the instance selection dialog

### 9.3.1 (2026-06-18)
* (@GermanBluefox) Added the possibility to execute one-way scripts without saving it

### 9.3.0 (2026-06-17)
* (@GermanBluefox) Implemented the support for credentials manager in the configuration

### 9.2.4 (2026-06-08)
* (arteck) Performance optimizations part 2
* (arteck) fix filter in tab scripts
* (@GermanBluefox) Fixed a subscription leak on script stop for RegExp-notation string ids (dispatch index)
* (@GermanBluefox) `extendObject` no longer throws into the script when the object contains non-clonable values (e.g. functions)

### 9.2.3 (2026-05-27)
* (arteck) Performance optimizations done
* (@GermanBluefox) Added on mouse over the value of the state

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
