# Function block diagrams (FBD)

A function block diagram is logic drawn from blocks, the way a PLC is programmed in CFC: timers, flip-flops,
comparisons and arithmetic, wired to ioBroker states. It is meant for logic that runs all the time - delays,
latches, thresholds - and for users who know this style from a PLC. To react to a single event, Blockly or Rules
are usually the simpler choice.

The diagram is turned into JavaScript when it is saved and runs like every other script of this adapter.

## Creating a diagram

Add a new script and choose **Function block diagram**. The editor has three parts:

- **Palette** (left), with a search and three tabs:
  - **Blocks**: the blocks by category - drag one onto the canvas, or click it to add it. A category opens and
    closes with a click on its name.
  - **Variables**: the states the diagram reads and writes; a click shows the block.
  - **Favorites**: the blocks marked with the star that shows when the mouse is over a block.
- **Canvas**: connect an output (right side of a block) with an input (left side). Only fitting types can be
  connected - the color of a pin shows its type; a link let go on a pin that does not take it says why. An input
  takes one link. `Delete` removes what is selected.
- **Properties** (right): **Properties** shows the settings of the selected block in parts that open and close -
  general (instance name, type, a comment), parameters, inputs and, for timers, flip-flops, edges and control blocks,
  a **preview**: a timing diagram of the block with its values. **Documentation** describes the block and its pins.
  With nothing selected: the settings of the diagram, and the keys.

A block shows what matters right in it: the state it reads or writes, the value of a `CONST`, and the values of the
inputs that are not connected - these can be changed right there: a click switches a BOOL, anything else is typed in
and taken with `Enter`. In the head of a block, the gear shows its properties, the menu `⋮` duplicates or deletes it
(online also: breakpoint; for an own block: inside view).

Problems are listed at the bottom of the canvas; a click selects the block. A diagram with errors can be saved, but
its script does not run - it logs the errors instead.

The button **FBD → JS** shows the generated code.

Editing works as usual: `Ctrl+Z` / `Ctrl+Y` (or the buttons of the toolbar) undo and redo, `Ctrl+C`, `Ctrl+X`
and `Ctrl+V` copy, cut and paste the selected blocks with the links between them - also into another diagram. Pasted
blocks get new IDs, and new names where the old ones are taken.

The bar above the canvas shows the diagram (and the path into an instance) and has the tools:

- the zoom: smaller, the zoom (a click: 100 %), larger
- **Arrange automatically** puts the blocks in columns along the data flow: inputs on the left, outputs on the
  right, each block level with the blocks it is linked to. Comments stay where they are. `Ctrl+Z` takes it back.
- **Find in the diagram** (`Ctrl+F`) finds blocks by instance name, type, state ID or other parameter, comments by
  their text. `Enter` goes to the next match, `Shift+Enter` to the one before, `Esc` closes the search.
- **Grid** on or off (with it, blocks snap to it), and links as curves or at right angles as in CFC - both are kept
  by the browser, not in the diagram
- on the right the online view, see below

**Connection marks**: a link across the whole diagram can be shown as a mark at both ends instead of a line - select
the link and switch on **Show as a connection mark** in its properties. Both marks show the name of the block the
link comes from, or a name of their own. A double click on a mark jumps to the other end. Only the drawing changes,
the link works the same.

## Online view

**Online** (on the right of the bar above the canvas) shows the values of the running diagram: at every output, BOOL
links in green (`TRUE`) or grey (`FALSE`), other links with their value in the middle. Next to the button, or under
it:

- the cycle count - it stands still when the diagram stopped running
- a warning when no data comes (the script does not run, or its instance is stopped)
- a hint when the diagram was changed after saving: the values belong to the saved version

When a cycle fails, the block whose code failed is framed in red and the error is listed at the bottom left; the
log names the block too (`Error in the function block diagram in block b7: ...`).

The values only flow while an editor shows the diagram online: the editor asks the adapter every 10 s, and after 30 s
without a request the diagram stops sending. At most four updates a second are sent, each with the values that
changed only. A diagram saved before this version shows the cycle count, but no values - save it once.

### Inside an instance

A double click on an instance of an own block (or **Inside view** in its properties) shows the diagram of the
block - as this diagram carries it, read only - and online with the values of just this instance. An instance inside
it opens the same way; the path at the top left leads back, and so does `Esc`. Values inside can be forced;
breakpoints are set in the diagram itself. The values inside need a diagram saved with this version.

### Forcing values, breakpoints, single steps

While the diagram is shown online, it can be steered:

- **Forcing**: select a block (or a link) - its properties show the outputs with their values. **TRUE** / **FALSE**,
  or a value and **Force**, hold the output at that value, whatever the block computes; the blocks behind it and the
  states the diagram writes get the forced value. A forced value is framed in orange; **Release** lets it go.
- **Breakpoints**: the dot at the top left of a block, `F9` or **Breakpoint** in its properties. The diagram stops in
  front of that block; the block that runs next is framed in yellow, and the values show how far the cycle got.
- The buttons left of **Online**: **Pause** / **Run on** (`F8`), **One cycle**, and **One block** (`F10`). While the
  diagram waits, the changes of its inputs wait too. A cycle started by hand counts one cycle time as time passed,
  so timers behave as they would, however long the diagram waited.

All of that ends with the online view: when the editor switches it off, is closed or goes away (30 s without a
request), the runtime releases the forced values, removes the breakpoints and runs on - it logs that. Saving the
diagram keeps forced values and breakpoints while the online view stays open. Breakpoints and single steps need a
diagram saved with this version; a diagram saved before can already be forced and paused.

**Careful:** a forced value acts on real devices - the diagram writes its states with it.

## Blocks

| Category   | Blocks                                                           |
|------------|------------------------------------------------------------------|
| ioBroker   | `STATE_IN`, `STATE_OUT`, `CONST`                                 |
| Logic      | `AND`, `OR`, `XOR`, `NOT`                                        |
| Memory     | `RS`, `SR`, `R_TRIG`, `F_TRIG`                                   |
| Timers     | `TON`, `TOF`, `TP`, `BLINK`                                      |
| Counters   | `CTU`, `CTD`, `CTUD`                                             |
| Comparison | `GT`, `GE`, `LT`, `LE`, `EQ`, `NE`                               |
| Arithmetic | `ADD`, `SUB`, `MUL`, `DIV`, `MIN`, `MAX`, `ROUND`                |
| Conversion | `TO_BOOL`, `TO_INT`, `TO_REAL`, `TO_TIME`, `TO_STRING`, `CONCAT` |
| Control    | `HYST`, `RAMP`, `PT1`, `PID`                                     |
| Calendar   | `CLOCK`, `TIMEWINDOW`, `SCHEDULE`, `ASTRO`                       |
| Messages   | `LOG`, `NOTIFY`, `SENDTO`                                         |
| Expert     | `JS`                                                             |

The names and the behavior follow IEC 61131-3. `AND`, `OR`, `XOR`, `ADD`, `MUL`, `MIN`, `MAX` and `CONCAT` can
have 2 to 16 inputs. Times are entered like `500ms`, `2s`, `1m30s` or `T#2s`, times of day like `08:30`.

The control blocks:

- `HYST` - two-point switch: `Q` goes on when `IN` rises above `HIGH` and off when it falls below `LOW`; in between
  it stays as it is. A heating that switches on below `LOW` takes `Q` inverted (`NOT`, or an inverted input).
- `RAMP` - `OUT` follows `IN`, but changes by at most `UP` per second upwards and `DOWN` per second downwards; `0`
  does not limit. It starts at `IN`.
- `PT1` - low pass of the first order: `OUT` follows `IN` with the time constant `T` (after `T`, 63 % of a step are
  reached). Smooths a noisy value; it starts at `IN`.
- `PID` - PID controller: set point `SP`, process value `PV`, output `Y` between `YMIN` and `YMAX`. `KP` is the gain,
  `TN` the reset time of the integral part, `TV` the derivative time; `TN` or `TV` of `0` leaves that part out.
  While `Y` is at a limit, the integral part does not grow further (anti-windup); the derivative is taken from `PV`,
  so a new set point gives no kick. `RST` clears the integral part.

`RAMP`, `PT1` and `PID` depend on time: a diagram with them runs cyclically.

Timers and counters:

- `BLINK` - while `EN` is true, `Q` is true for `TH` and false for `TL`, beginning with true.
- `CTU` counts the rising edges of `CU`; `R` sets `CV` back to 0, `Q` is true once `CV` reached `PV`. `CTD`
  counts down on `CD`, `LD` loads `PV`, `Q` is true at 0 and below. `CTUD` does both; `R` goes before `LD`, and
  edges of `CU` and `CD` in the same cycle cancel out. An input that is already true when the script starts is no
  edge. The count is not kept over a restart of the script.

Conversion: `TO_BOOL`, `TO_INT`, `TO_REAL`, `TO_TIME` and `TO_STRING` take any type. `TO_INT` rounds, a decimal
comma counts as a point, and what is no number gives 0; `TO_TIME` reads a number as ms and a text like `2s` or
`08:30`. `CONCAT` joins its inputs into one text - numbers as they are, so round them with `ROUND` first (`DIGITS`
decimals, 0 to 10).

The calendar:

- `CLOCK` - the local time: `TOD` (time of day), `HOUR`, `MIN`, `WDAY` (1 Monday ... 7 Sunday), `DAY`, `MONTH`,
  `YEAR`.
- `TIMEWINDOW` - `Q` is true from `START` to `END` on the chosen days (every day, Monday to Friday, Saturday and
  Sunday). A window over midnight, like `22:00` to `06:00`, belongs to the day it starts on: on Monday to Friday it
  lasts from Friday night into Saturday morning, but not from Sunday night into Monday.
- `SCHEDULE` - `Q` is true for one cycle when the time of the cron pattern comes, like `0 8 * * 1-5` for 8:00 on
  Monday to Friday, or with seconds in front `*/5 * * * * *` for every 5 seconds. The button next to the field opens the dialog for the pattern.
- `ASTRO` - `Q` is true from one event of the sun to another, like from `sunset` to `sunrise`, each with an offset
  in minutes. `START` and `END` are the times of the two events today. The position is the one in the settings of
  the adapter; without it there are no times, and `Q` stays false.

`CLOCK`, `TIMEWINDOW` and `ASTRO` make a diagram run cyclically. `SCHEDULE` does not: when its time comes, the
diagram runs at once, and once more right after it to end the pulse.

- `STATE_IN` reads a state and converts it to the chosen type (`BOOL`, `INT`, `REAL`, `STRING`). A value that
  cannot be converted is reported once in the log and read as 0. When the state ID changes - picked in the dialog
  or typed - the type is taken from the object of the state, and a block that still has its first name is named
  after the state. The type can be set differently afterwards; it is taken again only with the next ID.
- `STATE_OUT` writes a state only when the value changes. `Minimum time between writes` limits how often it
  writes; the last value is written when the time is over.
- `CONST` is a value of the chosen type. Linked to an input of another type, it takes the type of the input and
  keeps its value as far as it goes (`"0"` becomes 0 ms for a `TIME`) - unless it feeds other inputs already that
  the new type would not fit.

The messages:

- `LOG` writes a line into the log of ioBroker, with the chosen level (`info`, `warn`, `error`, `debug`): on a
  rising edge of `TRIG`, or whenever `IN` changes. `%s` in the text is the value of `IN`. At most 20 lines a minute -
  a diagram that runs every 200 ms would flood the log otherwise; the 20th line says so.
- `NOTIFY` sends the text as a notification of ioBroker - a message or an alert - and `SENDTO` to an adapter like
  `telegram.0`, `pushover.0` or `email.0`, as `{ text, message, title, subject }` with the chosen command (`send`).
  Both send when `LOG` would write, at most 5 times a minute; the log says when more were left out.

The expert block `JS` runs code of its own. The code is the body of a function that gets the inputs `IN1` ...
`INn` (0 to 8, of any type), `dt` (ms since the last cycle), `firstScan` and `state` - an object that is kept from
one cycle to the next. It returns the value of `OUT1`, or an array `[OUT1, OUT2, ...]` for more outputs (1 to 8);
where it gives `undefined`, an output keeps its value. The outputs may be connected to inputs of any type, so the
code has to put out what they expect.

```js
// counts how often IN1 went above IN2
if (IN1 > IN2 && !state.above) {
    state.count = (state.count || 0) + 1;
}
state.above = IN1 > IN2;
return state.count || 0;
```

The code runs in the script of the diagram, so it can call the functions of scripts like `log()` - but it should
not wait for anything: the next block needs its outputs at once. A syntax error is shown before the diagram is
saved, an error when it runs at the block.

Signal types: `BOOL`, `INT`, `REAL`, `TIME`, `STRING`. An `INT` may be connected to a `REAL` input; other
conversions are not done by themselves.

## Own blocks

A diagram can be a block itself, which other diagrams use as often as they like - like a function block in a PLC.
Switch on **This diagram is a block** in the settings of the diagram and give the block a name and a description.

- The inputs of the block are `FB_IN` blocks, its outputs `FB_OUT` blocks (category **Interface**, only offered in
  the diagram of a block). The pin name is what the input or output is called on the block; `FB_IN` also has a type
  and the value the input has when it is not connected.
- A block has no access to states: `STATE_IN` and `STATE_OUT` are not allowed in it, `CONST` is. It may use other
  own blocks, but not itself.
- Every instance has its own state - two instances of a block with a timer time independently.
- The script of a block does nothing when it runs; the block only works in the diagrams that use it.

The blocks of all diagrams are offered in the palette under **Own blocks**. The diagram that uses a block stores a
copy of it, and with it the version: every saved change of a block is a new version. The diagrams that use an older
one keep working with it and show a notice - **Update** in the properties of an instance takes the new version into
the diagram, **Open block** opens the diagram of the block. Links to inputs or outputs that no longer exist are
removed by the update.

Because the copy is stored with the diagram, a diagram keeps working when the block is deleted, and it can be
exported and imported alone. Copying instances into another diagram takes the block along.

An error in a block is reported at the instance that ran it, in the editor and in the log.

## Execution

The blocks run in the order of the data flow; the number in the corner of each block is its position. Blocks that
could run at the same time run from left to right, then from top to bottom.

- **Event driven**: when no block depends on time, the diagram runs whenever an input changes. Changes within
  20 ms run together in one cycle.
- **Cyclic**: as soon as the diagram contains a timer, it runs every 200 ms (50 ms to 10 s, see the settings of
  the diagram), and additionally right after an input changed.

The execution mode is chosen automatically, or can be set in the settings of the diagram.

A loop is only allowed through a block that stores a value (timer, counter, flip-flop, edge, control block,
`JS`, own block): the link that leads back
reads what that block put out in the previous cycle and is drawn as a double line. A loop without such a block
is an error.

A timer counts from the cycle in which it sees its input change, so it never expires before its time - at most
one cycle later.

## Limits

- Not for safety related functions. A diagram runs in a script of ioBroker, without real time guarantees.
- The state of the blocks is not kept over a restart of the script.
- Not yet available: breakpoints inside an own block, a manual execution order, links routed around blocks.

## Storage

The diagram is stored in the script itself, as the last line of `common.source` (`//#fbd:{...}`); the lines above
are the generated code. The diagram includes the copies of the own blocks it uses. The blocks of the library are implemented in the module `@iobroker/fb-runtime`, which comes with the
adapter, and not copied into every script.
