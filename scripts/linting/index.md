## Linting Guide

Project linting uses a harness-driven approach with centralized configuration (`linting-config.yaml`) and modular, domain-specific linters. Linters can run independently or through the orchestrator, supporting both automated workflows and targeted manual fixes.

- [**`linting-config.yaml`**](linting-config.yaml)
  -- The main linting configuration file for **all** linting scripts.

### Running Lints

Project-wide linting.
```bash
npm run lint
# or
node scripts/linting/lint.js
```
For linters that have a `--fix` flag.
```bash
npm run lint -- --fix
```
Linters also can be used autonomously, pointed at a specific file or directory.
```bash
node scripts/linting/code/no-jsdoc.js --fix src/utils/foo.js
node scripts/linting/docs/janitor.js README.md
```
But you can also use the harness in a targeted way.
```bash
node scripts/linting/lint.js --only code --fix
node scripts/linting/lint.js --skip no-console,remove-jsdoc --debug src/
```

Linters also have unit tests, which can be initiated with `npm test -- --group linting`.
See [the test index](../../test/index.md) for more details.

### Skip System

The project uses a universal skip system with ESLint-style patterns:

**File-level skips** prevent entire files from being processed:
```javascript
// lint-skip-file logging
// lint-skip-file docs
```

**Line-level skips** exclude specific lines:
```javascript
console.log('debug'); // lint-skip-line no-console
// lint-skip-next-line paths
const relative = require('./helper');
```

**Directory-level skips** use `.skipignore` files:
```bash
# Empty file = all linters forbidden
# Group names (docs, code, validators) = skip groups
# Individual aliases (logging, postman, litter) = skip specific linters
no-console
docs
```

### Common Scenarios

- **Use `--fix`** for automated corrections (whitespace, headers, link updates)
- **Use `--only <category>`** to focus on specific domains during development
- **Use `--skip <linter>`** to bypass problematic linters temporarily
- **Run individual linters** when debugging specific issues or working on targeted fixes
- **Use skip markers** for permanent exclusions in code
- **Use `.skipignore` files** for directory-wide exclusions
- **Before every commit**, linting is automatically ran project-wide.

### Linting Scripts

**Linting Core [`.`](index.md)**

*Orchestration & Configuration*
- [ [`lint.js`](lint.js) ]
  -- Main linting orchestrator that coordinates execution of all linters
- [ [`lint-harness.js`](lint-harness.js) ]
  -- Core harness providing common linting workflow and CLI argument handling
- [ [`linting-config.yaml`](linting-config.yaml) ]
  -- Centralized configuration defining targets, exclusions, and linter-specific settings

*Skip System & File Discovery*
- [ [`skip-system.js`](lib/skip-system.js) ]
  -- Universal skip marker system supporting ESLint-style patterns (`lint-skip-file`, `lint-skip-line`) and `.skipignore` files for directory-level exclusions
- [ [`file-discovery.js`](lib/file-discovery.js) ]
  -- File discovery engine with glob pattern matching, directory traversal, and skip system integration
- [ [`find-lint-skips.js`](lib/find-lint-skips.js) ]
  -- Diagnostic tool for auditing skip markers across the codebase (development utility)

*Output & Formatting*
- [ [`lint-helpers.js`](lib/lint-helpers.js) ]
  -- Common utilities for configuration loading, CLI parsing, and linter workflow patterns
- [ [`data-adapters.js`](lib/data-adapters.js) ]
  -- Pure data transformation functions for linting output (no styling or console output)
- [ [`visual-renderers.js`](lib/visual-renderers.js) ]
  -- Visual formatting and console output functions for linting results

**Code Standards [`code/`](code/)**
- [ [`no-bad-headers.js`](code/no-bad-headers.js) ]
  -- A shell script to enforce a consistent header comment in all project JavaScript files.
- [ [`no-trailing-whitespace.js`](code/no-trailing-whitespace.js) ]
  -- A shell script to strip trailing whitespace from all project JavaScript files.   
- [ [`no-console.js`](code/no-console.js) ]
  -- Enforces unified logger usage by detecting `console.*` statements
- [ [`no-relative-paths.js`](code/no-relative-paths.js) ]
  -- Prevents relative path usage in `require()` statements, enforcing path registry
- [ [`no-jsdoc.js`](code/no-jsdoc.js) ]
  -- Find and remove `jsdoc` comments from JavaScript files. 

**Documentation Quality [`docs/`](docs/)**
- [ [`postman.js`](docs/postman.js) ]
  -- Detects and can correct Markdown links to other files in the repo.
- [ [`librarian.js`](docs/librarian.js) ]
  -- A librarian for indexing all of the project's documentation and scripts in strategic `index.md`'s.
- [ [`janitor.js`](docs/janitor.js) ]
  -- A custodian to check for common LLM debris in code comments and Markdown files.
     - Emojis/graphic icons are whitelist-only and configure in `assets/litter-list.txt`.
     - Checks for `logger.*([HandwrittenBrackets] ... )` in JS files.
 
- [ [`yaml.js`](docs/yaml.js) ]
  -- A validator for YAML files in the repo (**NEW**).

**Path Validation [`validators/`](validators/)**
- [ [`mocha-path-validator.js`](validators/mocha-path-validator.js) ]
  -- A utility to validate paths in [`.mocharc.js`](../../.mocharc.js) files and test configurations.

### Uncategorized Test Scripts
<!-- uncategorized-start -->
<!-- uncategorized-end -->
