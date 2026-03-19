# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ioBroker.javascript is a JavaScript/TypeScript/Blockly script engine adapter for the ioBroker home automation platform. It runs as a daemon adapter that executes user-written scripts in a sandboxed environment, with a web-based editor UI (Monaco + Blockly) and an admin configuration panel.

## Build Commands

```bash
# Full build (backend TypeScript + both frontends)
npm run build

# Backend only (TypeScript → build/)
npm run build-backend

# Editor UI only (src-editor → admin/)
npm run build-editor

# Admin config UI only (src-admin → admin/custom/)
npm run admin-build

# Install all dependencies (root + src-editor + src-admin)
npm run npm
```

## Testing

```bash
# All tests (declaration checks + integration)
npm test

# Individual test suites
npm run test:declarations    # TypeScript declaration compilation checks
npm run test:integration     # Mocha integration tests (test/testFunctions.js etc.)
npm run test:scheduler       # Scheduler/cron tests only
npm run test:package         # Package structure validation

# Run a single test file directly
npx mocha test/testScheduler.js --exit
```

Test framework is Mocha, configured via `.mocharc.json`. Tests are in `test/`.

## Linting

```bash
npm run lint          # Lint backend (root) only
npm run lint-all      # Lint root + src-editor + src-admin
```

ESLint uses `@iobroker/eslint-config` (flat config in `eslint.config.mjs`). Prettier config extends `@iobroker/eslint-config/prettier.config.mjs`. The root ESLint config only covers `src/` — frontend directories have their own configs.

## Architecture

### Three codebases in one repo

1. **Backend adapter** (`src/` → compiled to `build/`): Node.js TypeScript, compiled to CommonJS. Entry point is `src/main.ts`. Runs as an ioBroker adapter daemon.

2. **Script editor UI** (`src-editor/`): React + TypeScript app built with Vite. Contains the Monaco code editor, Blockly visual editor, script management sidebar, log viewer, and OpenAI integration. Built output is copied to `admin/` by `tasks.js`.

3. **Admin config UI** (`src-admin/`): React + TypeScript app built with Vite. Provides adapter configuration via `@iobroker/json-config`. Built output goes to `admin/custom/`.

Each frontend has its own `package.json`, `node_modules`, and ESLint config. The build orchestration in `tasks.js` handles cleanup, npm installs, compilation, and copying built assets to `admin/`.

### Key backend modules (`src/lib/`)

- **`sandbox.ts`** (~244KB) — The script execution sandbox. Provides all global functions available to user scripts (`getState`, `setState`, `on`, `schedule`, `createState`, `httpGet`, etc.). This is the core of the adapter.
- **`scheduler.ts`** — Cron and astro-based scheduling engine (sunrise/sunset events via suncalc2).
- **`protectFs.ts`** — Filesystem access control for sandboxed scripts.
- **`debugger.ts`** — Script debugging support.
- **`mirror.ts`** — Mirrors scripts to/from the filesystem.
- **`javascript.d.ts`** (~140KB) — Complete TypeScript type definitions for the script API, used for editor autocompletion.
- **`typescriptTools.ts`** — TypeScript compilation for user scripts (via `virtual-tsc`).

### Build orchestration (`tasks.js`)

Custom Node.js build script using `@iobroker/build-tools`. Supports granular steps via CLI flags (`--0-clean`, `--1-npm`, `--2-build`, `--3-copy`, `--4-patch`). The `npm run build` command runs backend compilation first, then `node tasks` for the full frontend build pipeline.

### Adapter configuration

`io-package.json` defines adapter metadata, native configuration defaults, instance objects (astro variables, debug states), and ioBroker dependency requirements (js-controller >=5.0.19, admin >=7.6.1).

## TypeScript Configuration

- Backend targets ES2022, compiled to CommonJS (`tsconfig.build.json`)
- `@types/node` major version should match the lowest supported Node.js version
- Frontend apps target Chrome 89+ (Vite build config)

## CI/CD

GitHub Actions (`.github/workflows/test-and-release.yml`) runs lint, build, and adapter tests across Node 18/20/22/24 on Ubuntu, Windows, and macOS. Releases are automated via `@alcalzone/release-script` with NPM publish and GitHub release creation.
