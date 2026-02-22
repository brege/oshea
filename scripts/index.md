# Project Scripts Index

This document is a central index for all developer and automation scripts within the `oshea` repo.

### AI Scripts

- [ [`ai-context-generator.js`](ai-context-generator.js) ]
  -- Generates AI context from a source plugin as input and a context file as output to provide one big beautiful paste.

### Documentation

- [ [`generate-toc.js`](generate-toc.js) ]
  -- A utility to generate a Table of Contents for a Markdown file based on its headings.
  -- Automatically generates the main documentation index [`docs/index.md`](../docs/index.md) by discovering all non-excluded Markdown files.
- [ [`make-screenshots.sh`](make-screenshots.sh) ]
  -- Generates screenshots of example documents for the project's documentation.

### Test-Related Scripts [ `../test/scripts/` ]

This module has its own index file at [**the test index**](../test/index.md) for more information.

  These scripts are separated from the rest of the project scripts because they are only relevant to the test suite.
  The main test runner is managed by `mocha` via `npm test`.
