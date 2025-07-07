This document tracks the ongoing effort to remove all direct `console.*` and `chalk` usage from app code, replacing them with a unified logger module.

The goal is to make logging consistent, testable, and easy to maintain—without biting off more than can be debugged at once.

## Philosophy

Refactoring hundreds of scattered log calls is not something you brute-force in a single pass.  
Instead, we’re taking an empirically driven, iterative approach:

- **Measure first:** We won’t write a single line of replacement code until we know exactly what patterns exist and how many there are.
- **Refactor by “species”:** We’ll tackle one class of log call at a time—starting with the most frequent and structurally simple.
- **Automate everything:** Each refactoring step gets its own tool, so we can test, checkpoint, and roll back as needed.
- **Iterate, checkpoint, repeat:** Each successful pass is committed and verified before moving on.

## Phases

### 1. Taxonomy

Before any replacement, we need statistics.  
A script (`logging-classifier.js`) will scan all `.js` files in `src/` and produce a detailed report of every logging pattern (“species”) in use.  
This includes, for example:

- `console.log(chalk.green(...))`
- `console.error(chalk.red(...))`
- `console.warn(...)`
- `console.error(...)` followed by `process.exit(1)`
- plain `console.log(...)`
- and so on.

The output is a “hit list” of patterns, sorted by frequency and complexity.
This lets us prioritize the easy, high-impact wins first.

### 2. First Refactor

Once we know the landscape, we’ll pick the most common, structurally simple pattern to replace first—likely something like `console.warn(...)`.

- Build the first version of the new logger (`src/utils/logger.js`), with just a `warn()` method.
- Add a `utilsRoot` anchor to `paths.js` if needed.
- Write an AST-based replacer (`warn-replacer.js`) that finds and replaces all `console.warn(...)` calls with `logger.warn(...)`, inserting the correct `require` statement.
- Run the script, test the result, and commit.

This proves the concept and gives us a working logger and toolchain.

### 3. Iterative

With the foundation in place, we’ll repeat the process for each remaining species of log call:

- Pick the next pattern from the stats report (e.g., `console.log(chalk.green(...))`).
- Extend the logger as needed (e.g., add `logger.success()`).
- Write or enhance a replacer script to handle the new pattern, including any chalk removal or argument normalization.
- Run, test, checkpoint.

Each pass is small, verifiable, and easy to debug. There's always going to be edge cases. 
We’ll keep going until all legacy logging is gone.

