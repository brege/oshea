## Pathing Refactor Cheat Sheet

> **TODO** this document needs to update for accuracy, script locations following reorg, and be specified to only be for src/.
> 
> it also needs the details on how this was don on src/.  This should be changed to a record and not a cheat sheet.

This document summarizes the custom scripts used to find and categorize pathing candidates for the refactor.

### Tools

**`probe-require-and-path.js`**

The main data producer. Scans `.js` files and prints every line containing `require()`, `path.join()`, or `path.resolve()`.
```bash
node scripts/refactor/probe-require-and-path.js <path> [--rejects]
```

**`better_grep.sh`** The primary `awk`-based stream filter. It categorizes lines based on whether they contain string literals that look like paths.

```bash
... | ./scripts/refactor/@paths/utils/better_grep.sh --pathlike|--not-pathlike
```

**`better_anchor_grep.sh`** A secondary `grep`-based stream filter. It uses a `paths.js` file to find lines containing specific exported variable names ("anchors").

```bash
... | ./scripts/refactor/@paths/utils/better_anchor_grep.sh <paths_file> [--anchor <name>|--not-anchor]
```

**`better_cat.sh`** A stream sampler. It displays the head, tail, and an evenly spaced sample from the middle of a large input stream.

```bash
... | ./scripts/refactor/@paths/utils/better_cat.sh [-n <lines>]
```

**`paths.example.js`**  
The central definition file for path anchors. This file is the target model for the refactor and is used by `better_anchor_grep.sh`.

### Pipelines/Analyses

Sample the pipeline to 40 lines (default is 100 if `-n` is not specified):

```bash
node scripts/refactor/probe-require-and-path.js src/ | ./scripts/refactor/@paths/utils/better_cat.sh -n 40
```

This pipeline finds all `require`, `join`, and `resolve` calls that contain a relative or absolute path string. This is the primary list of candidates.

```bash
node scripts/refactor/probe-require-and-path.js src/ | ./scripts/refactor/@paths/utils/better_grep.sh --pathlike
```

This pipeline filters the high-priority list to find only the lines that are re-defining a variable you intend to have as a global anchor, like `projectRoot`. These are prime candidates for direct replacement.

```bash
node scripts/refactor/probe-require-and-path.js src/ | ./scripts/refactor/@paths/utils/better_anchor_grep.sh paths.example.js
```

Find all uses of a specific anchor

```bash
node scripts/refactor/probe-require-and-path.js src/ | ./scripts/refactor/@paths/utils/better_anchor_grep.sh paths.example.js --anchor projectRoot
```

This finds all the brittle, `../` style paths that need to be refactored by potentially creating *new* anchors in `paths.example.js`.

```bash
node scripts/refactor/probe-require-and-path.js src/ | ./scripts/refactor/@paths/utils/better_anchor_grep.sh paths.example.js --not-anchor
```

#### The Blacklist Workflow

The string replace patterns are hard to get right.  
For an issue of our finite size, it's not worth the effort to make a perfect filter.
I inspected the data stream, checked `.js` files to see if the pathing was dynamic, then
blacklist, filtered again, and so on.

```bash
node scripts/refactor/scan-path-usage.js src/ \
    | grep -v -f scripts/refactor/pathing_rejects.txt
```

Keep adding to `pathing_rejects.txt` (or fix until the stream is clean.

---

### The Refactoring Goal: Before → After

The purpose of these probes is to identify lines of brittle, hard-to-maintain code and transform them into clean, better-managed path references.

| Before ( with '../') | After (with `@paths`) |
| :--- | :--- |
| `const cliPath = path.resolve(__dirname, '../../../../cli.js');` | `const { cliPath } = require('@paths');` |
| `const projectRoot = path.resolve(__dirname, '../../../../');` | `const { projectRoot } = require('@paths');` |
| `const { ... } = require('../../../collections/cm-utils');` | `const { ... } = require('@paths');` (`cmUtilsPath`) |
| `path.join(projectRoot, 'plugins', pluginIdentifier);` | `path.join(pluginsRoot, pluginIdentifier);` |
