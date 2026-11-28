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

## Messages for scripts and AI agents

`sendTo('javascript.0', 'help', {})` answers with a description of the messages (`toScript`, `execute`, `calcAstro`, script versions, ...) for AI agents (e.g. pi-agent) and script authors; the answer lists all commands with `write` (whether a command changes something).

<!--
  ### **WORK IN PROGRESS**
-->

## Changelog
### **WORK IN PROGRESS**
* (@GermanBluefox) Fixed `setStateChanged()` writing a real change with `lc` from the time of the call and `ts` from the time of the write, which differed by up to seconds under load, so e.g. influxdb with `changesOnly` did not store the value. Now `lc` = `ts` on a real change, as with `setState()` (#2503)
* (@GermanBluefox) Version 10.6.0 was not published on npm, this release contains its changes

### 10.6.0 (2026-11-19)
* (@GermanBluefox) Added the message "help": a description of all messages for AI agents (e.g. pi-agent), and common.supportedMessages.help

### 10.5.5 (2026-11-17)
* (@GermanBluefox) Editor: log lines are kept when the script list or the log is hidden/shown (#2462)

### 10.5.4 (2026-11-15)
* (@GermanBluefox) Function block diagrams: a STATE_OUT is no longer shown as deviating when the state holds the value with float precision only (#2461)

### 10.5.3 (2026-11-11)
* (@GermanBluefox) Fixed: the cursor of the script editor jumped to the start of the script after the first typed character (when nothing else had updated the editor since the script was opened) and after saving

### 10.5.2 (2026-11-11)
* (@GermanBluefox) Added: function block diagrams - the online view marks a `STATE_OUT` block whose state somebody else changed (VIS, another script, by hand) and shows the value the state holds; the new option "Write the value back" of `STATE_OUT` writes the value of the diagram back then, at most once a second (#2442)
* (@Voodoo2man) Added: Blockly category selection for member IDs and change/ack filters to the enum trigger (#1960)

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
