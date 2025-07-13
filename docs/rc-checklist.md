## Release Candidate Checklist


### Documentation Checklist [ `docs/` ]

**State** is interpreted as *Urgency*, *Difficulty*, or *Completeness*

<!-- lint-disable-links -->

| ● | State   | Document                                | Notes                                 |
|:-:|:--------|:----------------------------------------|---------------------------------------|
|   |         | **Phase 1**                             | **Foundational Update**               |
| ✔ | Now     | **`guides/plugin-development.md`**      | Rewrite completely                    |
| ✔ | Now     | **`refs/cheat-sheet.md`**               | Modernize - doubles as *smoketester*  |
| ✔ | Medium  | **`plugins/README.md`**                 | Modernize                             |
| ✔ | Low     | `refs/plugin-contract.md`               | Consistency                           |
| ✔ | Auto    | **`scripts/index.md`**                  | `node scripts/docs/update-scripts.js` |
|   |         | **Phase 2**                             | **Strategic Synthesis**               |
| ✔ | Low     | `test/README.md`                        | Modernize                             |
| ✔ | Low     | `docs/reorganization-planner.md`        | Move to `docs/archive/v0.10/`         |
|   |         | **Phase 3**                             | **Future-Facing Content**             |
| ● | New     | `docs/walkthroughs/` → `test/e2e/`      | Walkthroughs & `e2e/level-4` parity   |
| ✔ | New     | `docs/ai/`                              | AI specification documents**          |
|   |         | **Phase 4**                             | **Indexing & Navigation**             |
| ✔ | Later   | `docs/index.md`                         | Organize by section                   |
| ✔ | Later   | `test/README.md` → `test/index.md`      | Retool for consistency                |
| ✔ | New     | `scripts/refactor/index.md`             | Recursive indexing + delegation       |
| ✔ | New     | `plugins/README.md` → `plugins/index.md`| Script and modernize                  |
| ✔ | New     | `scripts/update-project-indices.js`     | Unified Tool 'n Doc Index Script      | 
|   |         | **Phase 5**                             | **Marketability & Concision**         |
| ✔ | Finish  | `config.example.yaml`                   | Modernize - needs PM2                 |
| ✔ | Finish  | `scripts/docs/postman.mjs`              | Ensure link-ticks are valid           |
| ‖ | Finish  | **`README.md`**                         | **Update for v0.10**                  |

<!-- lint-enable-links -->
At the onset of the above task table, all documents were in a v0.9.00 state, needing huge rewrites to v0.10.x feature state. The main README should wait until v0.10 has stabilized.

---

### Repo Health Checklists

---

These are internal, code-hygienic tasks.


**Pathing & Dependency Management**

| ✔ | `pR`| Task Description                                                 |
|:-:|:----|:-----------------------------------------------------------------|
| ✔ |`pR1`| Build a centralized pathing registry                             |
| ✔ |`pR2`| Implement module aliases for safer, faster refactoring           |
| ✔ |`pR3`| Strengthen `require()` path robustness with a pathing registry   |
| ✔ |`pR4`| Tie registry to module aliases for resilient dependencies        |

*Status: Complete*

---

**Plugin Management**

| ✔ | `PM`| Task Description                                                 |
|:-:|:----|:-----------------------------------------------------------------|
| ✔ |`PM1`| Automatically register plugins from the plugins directory        | 
| ✔ |`PM2`| Eliminate need for explicit paths in `config.example.yaml`       |
| ✔ |`PM3`| Restore compatibility with D3.js slide plugin                    |

*Status: Complete*

---

**Tab Completion Errata**

| ✔ | `tC`| Task Description                                                 |
|:-:|:----|:-----------------------------------------------------------------|
| ✔ |`tC1`| Prevent tab completion errors from blocking core operations      |
| ✔ |`tC2`| Decouple completion errors from state-changing commands          |
| × |`tC3`| Optimize system path completion for zero perceived delay         |
| × |`tC4`| Hand off dynamic content earlier for smoother experience         |

*Status: Complete*

---

[**Linting and Automation Rules**](#linting-and-automation-rules)

| ✔ | `lg`| Task Description                                                 |
|:-:|:----|:-----------------------------------------------------------------|
| ✔ |`lg1`| Add and configure ESLint                                         |
| ✔ |`lg2`| Create unified lint script combining custom and ESLint checks    |
| ✔ |`lg3`| Set up Husky for local pre-commit, pre-tag/push automation       |
| ✔ |`lg4`| Configure GitHub Actions for CI workflows                        |
| ✔ |`lg5`| Automate version bumping and release tagging                     |

*Status: In Progress*

---

[**Testing, Debugging, and Telemetry**](#testing-debugging-and-telemetry)
<!-- lint-disable-links -->

| ● | `tt`| Task Description                                                 |
|:-:|:----|:-----------------------------------------------------------------|
| ✔ |`tt1`| Remove all old debugging code                                    |
| ✔ |`tt2`| Add `test-wacher.js` to exec tests on app code changes           |
| ✔ |`tt3`| Fix `--watch` flag in `mocha` to provide `tt2`'s as CLI option   |
| ✔ |`tt4`| Consolidate integration tests into manifest-driven harnesses     |
| ✔ |`tt5`| Organize e2e tests into groups in `.mocharc.js`                  |
| ✔ |`tt6`| Dump all test logs to a convenient machine-readable file         |
| ✔ |`tt7`| Build `--last-fails` mocha flag to re-run last failed from `tt6` |
| ✔ |`tt8`| Unify app-code console.logs and debugging to shrink line-char    |
| ○ |`tt9`| Add remainder of walkthroughs as `level4` tests.                 | 

<!-- lint-enable-links -->
cf. [Test Suite Refactor Impact Report](../test/docs/refactor-impact.md)

*Status: In Progress*
<!--
✔ = Complete
● = In Progress
○ = Open
× = Wontfix
‖ = Paused
-->

---

### Linting and Automation Status

Here are tools and scripts that already provide linting in one degree or another.

```
scripts/
├── docs/
│   ├── detect-js-code-references.mjs      # Finds JS code references in documentation
│   ├── docs-link-checker.mjs              # Validates links in documentation
│   ├── generate-help-checklist.js         # Generates help/checklist documents
│   ├── generate-toc.js                    # Generates table of contents for documentation
│   └── update-project-indices.js          # Updates unified tool and documentation indices
│
├── linting/
│   ├── standardize-js-line-one-all.js     # Standardizes first line (shebang, copyright)
│   └── strip-trailing-whitespace.js       # Removes trailing whitespace
│
└── refactor/
    └── validators/
        ├── mocha-path-validator.sh        # Validates Mocha test paths
        ├── paths-js-validator.js          # Checks correctness of paths.js
        └── require-path-validator.sh      # Validates require() paths
```

**Redundancy with ESLint**

- `[`standardize-js-line-one-all.js`](../scripts/linting/standardize-js-line-one-all.js)`: Partial overlap; ESLint can enforce some header rules.
- `[`strip-trailing-whitespace.js`](../scripts/linting/strip-trailing-whitespace.js)`: ESLint can enforce, but this script actively fixes them.

**Probable approach**

- Combine ESLint with custom scripts.
- Use Husky to run both ESLint and custom scripts before commits and pushes.

#### Local Workflow

1. **On commit:** \
   Run integration tests  
   ```bash
   npx husky add .husky/pre-commit "npm run test:integration"
   ```

2. **On tag:** \
   Run all tests, then bump version in `package.json`  
   ```bash
   npx husky add .husky/pre-tag "npm run bump-version"
   ```

3. **On push:** \
   Run all tests before pushing to remote  
   ```bash
   npx husky add .husky/pre-push "npm test"
   ```

#### Implementation plan

**`lg1` - Add and configure ESLint**
   ```bash
   npm install --save-dev eslint
   npx eslint --init
   ```
   
   `package.json`
   ```json
   {
     "scripts": {
       "lint:eslint": "eslint ."
     }
   }
   ```

**`lg2` - Create unified lint script combining custom scripts and ESLint**
   
   `package.json`
   ```json
   {
     "scripts": {
       "lint:custom": "node scripts/linting/strip-trailing-whitespace.js && node scripts/linting/standardize-js-line-one-all.js",
       "lint": "npm run lint:custom && npm run lint:eslint"
     }
   }
   ```
   Better yet, make a linter that runs all of the custom scripts at once.

**`lg3` - Set up Husky for local automation**  
   ```bash
   npm install --save-dev husky
   npx husky install
   npx husky add .husky/pre-commit "npm run test:integration"
   npx husky add .husky/pre-tag "npm test && npm run bump-version"
   npx husky add .husky/pre-push "npm test"
   ```
   - `pre-commit`: run integration tests  
   - `pre-tag`: run all tests and bump version  
   - `pre-push`: run all tests before pushing

**`lg4` - Configure GitHub Actions for CI workflows**
   - On push or pull request: run linting, integration tests, and documentation checks  
   - On tag: run end-to-end tests and version bump/publish  

   Example workflow:  
   ```yaml
   # .github/workflows/ci.yml
   on: [push, pull_request]
   jobs:
     lint-test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - run: npm ci
         - run: npm run lint
         - run: npm run test:integration
   ```

   ```yaml
   # .github/workflows/release.yml
   on:
     push:
       tags:
         - 'v*'
   jobs:
     e2e-test-release:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - run: npm ci
         - run: npm run test:e2e
         - run: npm run bump-version
         # Optional: publish or create release
   ```

**`lg5` - Automate version bumping and release tagging**

   `package.json`
   ```json
   {
     "scripts": {
       "bump-version": "npm version patch -m 'Release v%s'"
     }
   }
   ```

#### Summary table

By activity:

| Event         | Action(s)                         | Tool(s)         |
|---------------|-----------------------------------|-----------------|
| Commit        | Integration tests                 | Husky, npm      |
| Tag           | All tests, bump version           | Husky, npm      |
| Push          | All tests                         | Husky, npm      |
| Push/PR (CI)  | Lint, all tests, docs, etc.       | GitHub Actions  |

By stage:

| Stage         | Tool(s)            | Description                         | When                |
|---------------|--------------------|-------------------------------------|---------------------|
| Linting       | ESLint + custom    | Code style, whitespace, assertions  | pre-commit, CI      |
| Integration   | Mocha/Jest         | Fast integration tests              | pre-push, CI        |
| E2E           | Mocha/Jest         | Full end-to-end tests               | tag/release, CI     |
| Version bump  | npm/release-please | Update `package.json` version       | tag/release, CI     |
| Docs/indexing | Custom scripts     | Update docs indices, validate links | pre-commit, CI      |


---

The linting `lg?` and telemetry/testing `tt?` sections are closely connected. Improvements in one area directly enhance the effectiveness of the other. For example, enforcing code quality and consistency through linting makes it easier to implement reliable logging, debugging, and test automation. Likewise, better test and telemetry infrastructure surfaces issues that can then be addressed through targeted linting rules or code standards.

Treating these areas as complementary creates a feedback loop: linting normalization enables more meaningful tests and logs, while improved testing and telemetry highlight where linting and automation can be further refined. 

---

### Testing, Debugging, and Telemetry

**`tt3` - Fix `--watch` flag in `mocha` to provide tt2's as CLI option**

Use Mocha's native watch mode with explicit watch paths.  

`package.json`
```json
"scripts": {
  "test:watch": "mocha --watch --watch-files 'src/**/*.js,plugins/**/*.js,config.example.yaml'"
}
```

**`tt5` - Organize e2e tests into groups in `[`.mocharc.js`](../.mocharc.js)`**  
   
Define e2e test groups in `[`.mocharc.js`](../.mocharc.js)` for targeted runs.  
```js
// .mocharc.js
module.exports = {
  groups: {
    'l4-all':       'test/e2e/**/*.test.js',
    'l4-workflow':  'test/e2e/workflow-*.test.js',
    'l4-sadpath':   'test/e2e/sad-path-*.test.js',
    ...
    'l3-all':       'test/e2e/**/*.test.js',
    'l3-cm':        'test/e2e/collection-manager/*.test.js'
    ...
  }
}
```

**`tt6` - Dump all test logs to a convenient machine-readable file**

Create a custom Mocha reporter to log failed tests to JSON.  
```js
// test/scripts/log-failures-reporter.js
const Mocha = require('mocha');
const fs = require('fs');
const { EVENT_RUN_END, EVENT_TEST_FAIL } = Mocha.Runner.constants;

class LogFailuresReporter {
  constructor(runner) {
    const failures = [];
    runner.on(EVENT_TEST_FAIL, (test) => {
      failures.push({ title: test.fullTitle(), file: test.file });
    });
    runner.on(EVENT_RUN_END, () => {
      fs.writeFileSync('.test-failures.json', JSON.stringify(failures, null, 2));
    });
  }
}
module.exports = LogFailuresReporter;
```

**`tt7` - Build `--last-fails` mocha flag to re-run last failed from tt6**

Add a script to re-run only the last failed tests.  

`package.json`
```json
"scripts": {
  "test:last-fails": "mocha --grep \"$(node -p \\\"require('./.test-failures.json').map(f => f.title.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).join('|')\\\")\""
}
```

**`tt8` - Unify app-code console.logs and debugging to shrink line-char**

Here is why:

```
# node scripts/probe-logging.js src/

=== Logging Probe Summary ===
Files scanned: 51
Console usage: { error: 93, log: 206, warn: 71 }
Chalk usage: {
  red: 64,
  yellow: 66,
  blueBright: 17,
  bold: 5,
  cyan: 20,
  gray: 46,
  greenBright: 5,
  blue: 21,
  underline: 8,
  cyanBright: 1,
  magenta: 8,
  white: 2,
  green: 21,
  yellowBright: 1,
  rgb: 1,
  grey: 2
}
```

This more than justifies why replacing all of these console.log() statements, the gnarly chalk tangles, the unmanagable syntax structure of logging by module, function, etc, with something that is easily callable and has a much smaller footprint.

```js
// src/utils/logger.js 
const chalk = require('chalk');
const fs = require('fs');

const levels = { info: 1, warn: 2, error: 3, debug: 0 };

function log(level, message, meta = {}) {
  // Colorize based on level
  let output = message;
  if (level === 'error') output = chalk.red(message);
  else if (level === 'warn') output = chalk.yellow(message);
  else if (level === 'info') output = chalk.green(message);

  // Optionally add metadata or write to file/telemetry
  if (process.env.LOG_MODE === 'json') {
    const entry = { level, message, ...meta, timestamp: new Date().toISOString() };
    fs.appendFileSync('logs/app.log', JSON.stringify(entry) + '\n');
  } else {g
    console.log(output);
  }
}

module.exports = {
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};
```

This way, the syntax, verbosity depth, styling, modes, etc are managed in one system that will be much easier to feature-enrich at a later date. 
