# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ioBroker.javascript is a **Rules Engine adapter** for ioBroker that executes user-written JavaScript, TypeScript, Blockly, and Rules scripts in sandboxed Node.js VM environments. It provides a rich API for home automation (state subscriptions, scheduling, pattern matching, notifications) and includes a full-featured browser-based editor with Monaco, Blockly, and debugging support.

## Build & Development Commands

```bash
# Install all dependencies (root + src-editor + src-admin)
npm run npm

# Full build (backend TypeScript + editor/admin UIs + tasks)
npm run build

# Backend only (TypeScript compilation)
npm run build-backend

# Editor UI only
npm run build-editor

# Admin UI only
npm run admin-build
```

### Testing

```bash
# Full test suite (declaration checks + integration tests)
npm test

# Individual test suites
npm run test:integration        # Mocha integration tests
npm run test:declarations       # TypeScript/JS declaration compilation checks
npm run test:package            # Package file validation
npm run test:scheduler          # Scheduler-specific tests

# Run a single test file
npx mocha test/testScheduler.js --exit

# Run tests matching a pattern
npx mocha --grep "pattern" --exit
```

### Linting

```bash
npm run lint          # Lint backend (src/) only
npm run lint-all      # Lint backend + src-editor + src-admin
```

ESLint uses flat config (`eslint.config.mjs`) extending `@iobroker/eslint-config`. Prettier config inherits from the same package.

## Architecture

### Three Package Roots

The project has three independent npm packages (not using workspaces):

| Directory | Purpose | Build Tool |
|-----------|---------|------------|
| `/` (root) | Backend adapter + tests | TypeScript (`tsc`) |
| `src-editor/` | Script editor React SPA | Vite + Module Federation |
| `src-admin/` | Admin settings panel | Vite + Module Federation |

Each has its own `package.json`, `eslint.config.mjs`, and `tsconfig.json`.

### Backend (`src/`)

**`src/main.ts`** (~19k lines) - The adapter class extending `ioBroker.Adapter`. Handles the full lifecycle: object/state change events, script compilation and execution, TypeScript compilation, debug sessions, message handling, and script mirroring.

**`src/lib/sandbox.ts`** (~5.5k lines) - Creates the sandboxed execution environment for each user script. Exposes the automation API: `setState()`, `getState()`, `on()`, `schedule()`, `$()` selector, `exec()`, HTTP helpers, notifications, etc. Each script gets its own sandbox instance with isolated timers and subscriptions.

Key supporting modules in `src/lib/`:

| Module | Role |
|--------|------|
| `protectFs.ts` | Wraps Node.js `fs` to restrict script filesystem access |
| `scheduler.ts` | Manages cron, astro (sunrise/sunset), and interval schedules |
| `typescriptTools.ts` | In-memory TypeScript compilation via `virtual-tsc` |
| `debugger.ts` | Breakpoint debugging via child process fork |
| `mirror.ts` | Bidirectional sync between ioBroker DB scripts and filesystem |
| `patternCompareFunctions.ts` | Pattern matching for state subscriptions |
| `eventObj.ts` | Event object creation for subscription callbacks |

### Script Execution Flow

1. Script object created/updated in ioBroker object DB
2. `main.ts` detects change, compiles if TypeScript/Blockly
3. Global scripts compile first (provide shared declarations)
4. Script wrapped in Node.js `vm.Script` with sandbox context
5. Sandbox tracks all timers, subscriptions, schedules per script
6. On script stop/update, all resources are cleaned up

### Frontend (`src-editor/`)

React SPA with Monaco editor, Blockly visual editor, Rules editor, debugger UI, and AI chat panel. Communicates with the backend adapter via ioBroker admin WebSocket connection. Uses Module Federation for dynamic loading.

### Frontend (`src-admin/`)

React component for adapter instance configuration in the ioBroker admin panel. Uses `@iobroker/adapter-react-v5` and Material-UI.

### Build Pipeline

`tasks.js` orchestrates builds using `@iobroker/build-tools`:
- Backend: `tsc -p tsconfig.build.json` compiles `src/` to `build/`
- Editor: Vite build in `src-editor/`, output copied to `admin/`
- Admin: Vite build in `src-admin/`, output copied to `admin/custom/`

### Key Configuration Files

- `io-package.json` - ioBroker adapter metadata, instance settings schema, supported features
- `admin/jsonConfig.json` - Admin UI configuration schema (rendered by ioBroker admin)
- `tsconfig.build.json` - Backend build config (CommonJS output, ES2022 target)

## Conventions

- Node.js >= 18 required
- Backend TypeScript compiles to CommonJS (`module: "commonjs"`)
- `@types/node` major version should match the lowest supported Node.js version
- Test framework is Mocha with `@iobroker/testing` helpers
- CI runs tests across Node 18/20/22/24 on Ubuntu/Windows/macOS
- Releases use `@alcalzone/release-script` with Sentry notifications
