# Project Scripts Index

This document is a central index for all developer and automation scripts within the `md-to-pdf` repo.

### Batch Jobs [ `batch/` ]

  - [`batch_convert_hugo_recipes.js`](batch/batch_convert_hugo_recipes.js):
    Converts a directory of Hugo-formatted recipe files into individual PDFs.
  - [`batch_convert_hugo_recipes.sh`](batch/batch_convert_hugo_recipes.sh):
    A shell script version for converting Hugo recipes.
  - [`make-screenshots.sh`](batch/make-screenshots.sh):
    Generates screenshots of example documents for the project's documentation.

### Tab Completion [ `completion/` ]

  - [`generate-completion-cache.js`](completion/generate-completion-cache.js):
    Generates the static CLI command structure `~/.cache/md-to-pdf/cli-tree.json` for tab completion.
  - [`generate-completion-dynamic-cache.js`](completion/generate-completion-dynamic-cache.js):
    A runtime dynamic data cache `~/.cache/md-to-pdf/dynamic-completion-data.json` for tab completion.
### Repository Health & Auditing [ `repo-health/` ]

  - [`detect-js-code-references.mjs`](repo-health/detect-js-code-references.mjs):
    Audits Markdown files to find and validate relative links to `.js` source files.
  - [`docs-link-checker.mjs`](repo-health/docs-link-checker.mjs):
    Audits Markdown files for broken relative links to other documents or assets.
  - [`find-to-include-assertions.js`](repo-health/find-to-include-assertions.js):
    A utility to find potentially brittle `to.include` assertions within the test suite.
  - [`generate-help-checklist.js`](repo-health/generate-help-checklist.js):
    Automatically generates and updates the `help-text-checklist.md` to track CLI help text standardization.
  - [`generate-toc.js`](repo-health/generate-toc.js):
    A utility to generate a Table of Contents for a Markdown file based on its headings.
  - [`index-docs.js`](repo-health/index-docs.js):
    Automatically generates the main documentation index `docs/index.md` by discovering all non-excluded Markdown files.
  - [`index-scripts.js`](repo-health/index-scripts.js):
    Generates this index file **`scripts/index.md`** by discovering all project scripts.
  - [`require-path-corrector.mjs`](repo-health/require-path-corrector.mjs):
    Analyzes `.js` files for relative `require()` paths, a key tool for codebase reorganization.
  - [`standardize-js-line-one-all.sh`](repo-health/standardize-js-line-one-all.sh):
    A shell script to enforce a consistent header comment in all project `.js` files.

### Test-Related Scripts [ `test/scripts/` ]

  - [`extract-test-blocks-string.js`](../test/scripts/extract-test-blocks-string.js):
    Extracts specific test-case blocks from checklist documents based on a search string.
  - [`find-nonclosed-audits.js`](../test/scripts/find-nonclosed-audits.js):
    Finds all entries in the `audit-log.md` that are not marked as `CLOSED`.
  - [`find-skipped-tests.js`](../test/scripts/find-skipped-tests.js):
    Finds all tests in the codebase that are disabled with `it.skip()`.
  - [`find-unchecked-tests.js`](../test/scripts/find-unchecked-tests.js):
    Finds all tests in the Level 1-4 checklists that are not marked as complete.
  - [`ls-matching-tests.js`](../test/scripts/ls-matching-tests.js):
    Lists all test files `*.test.js` that correspond to a given test ID from a checklist.
  - [`qa-dashboard.js`](../test/scripts/qa-dashboard.js):
    Generates the comprehensive QA Dashboard in the main Test README by synthesizing data from all other QA scripts.


<!-- scripts-start -->


<!-- scripts-end -->

