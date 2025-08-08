# Project Scripts Index

This document is a central index for all developer and automation scripts within the `oshea` repo.

### Batch Jobs [ `batch/` ]

  - [ [`batch-convert-hugo-recipes.js`](batch/batch-convert-hugo-recipes.js) ]
    -- Converts a directory of Hugo-formatted recipe files into individual PDFs.
  - [ [`batch_convert_hugo_recipes.sh`](batch/batch_convert_hugo_recipes.sh) ]
    -- A shell script version for converting Hugo recipes.
  - [ [`make-screenshots.sh`](batch/make-screenshots.sh) ]
    -- Generates screenshots of example documents for the project's documentation.

### AI Scripts [ `ai/` ]

  - [ [`ai-context-generator.js`](ai/ai-context-generator.js) ]
    -- Generates AI context from a source plugin as input and a context file as output to provide one big beautiful paste.

### Demonstrations [ `demo/` ]

This module has its own index file at [**the demo index**](demo/index.md).

### Documentation [ `docs/` ]

  - [ [`generate-toc.js`](docs/generate-toc.js) ]
    -- A utility to generate a Table of Contents for a Markdown file based on its headings.
    -- Automatically generates the main documentation index [`docs/index.md`](../docs/index.md) by discovering all non-excluded Markdown files.

### Linting & Code Style [ `linting/` ]

This module has its own index file at [**the linting index**](linting/index.md).

- [ [**`code/`**](linting/code/) ]
  [ [**`docs/`**](linting/docs/) ]
  [ [**`validators/`**](linting/validators/) ]

### Test-Related Scripts [ `../test/scripts/` ]

This module has its own index file at [**the test index**](../test/index.md) for more information.

  These scripts are separated from the rest of the project scripts because they are only relevant to the test suite.
  The main test runner is managed by `mocha` via `npm test`.

### Shared Scripts [ `shared/` ]

  - [ [`file-helpers.js`](shared/file-helpers.js) ] -- Makes the rest of the Node.js scripts easier to point and shoot at file(s) and directories.
  - [ [path-finder.js](shared/path-finder.js) ]
    -- A helper tool that turns a script path in to a variable name.
  - [ [logger-surfacer.js](shared/logger-surfacer.js) ]
    -- Useful for surfacing how console output is being formed, without syntax distractions.

    `node scripts/shared/path-finder.js scripts/shared/file-helpers.js`
    ```js
    require('module-alias/register');
    const { fileHelpersPath } = require('@paths');
    const {
      findFiles,
      findFilesArray,
      getDefaultGlobIgnores,
      getPatternsFromArgs
    } = require(fileHelpersPath);
    ```

### Uncategorized Scripts

New scripts or new script locations will appear below after running
**`node scripts/linting/docs/librarian.js`**.

<!-- uncategorized-start -->
<!-- uncategorized-end -->
