## Linting Guide

**TODO: add linting guide**

- [**`linting-config.yaml`**](linting-config.yaml)
  -- The main linting configuration file for **all** linting scripts.

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

**Code Formatting [`code/`](code/)**

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

**Documentation Sirens [`docs/`](docs/)**

- [ [`postman.js`](docs/postman.js) ]
  -- Detects and can correct Markdown links to other files in the repo.
- [ [`update-project-indices.js`](docs/update-project-indices.js) ]
  -- A librarian for indexing all of the project's documentation and scripts in strategic `index.md`'s.
- [ [find-litter.js](docs/find-litter.js) ]
  -- A custodian to check for common LLM debris in code comments and Markdown files.
     Emojis/graphic icons are whitelist-only and configure in `assets/litter-list.txt`.

**Pathing Validators [`validators/`](validators/)**

- [ [`mocha-path-validator.js`](validators/mocha-path-validator.js) ]
  -- A utility to validate paths in [`.mocharc.js`](../../.mocharc.js) files.

## Uncategorized Test Scripts

<!-- uncategorized-start -->
<!-- uncategorized-end -->
