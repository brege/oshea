# Path Registry

This directory contains the project's centralized path registry.

This system eliminates brittle, relative `require()` paths in favor of a single, aliased source of truth (`@paths`), making the codebase more robust and easier to refactor.

### Core Registry Files

- [generator.js](generator.js) is the script that generates the registry files
- [paths-config.yaml](paths-config.yaml) is the configuration file for the path registry

### Generated Registry Files

[index.js](index.js) is **automatically generated** from [paths-config.yaml](paths-config.yaml). Do not edit it directly. 

To update it:
1. Edit [paths-config.yaml](./paths-config.yaml)
2. Run `node paths/generator.js -f`

### How do I link to something?

#### Good
```js
require('module-alias/register');
const { lintPath } = require('@paths');                     // ✔ good
const { main } = require(lintPath);
```

#### Bad
```js
//  Don't do this
const { findFiles } = require('../../shared/file-helpers'); // ✖ double dots
const { findFiles } = require(paths['fileHelpersPath']);    // ✖ dynamic key
const __dirname = ...;                                      // ✖ redeclaration
``` 

### Path Finder
For any given file, use the Path Finder [`path-finder.js`](path-finder.js) to generate the above code for directories, files, or globs.

### Command
```bash
node paths/path-finder.js src/completion/
```

### Output
```js
require('module-alias/register');
const {
  cliTreeBuilderPath,
  enginePath,
  generateCompletionCachePath,
  generateCompletionDynamicCachePath,
  trackerPath
} = require('@paths');
// File: src/completion/cli-tree-builder.js
// File: src/completion/engine.js
// File: src/completion/generate-completion-cache.js
// File: src/completion/generate-completion-dynamic-cache.js
// File: src/completion/tracker.js
```
