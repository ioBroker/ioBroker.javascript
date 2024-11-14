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

-   🇺🇸 [Function documentation](docs/en/javascript.md)
-   🇺🇸 [Upgrade guide](docs/en/upgrade-guide.md)
-   🇩🇪 [Benutzung](docs/de/usage.md)
-   Blockly
    -   🇺🇸 Here you can find the description of [blockly](docs/en/blockly.md).
    -   🇩🇪 Hier kann man die Beschreibung von [Blockly](docs/de/blockly.md) finden.
    -   🇷🇺 Описание по [blockly](docs/ru/blockly.md) можно найти [здесь](docs/ru/blockly.md).

## Changelog

<!--
	### **WORK IN PROGRESS**
-->
### **WORK IN PROGRESS**
-   (@GermanBluefox) Backend re-written to typescript
-   (@GermanBluefox) Removed the `request` module from the default modules

### 8.8.3 (2024-09-05)

-   (@GermanBluefox) Fixed object selector in rules

### 8.8.2 (2024-08-07)

-   (@GermanBluefox) updated dependencies

### 8.8.0 (2024-08-05)

-   (@klein0r) Added option to register notifications via scripts
-   (@klein0r) Fixed sendTo block with an empty name list

### 8.7.7 (2024-08-04)

-   (@klein0r) Fixed import scripts dialog
-   (@klein0r) Allowed removing all custom packages (empty list)

### 8.7.6 (2024-07-28)

-   (foxriver76) fix error with subpath imports in scripts

## License

The MIT License (MIT)

Copyright (c) 2014-2024 @GermanBluefox <dogafox@gmail.com>,

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
