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
- 🇩🇪 [Benutzung](docs/de/usage.md)
- Blockly
  - 🇺🇸 Here you can find the description of [blockly](docs/en/blockly.md). 
  - 🇩🇪 Hier kann man die Beschreibung von [Blockly](docs/de/blockly.md) finden. 
  - 🇷🇺 Описание по [blockly](docs/ru/blockly.md) можно найти [здесь](docs/ru/blockly.md).

<!--
  ### **WORK IN PROGRESS**
-->

## Changelog
### 10.2.2 (2026-09-12)
* (@GermanBluefox) Rules: selection of state fixed

### 10.2.0 (2026-09-11)
* (@GermanBluefox) Rules: an empty "and" band folds down to its heading. A rule without conditions runs its actions on every trigger, but that band was still the tallest thing in the rule - a drop area with a 64px floor, the "just check" selector and an "or" row per group, 292px for nothing. It is 41px now and says "without condition", clicking the heading opens it again, dragging a condition over it opens it by itself, and a band that has conditions in it never folds
* (@GermanBluefox) Rules: the block palette takes half the room it did. An entry carried 24px of padding around a 30px icon, which left 66px of sidebar for one line of text - so four blocks filled the whole height and everything else was behind a scrollbar. Entries are 31px apart now, the icon-only tabs above them no longer reserve the height of a label they do not have, and the sidebar is 168px instead of 200px wide. A name too long for that gets the full text as its tooltip. The button that folds the palette away also sits on the palette's line now instead of one pixel to the left of it, where it hung over the edge of the window once the palette was folded away
* (@GermanBluefox) Rules: picking the state of a trigger took the editor down with "n.replace is not a function" when a condition on a string state had no value entered yet. Choosing a state compiles the whole rule again, and the empty value arrived at the comparison as the boolean `false`. A condition without a value now compares against an empty text, and a number entered for a state that is a string is used as its text
* (@GermanBluefox) The script editor now tells the adapter every 10 seconds that it is open, and the adapter keeps the type definitions and the compiler hot while that is the case, so saving a script does not wait for them to be built again. 30 seconds after the last sign of life the GUI counts as gone and everything is given back - about 100 MB. A tab in the background does not count as open, so a forgotten browser tab cannot keep the memory alive for days (#2373)
* (@GermanBluefox) The type definitions of Node.js, ioBroker and the configured libraries were read at every start, whether anything wanted them or not. Only two things do - compiling a TypeScript script and the built-in editor - and they add about 90 MB to the compiler, so they are now read when one of those actually asks. An instance that runs plain JavaScript and is edited elsewhere (mirror directory, external editor) never reads them; the declarations of global JavaScripts are generated without them and come out the same. They can also be switched off for good ("Load type definitions", TypeScript tab) - the editor then loses its autocompletion and TypeScript scripts no longer compile, which the adapter warns about in the log (#2373)
* (@GermanBluefox) Every instance kept two TypeScript language services alive whether it needed them or not, and each one held on to about 95 MB once it had compiled anything. They are now built on the first compilation only, and the declarations of global JavaScripts are stored on the script object the same way compiled TypeScript sources already were - so a restart no longer regenerates them. What a language service does end up building is released again a minute after the last compilation and rebuilt on demand. On a test system this took an instance from 241 MB to 127 MB heap (352 MB to 233 MB RSS) (#2373)
* (@GermanBluefox) The helpers that the script editor draws on its own - the "Explain / Refactor / Test" row above every function, the tooltips for object IDs and CRON expressions, and the inline code suggestions - can be switched off. The instance setting "Show AI helpers in the script editor" (AI settings) does it; it is on by default, so nothing changes for anyone who is happy with them. `Alt+I` still shows the value of the object ID under the cursor when they are off
* (@GermanBluefox) The reasoning of an OpenAI-compatible endpoint was switched off unconditionally: `reasoning_effort: "none"` went out with every request as soon as a custom base URL was configured. That is right for a small local model and wrong for everything else - behind a proxy it turns off the reasoning of the very model one is paying for, or is rejected. It is a setting now ("Reasoning effort"), and the default leaves the parameter out and lets the endpoint decide
* (@GermanBluefox) The AI editor told the adapter how long it was willing to wait, and the adapter never read it: a stuck inline completion held its slot for the full ten minutes instead of the fifteen seconds it asked for
* (@GermanBluefox) The inline completion took the model chosen in the AI chat but picked the provider itself, so a model of one provider could be requested with the credentials and at the endpoint of another. Model and provider are now remembered and used together
* (@GermanBluefox) When two providers offer a model of the same name - a proxy and the vendor behind it, for instance - which of them served it was decided by whichever answered first, and could change from one reload to the next. The provider configured first wins now, so the direct route is preferred over a proxy

### 10.1.4 (2026-09-03)
* (@GermanBluefox) Rules: the text of an action can round the trigger value with `%.1s` - any number of digits after the decimal point, also `%.2old` for the old value - formatted with the decimal separator of the system, so `Kühlschrank zu warm (%.1s°C)` gives `29,4°C` where `%s` gave `29.400000000000002°C`
* (@GermanBluefox) Corrected the function block in blockly
* (@GermanBluefox) A custom OpenAI-compatible AI endpoint answered "Invalid API key" in the inline completion and while loading the model list, although the test button in the settings said "ok": both asked the adapter for the provider `openai`, and the adapter picks the key by that name, so they used the "OpenAI API key" instead of the "Custom API key". The custom endpoint is now addressed as what it is, everywhere (#2369)
* (@GermanBluefox) A configured "Custom API Base URL" also redirected every request meant for OpenAI itself to that address - with the OpenAI key attached and no way to switch it off. The base URL now belongs to the custom endpoint alone, so both can be used side by side. If the key of your custom endpoint is in the "OpenAI API key" field, move it to the "Custom API key" field; the adapter writes a warning in the log if it finds such a setup (#2369)
* (@GermanBluefox) A folded "or"/"else" section of a rule still occupied the 64px every section reserves as a drop target, and showed the top 64px of the very cards it was supposed to hide - clipped, and out of reach of the scrollbar. Being the last thing in the rule, that looked like a rule that could not be scrolled to its end
* (@GermanBluefox) The 1px line between the script tabs and the toolbar stopped 10px short of the left edge and 40px short of the right one: the tab row carried a margin and a `calc(100% - 50px)` width to leave room for the "close all but current" button. Both are padding on the tab strip now, so the line reaches the edges of the pane
* (@GermanBluefox) Blockly was grey in every dark theme - workspace, toolbox and flyout were hard-coded colours, which left a grey block sitting in the middle of, for instance, the navy "modernDark" admin. They follow the colours of the active ioBroker theme now, in light themes as well. The blocks themselves keep the colour of their category

### 10.1.3 (2026-08-30)
* (@GermanBluefox) The plain text export named its files after the script ID instead of the script name, so every dot of a name came out as an underscore - `HK-Balkontuer_v0.1` was exported as `HK-Balkontuer_v0_1.js`, and importing it back renamed the script to that. The files are now named after the script (#2364)
* (@GermanBluefox) Importing a plain text export treated a dot inside a file name as a folder level, so `PW-TV-Control_v0.6.js` created a folder `PW-TV-Control_v0` containing a script named `6`. Only the directories of the ZIP are folders now (#2364)
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
