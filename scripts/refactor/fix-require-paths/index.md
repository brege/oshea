# Instructions for Fixing `require()` Paths

This directory contains a set of scripts to analyze and repair broken `require()` and `import` paths within the repository, typically after a large-scale file reorganization.

The process identifies three classes of dependency issues:
1.**Moved Modules**: Paths that are incorrect due to a file's location changing. These are fixed automatically.
2.**Ghost Modules**: Paths that refer to modules that were renamed or deleted. These must be fixed manually.
3.**Degenerate Modules**: Paths that are ambiguous because their basename could refer to multiple files. These require a manual decision.

## The Process

Follow these steps from the **repository root directory**.

### Step 1: Generate the Dependency Catalogue

First, run the `require-catalogue.js` script. This scans the codebase and creates a `require-catalogue.json` file in the root of the repository, which maps every module and its dependencies.

```bash
node scripts/refactor/fix-require-paths/require-catalogue.js
```

### Step 2: Run the Automated Path Replacer

Next, run the `replace-requires.js` script with the `--write` flag. This script reads `require-catalogue.json` and automatically fixes all unambiguous "Moved Modules" paths.

It will also generate a "Degenerate Basename Report" for any ambiguous paths it could not resolve.

```bash
node scripts/refactor/fix-require-paths/replace-requires.js --write
```

### Step 3: Validate and Identify Remaining Issues

Finally, run the `path-validator.sh` script. This utility checks all relative `require()` paths in the project and produces a definitive list of all remaining broken links.

```bash
bash scripts/refactor/fix-require-paths/require-path-validator.sh
```

### Step 4: Manual Cleanup

The output from the validator script is your to-do list for manual cleanup. The remaining errors will be "Ghost" and "Degenerate" modules that you need to address manually.

Based on the latest run, the manual fixes fall into these patterns:

* **Renamed "Ghost" Modules**: The `require` path refers to a basename that was changed during the refactor.

  * **Example**: `require('../../plugin-validator')` was failing because the module was renamed.
  * **Fix**: Update the path to point to the new module, `require('.../plugins/validator')`.
  * **Example**: `require('.../collections-manager')` was failing because the directory module was renamed.
  * **Fix**: Update the path to point to the new directory, `require('.../src/collections')`. This was applied to many test files using `sed`.

* **Degenerate (Ambiguous) Modules**: The automated script correctly identified a `require` that could point to multiple files and refused to guess.

  * **Example**: The require for `updateCmd.js` in `cli.js` was flagged as degenerate.
  * **Fix**: The path was manually updated to the explicit, correct choice: `require('./src/cli/commands/updateCmd.js')`.

* **Commented-Out Code**: Some `MISSING` reports were false positives caused by the scripts detecting `require` statements inside commented-out code blocks.

  * **Example**: `require('./collection/archetypeCmd')` was found inside a comment.
  * **Fix**: These can be ignored or the commented-out code can be removed.

### Step 5 (Optional): Standardize File Headers

After all paths are repaired, you can run this utility script to ensure every `.js` file has a consistent header comment indicating its full path. This improves code navigability.

The script will add or replace the first or second line of each file with `// path/to/your/file.js`. It intelligently handles files with and without shebangs (`#!`).

```bash
bash scripts/linting/standardize-js-line-one-all.sh
```

By the end of this process, running the `path-validator.sh` script should produce no `MISSING` output.


