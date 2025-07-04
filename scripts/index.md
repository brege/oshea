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

  - [ [`dump-code-comments.js`](linting/dump-code-comments.js) ]
    -- Dumps all code comments from a target directory for review and cleanup.
  - [ [`find-to-include-assertions.js`](linting/find-to-include-assertions.js) ]
    -- A utility to find potentially brittle `to.include` assertions within the test suite.
  - [ [`standardize-js-line-one-all.js`](linting/standardize-js-line-one-all.js) ]
    -- A shell script to enforce a consistent header comment in all project `.js` files.
  - [ [`strip-trailing-whitespace.js`](linting/strip-trailing-whitespace.js) ]
    -- A shell script to strip trailing whitespace from all project `.js` files.

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

### Uncategorized Scripts

New scripts will appear below after running **[`node scripts/docs/index-scripts.js`](docs/index-scripts.js),** or after changing paths.

<!-- uncategorized-start -->
<!-- uncategorized-end -->
