# Refactoring & Auditing Scripts

This directory contains a suite of tools to analyze, repair, and validate the codebase, particularly after large-scale file reorganizations.

### Modernizing Pathing -- [ [`@paths/`](https://github.com/brege/md-to-pdf/tree/develop/scripts/refactor/@paths/) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/scripts/refactor/@paths/) ]
  
A collection of tools to probe and replace brittle `require()` paths with modern `@paths` patterns.

- [ [`probe/`](https://github.com/brege/md-to-pdf/tree/develop/scripts/refactor/@paths/probe/) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/scripts/refactor/@paths/probe/) ]
    -- A collection of tools to scan for broken `require()` paths and taxonomize them.
  
  - [ [`probe-require-and-path.js`](https://github.com/brege/md-to-pdf/tree/develop/scripts/refactor/@paths/probe/probe-require-and-path.js) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/scripts/refactor/@paths/probe/probe-require-and-path.js) ]
      -- For probing the three key pathed functions: `require()`, `path.join()`, and `path.resolve()`.
  - [ [`require-classifier.js`](https://github.com/brege/md-to-pdf/tree/develop/scripts/refactor/@paths/probe/require-classifier.js) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/scripts/refactor/@paths/probe/require-classifier.js) ]
      -- For classifying `require()` paths as 'pathlike', 'package', or `null`.
  - [ [`scan-path-usage.js`](https://github.com/brege/md-to-pdf/tree/develop/scripts/refactor/@paths/probe/scan-path-usage.js) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/scripts/refactor/@paths/probe/scan-path-usage.js) ]
      -- For scanning everything besides `probe-require-and-path.js`'s three key pathy functions.

- [ [`replace/`](https://github.com/brege/md-to-pdf/tree/develop/scripts/refactor/@paths/replace/) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/scripts/refactor/@paths/replace/) ]
    -- A collection of tools to replace brittle `require()` paths with modern `@paths` patterns.
  
  - [ [`replace-default-requires.js`](https://github.com/brege/md-to-pdf/tree/develop/scripts/refactor/@paths/replace/replace-default-requires.js) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/scripts/refactor/@paths/replace/replace-default-requires.js) ]
      -- For replacing `require()` static paths with `@paths` patterns.
  - [ [`replace-pattern.js`](https://github.com/brege/md-to-pdf/tree/develop/scripts/refactor/@paths/replace/replace-pattern.js) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/scripts/refactor/@paths/replace/replace-pattern.js) ]
      -- A `sed`-like tool more useful for huge codebases--over-engineered in this case. 

- [ [`utils/`](https://github.com/brege/md-to-pdf/tree/develop/scripts/refactor/@paths/utils/) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/scripts/refactor/@paths/utils/) ]
    -- Useful pipes for slicing `require()` paths via `probe-require-and-path.js` and `scan-path-usage.js`.
  
  - [ [`better_anchor_grep.sh`](https://github.com/brege/md-to-pdf/tree/develop/scripts/refactor/@paths/utils/better_anchor_grep.sh) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/scripts/refactor/@paths/utils/better_anchor_grep.sh) ] 
      -- Useful for slicing by `--not-anchor` vs `--anchor` type require paths.
  - [ [`better_cat.sh`](https://github.com/brege/md-to-pdf/tree/develop/scripts/refactor/@paths/utils/better_cat.sh) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/scripts/refactor/@paths/utils/better_cat.sh) ]
      -- Condenses any output streams by `-n` flag (25% beginning, 50% middle, 25% end).
  - [ [`better_grep.sh`](https://github.com/brege/md-to-pdf/tree/develop/scripts/refactor/@paths/utils/better_grep.sh) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/scripts/refactor/@paths/utils/better_grep.sh) ]
      -- Very useful for detecting `..`, `./`, and `../` patterns in `require()`, `join()`, and `resolve()` paths.
  - [ [`require-taxonomy-list.js`](https://github.com/brege/md-to-pdf/tree/develop/scripts/refactor/@paths/utils/require-taxonomy-list.js) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/scripts/refactor/@paths/utils/require-taxonomy-list.js) ]
      -- Second layer for bucketing path-types: destructured, dynamic, chained, and static (default).

### Fixing Legacy Pathing -- [ [`fix-require-paths/`](https://github.com/brege/md-to-pdf/tree/develop/scripts/refactor/fix-require-paths/) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/scripts/refactor/fix-require-paths/) ]
    
A suite of tools to analyze and repair broken `require()` paths after large-scale file reorganizations.

- [ [`replace-requires.js`](https://github.com/brege/md-to-pdf/tree/develop/scripts/refactor/fix-require-paths/replace-requires.js) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/scripts/refactor/fix-require-paths/replace-requires.js) ]
    -- Replaces paths in a target directory based on a require-catalogue.json file.
- [ [`require-catalogue.js`](https://github.com/brege/md-to-pdf/tree/develop/scripts/refactor/fix-require-paths/require-catalogue.js) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/scripts/refactor/fix-require-paths/require-catalogue.js) ]
    -- Generates a catalogue of `require()` paths in a target directory.

Status: **Complete**

### Validators -- [ [`validators/`](https://github.com/brege/md-to-pdf/tree/develop/refactor/validators/) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/refactor/validators/) ]

A collection of tools to validate the paths of various organizers.

- [ [`mocha-path-validator.sh`] ] 
    -- Recoded and repurposed as a [linter](https://github.com/brege/md-to-pdf/tree/develop/../linting/mocha-path-validator.js) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/../linting/mocha-path-validator.js).
- [ [`paths-js-validator.js`] ]
    -- Repurposed as a [linter](https://github.com/brege/md-to-pdf/tree/develop/../linting/paths-js-validator.js) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/../linting/paths-js-validator.js).
- [ [`require-path-validator.sh`](https://github.com/brege/md-to-pdf/tree/develop/scripts/refactor/validators/require-path-validator.sh) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/scripts/refactor/validators/require-path-validator.sh) ]
    -- Validates that the `require()` paths in a target directory exist.

Status: **Complete** -- being incorporated into the linter: [`scripts/linting/lint.js`](https://github.com/brege/md-to-pdf/tree/develop/../linting/lint.js) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/../linting/lint.js).

### Uncategorized Scripts

<!-- uncategorized-start -->
- [mocha-path-validator.sh](https://github.com/brege/md-to-pdf/tree/develop/scripts/refactor/validators/mocha-path-validator.sh) · [[permalink]](https://github.com/brege/md-to-pdf/blob/fd75c3d96a3b12373ff0ed7928d926b58d34befb/scripts/refactor/validators/mocha-path-validator.sh)
<!-- uncategorized-end -->
