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
### 9.3.0 (2026-06-17)
* (@GermanBluefox) Implemented the support for credentials manager in the configuration
* (@GermanBluefox) Added the possiblilty to execute scripts from AI agent

### 9.2.4 (2026-06-08)
* (arteck) Performance optimizations part 2
* (arteck) fix filter in tab scripts
* (@GermanBluefox) Fixed a subscription leak on script stop for RegExp-notation string ids (dispatch index)
* (@GermanBluefox) `extendObject` no longer throws into the script when the object contains non-clonable values (e.g. functions)

### 9.2.3 (2026-05-27)
* (arteck) Performance optimizations done
* (@GermanBluefox) Added on mouse over the value of the state

### 9.2.2 (2026-05-07)
* (Eistee82) Fix: AI chat mode tooltip no longer covers the dropdown options (issue #2201) — moved tooltip to the left of the selector
* (Eistee82) Clarified the AI chat mode descriptions in the tooltip: Agent is for larger models with tool support and handles both analysis and script creation, Code is for smaller models without tool support (uses two-step plan-then-code) — translations updated in all 11 languages
* (@GermanBluefox) Added the "is state exists" block to blockly

### 9.2.1 (2026-04-30)
* (@GermanBluefox) See previous changelog entries

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
