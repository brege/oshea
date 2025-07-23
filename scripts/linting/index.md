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
node scripts/linting/code/remove-jsdoc.js --fix src/utils/foo.js
node scripts/linting/docs/find-litter.js README.md
```
But you can also use the harness in a targeted way.
```bash
node scripts/linting/lint.js --only code --fix
node scripts/linting/lint.js --skip logging,remove-jsdoc --debug src/
```

Linters also have unit tests, which can be initiated with `npm test -- --group linting`.
See [the test index](../../test/index.md) for more details.

### Common Scenarios

- **Use `--fix`** for automated corrections (whitespace, headers, link updates)
- **Use `--only <category>`** to focus on specific domains during development
- **Use `--skip <linter>`** to bypass problematic linters temporarily
- **Run individual linters** when debugging specific issues or working on targeted fixes
- **Before every commit**, linting is automatically ran project-wide.

### Linting Scripts

**Linting Core [`.`](index.md)**
- [ [`lint.js`](lint.js) ]
  -- The main linting orchestrator. This is where you organize linting order.
- [ [`lint-harness.js`](lint-harness.js) ]
  -- The main linting harness.
- [ [`file-discovery.js`](lib/file-discovery.js) ]
  -- The file discovery utility, allowing globbing, directory traversal, and walking.
- [ [`lint-helpers.js`](lib/lint-helpers.js) ]
  -- Common patterns used by most be-spoke lints, as well as a lint-skipper.
- [ [`formatters.js`](lib/formatters.js) ]
  -- The formatter of the linting output (ESlint, JSON, etc.).

**Code Standards [`code/`](code/)**
- [ [`standardize-js-line-one-all.js`](code/standardize-js-line-one-all.js) ]
  -- A shell script to enforce a consistent header comment in all project JavaScript files.
- [ [`strip-trailing-whitespace.js`](code/strip-trailing-whitespace.js) ]
  -- A shell script to strip trailing whitespace from all project JavaScript files.   
- [ [`logging-lint.js`](code/logging-lint.js) ]
  -- A utility to check for `console.*` statements in a post `logger` world.     
- [ [`no-relative-paths.js`](code/no-relative-paths.js) ]
  -- A utility to check and warn for relative paths in JavaScript files.
- [ [`remove-jsdoc.js`](code/remove-jsdoc.js) ] 
  -- Find and remove `jsdoc` comments from JavaScript files. 

**Documentation Quality [`docs/`](docs/)**
- [ [`postman.js`](docs/postman.js) ]
  -- Detects and can correct Markdown links to other files in the repo.
- [ [`update-project-indices.js`](docs/update-project-indices.js) ]
  -- A librarian for indexing all of the project's documentation and scripts in strategic `index.md`'s.
- [ [`find-litter.js`](docs/find-litter.js) ]
  -- A custodian to check for common LLM debris in code comments and Markdown files.
     Emojis/graphic icons are whitelist-only and configure in `assets/litter-list.txt`.

**Path Validation [`validators/`](validators/)**
- [ [`mocha-path-validator.js`](validators/mocha-path-validator.js) ]
  -- A utility to validate paths in [`.mocharc.js`](../../.mocharc.js) files and test configurations.

### Uncategorized Test Scripts
<!-- uncategorized-start -->

- [data-adapters.js](lib/data-adapters.js)

- [visual-renderers.js](lib/visual-renderers.js)
<!-- uncategorized-end -->
