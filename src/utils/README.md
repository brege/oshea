## Logger System Reference Documentation

### Architecture

The oshea logging system is a **pure routing layer** that delegates all formatting to specialized formatters. This design separates concerns between message routing, formatting, and output rendering.

```
logger(message, options) → formatter → console/file output
```

### Script Directory

#### Core
- [`logger.js`](logger.js) is the pure routing layer for message delegation to formatters
- [`formatters/`](formatters/) contains specialized output formatting (app, table, inline, etc.)
- [`logger-enhancer.js`](logger-enhancer.js) provides debugging enhancements (caller info, stack traces, error categories)

#### Formatters

| Formatter         | Description                                                               |
|------------------:|:--------------------------------------------------------------------------|
| [`index.js`](formatters/index.js)                           | orchestrator for all formatters |
| [`color-theme.js`](formatters/color-theme.js)                  | color palette for CLI output |
| **App Code**      |                                                                           |
| [`app.formatter.js`](formatters/app.formatter.js)                 | **default output format** |
| [`inline.formatter.js`](formatters/inline.formatter.js)                | --consider pruning-- |
| [`paths.formatter.js`](formatters/paths.formatter.js)                  | --consider pruning-- |
| [`raw.formatter.js`](formatters/raw.formatter.js)                    | raw unformatted output |
| [`validation.formatter.js`](formatters/validation.formatter.js)           | `plugin validate` |
| [`plugin-list.formatter.js`](formatters/plugin-list.formatter.js)             | `plugin list` |
| [`table.formatter.js`](formatters/table.formatter.js)                 | `plugin list --short` |
| **Test Code**      |                                                                          |
| [`yaml-test.formatter.js`](formatters/yaml-test.formatter.js)       | `node ...e2e-runner.js` |
| [`config.formatter.js`](formatters/config.formatter.js)                      | `oshea config` |
| [`js.formatter.js`](formatters/js.formatter.js)             | `node ...path-finder.js <path>` | 

### Others

- [`asset-resolver.js`](asset-resolver.js) for loading CSS properties, like Katex styles
- [`file-helpers.js`](file-helpers.js) ] makes it easier  for scripts to point and shoot at files or directories 
- [`logger-surfacer.js`](logger-surfacer.js) surfaces console outputters


### Canonical Usage

#### Template Literals for User-Facing Values

**[✔] Correct** -- Values in message, context in metadata.
```javascript
logger.info(`Plugin selected: ${pluginName}`, {
  context: 'PluginDeterminer'
});
```

**[✖] Wrong** -- Values in metadata expecting formatter to display.
```javascript
logger.info('Plugin selected', {
  context: 'PluginDeterminer',
  pluginName: pluginName  // This won't be displayed!
});
```

#### Metadata for Debug Context Only

Metadata provides **structured debugging context**, not user display data.

```javascript
logger.error(`Failed to load plugin: ${error.message}`, {
  context: 'PluginManager',
  pluginPath: pluginPath,
  stack: error.stack,
  // These are for debugging, not user display
});
```

#### Level-Specific Guidelines

| Level        | Context    | Purpose                        | Usage                     |
|:-------------|:-----------|:-------------------------------|:--------------------------|
| `debug`      | Full       | Internal operations, debugging | Filtered unless `--debug` |
| `info`       | Suppressed | User-facing information        | CLI output, status        |
| `success`    | Suppressed | Positive outcomes              | Completion messages       |
| `warn`       | Full       | Issues requiring attention     | User warnings             |
| `error`      | Full       | Failures and problems          | Error reporting           |
| `validation` | Full       | Validation results             | Plugin validation output  |

### Layer-Specific Patterns

#### `src/cli/` -- Command Line Interface

**Preserve user interface strings**
```javascript
// [✔] Keep - user-facing interface text
logger.info('Important Notes:');
logger.warn('WARN: Plugin validation failed');
logger.error('ERROR: Collection not found');

// [✔] Convert to debug - operational noise
logger.debug('Attempting to update collection...');
```

**Principle.** CLI commands communicate with users. Only convert obvious operational noise.

#### `src/core/`, `src/collections/`, `src/plugins/` -- Internal Modules

**Convert operational logging to debug**
```javascript
// [✔] Convert to debug - internal operations
logger.debug('Configuration loaded successfully', {
  context: 'ConfigResolver',
  configPath: configPath
});

// [✔] Keep as info - user transparency (like LaTeX verbose output)
logger.info(`Source is a Git repository, attempting to clone: ${sourceUrl}`, {
  context: 'CollectionManager'
});
```

**Principle.** Internal modules should not pollute user interface. Preserve transparency about user-visible processes.

#### Available Formatters

| Format   | Usage                   | Output Style             |
|:---------|:------------------------|:-------------------------|
| `app`    | General logging         | Colored, with newlines   |
| `table`  | Structured data         | Aligned columns          |
| `inline` | Prompts, partial output | No newline               |
| `raw`    | Unformatted output      | Plain text               |
| `paths`  | Path-related output     | Path-specific formatting |

### Format Usage

```javascript
// Default formatting
logger.info('Standard message');

// Table output
logger.info('', { 
  format: 'table', 
  meta: { rows: tableData, columns: headers } 
});

// Inline output (no newline)
logger.info('Processing... ', { format: 'inline' });
```


### Context Suppression

Context is automatically suppressed for clean user interfaces:

```javascript
// Without --debug: "Plugin loaded successfully"
// With --debug: "[PluginManager] Plugin loaded successfully"
logger.info('Plugin loaded successfully', {
  context: 'PluginManager'  // Hidden unless debug mode
});
```

### Debug Mode Control

```javascript
logger.setDebugMode(true);  // Enable debug output and full context
```

**Behavior**
- `debug` messages only appear when debug mode is enabled
- `info`/`success` messages hide context unless debug mode
- `warn`/`error` always show full context

### Enhanced Debugging

Optional enhancement features (controlled via `loggerConfig`):

```javascript
logger.configureLogger({
  showCaller: true,      // Show file:line caller info
  showStack: true,       // Show stack traces for errors  
  enrichErrors: true,    // Auto-categorize errors and add hints
  stackDepth: 3          // Number of stack frames to show
});
```

### Common Anti-Patterns

#### [✖] Wrong -- Values in Metadata (Expecting Display)
```javascript
// This broke user output during refactoring
logger.info('Collection name', { collectionName: name });
// User sees: "Collection name" (missing the actual name!)
```

#### [✖] Wrong -- Manual `stdout.write()` Hacks
```javascript
// Validator workaround that was needed due to formatter limitations
logger.success('Found file: ', { format: 'inline' });
process.stdout.write(`'${filename}'\n`);  // Hack!
```

#### [✖] Wrong -- Duplicate Information
```javascript
// Redundant - value appears in both message and metadata
logger.info(`Plugin loaded: ${name}`, { pluginName: name });
```

### Integration Examples

#### Plugin Validation Output
```javascript
logger.info('  Checking plugin structure... ', { format: 'inline' });
logger.success(`✓ Found required file: '${filename}'`, {
  context: 'V1Validator',
  plugin: pluginName
});
```

#### Collection Management
```javascript
logger.info(`Adding collection from source: ${source}`, {
  context: 'CollectionManager'
});
logger.success(`Successfully cloned: ${source} -> ${targetPath}`, {
  context: 'CollectionManager'
});
```

#### Error Handling
```javascript
logger.error(`Failed to load configuration: ${error.message}`, {
  context: 'ConfigResolver',
  configPath: attemptedPath,
  stack: error.stack
});
```

### Future ErrorManager Integration

The structured metadata preserved in debug logging serves as **operational checkpoints** for future ErrorManager implementation:

```javascript
// Debug instrumentation becomes ErrorManager anchor points
logger.debug('Configuration resolution started', {
  context: 'ConfigResolver',
  requestedPath: userConfigPath,
  // Rich context for error correlation
});
```
