# Function block diagrams (FBD)

A function block diagram is logic drawn from blocks, the way a PLC is programmed in CFC: timers, flip-flops,
comparisons and arithmetic, wired to ioBroker states. It is meant for logic that runs all the time - delays,
latches, thresholds - and for users who know this style from a PLC. To react to a single event, Blockly or Rules
are usually the simpler choice.

The diagram is turned into JavaScript when it is saved and runs like every other script of this adapter.

## Creating a diagram

Add a new script and choose **Function block diagram**. The editor has three parts:

- **Palette** (left): the blocks by category. Drag a block onto the canvas, or click it to add it.
- **Canvas**: connect an output (right side of a block) with an input (left side). Only fitting types can be
  connected; an input takes one link. `Delete` removes what is selected.
- **Properties** (right): the settings of the selected block - its instance name, the state it reads or writes,
  the values of inputs that are not connected, inverted inputs. With nothing selected, the settings of the diagram.

Problems are listed at the bottom left of the canvas; a click selects the block. A diagram with errors can be
saved, but its script does not run - it logs the errors instead.

The button **FBD → JS** shows the generated code.

## Blocks

| Category   | Blocks                                            |
|------------|---------------------------------------------------|
| ioBroker   | `STATE_IN`, `STATE_OUT`, `CONST`                  |
| Logic      | `AND`, `OR`, `XOR`, `NOT`, `RS`, `SR`, `R_TRIG`, `F_TRIG` |
| Timers     | `TON`, `TOF`, `TP`                                |
| Comparison | `GT`, `GE`, `LT`, `LE`, `EQ`, `NE`                |
| Arithmetic | `ADD`, `SUB`, `MUL`, `DIV`, `MIN`, `MAX`          |

The names and the behavior follow IEC 61131-3. `AND`, `OR`, `XOR`, `ADD`, `MUL`, `MIN` and `MAX` can have 2 to 16
inputs. Times are entered like `500ms`, `2s`, `1m30s` or `T#2s`.

- `STATE_IN` reads a state and converts it to the chosen type (`BOOL`, `INT`, `REAL`, `STRING`). A value that
  cannot be converted is reported once in the log and read as 0. When a state is selected, the type is taken
  from its object.
- `STATE_OUT` writes a state only when the value changes. `Minimum time between writes` limits how often it
  writes; the last value is written when the time is over.

Signal types: `BOOL`, `INT`, `REAL`, `TIME`, `STRING`. An `INT` may be connected to a `REAL` input; other
conversions are not done by themselves.

## Execution

The blocks run in the order of the data flow; the number in the corner of each block is its position. Blocks that
could run at the same time run from left to right, then from top to bottom.

- **Event driven**: when no block depends on time, the diagram runs whenever an input changes. Changes within
  20 ms run together in one cycle.
- **Cyclic**: as soon as the diagram contains a timer, it runs every 200 ms (50 ms to 10 s, see the settings of
  the diagram), and additionally right after an input changed.

The execution mode is chosen automatically, or can be set in the settings of the diagram.

A loop is only allowed through a block that stores a value (timer, flip-flop, edge): the link that leads back
reads what that block put out in the previous cycle and is drawn as a double line. A loop without such a block
is an error.

A timer counts from the cycle in which it sees its input change, so it never expires before its time - at most
one cycle later.

## Limits

- Not for safety related functions. A diagram runs in a script of ioBroker, without real time guarantees.
- The state of the blocks is not kept over a restart of the script.
- Not yet available: online view of the values, own blocks and sub diagrams, copy and paste, undo, automatic
  layout.

## Storage

The diagram is stored in the script itself, as the last line of `common.source` (`//#fbd:{...}`); the lines above
are the generated code. The blocks are implemented in the module `@iobroker/fb-runtime`, which comes with the
adapter, and not copied into every script.
