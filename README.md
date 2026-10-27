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
* (@GermanBluefox) Added: the AI uses the AI settings of the system that are set up once in admin (System settings → AI) - for new instances and for instances without own keys
* (@GermanBluefox) Fixed: a script started via the `execute` message wrote `scriptEnabled.__execute_<n>` without object, when the instance stopped or the setState limit stopped the script before the output was collected

### 10.4.7 (2026-10-23)
* (@GermanBluefox) Fixed: the AI chat did not see the open script when it was a Blockly script, and an outdated version of it after unsaved edits; the open script is now always the context when no other script is mentioned
* (@GermanBluefox) Fixed: the code mode of the AI chat ignored the open script and wrote an unrelated new script for a request like "turn on the logs in the script"

### 10.4.6 (2026-10-19)
* (@GermanBluefox) Fixed: false "Cannot redeclare block-scoped variable" (TS2451) warnings for `const`s that are declared in several scripts
* (@GermanBluefox) Fixed: `subscribeObject()`/`onObject()` and the rule trigger "On object change" never fired for a pattern with `*`
* (@GermanBluefox) Fixed: a change of a TypeScript script could be ignored after its compilation result could not be stored

### 10.4.5 (2026-10-18)
* (@GermanBluefox) Fixed: a script that did not handle a rejected `setStateAsync` (e.g. of a missing state) or another asynchronous function terminated the adapter
* (@agross) Fixed: TypeScript scripts that import the same module as a global script failed with "Identifier has already been declared"
* (@GermanBluefox) Fixed: the @-mention list of the AI chat showed only the first 13 scripts
* (@GermanBluefox) Fixed: selection of state if predefined

### 10.4.4 (2026-10-16)
* (@GermanBluefox) Fixed: a script that did not handle a rejected `setStateAsync` (e.g. of a missing state) or another asynchronous function terminated the adapter
* (@GermanBluefox) Fixed: instances of different versions
* (@GermanBluefox) Fixed: the AI chat stopped with "m.default is not a constructor"

### 10.4.1 (2026-10-09)
* (@GermanBluefox) Changed: the AI assistant uses the shared libraries `@iobroker/ai-core` and `@iobroker/ai-gui`
* (@GermanBluefox) Fixed: the AI push session is bound to the user who opened it, and testing the values of the AI settings form needs the "execute" right

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
