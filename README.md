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

## Changelog
<!--
	### **WORK IN PROGRESS**
-->
### **WORK IN PROGRESS**
* (foxriver76) fixed subpath imports with controller v6 (needs js-controller v6.0.9)

### 8.7.1 (2024-07-22)
* (foxriver76) load correct typings for TypeScript scripts with js-controller v6 (needs js-controller v6.0.9)

### 8.7.0 (2024-07-18)
* (klein0r) Escape all field inputs correctly when using single quotes
* (klein0r) Added sandbox function to subscribe to all enum members
* (klein0r) Added Blockly block to subscribe to all enum members
* (klein0r) Added sandbox functions to start/restart/stop an instance
* (klein0r) Added Blockly block to start/restart/stop an instance
* (klein0r) Added Blockly block to start/stop a script
* (klein0r) Added Blockly result blocks for script messages
* (klein0r) Fixed onLog / onLogUnregister return types
* (foxriver76) fixed issue in importing additional node modules for packages which do not provide a default export (e.g. `mathjs`)
* (bluefox) Removed `withStyles` from GUI

### 8.6.0 (2024-06-14)

* (foxriver76) fixed issue with additional node modules which are installed from GitHub (controller v6)
* (klein0r) Added new Blockly block to save http response into temp file
* (klein0r) Escape single quotes in all object Blockly blocks
* (klein0r) Grouped Blockly blocks / changed order of blocks
* (klein0r) Allow multi line comments

### 8.5.2 (2024-06-11)

* (foxriver76) fixed issue with additional node modules when using js-controller version 6
* (klein0r) Added Blockly block to check if text includes another text
* (klein0r) Fixed onFile error when file has been deleted

### 8.5.1 (2024-06-10)

* (klein0r) Added Blockly dark theme
* (klein0r) Fixed sendTo custom parameters with special chars

## License
The MIT License (MIT)

Copyright (c) 2014-2024 bluefox <dogafox@gmail.com>,

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
