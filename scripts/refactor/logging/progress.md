This document tracks the ongoing effort to remove all direct `console.*` and `chalk` usage from app code, replacing them with a unified logger module.

The goal is to make logging consistent, testable, and easy to maintain—without biting off more than can be debugged at once.

## Philosophy

Refactoring hundreds of scattered log calls is not something you brute-force in a single pass.  
Instead, we’re taking an empirically driven, iterative approach:

- **Measure first:** We won’t write a single line of replacement code until we know exactly what patterns exist and how many there are.
- **Refactor by “species”:** We’ll tackle one class of log call at a time—starting with the most frequent and structurally simple.
- **Automate everything:** Each refactoring step gets its own tool, so we can test, checkpoint, and roll back as needed.
- **Iterate, checkpoint, repeat:** Each successful pass is committed and verified before moving on.

## Hypothesis

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

## Discovery

The hypothesis needs to be rethought, because you can't do AST replacements, pure line replacement, and injection at the same time.  

We need a proper orchestrator:
```
scripts/refactor/logging/
├── probe-logging.js           # 1. Probe: Find all logging patterns/species, output report
├── logging-classifier.js      # 2. Classify: Group, analyze, and suggest mappings for species
├── replace-logging-species.js # 3. AST-based: Replace logging callsites (no import edits)
├── inject-logger-import.js    # 4. Line-based: Ensure logger is imported via @paths in each file
├── orchestrate-logging-refactor.js # 5. Orchestrator: Runs the above in sequence, handles dry-run/write, summary, etc.
└── logging-utils.js           # 6. (maybe) Shared: Utility functions used by all scripts
```

### Cheat-Sheet / Workflows


#### Step 1: Probe Logging Calls

Scans files for console/chalk usage and outputs a report.

```sh
# Pretty output (human readable)
node scripts/refactor/logging/probe-logging.js src/cli/commands/

# JSON output (for next steps)
node scripts/refactor/logging/probe-logging.js src/cli/commands/ --json
```

#### Step 2: Classify Logging Species

Groups and analyzes logging call patterns, suggests logger mappings.

```sh
node scripts/refactor/logging/logging-classifier.js logging-probe-report.json
```
- Output: Prints summary and writes `logging-species-mapping.json`.

#### Step 3: Replace Logging Species (Simple and Template Literals)

Replaces console/chalk callsites with logger calls.

```sh
# Replace a specific species (from mapping)
node scripts/refactor/logging/replace-logging-species.js src/ "console.log(chalk.red)" "logger.error" --write

# Replace all template literal console.* calls (with or without chalk)
node scripts/refactor/logging/replace-logging-species.js src/ --write
```
- Omit `--write` for dry-run.

#### Step 4: Inject Logger Import

Ensures `const { logger } = require('@paths');` is present in each file.

```sh
# For a directory
node scripts/refactor/logging/inject-logger-import.js src/cli/commands/ --write

# For a single file
node scripts/refactor/logging/inject-logger-import.js src/cli/commands/collection/listCmd.js --write

# For multiple files (comma-separated)
node scripts/refactor/logging/inject-logger-import.js file1.js,file2.js --write
```
- Omit `--write` for dry-run.

### Orchestrator

Runs all steps in order, passing data in-memory.

```sh
# Dry run, pretty output
node scripts/refactor/logging/orchestrate-logging-refactor.js src/cli/commands/ --probe

# Actually write changes
node scripts/refactor/logging/orchestrate-logging-refactor.js src/cli/commands/ --write --probe
```

- `--probe` = verbose, pretty output (recommended for review).
- `--write` = actually modify files.

### Count and List Complex/Nested Logging Calls

**Count nested/template literal console.* calls:**
```sh
node scripts/refactor/logging/count-nested-species.js logging-probe-report.json
```

**List all template literal console.* calls (one per line):**
```sh
node scripts/refactor/logging/list-nested-species.js logging-probe-report.json
```

#### Workflow

```sh
# 1. Probe and review
node scripts/refactor/logging/probe-logging.js src/cli/commands/ --json

# 2. Classify and review mapping
node scripts/refactor/logging/logging-classifier.js logging-probe-report.json

# 3. Replace all logging species and template literal logs
node scripts/refactor/logging/replace-logging-species.js src/ --write

# 4. Inject logger imports
node scripts/refactor/logging/inject-logger-import.js src/cli/commands/ --write

# (Or do all steps at once:)
node scripts/refactor/logging/orchestrate-logging-refactor.js src/cli/commands/ --write --probe
```

### Logging Responsibilities -- Callsite vs. Logger

Callsite (where you call the logger):

- Specifies the log message (string, template, or error)
- Chooses the log level (`info`, `warn`, `error`, etc.)
- Optionally passes context/meta data (such as module name, event, impact, etc.)

Logger (the central logging module):

- Decides color based on log level
- Routes output to stdout or stderr based on log level
- Handles writing to log files, if needed
- Adds timestamps or other formatting
- Processes and displays context/meta data
- Handles structured output (e.g., JSON mode)
- Never expects colors, chalk, or formatting from the callsite

#### Before Rework -- Callsite Handles Color / Formatting

```js
// Bad: Callsite uses chalk and decides color
logger.info(chalk.yellow('Warning: something happened'));
logger.error(chalk.red(`Error in ${module}: ${err}`));
console.log(chalk.green(`Success: ${result}`));
```

#### After Rework -- Logger Handles Color / Formatting

```js
// Good: Callsite only provides message, level, and optional context
logger.info('Warning: something happened', { module: 'core', impact: 'medium' });
logger.error(`Error in ${module}: ${err}`, { module, impact: 'high' });
logger.success(`Success: ${result}`, { module: 'core' });
```

*The logger module will apply the correct color, choose the output stream, and handle any additional formatting or file writing.*

**Summary:**  
- Callsite: Only message, level, and optional context/meta.
- Logger: All color, stream, formatting, and routing logic.  
- No chalk or formatting at the callsite. All output decisions are centralized.

This division keeps your codebase consistent, maintainable, and easy to extend.

### Why this is going to be a pain in the ass -- `test/`

The handwritten logging in the app code, paired with string-matching asserts in the test code, is going to make this a much larger scope-of-work than I had initially anticipated.

1. Do the workflow of slicing and replacing console.* calls.

2. A new script that acts as a linter to anchor the new logging calls to a new field in logger().

3. Update tests to assert on structured log output, not string-matched console output.

   This is the most labor-intensive phase, as you identified. The proposed `capture-logs.js` helper is the canonical solution for this problem. It allows tests to operate on structured data instead of fragile string matching against `stdout`.

   This is a big win for testing future. There is no easy way to refactor this cleanly.
   I am going to have to make AI do it.


#### **1. Refactor App Code: Move to Centralized Logger**

Replace all `console.*` calls with structured `logger.*` calls, using a placeholder (e.g., `$my-module-name`) for the module name.

**Before (PluginRegistryBuilder):**
```js
console.warn(`WARN (PluginRegistryBuilder): Config path '${pluginEntry.config_path}' for CM-enabled plugin '${pluginEntry.invoke_name}' does not exist. Skipping.`);
console.error(`ERROR (PluginRegistryBuilder) reading or parsing CM manifest '${cmEnabledManifestPath}': ${error.message}`);
```

**After (with placeholder):**
```js
logger.warn(
  `Config path '${pluginEntry.config_path}' for CM-enabled plugin '${pluginEntry.invoke_name}' does not exist. Skipping.`,
  { pluginEntry, module: '$my-module-name' }
);

logger.error(
  `Error reading or parsing CM manifest '${cmEnabledManifestPath}': ${error.message}`,
  { error, cmEnabledManifestPath, module: '$my-module-name' }
);
```

#### **2. Linter/Codemod: Replace Placeholders with Real Module Names**

Traverse the codebase and replace all `$my-module-name` placeholders in logger calls with the correct module path, using AST traversal.

**AST Traversal Skeleton:**
```js
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

function replaceModulePlaceholders(filePath, projectRoot) {
  const code = fs.readFileSync(filePath, 'utf8');
  const ast = parser.parse(code, { sourceType: 'module' });
  const relModule = path.relative(projectRoot, filePath).replace(/\\/g, '/');

  traverse(ast, {
    CallExpression(path) {
      const node = path.node;
      // Look for logger.* calls with module: '$my-module-name'
      if (
        t.isMemberExpression(node.callee) &&
        node.callee.object.name === 'logger' &&
        node.arguments.length > 1 &&
        t.isObjectExpression(node.arguments[1])
      ) {
        node.arguments[1].properties.forEach(prop => {
          if (
            t.isIdentifier(prop.key, { name: 'module' }) &&
            t.isStringLiteral(prop.value, { value: '$my-module-name' })
          ) {
            // Replace placeholder with real relative module path
            prop.value = t.stringLiteral(relModule);
          }
        });
      }
    }
  });

  const output = generate(ast, {}, code).code;
  fs.writeFileSync(filePath, output, 'utf8');
}

// Usage: for each file in your source tree
// replaceModulePlaceholders('src/plugins/PluginRegistryBuilder.js', '/absolute/path/to/project/root');
```
This ensures all logger calls have the correct `module` field.

#### **3. Refactor Tests: Use Log-Capturing Helper**

Update tests to assert on structured log output, not string-matched console output.

**Helper:**
```js
// test/helpers/capture-logs.js
const logs = [];
const testLogger = {
  info: (msg, meta) => logs.push({ level: 'info', msg, meta }),
  warn: (msg, meta) => logs.push({ level: 'warn', msg, meta }),
  error: (msg, meta) => logs.push({ level: 'error', msg, meta }),
};
module.exports = { logs, testLogger };
```

**Before (old test):**
```js
assert(stdout.includes("WARN (PluginRegistryBuilder): Config path"));
```

**After (refactored test):**
```js
const { logs, testLogger } = require('../helpers/capture-logs');
myFunctionUnderTest({ logger: testLogger });
expect(logs).toContainEqual(expect.objectContaining({
  level: 'warn',
  msg: expect.stringContaining('Config path'),
  meta: expect.objectContaining({ module: 'plugins/PluginRegistryBuilder.js' })
}));
```

#### **Summary Table**

1. Refactor App Code | Replace `console.*` with `logger.*`, use `$my-module-name` as placeholder 
2. Linter/Codemod | Traverse code, replace `$my-module-name` with real relative module path
3. Refactor Tests | Use log-capturing helper, assert on structured logs
