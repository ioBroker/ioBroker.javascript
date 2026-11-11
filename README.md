![Logo](admin/javascript.png)
# JavaScript Script Engine

![Number of Installations](http://iobroker.live/badges/javascript-installed.svg)
![Number of Installations](http://iobroker.live/badges/javascript-stable.svg)
[![NPM version](http://img.shields.io/npm/v/iobroker.javascript.svg)](https://www.npmjs.com/package/iobroker.javascript)

![Test and Release](https://github.com/ioBroker/ioBroker.javascript/workflows/Test%20and%20Release/badge.svg)
[![Translation status](https://weblate.iobroker.net/widgets/adapters/-/javascript/svg-badge.svg)](https://weblate.iobroker.net/engage/adapters/?utm_source=widget)
[![Downloads](https://img.shields.io/npm/dm/iobroker.javascript.svg)](https://www.npmjs.com/package/iobroker.javascript)
**This adapter uses Sentry libraries to automatically report exceptions and code errors to the developers.** For more details and for information how to disable the error reporting see [Sentry-Plugin Documentation](https://github.com/ioBroker/plugin-sentry#plugin-sentry)! Sentry reporting is used starting with js-controller 3.0.

Executes JavaScript, TypeScript Scripts.

## Documentation

- 🇺🇸 [Function documentation](docs/en/javascript.md)
- 🇺🇸 [Upgrade guide](docs/en/upgrade-guide.md)
- 🇩🇪 [Funktionsdokumentation](docs/de/javascript.md)
- 🇩🇪 [Benutzung](docs/de/usage.md)
- 🇺🇸 [Function block diagrams](docs/en/fbd.md)
- 🇩🇪 [Funktionspläne](docs/de/fbd.md)
- Blockly
  - 🇺🇸 Here you can find the description of [blockly](docs/en/blockly.md). 
  - 🇩🇪 Hier kann man die Beschreibung von [Blockly](docs/de/blockly.md) finden. 
  - 🇷🇺 Описание по [blockly](docs/ru/blockly.md) можно найти [здесь](docs/ru/blockly.md).

<!--
  ### **WORK IN PROGRESS**
-->

## Changelog
### **WORK IN PROGRESS**
* (@GermanBluefox) Added: function block diagrams - the online view marks a `STATE_OUT` block whose state somebody else changed (VIS, another script, by hand) and shows the value the state holds; the new option "Write the value back" of `STATE_OUT` writes the value of the diagram back then, at most once a second (#2442)

### 10.5.1 (2026-11-10)
* (@GermanBluefox) Added: function block diagrams - blocks can be pinned (pin button on the block, its menu or the properties): "Arrange automatically" leaves them where they are and arranges the other blocks around them (#2443)
* (@GermanBluefox) Added: function block diagrams - a link can be moved to another input by dragging its connected input; let go where no input is, it is deleted - a mere click on it keeps it (#2438)
* (@GermanBluefox) Added: function block diagrams - the `PID` block has the output `RUN`: `TRUE` while the controller works, i.e. none of `MAN`, `RST` and `HOLD` is active (#2440)
* (@GermanBluefox) Changed: function block diagrams - the online view shows the value of a link that is not BOOL at the input of the target block instead of in the middle of the link (#2444)

### 10.5.0 (2026-11-07)
* (@GermanBluefox) Added: script functions `readDir`, `fileExists`, `chmodFile` and `chownFile` for files in the DB, and `chmodObject` and `chownObject` to change the access rights and the owner of objects and states (only with the option "Enable command setObject"), each with an `...Async` variant
* (@GermanBluefox) Added: function block diagrams - block `CHARCURVE` (characteristic curve, e.g. a heating curve): `OUT` on the straight lines through 2 to 10 points `X1`/`Y1` ... `Xn`/`Yn`, kept at the Y of the outer points beyond them; the points are inputs, so they can be connected too, and the properties show the curve (#2433)

### 10.4.10 (2026-11-04)
* (@GermanBluefox) Fixed: the unsaved changes of the open scripts were lost, when the list of scripts or the log was hidden or shown again (#1739)
* (@GermanBluefox) Added: animated icons in the editor (`@iobroker/gui-components` 10.3.16) - start/stop morphs between play and pause and shows a ring until the instance confirmed it, the restart button turns until the script is restarted, folders open with an animation, animated delete, menu arrow and expert mode symbols, a check mark after saving and copying
* (@GermanBluefox) Added: more animations in the editor - the rows of a folder grow and shrink when it is opened and closed, new scripts light up, the colors of the start/stop buttons fade, the Save/Diff/Cancel buttons and new tabs grow to their width, closed tabs shrink, new log lines slide in, the side menu and the log slide in when they are opened, badges jump when their number grows
* (@GermanBluefox) Added: the log shows the number of new lines, while it does not follow them
* (@GermanBluefox) Added: the history dialog can be maximized (button or double click on its title); the width of the version list and the border between the two sides of the diff can be dragged; buttons jump from change to change; "Take over into the editor" is disabled for a version that is the same as the editor
* (@GermanBluefox) Changed: the diffs (history, unsaved changes, AI suggestions) scroll to the first change and show changed indentation too
* (@GermanBluefox) Updated packages

### 10.4.9 (2026-11-02)
* (@GermanBluefox) Fixed: the restart button of the editor did nothing for a running script since 10.4.7 (#2423)
* (@GermanBluefox) Added: OpenRouter, if it is chosen in the system-wide AI settings of admin (`@iobroker/ai-core` 0.0.6, `@iobroker/ai-gui` 0.0.5)
* (@GermanBluefox) Added: function block diagrams - selection blocks `SEL`, `MUX` and `LIMIT`; the `PID` block got `HOLD`, a dead band `DB`, a manual mode (`MAN`, `YMAN`) and `INV` to reverse its direction
* (@GermanBluefox) Changed: function block diagrams - `RST` of the `PID` block puts out `Y` = 0 (or the limit nearest to it) instead of the P part (#2426)

### 10.4.8 (2026-10-27)
* (@GermanBluefox) Fixed: setting scriptEnabled to true restarts an already running script again (#2417)
* (@GermanBluefox) Fixed: a script that stopped itself with `stopScript()` (or was restarted with `runScript()`) kept running and `scriptEnabled` stayed `true`
* (@GermanBluefox) Added: the AI uses the AI settings of the system that are set up once in admin (System settings → AI) - for new instances and for instances without own keys
* (@GermanBluefox) Fixed: a script started via the `execute` message wrote `scriptEnabled.__execute_<n>` without object, when the instance stopped or the setState limit stopped the script before the output was collected

## License
The MIT License (MIT)

Copyright (c) 2014-2026 bluefox <dogafox@gmail.com>  
Copyright (c) 2014 hobbyquaker

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
