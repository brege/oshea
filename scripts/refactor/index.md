# Refactoring & Auditing Scripts

This directory contains a suite of tools to analyze, repair, and validate the codebase, particularly after large-scale file reorganizations.

### Modernizing Pathing -- [ [`@paths/`](@paths/) ]
  
A collection of tools to probe and replace brittle `require()` paths with modern `@paths` patterns.

- [ [`probe/`](@paths/probe/) ]
    -- A collection of tools to scan for broken `require()` paths and taxonomize them.
  
  - [ [`probe-require-and-path.js`](@paths/probe/probe-require-and-path.js) ]
      -- For probing the three key pathed functions: `require()`, `path.join()`, and `path.resolve()`.
  - [ [`require-classifier.js`](@paths/probe/require-classifier.js) ]
      -- For classifying `require()` paths as 'pathlike', 'package', or `null`.
  - [ [`scan-path-usage.js`](@paths/probe/scan-path-usage.js) ]
      -- For scanning everything besides `probe-require-and-path.js`'s three key pathy functions.

- [ [`replace/`](@paths/replace/) ]
    -- A collection of tools to replace brittle `require()` paths with modern `@paths` patterns.
  
  - [ [`replace-default-requires.js`](@paths/replace/replace-default-requires.js) ]
      -- For replacing `require()` static paths with `@paths` patterns.
  - [ [`replace-pattern.js`](@paths/replace/replace-pattern.js) ]
      -- A `sed`-like tool more useful for huge codebases--over-engineered in this case. 

- [ [`utils/`](@paths/utils/) ]
    -- Useful pipes for slicing `require()` paths via `probe-require-and-path.js` and `scan-path-usage.js`.
  
  - [ [`better_anchor_grep.sh`](@paths/utils/better_anchor_grep.sh) ] 
      -- Useful for slicing by `--not-anchor` vs `--anchor` type require paths.
  - [ [`better_cat.sh`](@paths/utils/better_cat.sh) ]
      -- Condenses any output streams by `-n` flag (25% beginning, 50% middle, 25% end).
  - [ [`better_grep.sh`](@paths/utils/better_grep.sh) ]
      -- Very useful for detecting `..`, `./`, and `../` patterns in `require()`, `join()`, and `resolve()` paths.
  - [ [`require-taxonomy-list.js`](@paths/utils/require-taxonomy-list.js) ]
      -- Second layer for bucketing path-types: destructured, dynamic, chained, and static (default).

### Fixing Legacy Pathing -- [ [`fix-require-paths/`](fix-require-paths/) ]
    
A suite of tools to analyze and repair broken `require()` paths after large-scale file reorganizations.

- [ [`replace-requires.js`](fix-require-paths/replace-requires.js) ]
    -- Replaces paths in a target directory based on a require-catalogue.json file.
- [ [`require-catalogue.js`](fix-require-paths/require-catalogue.js) ]
    -- Generates a catalogue of `require()` paths in a target directory.

Status: **Complete**

### Validators -- [ [`validators/`](refactor/validators/) ]

A collection of tools to validate the paths of various organizers.

- [ [`mocha-path-validator.sh`](validators/mocha-path-validator.sh) ]
    -- Validates that the test file paths and patterns in `.mocharc.js` exist.
- [ [`paths-js-validator.js`](validators/paths-js-validator.js) ]
    -- Validates that the paths in `paths.js` exist.
- [ [`require-path-validator.sh`](validators/require-path-validator.sh) ]
    -- Validates that the `require()` paths in a target directory exist.

Status: **Complete** -- being incorporated into the linter: [`scripts/linting/lint.js`](../linting/lint.js).

### Uncategorized Scripts

<!-- uncategorized-start -->
- [inject-logger-import.js](logging/inject-logger-import.js)
- [list-nested-species.js](logging/list-nested-species.js)
- [logging-classifier.js](logging/logging-classifier.js)
- [orchestrate-logging-refactor.js](logging/orchestrate-logging-refactor.js)
- [probe-logging.js](logging/probe-logging.js)
- [replace-logging-species.js](logging/replace-logging-species.js)
<!-- uncategorized-end -->
