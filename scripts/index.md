# Project Scripts Index

This document is a central index for all developer and automation scripts within the `md-to-pdf` repo.

### Batch Jobs [ `batch/` ]

  - [ [`batch_convert_hugo_recipes.js`](batch/batch_convert_hugo_recipes.js) ]
    -- Converts a directory of Hugo-formatted recipe files into individual PDFs.
  - [ [`batch_convert_hugo_recipes.sh`](batch/batch_convert_hugo_recipes.sh) ]
    -- A shell script version for converting Hugo recipes.
  - [ [`make-screenshots.sh`](batch/make-screenshots.sh) ]
    -- Generates screenshots of example documents for the project's documentation.

### Tab Completion [ `completion/` ]

  - [ [`generate-completion-cache.js`](completion/generate-completion-cache.js) ]
    -- Generates the static CLI command structure `~/.cache/md-to-pdf/cli-tree.json` for tab completion.
  - [ [`generate-completion-dynamic-cache.js`](completion/generate-completion-dynamic-cache.js) ]
    -- A runtime dynamic data cache `~/.cache/md-to-pdf/dynamic-completion-data.json` for tab completion.

### AI Scripts [ `ai/` ] 

  - [ [`ai-context-generator.js`](ai/ai-context-generator.js) ]
    -- Generates AI context from a source plugin as input and a context file as output to provide one big beautiful paste.

### Documentation [ `docs/` ]

  * [ [`update-project-indices.js`](docs/update-project-indices.js) ]
    -- The project's librarian of documentation and scripts.
    * Produces indices for
      [**`docs/`**](index.md),
      [**`scripts/`**](../scripts/index.md),
      [**`plugins/`**](../plugins/index.md), and
      [**`test/`**](../test/index.md).  
    * Configured via [`.index-config.yaml`](../.index-config.yaml) at the project root.

  - [ [`detect-js-code-references.mjs`](docs/detect-js-code-references.mjs) ]
    -- Audits Markdown files to find and validate relative links to `.js` source files.
  - [ [`docs-link-checker.mjs`](docs/docs-link-checker.mjs) ]
    -- Audits Markdown files for broken relative links to other documents or assets.
  - [ [`generate-help-checklist.js`](docs/generate-help-checklist.js) ]
    -- Automatically generates and updates the `help-text-checklist.md` to track CLI help text standardization.
  - [ [`generate-toc.js`](docs/generate-toc.js) ]
    -- A utility to generate a Table of Contents for a Markdown file based on its headings.
    -- Automatically generates the main documentation index `docs/index.md` by discovering all non-excluded Markdown files.
  - [ [`index-scripts.js`](docs/index-scripts.js) ]
    -- Generates this index file **`scripts/index.md`** by discovering all project scripts.

### Linting & Code Style [ `linting/` ]

  - [ [`lint.js`](linting/lint.js) ]
    -- The main linting orchestrator. This is where you organize linting order.
  - [ [lint-helpers.js](shared/lint-helpers.js) ]
    -- Common patterns used by most be-spoke lints.

  **Validators** [ [`validators/`](linting/validators/) ]
  - [ [`mocha-path-validator.js`](linting/validators/mocha-path-validator.js) ]
    -- A utility to validate paths in `.mocharc.js` files.
  - [ [`paths-js-validator.js`](linting/validators/paths-js-validator.js) ]
    -- A utility to validate paths in `paths.js` files.

  **Code** [ [`code/`](linting/code/) ]
  - [ [`standardize-js-line-one-all.js`](linting/code/standardize-js-line-one-all.js) ]
    -- A shell script to enforce a consistent header comment in all project `.js` files.
  - [ [`strip-trailing-whitespace.js`](linting/code/strip-trailing-whitespace.js) ]
    -- A shell script to strip trailing whitespace from all project `.js` files.
  - [ [`logging-lint.js`](linting/code/logging-lint.js) ]
    -- A utility to check for `console.*` statements in a post `logger` world.
  - [ [`remove-auto-doc.js`](linting/code/remove-auto-doc.js) ]
    -- Find and remove `auto-doc` comments from `.js` files.

  **Docs** [ [`docs/`](linting/docs/) ]
  - [ [`postman.js`](linting/docs/postman.js) ]
    -- Detects and can correct Markdown links to other files in the repo.  Configure with `postman.yaml`.
  - [ [`update-project-indices.js`](linting/docs/update-project-indices.js) ]
    -- A librarian for indexing all of the project's documentation and scripts.

### Refactoring & Auditing [ `refactor/` ]

  This section has its own index file at [`refactor/index.md`](refactor/index.md).

  - [ [`refactor/`](refactor/) ]
    -- A collection of tools that helped in refactoring the project and its codebase at different points in its history.
    
    - [ [`@paths/`](refactor/@paths/) ]
      -- A collection of tools to probe and replace brittle `require()` paths with modern `@paths` patterns.
    - [ [`fix-require-paths/`](refactor/fix-require-paths/) ]
      -- A suite of tools to analyze and repair broken `require()` paths in the legacy codebase after the large-scale file reorganization.
    - [ [`validators/`](refactor/validators/) ]
      -- A collection of tools to validate the paths or various organizers like `.mocharc.js` and `paths.js`.

### Test-Related Scripts [ `../test/scripts/` ]

  These scripts are separated from the rest of the project scripts because they are only relevant to the test suite.  
  The main test runner is managed by `mocha` via `npm test`.

  > See the [Test Index](../test/index.md) for more information.


### Shared Scripts [ `shared/` ]

  - [ [`file-helpers.js`](shared/file-helpers.js) ] -- Makes the rest of the Node.js scripts easier to point and shoot at file(s) and directories.
  - [ [`comment-surfacer.js`](shared/comment-surfacer.js) ]
    -- A utility to surface code comment-ditritus in `.js` files.

### Uncategorized Scripts

New scripts or new script locations will appear below after running **[`node scripts/docs/update-project-indices.js`](../scripts/docs/update-project-indices.js).**

<!-- uncategorized-start -->
- [formatters.js](shared/formatters.js)
- [generate-paths-beautiful.js](generate-paths-beautiful.js)
- [lint-harness.js](linting/lint-harness.js)
- [no-relative-paths.js](linting/code/no-relative-paths.js)
- [output-adapter.js](shared/output-adapter.js)
- [paths-usage-validator.js](linting/validators/paths-usage-validator.js)
- [scriptsPaths.js](scriptsPaths.js)
<!-- uncategorized-end -->
