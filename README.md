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
### 10.4.1 (2026-10-09)
* (@GermanBluefox) Changed: the AI assistant uses the shared libraries `@iobroker/ai-core` and `@iobroker/ai-gui`

### 10.4.0 (2026-10-08)
* (@GermanBluefox) The endpoint of an AI request comes out of the configuration and no longer out of the request. An address in the message used to win over the stored one, which was the comfortable way to put a proxy in front of OpenAI - and at the same time the way to have this instance carry the stored key, as the `Authorization` of that request, to an address of somebody else's choosing. Whoever may send a message to this instance could do that. A proxy belongs in the configuration now, where it is entered once by whoever may configure the adapter. The editor never sent an address, so nothing changes for it; the Test buttons of the settings dialog keep trying what stands in the form, with one limit: an address out of the form counts only together with a key out of the form - one's own key to one's own endpoint gives nothing away. In the credential-store mode the saved address is used, so an endpoint of one's own has to be saved before it can be tested there
* (@GermanBluefox) Only an entry that was stored as an AI credential is read from the central credential store. The store holds the secrets of the whole system - a database password, the login of a camera - and a request for "the key of this provider" could name any one of them
* (@GermanBluefox) The `execute` message - which runs a script here, with the whole ioBroker API behind it - checks who asked for it. A message never said on whose behalf it came, so there was nothing to check, and everyone who may send one to this instance could have code executed. Where the js-controller names the user (7.2.5 and newer, which put the user of a socket connection into the message), that user needs the right that a command on the host needs. Where it does not name one - an older controller, a script, an adapter - nothing changes
* (@GermanBluefox) The question before a debug session ("The script will be stopped and must be activated manually after debugging") started the debugging even when it was answered with "Cancel" (#2382)
* (@GermanBluefox) Stopping a debug session could end the debugged process with "uncaught exception: write EPIPE": the inspector process exited at once, although the process it debugs writes its whole log through its pipes and was still shutting down. The inspector now stops that process first and waits till it is really gone, a broken pipe cannot end a debugged script anymore, and the reset of the connection to the debugged process is not reported as an internal error of the inspector (#2382)
* (@GermanBluefox) The AI chat stayed empty when a request took longer than 30 seconds: the answer is pushed as an instance message now instead of waiting for the socket callback
* (@GermanBluefox) An AI answer without content now says why (stop reason, token counts) instead of leaving an empty chat bubble, and every failed request is logged
* (@GermanBluefox) An answer cut off at the output limit is marked as incomplete
* (@GermanBluefox) Sorted the scripts in the `@` list of the AI chat by their path
* (@GermanBluefox) The AI chat can be maximized to the whole editor area (#2389)
* (@GermanBluefox) The AI chat shows a spinner for the whole request, not only until the first tool call
* (@GermanBluefox) Fixed an accepted AI suggestion not reaching the visible editor
* (@GermanBluefox) Fixed the splitters jumping back to their previous width while being dragged
* (@GermanBluefox) Blockly: fixed a parameter of a "JavaScript function" with its default name making the script unsavable
* (@GermanBluefox) Added a script history: saved versions can be listed, compared and restored in the editor. "Saved versions per script" (30 by default, 0 switches it off)
* (@GermanBluefox) Added a "Script history" tab with the used storage per script and buttons to delete single, orphaned or all histories
* (@GermanBluefox) Moved the credentials table to its own tab
* (@GermanBluefox) Mirror: a changed file no longer resets `enabled` and `engine` of the script (#2396)

### 10.3.0 (2026-09-20)
* (@GermanBluefox) The code editor (Monaco), Blockly and the Rules blocks are loaded only when a script of that kind is opened, so the editor starts faster
* (@GermanBluefox) Added function block diagrams (FBD, in the style of CFC): timers, counters, flip-flops, edges, comparison, arithmetic, conversions, control, calendar (cron, sun events), log and messages, and a block with own JavaScript - wired to ioBroker states. See [the description](docs/en/fbd.md)

### 10.2.5 (2026-09-17)
* (@GermanBluefox) Added the functions help dialog in editor

### 10.2.4 (2026-09-14)
* (@GermanBluefox) Rules: selection of state fixed
* (@GermanBluefox) Fixed debugger

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
