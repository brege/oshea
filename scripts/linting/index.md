## Linting Guide

**TODO: add linting guide**

### Linting Scripts

**Code Formatting [`code/`](code/)**

- [ [`standardize-js-line-one-all.js`](code/standardize-js-line-one-all.js) ]
  -- A shell script to enforce a consistent header comment in all project JavaScript files.
- [ [`strip-trailing-whitespace.js`](code/strip-trailing-whitespace.js) ]
  -- A shell script to strip trailing whitespace from all project JavaScript files.   
- [ [`logging-lint.js`](code/logging-lint.js) ]
  -- A utility to check for `console.*` statements in a post `logger` world.     
- [ [`no-relative-paths.js`](code/no-relative-paths.js) ]
  -- A utility to check and warn for relative paths in JavaScript files.
- [ [`remove-auto-doc.js`](code/remove-auto-doc.js) ] 
  -- Find and remove `auto-doc` comments from JavaScript files. 
          

**Documentation Sirens [`docs/`](docs/)**

- [ [`postman.js`](docs/postman.js) ]
  -- Detects and can correct Markdown links to other files in the repo. Configure with `postman.yaml`.
     Its [helper](docs/postman-helpers.js) attempts to offload utilities from the core logic.
- [ [`update-project-indices.js`](docs/update-project-indices.js) ]
  -- A librarian for indexing all of the project's documentation and scripts.

**Linting Core [`./`](index.md)**

- [ [`lint.js`](lint.js) ]
  -- The main linting orchestrator. This is where you organize linting order.
- [ [`lint-harness.js`](lint-harness.js) ]
  -- The main linting harness.
- [ [`lint-helpers.js`](lib/lint-helpers.js) ]
  -- Common patterns used by most be-spoke lints.
- [ [`formatters.js`](lib/formatters.js) ]
  -- The formatter of the linting output (ESlint, JSON, etc.).

**Pathing Validators [`validators/`](validators/)**

- [ [`mocha-path-validator.js`](validators/mocha-path-validator.js) ]
  -- A utility to validate paths in `.mocharc.js` files.
- [ [`paths-js-validator.js`](validators/paths-js-validator.js) ]
  -- A utility to validate paths in `paths.js` (sunsetting soon).
- [ [`paths-usage-validator.js`](validators/paths-usage-validator.js) ]
  -- Checks that paths in source files are registered in `paths.js` (sunsetting soon).

## Uncategorized Test Scripts

<!-- uncategorized-start -->
<!-- uncategorized-end -->
