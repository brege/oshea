# Meta Level 0 - Test Scenario Checklist (Tooling Unit Tests)

This checklist outlines unit tests for the project's internal tooling, such as linters and validation scripts.

Status Legend:
[x] Proposed,
[x] Completed (test implemented & passing),

## M.1. Code Linters

* [x] M.0.1.1 (Unit Test) The `logging-lint` linter correctly identifies `console.log` usage.
  - **test_id:** M.0.1.1
  - **status:** CLOSED
  - **test_target:** logging-lint
  - **test_type:** LINTING_UNIT
  - **description:** (Unit Test) The `logging-lint` linter correctly identifies `console.log` usage.

* [x] M.0.1.2 (Unit Test) The `remove-auto-doc` linter correctly identifies `@auto-doc` comment blocks.
  - **test_id:** M.0.1.2
  - **status:** CLOSED
  - **test_target:** remove-auto-doc
  - **test_type:** LINTING_UNIT
  - **description:** (Unit Test) The `remove-auto-doc` linter correctly identifies `@auto-doc` comment blocks.

* [x] M.0.1.3 (Unit Test) The `strip-trailing-whitespace` linter correctly identifies trailing whitespace.
  - **test_id:** M.0.1.3
  - **status:** CLOSED
  - **test_target:** strip-trailing-whitespace
  - **test_type:** LINTING_UNIT
  - **description:** (Unit Test) The `strip-trailing-whitespace` linter correctly identifies trailing whitespace.

* [x] M.0.1.4 (Unit Test) The `standardize-js-line-one-all` linter correctly identifies incorrect file headers.
  - **test_id:** M.0.1.4
  - **status:** CLOSED
  - **test_target:** standardize-js-line-one-all
  - **test_type:** LINTING_UNIT
  - **description:** (Unit Test) The `standardize-js-line-one-all` linter correctly identifies incorrect file headers.

* [x] M.0.1.5 (Unit Test) The `no-relative-paths` linter correctly identifies relative `require()` paths.
  - **test_id:** M.0.1.5
  - **status:** CLOSED
  - **test_target:** no-relative-paths
  - **test_type:** LINTING_UNIT
  - **description:** (Unit Test) The `no-relative-paths` linter correctly identifies relative `require()` paths.

## M.2. Documentation & Validator Linters

* [x] M.0.2.1 (Unit Test) The `postman` linter correctly identifies orphan links in Markdown files.
  - **test_id:** M.0.2.1
  - **status:** CLOSED
  - **test_target:** postman
  - **test_type:** LINTING_UNIT
  - **description:** (Unit Test) The `postman` linter correctly identifies orphan links in Markdown files.

* [x] M.0.2.2 (Unit Test) The `find-litter` linter correctly identifies disallowed emojis or keywords.
  - **test_id:** M.0.2.2
  - **status:** CLOSED
  - **test_target:** find-litter
  - **test_type:** LINTING_UNIT
  - **description:** (Unit Test) The `find-litter` linter correctly identifies disallowed emojis or keywords.

* [x] M.0.2.3 (Unit Test) The `update-project-indices` (librarian) linter correctly identifies untracked files.
  - **test_id:** M.0.2.3
  - **status:** CLOSED
  - **test_target:** update-project-indices
  - **test_type:** LINTING_UNIT
  - **description:** (Unit Test) The `update-project-indices` (librarian) linter correctly identifies untracked files.
